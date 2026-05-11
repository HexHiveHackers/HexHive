import type { Expr, Literal } from '$lib/hhql';
import { emit, parseHhql } from '$lib/hhql';

export type ActivePreset = 'any' | 'last7' | 'last30' | 'thisYear' | 'never';
export type JoinedPreset = 'any' | 'last30d' | 'lastYear' | 'thisYear';
export type NumPreset = 'any' | 'gte1' | 'gte5' | 'gte20' | 'gte100' | 'gte1000';

export interface ChipState {
  types: string[]; // creates IN (...)
  active: ActivePreset;
  joined: JoinedPreset;
  downloads: NumPreset;
  listings: NumPreset;
  has: string[]; // bare booleans: hasBio, hasLinks, ...
  affiliations: string[]; // affiliation IN (...)
  hidePlaceholder: boolean; // when true, emits "NOT placeholder"
  adminOnly: boolean; // when true, emits "admin"
}

const HAS_FIELDS = ['hasBio', 'hasAlias', 'hasAvatar', 'hasLinks', 'hasAffiliations'] as const;
const THIS_YEAR_START = `${new Date().getUTCFullYear()}-01-01`;

// Stable order matches design spec.
export function queryFromChipState(s: ChipState): string {
  const parts: string[] = [];
  if (s.types.length > 0) parts.push(`creates IN (${s.types.join(', ')})`);
  if (s.active !== 'any') parts.push(activeClause(s.active));
  if (s.joined !== 'any') parts.push(joinedClause(s.joined));
  if (s.downloads !== 'any') parts.push(`downloads ${numOpForPreset(s.downloads)}`);
  if (s.listings !== 'any') parts.push(`listings ${numOpForPreset(s.listings)}`);
  for (const h of HAS_FIELDS) {
    if (s.has.includes(h)) parts.push(h);
  }
  if (s.affiliations.length > 0) parts.push(`affiliation IN (${s.affiliations.map(quoteIfNeeded).join(', ')})`);
  if (s.hidePlaceholder) parts.push('NOT placeholder');
  if (s.adminOnly) parts.push('admin');
  return parts.join(' AND ');
}

export function chipStateFromQuery(q: string): ChipState {
  const r = parseHhql(q);
  const ast = r.ast;
  const s: ChipState = {
    types: [],
    active: 'any',
    joined: 'any',
    downloads: 'any',
    listings: 'any',
    has: [],
    affiliations: [],
    hidePlaceholder: false,
    adminOnly: false,
  };
  if (!ast) return s;
  walk(ast, (e) => {
    if (e.kind === 'in' && e.field === 'creates' && !e.negated) {
      s.types = e.values.map(litStr);
    } else if (e.kind === 'in' && e.field === 'affiliation' && !e.negated) {
      s.affiliations = e.values.map(litStr);
    } else if (e.kind === 'compare' && e.field === 'active' && e.op === '>') {
      s.active = matchActive(e.value) ?? 'any';
    } else if (e.kind === 'empty' && e.field === 'active' && !e.negated) {
      s.active = 'never';
    } else if (e.kind === 'compare' && e.field === 'joined' && e.op === '>') {
      s.joined = matchJoined(e.value) ?? 'any';
    } else if (e.kind === 'compare' && e.field === 'downloads' && e.op === '>=' && e.value.kind === 'number') {
      s.downloads = numFromN(e.value.value);
    } else if (e.kind === 'compare' && e.field === 'listings' && e.op === '>=' && e.value.kind === 'number') {
      s.listings = numFromN(e.value.value);
    } else if (e.kind === 'bare' && HAS_FIELDS.some((h) => h === e.field) && !e.negated) {
      if (!s.has.includes(e.field)) s.has.push(e.field);
    } else if (e.kind === 'not' && e.inner.kind === 'bare' && e.inner.field === 'placeholder') {
      s.hidePlaceholder = true;
    } else if (e.kind === 'bare' && e.field === 'admin' && !e.negated) {
      s.adminOnly = true;
    }
  });
  return s;
}

// Apply a chip change while preserving any custom (unmapped) clauses in q.
export function applyChip<K extends keyof ChipState>(currentQuery: string, key: K, value: ChipState[K]): string {
  const state = chipStateFromQuery(currentQuery);
  const nextState = { ...state, [key]: value };
  const customClauses = extractCustomClauses(currentQuery);
  const base = queryFromChipState(nextState);
  return [base, ...customClauses].filter(Boolean).join(' AND ');
}

function walk(e: Expr, visit: (e: Expr) => void): void {
  visit(e);
  if (e.kind === 'and' || e.kind === 'or') {
    walk(e.left, visit);
    walk(e.right, visit);
  } else if (e.kind === 'not') {
    walk(e.inner, visit);
  } else if (e.kind === 'group') {
    walk(e.inner, visit);
  }
}

function isMappedClause(e: Expr): boolean {
  if (e.kind === 'in' && (e.field === 'creates' || e.field === 'affiliation')) return true;
  if (
    e.kind === 'compare' &&
    (e.field === 'active' || e.field === 'joined' || e.field === 'downloads' || e.field === 'listings')
  )
    return true;
  if (e.kind === 'empty' && e.field === 'active' && !e.negated) return true;
  if (e.kind === 'bare' && (HAS_FIELDS.some((h) => h === e.field) || e.field === 'admin' || e.field === 'placeholder'))
    return true;
  if (e.kind === 'not' && e.inner.kind === 'bare' && e.inner.field === 'placeholder') return true;
  return false;
}

function extractCustomClauses(q: string): string[] {
  const r = parseHhql(q);
  if (!r.ast) return [];
  const top = flattenAnd(r.ast);
  return top.filter((c) => !isMappedClause(c)).map(emit);
}

function flattenAnd(e: Expr): Expr[] {
  if (e.kind === 'and') return [...flattenAnd(e.left), ...flattenAnd(e.right)];
  if (e.kind === 'group') return flattenAnd(e.inner);
  return [e];
}

function activeClause(p: ActivePreset): string {
  switch (p) {
    case 'last7':
      return 'active > -7d';
    case 'last30':
      return 'active > -30d';
    case 'thisYear':
      return `active > ${THIS_YEAR_START}`;
    case 'never':
      return 'active IS EMPTY';
    default:
      return '';
  }
}

function joinedClause(p: JoinedPreset): string {
  switch (p) {
    case 'last30d':
      return 'joined > -30d';
    case 'lastYear':
      return 'joined > -1y';
    case 'thisYear':
      return `joined > ${THIS_YEAR_START}`;
    default:
      return '';
  }
}

function numOpForPreset(p: NumPreset): string {
  switch (p) {
    case 'gte1':
      return '>= 1';
    case 'gte5':
      return '>= 5';
    case 'gte20':
      return '>= 20';
    case 'gte100':
      return '>= 100';
    case 'gte1000':
      return '>= 1000';
    default:
      return '>= 1';
  }
}

function numFromN(n: number): NumPreset {
  if (n >= 1000) return 'gte1000';
  if (n >= 100) return 'gte100';
  if (n >= 20) return 'gte20';
  if (n >= 5) return 'gte5';
  if (n >= 1) return 'gte1';
  return 'any';
}

function matchActive(lit: Literal): ActivePreset | null {
  if (lit.kind === 'reldate') {
    if (lit.value === '-7d') return 'last7';
    if (lit.value === '-30d') return 'last30';
  }
  if (lit.kind === 'date' && lit.value === THIS_YEAR_START) return 'thisYear';
  return null;
}

function matchJoined(lit: Literal): JoinedPreset | null {
  if (lit.kind === 'reldate') {
    if (lit.value === '-30d') return 'last30d';
    if (lit.value === '-1y') return 'lastYear';
  }
  if (lit.kind === 'date' && lit.value === THIS_YEAR_START) return 'thisYear';
  return null;
}

function litStr(l: Literal): string {
  switch (l.kind) {
    case 'string':
      return l.value;
    case 'bool':
      return l.value ? 'true' : 'false';
    case 'number':
      return String(l.value);
    case 'date':
    case 'reldate':
      return l.value;
  }
}

function quoteIfNeeded(s: string): string {
  return /[\s,()"]/.test(s) ? `"${s}"` : s;
}
