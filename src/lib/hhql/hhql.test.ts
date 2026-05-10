// src/lib/hhql/hhql.test.ts
import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluator';
import type { DirectoryRow } from './fields-users';
import { fieldsUsers } from './fields-users';
import { parse } from './parser';
import { tokenize } from './tokens';

describe('tokenize', () => {
  it('splits identifiers, operators, and literals with positions', () => {
    const tokens = tokenize('active > -7d AND hasBio');
    expect(tokens).toEqual([
      { kind: 'ident', value: 'active', start: 0, end: 6 },
      { kind: 'op', value: '>', start: 7, end: 8 },
      { kind: 'reldate', value: '-7d', start: 9, end: 12 },
      { kind: 'kw', value: 'AND', start: 13, end: 16 },
      { kind: 'ident', value: 'hasBio', start: 17, end: 23 },
    ]);
  });

  it('parses double-quoted strings with internal whitespace', () => {
    const tokens = tokenize('affiliation = "team aqua"');
    expect(tokens[2]).toEqual({ kind: 'string', value: 'team aqua', start: 14, end: 25 });
  });

  it('lexes IN, NOT, IS, EMPTY as keywords case-insensitively', () => {
    const tokens = tokenize('admin is not empty');
    expect(tokens.map((t) => t.kind)).toEqual(['ident', 'kw', 'kw', 'kw']);
    expect(tokens.map((t) => t.value)).toEqual(['admin', 'IS', 'NOT', 'EMPTY']);
  });

  it('recognizes paren and comma punctuation', () => {
    const tokens = tokenize('creates IN (sprite, sound)');
    expect(tokens.map((t) => t.kind)).toEqual(['ident', 'kw', 'lparen', 'ident', 'comma', 'ident', 'rparen']);
  });

  it('recognizes !=, >=, <=, !~, ~ as op tokens', () => {
    const tokens = tokenize('a != b >= c <= d !~ e ~ f');
    expect(tokens.filter((t) => t.kind === 'op').map((t) => t.value)).toEqual(['!=', '>=', '<=', '!~', '~']);
  });

  it('produces a number token for bare integers', () => {
    const tokens = tokenize('downloads >= 100');
    expect(tokens[2]).toEqual({ kind: 'number', value: 100, start: 13, end: 16 });
  });

  it('produces an iso date token for YYYY-MM-DD', () => {
    const tokens = tokenize('joined > 2026-01-01');
    expect(tokens[2]).toEqual({ kind: 'date', value: '2026-01-01', start: 9, end: 19 });
  });

  it('treats an unterminated quoted string leniently — consumes to EOF', () => {
    const tokens = tokenize('"oops');
    expect(tokens).toEqual([{ kind: 'string', value: 'oops', start: 0, end: 6 }]);
  });

  it('lexes a bare hyphen as an ident, not a sign', () => {
    const tokens = tokenize('a - b');
    expect(tokens.map((t) => ({ kind: t.kind, value: t.value }))).toEqual([
      { kind: 'ident', value: 'a' },
      { kind: 'ident', value: '-' },
      { kind: 'ident', value: 'b' },
    ]);
  });
});

describe('parse', () => {
  it('parses a single compare', () => {
    const r = parse('downloads >= 100');
    expect(r.ok).toBe(true);
    expect(r.ast).toMatchObject({
      kind: 'compare',
      field: 'downloads',
      op: '>=',
      value: { kind: 'number', value: 100 },
    });
  });

  it('parses IN list with negation', () => {
    const r = parse('creates NOT IN (sprite, sound)');
    expect(r.ok).toBe(true);
    expect(r.ast).toMatchObject({
      kind: 'in',
      field: 'creates',
      negated: true,
      values: [
        { kind: 'string', value: 'sprite' },
        { kind: 'string', value: 'sound' },
      ],
    });
  });

  it('parses IS NOT EMPTY', () => {
    const r = parse('alias IS NOT EMPTY');
    expect(r.ok).toBe(true);
    expect(r.ast).toMatchObject({ kind: 'empty', field: 'alias', negated: true });
  });

  it('parses bare boolean keywords', () => {
    const r = parse('hasBio');
    expect(r.ok).toBe(true);
    expect(r.ast).toMatchObject({ kind: 'bare', field: 'hasBio', negated: false });
  });

  it('treats NOT hasBio as negated bare', () => {
    const r = parse('NOT hasBio');
    expect(r.ok).toBe(true);
    expect(r.ast).toMatchObject({ kind: 'not', inner: { kind: 'bare', field: 'hasBio' } });
  });

  it('treats adjacent clauses as implicit AND', () => {
    const r = parse('hasBio active > -7d');
    expect(r.ok).toBe(true);
    expect(r.ast?.kind).toBe('and');
  });

  it('respects OR < AND precedence', () => {
    const r = parse('a = 1 OR b = 2 AND c = 3');
    expect(r.ok).toBe(true);
    // expect: or(a=1, and(b=2, c=3))
    expect(r.ast).toMatchObject({ kind: 'or', right: { kind: 'and' } });
  });

  it('parses parenthesized groups', () => {
    const r = parse('(a = 1 OR b = 2) AND c = 3');
    expect(r.ok).toBe(true);
    expect(r.ast).toMatchObject({ kind: 'and', left: { kind: 'group' } });
  });

  it('returns ok with null ast on empty input', () => {
    const r = parse('   ');
    expect(r.ok).toBe(true);
    expect(r.ast).toBeNull();
  });

  it('returns errors with positions on unbalanced paren', () => {
    const r = parse('(a = 1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.message).toMatch(/paren/i);
  });

  it('is lenient: trailing AND yields a partial ast and an error', () => {
    const r = parse('hasBio AND');
    expect(r.ok).toBe(false);
    expect(r.ast).not.toBeNull(); // we got at least the left side
  });
});

function row(overrides: Partial<DirectoryRow> = {}): DirectoryRow {
  return {
    username: 'someone',
    alias: null,
    bio: null,
    listingsByType: { romhack: 0, sprite: 0, sound: 0, script: 0 },
    totalDownloads: 0,
    lastActive: null,
    joinedAt: Date.now(),
    hasBio: false,
    hasAlias: false,
    hasAvatar: false,
    hasLinks: false,
    hasAffiliations: false,
    affiliations: [],
    akas: [],
    isPlaceholder: false,
    isAdmin: false,
    name: 'Someone',
    avatarKey: null,
    pronouns: null,
    placeholderKind: 'contributor',
    ...overrides,
  };
}

function predicate(query: string) {
  const r = parse(query);
  if (!r.ok || !r.ast) throw new Error(`parse failed: ${JSON.stringify(r)}`);
  const ast = r.ast;
  return (r: DirectoryRow) => evaluate(ast, r, fieldsUsers);
}

describe('evaluate', () => {
  it('compares numbers', () => {
    const p = predicate('downloads > 100');
    expect(p(row({ totalDownloads: 200 }))).toBe(true);
    expect(p(row({ totalDownloads: 50 }))).toBe(false);
  });

  it('matches string contains case-insensitively', () => {
    const p = predicate('bio ~ shiny');
    expect(p(row({ bio: 'Loves SHINY pokemon' }))).toBe(true);
    expect(p(row({ bio: 'no match' }))).toBe(false);
    expect(p(row({ bio: null }))).toBe(false);
  });

  it('handles bare boolean shorthand', () => {
    const p = predicate('hasBio');
    expect(p(row({ hasBio: true }))).toBe(true);
    expect(p(row({ hasBio: false }))).toBe(false);
  });

  it('handles NOT bare', () => {
    const p = predicate('NOT placeholder');
    expect(p(row({ isPlaceholder: false }))).toBe(true);
    expect(p(row({ isPlaceholder: true }))).toBe(false);
  });

  it('IN over enum array (creates)', () => {
    const p = predicate('creates IN (sprite, sound)');
    expect(p(row({ listingsByType: { romhack: 0, sprite: 2, sound: 0, script: 0 } }))).toBe(true);
    expect(p(row({ listingsByType: { romhack: 1, sprite: 0, sound: 0, script: 0 } }))).toBe(false);
  });

  it('IS EMPTY / IS NOT EMPTY for nullable string', () => {
    const empty = predicate('alias IS EMPTY');
    const notEmpty = predicate('alias IS NOT EMPTY');
    expect(empty(row({ alias: null }))).toBe(true);
    expect(empty(row({ alias: 'x' }))).toBe(false);
    expect(notEmpty(row({ alias: 'x' }))).toBe(true);
  });

  it('relative dates against `active`', () => {
    const recent = Date.now() - 3 * 86_400_000; // 3 days ago
    const old = Date.now() - 30 * 86_400_000;
    const p = predicate('active > -7d');
    expect(p(row({ lastActive: recent }))).toBe(true);
    expect(p(row({ lastActive: old }))).toBe(false);
    expect(p(row({ lastActive: null }))).toBe(false);
  });

  it('combines AND / OR with correct precedence', () => {
    const p = predicate('hasBio AND (downloads > 100 OR placeholder)');
    expect(p(row({ hasBio: true, totalDownloads: 200 }))).toBe(true);
    expect(p(row({ hasBio: true, isPlaceholder: true }))).toBe(true);
    expect(p(row({ hasBio: true, totalDownloads: 50, isPlaceholder: false }))).toBe(false);
    expect(p(row({ hasBio: false, totalDownloads: 200 }))).toBe(false);
  });

  it('returns false (no row) for unknown fields', () => {
    const p = predicate('nope = 1');
    expect(p(row())).toBe(false);
  });
});

import { emit } from './emit';

describe('emit', () => {
  it('round-trips a simple compare', () => {
    const r = parse('downloads > 100');
    if (!r.ok || !r.ast) throw new Error('parse failed');
    expect(emit(r.ast)).toBe('downloads > 100');
  });

  it('emits IN with quoted multi-word values', () => {
    const r = parse('affiliation IN ("team aqua", magma)');
    if (!r.ok || !r.ast) throw new Error('parse failed');
    expect(emit(r.ast)).toBe('affiliation IN ("team aqua", magma)');
  });

  it('omits implicit AND when no OR is present', () => {
    const r = parse('hasBio AND active > -7d AND NOT placeholder');
    if (!r.ok || !r.ast) throw new Error('parse failed');
    expect(emit(r.ast)).toBe('hasBio active > -7d NOT placeholder');
  });

  it('keeps explicit AND when an OR forces precedence', () => {
    const r = parse('a = 1 AND (b = 2 OR c = 3)');
    if (!r.ok || !r.ast) throw new Error('parse failed');
    expect(emit(r.ast)).toBe('a = 1 AND (b = 2 OR c = 3)');
  });
});
