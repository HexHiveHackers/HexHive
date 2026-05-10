# /users filters + HHQL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `/users` directory with a chip-bar filter UI backed by HHQL — a reusable JQL/PQL-style query language scoped to user records — with URL-shareable state.

**Architecture:** A field-agnostic parser/evaluator under `src/lib/hhql/` plus a per-page field registry. Server enriches the roster once with derived counts/flags; client parses the query string and filters in-memory. Chip bar and `</>` editor are two views of one query string, both writing to a single `$state` source of truth.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), Drizzle on libSQL/Turso, vitest, `@testing-library/svelte`, shadcn-svelte (`Popover` + `Command`), Tailwind v4.

**Spec:** [`docs/superpowers/specs/2026-05-10-users-hhql-filters-design.md`](../specs/2026-05-10-users-hhql-filters-design.md)

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/hhql/tokens.ts` | new | Tokenizer with positions |
| `src/lib/hhql/ast.ts` | new | AST node types |
| `src/lib/hhql/parser.ts` | new | Tokens → AST, lenient recovery |
| `src/lib/hhql/fields.ts` | new | `FieldRegistry` interface + types |
| `src/lib/hhql/fields-users.ts` | new | `/users` field registry |
| `src/lib/hhql/evaluator.ts` | new | AST + row → boolean |
| `src/lib/hhql/emit.ts` | new | AST → canonical text |
| `src/lib/hhql/index.ts` | new | Public surface (`parseHhql`, `evaluate`, `emit`) |
| `src/lib/hhql/hhql.test.ts` | new | Combined parser/evaluator/emit suite |
| `src/lib/server/users-directory.ts` | new | `enrichDirectoryUsers(db)` |
| `src/lib/server/users-directory.test.ts` | new | In-memory libSQL fixture |
| `src/lib/components/users/UserCard.svelte` | new | Extracted from existing snippet |
| `src/lib/components/users/filter-state.ts` | new | ChipState ⇄ AST helpers |
| `src/lib/components/users/filter-state.test.ts` | new | Round-trip + custom-clause survival |
| `src/lib/components/users/FilterBar.svelte` | new | Chip dropdowns |
| `src/lib/components/users/HhqlInput.svelte` | new | `</>` textarea with highlight overlay |
| `src/routes/users/+page.server.ts` | modify | Use `enrichDirectoryUsers`, pass `q`+`sort` |
| `src/routes/users/+page.svelte` | modify | Mount FilterBar, HhqlInput, derived rows |

Sort applies separately from `?q=` via `?sort=field:dir`.

---

## Conventions for every task

- TDD: failing test first, then implementation, then green.
- Use `bun run test <path>` to run a single file. `bun run check` and `bun run lint` after each task; both must be 0 errors / 0 warnings.
- No `as any`, no `as unknown`, no suppression comments — see CLAUDE.md "Strict-typing & lint policy".
- Commit messages follow conventional commits (`feat(hhql): …`, `feat(users): …`, `test(hhql): …`) and end with `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## Task 1: Tokenizer

**Files:**
- Create: `src/lib/hhql/tokens.ts`
- Create: `src/lib/hhql/hhql.test.ts` (this file collects all HHQL tests)

- [ ] **Step 1.1: Write the failing test**

```ts
// src/lib/hhql/hhql.test.ts
import { describe, expect, it } from 'vitest';
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
});
```

- [ ] **Step 1.2: Verify it fails**

Run: `bun run test src/lib/hhql/hhql.test.ts`
Expected: failure — `tokens` module does not exist.

- [ ] **Step 1.3: Implement the tokenizer**

```ts
// src/lib/hhql/tokens.ts
export type TokenKind =
  | 'ident'
  | 'kw'
  | 'op'
  | 'string'
  | 'number'
  | 'date'
  | 'reldate'
  | 'lparen'
  | 'rparen'
  | 'comma';

export interface Token {
  kind: TokenKind;
  value: string | number;
  start: number;
  end: number;
}

const KEYWORDS = new Set(['AND', 'OR', 'NOT', 'IN', 'IS', 'EMPTY', 'TRUE', 'FALSE']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REL_DATE = /^-\d+[dwmy]$/;

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === '(') { out.push({ kind: 'lparen', value: '(', start: i, end: i + 1 }); i++; continue; }
    if (ch === ')') { out.push({ kind: 'rparen', value: ')', start: i, end: i + 1 }); i++; continue; }
    if (ch === ',') { out.push({ kind: 'comma', value: ',', start: i, end: i + 1 }); i++; continue; }
    if (ch === '"') {
      const start = i;
      i++;
      let value = '';
      while (i < input.length && input[i] !== '"') { value += input[i]; i++; }
      i++; // closing quote (or EOF)
      out.push({ kind: 'string', value, start, end: i });
      continue;
    }
    // multi-char ops
    const two = input.slice(i, i + 2);
    if (two === '!=' || two === '>=' || two === '<=' || two === '!~') {
      out.push({ kind: 'op', value: two, start: i, end: i + 2 }); i += 2; continue;
    }
    if (ch === '=' || ch === '>' || ch === '<' || ch === '~') {
      out.push({ kind: 'op', value: ch, start: i, end: i + 1 }); i++; continue;
    }
    // word-shaped: identifier, keyword, reldate, date, number
    const start = i;
    let word = '';
    while (i < input.length && /[A-Za-z0-9_\-]/.test(input[i]!)) { word += input[i]; i++; }
    if (word === '') { i++; continue; } // skip unknown char silently — lenient lex
    if (REL_DATE.test(word)) {
      out.push({ kind: 'reldate', value: word, start, end: i });
    } else if (ISO_DATE.test(word)) {
      out.push({ kind: 'date', value: word, start, end: i });
    } else if (/^-?\d+$/.test(word)) {
      out.push({ kind: 'number', value: Number(word), start, end: i });
    } else if (KEYWORDS.has(word.toUpperCase())) {
      out.push({ kind: 'kw', value: word.toUpperCase(), start, end: i });
    } else {
      out.push({ kind: 'ident', value: word, start, end: i });
    }
  }
  return out;
}
```

- [ ] **Step 1.4: Verify green**

Run: `bun run test src/lib/hhql/hhql.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 1.5: Lint + check**

Run: `bun run lint && bun run check`
Expected: 0/0.

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/hhql/tokens.ts src/lib/hhql/hhql.test.ts
git commit -m "$(printf 'feat(hhql): tokenizer\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 2: AST node types

**Files:**
- Create: `src/lib/hhql/ast.ts`

This task is type-only; no tests until the parser consumes it (Task 3).

- [ ] **Step 2.1: Write the AST types**

```ts
// src/lib/hhql/ast.ts
export type CompareOp = '=' | '!=' | '>' | '<' | '>=' | '<=' | '~' | '!~';

export interface Span { start: number; end: number; }

export type Literal =
  | { kind: 'string'; value: string; span: Span }
  | { kind: 'number'; value: number; span: Span }
  | { kind: 'date'; value: string; span: Span }       // ISO YYYY-MM-DD
  | { kind: 'reldate'; value: string; span: Span }    // -7d / -2w / -1m / -1y
  | { kind: 'bool'; value: boolean; span: Span };

export type Expr =
  | { kind: 'compare'; field: string; fieldSpan: Span; op: CompareOp; value: Literal; span: Span }
  | { kind: 'in'; field: string; fieldSpan: Span; negated: boolean; values: Literal[]; span: Span }
  | { kind: 'empty'; field: string; fieldSpan: Span; negated: boolean; span: Span }
  | { kind: 'bare'; field: string; fieldSpan: Span; negated: boolean; span: Span }   // hasBio / NOT hasBio
  | { kind: 'and'; left: Expr; right: Expr; span: Span }
  | { kind: 'or'; left: Expr; right: Expr; span: Span }
  | { kind: 'not'; inner: Expr; span: Span }
  | { kind: 'group'; inner: Expr; span: Span };

export interface ParseError { message: string; span: Span; }
export type ParseResult = { ok: true; ast: Expr | null } | { ok: false; ast: Expr | null; errors: ParseError[] };
```

- [ ] **Step 2.2: Lint + check**

Run: `bun run lint && bun run check`
Expected: 0/0.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/hhql/ast.ts
git commit -m "$(printf 'feat(hhql): AST node types\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 3: Parser

**Files:**
- Create: `src/lib/hhql/parser.ts`
- Modify: `src/lib/hhql/hhql.test.ts`

- [ ] **Step 3.1: Append failing parser tests**

```ts
// append to src/lib/hhql/hhql.test.ts
import { parse } from './parser';

describe('parse', () => {
  it('parses a single compare', () => {
    const r = parse('downloads >= 100');
    expect(r.ok).toBe(true);
    expect(r.ast).toMatchObject({ kind: 'compare', field: 'downloads', op: '>=', value: { kind: 'number', value: 100 } });
  });

  it('parses IN list with negation', () => {
    const r = parse('creates NOT IN (sprite, sound)');
    expect(r.ok).toBe(true);
    expect(r.ast).toMatchObject({ kind: 'in', field: 'creates', negated: true, values: [
      { kind: 'string', value: 'sprite' },
      { kind: 'string', value: 'sound' },
    ] });
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
```

- [ ] **Step 3.2: Verify failure**

Run: `bun run test src/lib/hhql/hhql.test.ts`
Expected: failure — `./parser` not found.

- [ ] **Step 3.3: Implement the parser**

```ts
// src/lib/hhql/parser.ts
import type { CompareOp, Expr, Literal, ParseError, ParseResult, Span } from './ast';
import { type Token, tokenize } from './tokens';

const COMPARE_OPS: ReadonlySet<CompareOp> = new Set(['=', '!=', '>', '<', '>=', '<=', '~', '!~']);

class Cursor {
  i = 0;
  errors: ParseError[] = [];
  constructor(private readonly tokens: Token[], private readonly endPos: number) {}
  peek(o = 0): Token | undefined { return this.tokens[this.i + o]; }
  next(): Token | undefined { return this.tokens[this.i++]; }
  done(): boolean { return this.i >= this.tokens.length; }
  span(start: number, end: number): Span { return { start, end }; }
  eofSpan(): Span { return { start: this.endPos, end: this.endPos }; }
  err(message: string, span: Span): void { this.errors.push({ message, span }); }
}

export function parse(input: string): ParseResult {
  const tokens = tokenize(input);
  const cur = new Cursor(tokens, input.length);
  if (cur.done()) return { ok: true, ast: null };
  const ast = parseOr(cur);
  if (!cur.done()) {
    const t = cur.peek()!;
    cur.err(`unexpected token "${String(t.value)}"`, { start: t.start, end: t.end });
  }
  return cur.errors.length === 0 ? { ok: true, ast } : { ok: false, ast, errors: cur.errors };
}

function parseOr(cur: Cursor): Expr | null {
  let left = parseAnd(cur);
  while (left && cur.peek()?.kind === 'kw' && cur.peek()!.value === 'OR') {
    cur.next();
    const right = parseAnd(cur);
    if (!right) { cur.err('expected expression after OR', cur.eofSpan()); break; }
    left = { kind: 'or', left, right, span: { start: left.span.start, end: right.span.end } };
  }
  return left;
}

function parseAnd(cur: Cursor): Expr | null {
  let left = parseUnary(cur);
  while (left) {
    const t = cur.peek();
    if (!t) break;
    if (t.kind === 'kw' && t.value === 'AND') { cur.next(); }
    else if (canStartTerm(t)) { /* implicit AND */ }
    else break;
    const right = parseUnary(cur);
    if (!right) { cur.err('expected expression', cur.eofSpan()); break; }
    left = { kind: 'and', left, right, span: { start: left.span.start, end: right.span.end } };
  }
  return left;
}

function canStartTerm(t: Token): boolean {
  return t.kind === 'ident' || t.kind === 'lparen' || (t.kind === 'kw' && t.value === 'NOT');
}

function parseUnary(cur: Cursor): Expr | null {
  const t = cur.peek();
  if (!t) return null;
  if (t.kind === 'kw' && t.value === 'NOT') {
    const start = t.start;
    cur.next();
    const inner = parseUnary(cur);
    if (!inner) { cur.err('expected expression after NOT', cur.eofSpan()); return null; }
    return { kind: 'not', inner, span: { start, end: inner.span.end } };
  }
  return parseAtom(cur);
}

function parseAtom(cur: Cursor): Expr | null {
  const t = cur.peek();
  if (!t) return null;
  if (t.kind === 'lparen') {
    const start = t.start;
    cur.next();
    const inner = parseOr(cur);
    const close = cur.peek();
    if (close?.kind !== 'rparen') {
      cur.err('unbalanced paren', { start, end: (inner?.span.end ?? start) + 1 });
      if (inner) return { kind: 'group', inner, span: { start, end: inner.span.end } };
      return null;
    }
    const end = close.end;
    cur.next();
    if (!inner) { cur.err('empty group', { start, end }); return null; }
    return { kind: 'group', inner, span: { start, end } };
  }
  if (t.kind !== 'ident') {
    cur.err('expected field', { start: t.start, end: t.end });
    cur.next();
    return null;
  }
  return parseClause(cur);
}

function parseClause(cur: Cursor): Expr | null {
  const fieldTok = cur.next();
  if (!fieldTok || fieldTok.kind !== 'ident') return null;
  const field = String(fieldTok.value);
  const fieldSpan = { start: fieldTok.start, end: fieldTok.end };
  const next = cur.peek();
  // bare boolean: end of input, or followed by AND/OR/NOT/rparen, or another ident (implicit AND)
  if (!next || (next.kind === 'kw' && (next.value === 'AND' || next.value === 'OR')) || next.kind === 'rparen' || next.kind === 'ident' || (next.kind === 'kw' && next.value === 'NOT')) {
    return { kind: 'bare', field, fieldSpan, negated: false, span: fieldSpan };
  }
  if (next.kind === 'kw' && next.value === 'IN') {
    cur.next();
    return parseIn(cur, field, fieldSpan, /* negated */ false);
  }
  if (next.kind === 'kw' && next.value === 'NOT') {
    // could be "NOT IN" or end-of-clause. Look ahead.
    const after = cur.peek(1);
    if (after?.kind === 'kw' && after.value === 'IN') { cur.next(); cur.next(); return parseIn(cur, field, fieldSpan, true); }
    // otherwise leave NOT for outer parser — emit a bare clause
    return { kind: 'bare', field, fieldSpan, negated: false, span: fieldSpan };
  }
  if (next.kind === 'kw' && next.value === 'IS') {
    cur.next();
    let negated = false;
    if (cur.peek()?.kind === 'kw' && cur.peek()!.value === 'NOT') { cur.next(); negated = true; }
    const empty = cur.peek();
    if (!empty || empty.kind !== 'kw' || empty.value !== 'EMPTY') {
      cur.err('expected EMPTY', empty ? { start: empty.start, end: empty.end } : cur.eofSpan());
      return { kind: 'empty', field, fieldSpan, negated, span: fieldSpan };
    }
    cur.next();
    return { kind: 'empty', field, fieldSpan, negated, span: { start: fieldSpan.start, end: empty.end } };
  }
  if (next.kind === 'op' && COMPARE_OPS.has(next.value as CompareOp)) {
    const op = next.value as CompareOp;
    cur.next();
    const lit = parseLiteral(cur);
    if (!lit) { cur.err(`expected value after ${op}`, cur.eofSpan()); return { kind: 'bare', field, fieldSpan, negated: false, span: fieldSpan }; }
    return { kind: 'compare', field, fieldSpan, op, value: lit, span: { start: fieldSpan.start, end: lit.span.end } };
  }
  cur.err('expected operator or end of clause', { start: next.start, end: next.end });
  return { kind: 'bare', field, fieldSpan, negated: false, span: fieldSpan };
}

function parseIn(cur: Cursor, field: string, fieldSpan: Span, negated: boolean): Expr | null {
  const lparen = cur.peek();
  if (lparen?.kind !== 'lparen') {
    cur.err('expected (', lparen ? { start: lparen.start, end: lparen.end } : cur.eofSpan());
    return { kind: 'in', field, fieldSpan, negated, values: [], span: fieldSpan };
  }
  cur.next();
  const values: Literal[] = [];
  while (cur.peek() && cur.peek()!.kind !== 'rparen') {
    const lit = parseLiteral(cur);
    if (!lit) break;
    values.push(lit);
    if (cur.peek()?.kind === 'comma') cur.next();
  }
  const close = cur.peek();
  if (close?.kind !== 'rparen') {
    cur.err('expected )', close ? { start: close.start, end: close.end } : cur.eofSpan());
    return { kind: 'in', field, fieldSpan, negated, values, span: fieldSpan };
  }
  cur.next();
  return { kind: 'in', field, fieldSpan, negated, values, span: { start: fieldSpan.start, end: close.end } };
}

function parseLiteral(cur: Cursor): Literal | null {
  const t = cur.peek();
  if (!t) return null;
  if (t.kind === 'string') { cur.next(); return { kind: 'string', value: String(t.value), span: { start: t.start, end: t.end } }; }
  if (t.kind === 'number') { cur.next(); return { kind: 'number', value: Number(t.value), span: { start: t.start, end: t.end } }; }
  if (t.kind === 'date') { cur.next(); return { kind: 'date', value: String(t.value), span: { start: t.start, end: t.end } }; }
  if (t.kind === 'reldate') { cur.next(); return { kind: 'reldate', value: String(t.value), span: { start: t.start, end: t.end } }; }
  if (t.kind === 'ident') {
    cur.next();
    const v = String(t.value);
    if (v === 'true' || v === 'false') return { kind: 'bool', value: v === 'true', span: { start: t.start, end: t.end } };
    return { kind: 'string', value: v, span: { start: t.start, end: t.end } };
  }
  if (t.kind === 'kw' && (t.value === 'TRUE' || t.value === 'FALSE')) {
    cur.next();
    return { kind: 'bool', value: t.value === 'TRUE', span: { start: t.start, end: t.end } };
  }
  return null;
}
```

- [ ] **Step 3.4: Verify green**

Run: `bun run test src/lib/hhql/hhql.test.ts`
Expected: all parser tests pass.

- [ ] **Step 3.5: Lint + check, commit**

```bash
bun run lint && bun run check
git add src/lib/hhql/parser.ts src/lib/hhql/hhql.test.ts
git commit -m "$(printf 'feat(hhql): parser with lenient recovery\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 4: Field registry interface + `/users` registry

**Files:**
- Create: `src/lib/hhql/fields.ts`
- Create: `src/lib/hhql/fields-users.ts`

- [ ] **Step 4.1: Define the registry shape**

```ts
// src/lib/hhql/fields.ts
export type FieldType = 'string' | 'string[]' | 'number' | 'date' | 'bool' | 'enum' | 'enum[]';

export interface FieldSpec<Row> {
  name: string;                         // canonical, lowercase
  aliases?: string[];                   // resolved by registry
  type: FieldType;
  enumValues?: readonly string[];       // for type 'enum' / 'enum[]'
  // Read the raw value from a row. Strings are compared case-insensitively.
  // Dates must be returned as a number (ms since epoch) or null.
  // Bools are returned as boolean. Arrays as the underlying array.
  read: (row: Row) => string | string[] | number | boolean | null | undefined;
}

export interface FieldRegistry<Row> {
  fields: ReadonlyArray<FieldSpec<Row>>;
  // Resolve a user-typed name (case-insensitive, may be alias) to its canonical FieldSpec, or undefined.
  resolve: (name: string) => FieldSpec<Row> | undefined;
}

export function buildRegistry<Row>(fields: ReadonlyArray<FieldSpec<Row>>): FieldRegistry<Row> {
  const map = new Map<string, FieldSpec<Row>>();
  for (const f of fields) {
    map.set(f.name.toLowerCase(), f);
    for (const alias of f.aliases ?? []) map.set(alias.toLowerCase(), f);
  }
  return { fields, resolve: (n) => map.get(n.toLowerCase()) };
}
```

- [ ] **Step 4.2: Define the `/users` registry**

```ts
// src/lib/hhql/fields-users.ts
import { type FieldRegistry, buildRegistry } from './fields';
import type { ListingType } from '$lib/db/schema';

export interface DirectoryRow {
  username: string;
  alias: string | null;
  bio: string | null;
  listingsByType: Record<ListingType, number>;
  totalDownloads: number;
  lastActive: number | null;          // ms since epoch
  joinedAt: number;                   // ms since epoch
  hasBio: boolean;
  hasAlias: boolean;
  hasAvatar: boolean;
  hasLinks: boolean;
  hasAffiliations: boolean;
  affiliations: { name: string; role: string | null }[];
  akas: string[];
  isPlaceholder: boolean;
  isAdmin: boolean;
}

export const fieldsUsers: FieldRegistry<DirectoryRow> = buildRegistry<DirectoryRow>([
  { name: 'username', aliases: ['handle'], type: 'string', read: (r) => r.username },
  { name: 'alias', aliases: ['name'], type: 'string', read: (r) => r.alias },
  { name: 'bio', type: 'string', read: (r) => r.bio },
  {
    name: 'creates', aliases: ['makes'], type: 'enum[]',
    enumValues: ['romhack', 'sprite', 'sound', 'script'],
    read: (r) => Object.entries(r.listingsByType).filter(([, n]) => n > 0).map(([t]) => t),
  },
  { name: 'listings', aliases: ['count'], type: 'number', read: (r) => Object.values(r.listingsByType).reduce((a, b) => a + b, 0) },
  { name: 'romhacks', type: 'number', read: (r) => r.listingsByType.romhack },
  { name: 'sprites', type: 'number', read: (r) => r.listingsByType.sprite },
  { name: 'sounds', type: 'number', read: (r) => r.listingsByType.sound },
  { name: 'scripts', type: 'number', read: (r) => r.listingsByType.script },
  { name: 'downloads', aliases: ['dls'], type: 'number', read: (r) => r.totalDownloads },
  { name: 'active', aliases: ['lastactive'], type: 'date', read: (r) => r.lastActive },
  { name: 'joined', aliases: ['created'], type: 'date', read: (r) => r.joinedAt },
  { name: 'hasbio', type: 'bool', read: (r) => r.hasBio },
  { name: 'hasalias', type: 'bool', read: (r) => r.hasAlias },
  { name: 'hasavatar', type: 'bool', read: (r) => r.hasAvatar },
  { name: 'haslinks', type: 'bool', read: (r) => r.hasLinks },
  { name: 'hasaffiliations', type: 'bool', read: (r) => r.hasAffiliations },
  { name: 'affiliation', aliases: ['team', 'group'], type: 'string[]', read: (r) => r.affiliations.map((a) => a.name) },
  { name: 'role', type: 'string[]', read: (r) => r.affiliations.map((a) => a.role).filter((x): x is string => x !== null) },
  { name: 'aka', type: 'string[]', read: (r) => r.akas },
  { name: 'placeholder', aliases: ['unclaimed'], type: 'bool', read: (r) => r.isPlaceholder },
  { name: 'admin', type: 'bool', read: (r) => r.isAdmin },
]);
```

- [ ] **Step 4.3: Lint + check, commit**

```bash
bun run lint && bun run check
git add src/lib/hhql/fields.ts src/lib/hhql/fields-users.ts
git commit -m "$(printf 'feat(hhql): field registry interface + /users registry\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 5: Evaluator

**Files:**
- Create: `src/lib/hhql/evaluator.ts`
- Modify: `src/lib/hhql/hhql.test.ts`

- [ ] **Step 5.1: Append failing evaluator tests**

```ts
// append to src/lib/hhql/hhql.test.ts
import type { DirectoryRow } from './fields-users';
import { fieldsUsers } from './fields-users';
import { evaluate } from './evaluator';
import { parse as parseHhql } from './parser';

function row(overrides: Partial<DirectoryRow> = {}): DirectoryRow {
  return {
    username: 'someone', alias: null, bio: null,
    listingsByType: { romhack: 0, sprite: 0, sound: 0, script: 0 },
    totalDownloads: 0, lastActive: null, joinedAt: Date.now(),
    hasBio: false, hasAlias: false, hasAvatar: false, hasLinks: false, hasAffiliations: false,
    affiliations: [], akas: [], isPlaceholder: false, isAdmin: false,
    ...overrides,
  };
}

function predicate(query: string) {
  const r = parseHhql(query);
  if (!r.ok || !r.ast) throw new Error('parse failed: ' + JSON.stringify(r));
  return (row: DirectoryRow) => evaluate(r.ast!, row, fieldsUsers);
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
```

- [ ] **Step 5.2: Verify failure**

Run: `bun run test src/lib/hhql/hhql.test.ts`
Expected: failure — `./evaluator` not found.

- [ ] **Step 5.3: Implement the evaluator**

```ts
// src/lib/hhql/evaluator.ts
import type { CompareOp, Expr, Literal } from './ast';
import type { FieldRegistry, FieldSpec } from './fields';

export function evaluate<Row>(ast: Expr, row: Row, registry: FieldRegistry<Row>): boolean {
  switch (ast.kind) {
    case 'and': return evaluate(ast.left, row, registry) && evaluate(ast.right, row, registry);
    case 'or':  return evaluate(ast.left, row, registry) || evaluate(ast.right, row, registry);
    case 'not': return !evaluate(ast.inner, row, registry);
    case 'group': return evaluate(ast.inner, row, registry);
    case 'bare': {
      const spec = registry.resolve(ast.field);
      if (!spec || spec.type !== 'bool') return false;
      const v = spec.read(row);
      return ast.negated ? !v : Boolean(v);
    }
    case 'empty': {
      const spec = registry.resolve(ast.field);
      if (!spec) return false;
      const v = spec.read(row);
      const isEmpty = v == null || (typeof v === 'string' && v === '') || (Array.isArray(v) && v.length === 0);
      return ast.negated ? !isEmpty : isEmpty;
    }
    case 'in': {
      const spec = registry.resolve(ast.field);
      if (!spec) return false;
      const haystack = spec.read(row);
      const wanted = ast.values.map(literalToString).map((s) => s.toLowerCase());
      const hit = arrayContainsAny(haystack, wanted);
      return ast.negated ? !hit : hit;
    }
    case 'compare': {
      const spec = registry.resolve(ast.field);
      if (!spec) return false;
      return compareField(spec, row, ast.op, ast.value);
    }
  }
}

function literalToString(lit: Literal): string {
  if (lit.kind === 'bool') return String(lit.value);
  if (lit.kind === 'number') return String(lit.value);
  return lit.value;
}

function arrayContainsAny(haystack: unknown, wanted: string[]): boolean {
  if (haystack == null) return false;
  if (Array.isArray(haystack)) {
    const lower = haystack.map((x) => String(x).toLowerCase());
    return lower.some((v) => wanted.includes(v));
  }
  return wanted.includes(String(haystack).toLowerCase());
}

function compareField<Row>(spec: FieldSpec<Row>, row: Row, op: CompareOp, lit: Literal): boolean {
  const raw = spec.read(row);
  if (spec.type === 'number') {
    if (typeof raw !== 'number' || lit.kind !== 'number') return false;
    return cmpNumber(raw, op, lit.value);
  }
  if (spec.type === 'date') {
    if (typeof raw !== 'number') return false;
    const target = literalToTimestamp(lit);
    if (target == null) return false;
    return cmpNumber(raw, op, target);
  }
  if (spec.type === 'bool') {
    const expected = lit.kind === 'bool' ? lit.value : String(literalToString(lit)).toLowerCase() === 'true';
    if (op === '=') return Boolean(raw) === expected;
    if (op === '!=') return Boolean(raw) !== expected;
    return false;
  }
  if (spec.type === 'string') {
    if (raw == null) return op === '!=' || op === '!~';
    const a = String(raw).toLowerCase();
    const b = literalToString(lit).toLowerCase();
    return cmpString(a, op, b);
  }
  if (spec.type === 'string[]' || spec.type === 'enum[]' || spec.type === 'enum') {
    const arr = Array.isArray(raw) ? raw.map((x) => String(x).toLowerCase()) : raw == null ? [] : [String(raw).toLowerCase()];
    const b = literalToString(lit).toLowerCase();
    if (op === '~') return arr.some((s) => s.includes(b));
    if (op === '!~') return !arr.some((s) => s.includes(b));
    if (op === '=') return arr.includes(b);
    if (op === '!=') return !arr.includes(b);
    return false;
  }
  return false;
}

function cmpNumber(a: number, op: CompareOp, b: number): boolean {
  switch (op) {
    case '=':  return a === b;
    case '!=': return a !== b;
    case '>':  return a > b;
    case '<':  return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
    default:   return false;
  }
}

function cmpString(a: string, op: CompareOp, b: string): boolean {
  switch (op) {
    case '=':  return a === b;
    case '!=': return a !== b;
    case '~':  return a.includes(b);
    case '!~': return !a.includes(b);
    default:   return false;
  }
}

function literalToTimestamp(lit: Literal): number | null {
  if (lit.kind === 'date') return Date.parse(lit.value);
  if (lit.kind === 'reldate') {
    const m = /^-(\d+)([dwmy])$/.exec(lit.value);
    if (!m) return null;
    const n = Number(m[1]);
    const unit = m[2];
    const ms = unit === 'd' ? 86_400_000 : unit === 'w' ? 7 * 86_400_000 : unit === 'm' ? 30 * 86_400_000 : 365 * 86_400_000;
    return Date.now() - n * ms;
  }
  if (lit.kind === 'number') return lit.value;
  return null;
}
```

- [ ] **Step 5.4: Verify green**

Run: `bun run test src/lib/hhql/hhql.test.ts`
Expected: all 9 evaluator tests pass.

- [ ] **Step 5.5: Lint + check, commit**

```bash
bun run lint && bun run check
git add src/lib/hhql/evaluator.ts src/lib/hhql/hhql.test.ts
git commit -m "$(printf 'feat(hhql): evaluator over field registry\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 6: Canonical emit + public surface

**Files:**
- Create: `src/lib/hhql/emit.ts`
- Create: `src/lib/hhql/index.ts`
- Modify: `src/lib/hhql/hhql.test.ts`

- [ ] **Step 6.1: Append failing emit tests**

```ts
// append to src/lib/hhql/hhql.test.ts
import { emit } from './emit';

describe('emit', () => {
  it('round-trips a simple compare', () => {
    const r = parseHhql('downloads > 100');
    if (!r.ok || !r.ast) throw new Error('parse failed');
    expect(emit(r.ast)).toBe('downloads > 100');
  });

  it('emits IN with quoted multi-word values', () => {
    const r = parseHhql('affiliation IN ("team aqua", magma)');
    if (!r.ok || !r.ast) throw new Error('parse failed');
    expect(emit(r.ast)).toBe('affiliation IN ("team aqua", magma)');
  });

  it('omits implicit AND when no OR is present', () => {
    const r = parseHhql('hasBio AND active > -7d AND NOT placeholder');
    if (!r.ok || !r.ast) throw new Error('parse failed');
    expect(emit(r.ast)).toBe('hasBio active > -7d NOT placeholder');
  });

  it('keeps explicit AND when an OR forces precedence', () => {
    const r = parseHhql('a = 1 AND (b = 2 OR c = 3)');
    if (!r.ok || !r.ast) throw new Error('parse failed');
    expect(emit(r.ast)).toBe('a = 1 AND (b = 2 OR c = 3)');
  });
});
```

- [ ] **Step 6.2: Verify failure**

Run: `bun run test src/lib/hhql/hhql.test.ts`
Expected: failure — `./emit` not found.

- [ ] **Step 6.3: Implement emit**

```ts
// src/lib/hhql/emit.ts
import type { Expr, Literal } from './ast';

export function emit(ast: Expr): string {
  return emitExpr(ast, /* needsExplicitAnd */ containsOr(ast));
}

function containsOr(e: Expr): boolean {
  switch (e.kind) {
    case 'or': return true;
    case 'and': return containsOr(e.left) || containsOr(e.right);
    case 'not': return containsOr(e.inner);
    case 'group': return containsOr(e.inner);
    default: return false;
  }
}

function emitExpr(e: Expr, explicitAnd: boolean): string {
  switch (e.kind) {
    case 'and': return `${emitExpr(e.left, explicitAnd)}${explicitAnd ? ' AND ' : ' '}${emitExpr(e.right, explicitAnd)}`;
    case 'or':  return `${emitExpr(e.left, explicitAnd)} OR ${emitExpr(e.right, explicitAnd)}`;
    case 'not': return `NOT ${emitExpr(e.inner, explicitAnd)}`;
    case 'group': return `(${emitExpr(e.inner, explicitAnd)})`;
    case 'bare': return e.negated ? `NOT ${e.field}` : e.field;
    case 'empty': return `${e.field} IS ${e.negated ? 'NOT ' : ''}EMPTY`;
    case 'in': return `${e.field} ${e.negated ? 'NOT IN' : 'IN'} (${e.values.map(emitLiteral).join(', ')})`;
    case 'compare': return `${e.field} ${e.op} ${emitLiteral(e.value)}`;
  }
}

function emitLiteral(l: Literal): string {
  if (l.kind === 'string') return needsQuote(l.value) ? `"${l.value}"` : l.value;
  if (l.kind === 'bool') return l.value ? 'true' : 'false';
  return String(l.value);
}

function needsQuote(s: string): boolean {
  return /[\s,()"]/.test(s) || s.length === 0;
}
```

- [ ] **Step 6.4: Implement index/public surface**

```ts
// src/lib/hhql/index.ts
export { parse as parseHhql } from './parser';
export { evaluate } from './evaluator';
export { emit } from './emit';
export { buildRegistry } from './fields';
export type { FieldRegistry, FieldSpec, FieldType } from './fields';
export type { Expr, Literal, ParseError, ParseResult, Span } from './ast';
```

- [ ] **Step 6.5: Verify green, lint, commit**

```bash
bun run test src/lib/hhql/hhql.test.ts
bun run lint && bun run check
git add src/lib/hhql/emit.ts src/lib/hhql/index.ts src/lib/hhql/hhql.test.ts
git commit -m "$(printf 'feat(hhql): canonical emit + public surface\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 7: Server enrichment

**Files:**
- Create: `src/lib/server/users-directory.ts`
- Create: `src/lib/server/users-directory.test.ts`

- [ ] **Step 7.1: Write the failing test**

```ts
// src/lib/server/users-directory.test.ts
import { migrate } from 'drizzle-orm/libsql/migrator';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { beforeAll, describe, expect, it } from 'vitest';
import * as schema from '$lib/db/schema';
import { enrichDirectoryUsers } from './users-directory';

const client = createClient({ url: ':memory:' });
const db = drizzle(client, { schema });

beforeAll(async () => {
  await migrate(db, { migrationsFolder: './drizzle' });
  await db.insert(schema.user).values([
    { id: 'u1', name: 'Alex', email: 'a@x', emailVerified: true },
    { id: 'u2', name: 'Bea', email: 'b@x', emailVerified: true, isAdmin: true },
  ]);
  await db.insert(schema.profile).values([
    { userId: 'u1', username: 'alex', alias: 'Alex', bio: 'spriter', avatarKey: 'avatars/u1.png' },
    { userId: 'u2', username: 'bea', alias: null, bio: null },
  ]);
  await db.insert(schema.affiliation).values([{ id: 'aff1', name: 'Team Aqua' }]);
  await db.insert(schema.profileAffiliation).values([{ userId: 'u1', affiliationId: 'aff1', role: 'lead spriter' }]);
  await db.insert(schema.aliasEntry).values([{ id: 'ak1', userId: 'u1', value: 'skeetendo' }]);
  await db.insert(schema.profileLink).values([{ id: 'pl1', userId: 'u1', url: 'https://example.com', sortOrder: 0 }]);
  await db.insert(schema.listing).values([
    { id: 'l1', type: 'sprite', slug: 's1', authorId: 'u1', title: 'A', downloads: 100, status: 'published' },
    { id: 'l2', type: 'sprite', slug: 's2', authorId: 'u1', title: 'B', downloads: 50, status: 'published' },
    { id: 'l3', type: 'romhack', slug: 'r1', authorId: 'u1', title: 'C', downloads: 5, status: 'published' },
  ]);
});

describe('enrichDirectoryUsers', () => {
  it('returns one row per profile with derived counts and flags', async () => {
    const rows = await enrichDirectoryUsers(db);
    const alex = rows.find((r) => r.username === 'alex')!;
    const bea = rows.find((r) => r.username === 'bea')!;

    expect(alex.listingsByType).toEqual({ romhack: 1, sprite: 2, sound: 0, script: 0 });
    expect(alex.totalDownloads).toBe(155);
    expect(alex.hasBio).toBe(true);
    expect(alex.hasAlias).toBe(true);
    expect(alex.hasAvatar).toBe(true);
    expect(alex.hasLinks).toBe(true);
    expect(alex.hasAffiliations).toBe(true);
    expect(alex.affiliations).toEqual([{ name: 'Team Aqua', role: 'lead spriter' }]);
    expect(alex.akas).toEqual(['skeetendo']);
    expect(alex.isAdmin).toBe(false);

    expect(bea.listingsByType).toEqual({ romhack: 0, sprite: 0, sound: 0, script: 0 });
    expect(bea.totalDownloads).toBe(0);
    expect(bea.hasBio).toBe(false);
    expect(bea.hasAlias).toBe(false);
    expect(bea.hasLinks).toBe(false);
    expect(bea.hasAffiliations).toBe(false);
    expect(bea.isAdmin).toBe(true);
  });
});
```

- [ ] **Step 7.2: Verify it fails**

Run: `bun run test src/lib/server/users-directory.test.ts`
Expected: failure — module not found.

- [ ] **Step 7.3: Implement `enrichDirectoryUsers`**

```ts
// src/lib/server/users-directory.ts
import { desc, eq, sql } from 'drizzle-orm';
import * as schema from '$lib/db/schema';
import type { ListingType } from '$lib/db/schema';
import type { DB } from '$lib/db';
import type { DirectoryRow } from '$lib/hhql/fields-users';

const ZERO_COUNTS: Record<ListingType, number> = { romhack: 0, sprite: 0, sound: 0, script: 0 };

export async function enrichDirectoryUsers(db: DB): Promise<DirectoryRow[]> {
  const lastActive = sql<number | null>`max(${schema.session.updatedAt})`;

  const baseRows = await db
    .select({
      userId: schema.profile.userId,
      username: schema.profile.username,
      alias: schema.profile.alias,
      bio: schema.profile.bio,
      avatarKey: schema.profile.avatarKey,
      hideActivity: schema.profile.hideActivity,
      isPlaceholder: schema.user.isPlaceholder,
      isAdmin: schema.user.isAdmin,
      joinedAt: schema.user.createdAt,
      lastActive,
    })
    .from(schema.profile)
    .innerJoin(schema.user, eq(schema.user.id, schema.profile.userId))
    .leftJoin(schema.session, eq(schema.session.userId, schema.profile.userId))
    .where(sql`length(${schema.profile.username}) > 0`)
    .groupBy(schema.profile.userId)
    .orderBy(desc(lastActive));

  const counts = await db
    .select({
      authorId: schema.listing.authorId,
      type: schema.listing.type,
      n: sql<number>`count(*)`,
      dls: sql<number>`coalesce(sum(${schema.listing.downloads}), 0)`,
    })
    .from(schema.listing)
    .where(eq(schema.listing.status, 'published'))
    .groupBy(schema.listing.authorId, schema.listing.type);

  const affJoins = await db
    .select({ userId: schema.profileAffiliation.userId, name: schema.affiliation.name, role: schema.profileAffiliation.role })
    .from(schema.profileAffiliation)
    .innerJoin(schema.affiliation, eq(schema.affiliation.id, schema.profileAffiliation.affiliationId));

  const akas = await db.select({ userId: schema.aliasEntry.userId, value: schema.aliasEntry.value }).from(schema.aliasEntry);
  const links = await db.select({ userId: schema.profileLink.userId }).from(schema.profileLink).groupBy(schema.profileLink.userId);
  const linkSet = new Set(links.map((l) => l.userId));

  const countsByUser = new Map<string, { listingsByType: Record<ListingType, number>; totalDownloads: number }>();
  for (const c of counts) {
    const cur = countsByUser.get(c.authorId) ?? { listingsByType: { ...ZERO_COUNTS }, totalDownloads: 0 };
    cur.listingsByType[c.type as ListingType] = Number(c.n);
    cur.totalDownloads += Number(c.dls);
    countsByUser.set(c.authorId, cur);
  }

  const affsByUser = new Map<string, { name: string; role: string | null }[]>();
  for (const a of affJoins) {
    const list = affsByUser.get(a.userId) ?? [];
    list.push({ name: a.name, role: a.role });
    affsByUser.set(a.userId, list);
  }

  const akasByUser = new Map<string, string[]>();
  for (const a of akas) {
    const list = akasByUser.get(a.userId) ?? [];
    list.push(a.value);
    akasByUser.set(a.userId, list);
  }

  return baseRows.map((r): DirectoryRow => {
    const c = countsByUser.get(r.userId) ?? { listingsByType: { ...ZERO_COUNTS }, totalDownloads: 0 };
    const affs = affsByUser.get(r.userId) ?? [];
    const ak = akasByUser.get(r.userId) ?? [];
    const lastActiveMs =
      r.hideActivity || r.lastActive == null ? null : Number(r.lastActive) * 1000;
    return {
      username: r.username,
      alias: r.alias,
      bio: r.bio,
      listingsByType: c.listingsByType,
      totalDownloads: c.totalDownloads,
      lastActive: lastActiveMs,
      joinedAt: r.joinedAt.getTime(),
      hasBio: !!(r.bio && r.bio.length > 0),
      hasAlias: !!(r.alias && r.alias.length > 0),
      hasAvatar: !!(r.avatarKey && r.avatarKey.length > 0),
      hasLinks: linkSet.has(r.userId),
      hasAffiliations: affs.length > 0,
      affiliations: affs,
      akas: ak,
      isPlaceholder: r.isPlaceholder,
      isAdmin: r.isAdmin,
    };
  });
}
```

- [ ] **Step 7.4: Verify green, lint, commit**

```bash
bun run test src/lib/server/users-directory.test.ts
bun run lint && bun run check
git add src/lib/server/users-directory.ts src/lib/server/users-directory.test.ts
git commit -m "$(printf 'feat(users): enrichDirectoryUsers with derived counts and flags\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 8: Extract `UserCard.svelte`

Pure refactor — visually identical, no behavior change.

**Files:**
- Create: `src/lib/components/users/UserCard.svelte`
- Modify: `src/routes/users/+page.svelte`

- [ ] **Step 8.1: Create the component**

Copy the body of the existing `{#snippet card(u: Row)}` from `src/routes/users/+page.svelte` (currently lines 30–66) into a new component. Use the exact same markup; only replace the snippet binding with a `let { user } = $props()` pattern.

```svelte
<!-- src/lib/components/users/UserCard.svelte -->
<script lang="ts">
  import Avatar from '$lib/components/profile/Avatar.svelte';

  interface Props {
    user: {
      username: string;
      alias?: string | null;
      name?: string | null;
      avatarKey?: string | null;
      pronouns?: string | null;
      bio?: string | null;
      lastActive: number | null;
      joinedAt: number;
      isPlaceholder: boolean;
    };
  }
  let { user }: Props = $props();

  function relative(ms: number): string {
    const diff = Date.now() - ms;
    const s = Math.max(1, Math.round(diff / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d}d ago`;
    const mo = Math.round(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.round(mo / 12)}y ago`;
  }
  function joinedLabel(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  }
</script>

<li>
  <a
    href={`/u/${user.username}`}
    class="group flex items-start gap-3 rounded-lg border bg-card/40 p-4 transition-colors hover:border-primary/50 hover:bg-card"
  >
    <Avatar avatarKey={user.avatarKey ?? null} name={user.name || user.username} size={48} />
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2 flex-wrap">
        {#if user.alias}
          <span class="font-display text-sm group-hover:text-primary">{user.alias}</span>
          <span class="text-xs text-muted-foreground">@{user.username}</span>
        {:else}
          <span class="font-display text-sm group-hover:text-primary">@{user.username}</span>
        {/if}
        {#if user.pronouns}
          <span class="text-xs text-muted-foreground">{user.pronouns}</span>
        {/if}
      </div>
      {#if user.bio}
        <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{user.bio}</p>
      {/if}
      <div class="mt-2 flex items-center gap-3 text-[0.7rem] text-muted-foreground">
        {#if user.isPlaceholder}
          <span class="italic opacity-70">Awaiting creator</span>
        {:else if user.lastActive}
          <span title={new Date(user.lastActive).toLocaleString()}>Active {relative(user.lastActive)}</span>
        {:else}
          <span class="italic opacity-70">Activity hidden</span>
        {/if}
        <span aria-hidden="true">·</span>
        <span>Joined {joinedLabel(user.joinedAt)}</span>
      </div>
    </div>
  </a>
</li>
```

- [ ] **Step 8.2: Use it in `+page.svelte`**

Delete the local `{#snippet card}` block; replace its two render-sites with `<UserCard user={u} />`. Add the import. The page should render identically.

- [ ] **Step 8.3: Verify build still loads, lint, commit**

```bash
bun run check && bun run lint
git add src/lib/components/users/UserCard.svelte src/routes/users/+page.svelte
git commit -m "$(printf 'refactor(users): extract UserCard component\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 9: Filter state (Chip ⇄ AST)

**Files:**
- Create: `src/lib/components/users/filter-state.ts`
- Create: `src/lib/components/users/filter-state.test.ts`

- [ ] **Step 9.1: Write failing tests**

```ts
// src/lib/components/users/filter-state.test.ts
import { describe, expect, it } from 'vitest';
import { applyChip, type ChipState, chipStateFromQuery, queryFromChipState } from './filter-state';

const empty: ChipState = {
  types: [],
  active: 'any',
  joined: 'any',
  downloads: 'any',
  listings: 'any',
  has: [],
  affiliations: [],
  hidePlaceholder: true,
  adminOnly: false,
};

describe('queryFromChipState', () => {
  it('emits canonical clauses in stable order', () => {
    const s: ChipState = { ...empty, types: ['sprite', 'sound'], has: ['hasBio'] };
    expect(queryFromChipState(s)).toBe('creates IN (sprite, sound) hasBio NOT placeholder');
  });

  it('drops placeholder clause when hidePlaceholder = false (showing all)', () => {
    const s: ChipState = { ...empty, hidePlaceholder: false };
    expect(queryFromChipState(s)).toBe('');
  });

  it('produces nothing for fully empty state', () => {
    expect(queryFromChipState({ ...empty, hidePlaceholder: false })).toBe('');
  });

  it('emits date presets correctly', () => {
    expect(queryFromChipState({ ...empty, hidePlaceholder: false, active: 'last7' })).toBe('active > -7d');
    expect(queryFromChipState({ ...empty, hidePlaceholder: false, active: 'never' })).toBe('active IS EMPTY');
  });
});

describe('chipStateFromQuery', () => {
  it('round-trips canonical chip output', () => {
    const s: ChipState = { ...empty, types: ['sprite'], active: 'last30', has: ['hasBio'] };
    const q = queryFromChipState(s);
    expect(chipStateFromQuery(q)).toEqual(s);
  });

  it('survives an unrecognized custom clause without losing it', () => {
    const q = 'creates IN (sprite) username ~ jor NOT placeholder';
    const s = chipStateFromQuery(q);
    // chip state captures what it can
    expect(s.types).toEqual(['sprite']);
    expect(s.hidePlaceholder).toBe(true);
    // custom clause survives a re-emit when applied via applyChip
    const next = applyChip(q, 'types', ['sprite', 'sound']);
    expect(next).toContain('username ~ jor');
    expect(next).toContain('creates IN (sprite, sound)');
  });
});
```

- [ ] **Step 9.2: Verify failure**

Run: `bun run test src/lib/components/users/filter-state.test.ts`
Expected: failure — module not found.

- [ ] **Step 9.3: Implement**

```ts
// src/lib/components/users/filter-state.ts
import type { Expr, Literal } from '$lib/hhql';
import { emit, parseHhql } from '$lib/hhql';

export type ActivePreset = 'any' | 'last7' | 'last30' | 'thisYear' | 'ever' | 'never';
export type JoinedPreset = 'any' | 'last30d' | 'lastYear' | 'thisYear';
export type NumPreset = 'any' | 'gte1' | 'gte5' | 'gte20' | 'gte100' | 'gte1000';

export interface ChipState {
  types: string[];                     // creates IN (...)
  active: ActivePreset;
  joined: JoinedPreset;
  downloads: NumPreset;
  listings: NumPreset;
  has: string[];                       // bare booleans: hasBio, hasLinks, ...
  affiliations: string[];              // affiliation IN (...)
  hidePlaceholder: boolean;            // when true, emits "NOT placeholder"
  adminOnly: boolean;                  // when true, emits "admin"
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
  for (const h of HAS_FIELDS) if (s.has.includes(h)) parts.push(h);
  if (s.affiliations.length > 0) parts.push(`affiliation IN (${s.affiliations.map(quoteIfNeeded).join(', ')})`);
  if (s.hidePlaceholder) parts.push('NOT placeholder');
  if (s.adminOnly) parts.push('admin');
  return parts.join(' ');
}

export function chipStateFromQuery(q: string): ChipState {
  const r = parseHhql(q);
  const ast = r.ast;
  const s: ChipState = {
    types: [], active: 'any', joined: 'any', downloads: 'any', listings: 'any',
    has: [], affiliations: [], hidePlaceholder: false, adminOnly: false,
  };
  if (!ast) return s;
  walk(ast, (e) => {
    if (e.kind === 'in' && e.field === 'creates' && !e.negated) s.types = e.values.map(litStr);
    else if (e.kind === 'in' && e.field === 'affiliation' && !e.negated) s.affiliations = e.values.map(litStr);
    else if (e.kind === 'compare' && e.field === 'active' && e.op === '>') s.active = matchActive(e.value) ?? 'any';
    else if (e.kind === 'empty' && e.field === 'active') s.active = e.negated ? 'ever' : 'never';
    else if (e.kind === 'compare' && e.field === 'joined' && e.op === '>') s.joined = matchJoined(e.value) ?? 'any';
    else if (e.kind === 'compare' && e.field === 'downloads' && e.op === '>=' && e.value.kind === 'number') s.downloads = numFromN(e.value.value);
    else if (e.kind === 'compare' && e.field === 'listings' && e.op === '>=' && e.value.kind === 'number') s.listings = numFromN(e.value.value);
    else if (e.kind === 'bare' && (HAS_FIELDS as readonly string[]).includes(e.field) && !e.negated) {
      if (!s.has.includes(e.field)) s.has.push(e.field);
    }
    else if (e.kind === 'not' && e.inner.kind === 'bare' && e.inner.field === 'placeholder') s.hidePlaceholder = true;
    else if (e.kind === 'bare' && e.field === 'admin' && !e.negated) s.adminOnly = true;
  });
  return s;
}

// Apply a chip change while preserving any custom (unmapped) clauses in q.
export function applyChip<K extends keyof ChipState>(currentQuery: string, key: K, value: ChipState[K]): string {
  const state = chipStateFromQuery(currentQuery);
  const nextState = { ...state, [key]: value };
  const customClauses = extractCustomClauses(currentQuery);
  const base = queryFromChipState(nextState);
  return [base, ...customClauses].filter(Boolean).join(' ');
}

function walk(e: Expr, visit: (e: Expr) => void): void {
  visit(e);
  if (e.kind === 'and' || e.kind === 'or') { walk(e.left, visit); walk(e.right, visit); }
  else if (e.kind === 'not') { walk(e.inner, visit); }
  else if (e.kind === 'group') { walk(e.inner, visit); }
}

function isMappedClause(e: Expr): boolean {
  if (e.kind === 'in' && (e.field === 'creates' || e.field === 'affiliation')) return true;
  if (e.kind === 'compare' && (e.field === 'active' || e.field === 'joined' || e.field === 'downloads' || e.field === 'listings')) return true;
  if (e.kind === 'empty' && e.field === 'active') return true;
  if (e.kind === 'bare' && ((HAS_FIELDS as readonly string[]).includes(e.field) || e.field === 'admin' || e.field === 'placeholder')) return true;
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
    case 'last7':    return 'active > -7d';
    case 'last30':   return 'active > -30d';
    case 'thisYear': return `active > ${THIS_YEAR_START}`;
    case 'ever':     return 'active IS NOT EMPTY';
    case 'never':    return 'active IS EMPTY';
    default:         return '';
  }
}

function joinedClause(p: JoinedPreset): string {
  switch (p) {
    case 'last30d':  return 'joined > -30d';
    case 'lastYear': return 'joined > -1y';
    case 'thisYear': return `joined > ${THIS_YEAR_START}`;
    default:         return '';
  }
}

function numOpForPreset(p: NumPreset): string {
  switch (p) {
    case 'gte1':    return '>= 1';
    case 'gte5':    return '>= 5';
    case 'gte20':   return '>= 20';
    case 'gte100':  return '>= 100';
    case 'gte1000': return '>= 1000';
    default:        return '>= 1';
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

function litStr(l: Literal): string { return l.kind === 'string' ? l.value : String(l.kind === 'bool' ? l.value : (l as { value: unknown }).value); }
function quoteIfNeeded(s: string): string { return /[\s,()"]/.test(s) ? `"${s}"` : s; }
```

- [ ] **Step 9.4: Verify green, lint, commit**

```bash
bun run test src/lib/components/users/filter-state.test.ts
bun run lint && bun run check
git add src/lib/components/users/filter-state.ts src/lib/components/users/filter-state.test.ts
git commit -m "$(printf 'feat(users): chip-state \\u21c4 HHQL helpers\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 10: `HhqlInput.svelte` — `</>` editor with highlight overlay

**Files:**
- Create: `src/lib/components/users/HhqlInput.svelte`

A `<textarea>` with a positioned `<pre>` overlay rendering highlighted spans. We don't need autocomplete in v1 (deferred). Error tooltip is rendered inline below the textarea when invalid.

- [ ] **Step 10.1: Implement**

```svelte
<!-- src/lib/components/users/HhqlInput.svelte -->
<script lang="ts">
  import { parseHhql } from '$lib/hhql';
  import { tokenize } from '$lib/hhql/tokens';

  interface Props { value: string; }
  let { value = $bindable() }: Props = $props();

  const tokens = $derived(tokenize(value));
  const parseRes = $derived(parseHhql(value));
  const error = $derived(parseRes.ok ? null : (parseRes.errors[0] ?? null));

  function classFor(kind: string): string {
    switch (kind) {
      case 'ident': return 'text-primary';
      case 'kw':    return 'text-muted-foreground font-bold';
      case 'op':    return 'text-muted-foreground';
      case 'string':
      case 'date':
      case 'reldate':
      case 'number': return 'text-amber-300';
      default: return '';
    }
  }
</script>

<div class="relative font-mono text-sm leading-6">
  <pre aria-hidden="true" class="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words p-2">
{#each tokens as t (t.start)}<span class={classFor(t.kind)}>{value.slice(t.start, t.end)}</span>{value.slice(t.end, tokens[tokens.indexOf(t) + 1]?.start ?? value.length)}{/each}{tokens.length === 0 ? value : ''}</pre>
  <textarea
    class="relative w-full bg-transparent caret-primary outline-none p-2 text-transparent resize-none"
    rows="2"
    spellcheck="false"
    autocapitalize="off"
    autocomplete="off"
    bind:value
  ></textarea>
</div>
{#if error}
  <p class="mt-1 text-xs text-destructive">{error.message}</p>
{/if}
```

- [ ] **Step 10.2: Lint + check, commit**

```bash
bun run lint && bun run check
git add src/lib/components/users/HhqlInput.svelte
git commit -m "$(printf 'feat(users): HhqlInput component with highlight overlay\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 11: `FilterBar.svelte` — chip dropdowns

**Files:**
- Create: `src/lib/components/users/FilterBar.svelte`

Chips use shadcn `Popover` + `Command` (already in `$lib/components/ui`). Each chip writes to the bound `query` via `applyChip`. Behavior is unit-tested via `applyChip`/`chipStateFromQuery` (Task 9); FilterBar itself is a visual binding layer verified manually in Task 12.

- [ ] **Step 11.1: Implement `FilterBar.svelte`**

```svelte
<!-- src/lib/components/users/FilterBar.svelte -->
<script lang="ts">
  import * as Popover from '$lib/components/ui/popover';
  import * as Command from '$lib/components/ui/command';
  import { Button } from '$lib/components/ui/button';
  import { type ActivePreset, type ChipState, type JoinedPreset, type NumPreset, applyChip, chipStateFromQuery, queryFromChipState } from './filter-state';

  interface Props {
    query: string;
    affiliations: string[];               // distinct names from current roster
  }
  let { query = $bindable(), affiliations }: Props = $props();
  const dispatch = $derived((next: string) => { query = next; });

  const state = $derived<ChipState>(chipStateFromQuery(query));

  function set<K extends keyof ChipState>(key: K, value: ChipState[K]): void {
    const next = applyChip(query, key, value);
    dispatch(next);
  }

  function toggleHas(name: string): void {
    const has = state.has.includes(name) ? state.has.filter((h) => h !== name) : [...state.has, name];
    set('has', has);
  }

  function toggleType(t: string): void {
    const types = state.types.includes(t) ? state.types.filter((x) => x !== t) : [...state.types, t];
    set('types', types);
  }

  function toggleActive(p: ActivePreset): void { set('active', state.active === p ? 'any' : p); }
  function toggleJoined(p: JoinedPreset): void { set('joined', state.joined === p ? 'any' : p); }
  function toggleDownloads(p: NumPreset): void { set('downloads', state.downloads === p ? 'any' : p); }
  function toggleListings(p: NumPreset): void { set('listings', state.listings === p ? 'any' : p); }
  function toggleAffiliation(a: string): void {
    const affs = state.affiliations.includes(a) ? state.affiliations.filter((x) => x !== a) : [...state.affiliations, a];
    set('affiliations', affs);
  }

  const ASSET_TYPES = ['romhack', 'sprite', 'sound', 'script'];
  const HAS_OPTIONS: { id: string; label: string }[] = [
    { id: 'hasBio', label: 'Has bio' },
    { id: 'hasAlias', label: 'Has alias' },
    { id: 'hasAvatar', label: 'Has avatar' },
    { id: 'hasLinks', label: 'Has links' },
    { id: 'hasAffiliations', label: 'Has affiliations' },
  ];
</script>

<div class="flex flex-wrap items-center gap-2">
  <!-- Type -->
  <Popover.Root>
    <Popover.Trigger>{#snippet child({ props })}
      <Button variant="outline" size="sm" {...props}>Type{state.types.length ? ` (${state.types.length})` : ''}</Button>
    {/snippet}</Popover.Trigger>
    <Popover.Content class="p-0 w-44">
      <Command.Root>
        <Command.List>
          {#each ASSET_TYPES as t (t)}
            <Command.Item role="option" onSelect={() => toggleType(t)}>
              <span class="flex-1 capitalize">{t}</span>
              {#if state.types.includes(t)}<span aria-hidden="true">✓</span>{/if}
            </Command.Item>
          {/each}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  <!-- Active -->
  <Popover.Root>
    <Popover.Trigger>{#snippet child({ props })}
      <Button variant="outline" size="sm" {...props}>Active{state.active !== 'any' ? `: ${state.active}` : ''}</Button>
    {/snippet}</Popover.Trigger>
    <Popover.Content class="p-0 w-44">
      <Command.Root>
        <Command.List>
          <Command.Item role="option" onSelect={() => toggleActive('last7')}>Last 7 days{#if state.active === 'last7'}<span aria-hidden="true">✓</span>{/if}</Command.Item>
          <Command.Item role="option" onSelect={() => toggleActive('last30')}>Last 30 days{#if state.active === 'last30'}<span aria-hidden="true">✓</span>{/if}</Command.Item>
          <Command.Item role="option" onSelect={() => toggleActive('thisYear')}>This year{#if state.active === 'thisYear'}<span aria-hidden="true">✓</span>{/if}</Command.Item>
          <Command.Item role="option" onSelect={() => toggleActive('ever')}>Ever active{#if state.active === 'ever'}<span aria-hidden="true">✓</span>{/if}</Command.Item>
          <Command.Item role="option" onSelect={() => toggleActive('never')}>Never{#if state.active === 'never'}<span aria-hidden="true">✓</span>{/if}</Command.Item>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  <!-- Joined -->
  <Popover.Root>
    <Popover.Trigger>{#snippet child({ props })}
      <Button variant="outline" size="sm" {...props}>Joined{state.joined !== 'any' ? `: ${state.joined}` : ''}</Button>
    {/snippet}</Popover.Trigger>
    <Popover.Content class="p-0 w-44">
      <Command.Root>
        <Command.List>
          <Command.Item role="option" onSelect={() => toggleJoined('last30d')}>Last 30 days</Command.Item>
          <Command.Item role="option" onSelect={() => toggleJoined('lastYear')}>Last year</Command.Item>
          <Command.Item role="option" onSelect={() => toggleJoined('thisYear')}>This year</Command.Item>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  <!-- Downloads -->
  <Popover.Root>
    <Popover.Trigger>{#snippet child({ props })}
      <Button variant="outline" size="sm" {...props}>Downloads{state.downloads !== 'any' ? `: ${state.downloads}` : ''}</Button>
    {/snippet}</Popover.Trigger>
    <Popover.Content class="p-0 w-44">
      <Command.Root>
        <Command.List>
          {#each (['gte1','gte100','gte1000'] as NumPreset[]) as p (p)}
            <Command.Item role="option" onSelect={() => toggleDownloads(p)}>
              {p === 'gte1' ? '≥ 1' : p === 'gte100' ? '≥ 100' : '≥ 1000'}
            </Command.Item>
          {/each}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  <!-- Listings -->
  <Popover.Root>
    <Popover.Trigger>{#snippet child({ props })}
      <Button variant="outline" size="sm" {...props}>Listings{state.listings !== 'any' ? `: ${state.listings}` : ''}</Button>
    {/snippet}</Popover.Trigger>
    <Popover.Content class="p-0 w-44">
      <Command.Root>
        <Command.List>
          {#each (['gte1','gte5','gte20'] as NumPreset[]) as p (p)}
            <Command.Item role="option" onSelect={() => toggleListings(p)}>
              {p === 'gte1' ? '≥ 1' : p === 'gte5' ? '≥ 5' : '≥ 20'}
            </Command.Item>
          {/each}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  <!-- Has -->
  <Popover.Root>
    <Popover.Trigger>{#snippet child({ props })}
      <Button variant="outline" size="sm" {...props}>Has…{state.has.length ? ` (${state.has.length})` : ''}</Button>
    {/snippet}</Popover.Trigger>
    <Popover.Content class="p-0 w-52">
      <Command.Root>
        <Command.List>
          {#each HAS_OPTIONS as h (h.id)}
            <Command.Item role="option" onSelect={() => toggleHas(h.id)}>
              <span class="flex-1">{h.label}</span>
              {#if state.has.includes(h.id)}<span aria-hidden="true">✓</span>{/if}
            </Command.Item>
          {/each}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  <!-- Affiliation -->
  {#if affiliations.length > 0}
    <Popover.Root>
      <Popover.Trigger>{#snippet child({ props })}
        <Button variant="outline" size="sm" {...props}>Affiliation{state.affiliations.length ? ` (${state.affiliations.length})` : ''}</Button>
      {/snippet}</Popover.Trigger>
      <Popover.Content class="p-0 w-56">
        <Command.Root>
          <Command.Input placeholder="Filter affiliations…" />
          <Command.List>
            {#each affiliations as a (a)}
              <Command.Item role="option" onSelect={() => toggleAffiliation(a)}>
                <span class="flex-1">{a}</span>
                {#if state.affiliations.includes(a)}<span aria-hidden="true">✓</span>{/if}
              </Command.Item>
            {/each}
          </Command.List>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
  {/if}

  <!-- Identity toggles -->
  <Button variant={state.hidePlaceholder ? 'default' : 'outline'} size="sm"
    onclick={() => set('hidePlaceholder', !state.hidePlaceholder)}>
    Hide unclaimed
  </Button>
  <Button variant={state.adminOnly ? 'default' : 'outline'} size="sm"
    onclick={() => set('adminOnly', !state.adminOnly)}>
    Admin
  </Button>
</div>
```

- [ ] **Step 11.2: Lint + check, commit**

```bash
bun run lint && bun run check
git add src/lib/components/users/FilterBar.svelte
git commit -m "$(printf 'feat(users): FilterBar with chip dropdowns\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 12: Wire `+page.server.ts` and `+page.svelte`

**Files:**
- Modify: `src/routes/users/+page.server.ts`
- Modify: `src/routes/users/+page.svelte`

- [ ] **Step 12.1: Update `+page.server.ts`**

```ts
// src/routes/users/+page.server.ts
import { db } from '$lib/db';
import { enrichDirectoryUsers } from '$lib/server/users-directory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const users = await enrichDirectoryUsers(db);
  return {
    users,
    q: url.searchParams.get('q') ?? '',
    sort: url.searchParams.get('sort') ?? 'active:desc',
  };
};
```

- [ ] **Step 12.2: Replace `+page.svelte`**

```svelte
<!-- src/routes/users/+page.svelte -->
<script lang="ts">
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { evaluate, parseHhql } from '$lib/hhql';
  import { fieldsUsers, type DirectoryRow } from '$lib/hhql/fields-users';
  import FilterBar from '$lib/components/users/FilterBar.svelte';
  import HhqlInput from '$lib/components/users/HhqlInput.svelte';
  import UserCard from '$lib/components/users/UserCard.svelte';

  let { data } = $props();

  let query = $state(data.q);
  let sort  = $state(data.sort);
  let editorOpen = $state(data.q.length > 0);

  const ast      = $derived(parseHhql(query));
  const filtered = $derived(ast.ok && ast.ast ? data.users.filter((u: DirectoryRow) => evaluate(ast.ast!, u, fieldsUsers)) : data.users);
  const sorted   = $derived(applySort(filtered, sort));
  const claimed  = $derived(sorted.filter((u) => !u.isPlaceholder));
  const unclaimed = $derived(sorted.filter((u) => u.isPlaceholder));

  const affiliations = $derived(
    Array.from(new Set(data.users.flatMap((u: DirectoryRow) => u.affiliations.map((a) => a.name)))).sort(),
  );

  // URL state sync (debounced)
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const q = query, s = sort;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const url = new URL(page.url);
      if (q.length > 0) url.searchParams.set('q', q); else url.searchParams.delete('q');
      if (s !== 'active:desc') url.searchParams.set('sort', s); else url.searchParams.delete('sort');
      replaceState(url, {});
    }, 150);
  });

  function applySort(rows: DirectoryRow[], sortKey: string): DirectoryRow[] {
    const [field, dir] = sortKey.split(':') as [string, 'asc' | 'desc'];
    const sign = dir === 'asc' ? 1 : -1;
    const cp = (a: number | null, b: number | null) => (a ?? -Infinity) === (b ?? -Infinity) ? 0 : ((a ?? -Infinity) > (b ?? -Infinity) ? sign : -sign);
    const arr = [...rows];
    arr.sort((a, b) => {
      switch (field) {
        case 'joined':    return cp(a.joinedAt, b.joinedAt);
        case 'downloads': return cp(a.totalDownloads, b.totalDownloads);
        case 'listings':  return cp(Object.values(a.listingsByType).reduce((x, y) => x + y, 0), Object.values(b.listingsByType).reduce((x, y) => x + y, 0));
        case 'username':  return sign * a.username.localeCompare(b.username);
        case 'active':
        default:          return cp(a.lastActive, b.lastActive);
      }
    });
    return arr;
  }
</script>

<svelte:head><title>Users · HexHive</title></svelte:head>

<section class="mx-auto max-w-5xl px-4 py-10 grid gap-6">
  <header class="grid gap-2">
    <span class="font-display text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Directory</span>
    <h1 class="font-display text-2xl">Users</h1>
    <p class="text-sm text-muted-foreground">Everyone with a HexHive account. Filter by what they make and how active they are.</p>
  </header>

  <div class="grid gap-2">
    <div class="flex items-center justify-between gap-2">
      <FilterBar bind:query {affiliations} />
      <div class="flex items-center gap-1">
        <select class="rounded border bg-card text-xs px-2 py-1" bind:value={sort}>
          <option value="active:desc">Sort: recent</option>
          <option value="downloads:desc">Sort: downloads</option>
          <option value="listings:desc">Sort: listings</option>
          <option value="joined:desc">Sort: joined</option>
          <option value="username:asc">Sort: username</option>
        </select>
        <button type="button" class="rounded border bg-card text-xs px-2 py-1 font-mono" onclick={() => (editorOpen = !editorOpen)}
          aria-pressed={editorOpen}>{editorOpen ? '×' : '</>'}</button>
      </div>
    </div>
    {#if editorOpen}
      <HhqlInput bind:value={query} />
    {/if}
  </div>

  <div class="grid gap-3">
    <h2 class="font-display text-sm uppercase tracking-[0.14em] text-muted-foreground">Members</h2>
    {#if data.users.length === 0}
      <p class="text-sm text-muted-foreground">No members yet.</p>
    {:else if claimed.length === 0 && unclaimed.length === 0}
      <p class="text-sm text-muted-foreground">No users match this query — <button type="button" class="underline" onclick={() => (query = '')}>clear</button></p>
    {:else if claimed.length === 0}
      <p class="text-sm text-muted-foreground">No claimed users match this query.</p>
    {:else}
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each claimed as u (u.username)}<UserCard user={u} />{/each}
      </ul>
    {/if}
  </div>

  {#if unclaimed.length > 0}
    <div class="grid gap-3">
      <div class="grid gap-1">
        <h2 class="font-display text-sm uppercase tracking-[0.14em] text-amber-300">Unclaimed credits</h2>
        <p class="text-xs text-muted-foreground">
          Profiles HexHive created on behalf of original creators. If one is yours, sign in with the matching provider to claim it.
        </p>
      </div>
      <ul class="grid gap-2 sm:grid-cols-2">
        {#each unclaimed as u (u.username)}<UserCard user={u} />{/each}
      </ul>
    </div>
  {/if}
</section>
```

- [ ] **Step 12.3: Smoke-test in dev**

Run: `bun run dev`, open `http://localhost:5173/users`. Verify:
- Page renders with chip bar.
- Click "Active → Last 30 days"; URL gains `?q=active%20%3E%20-30d`; user count drops to active users.
- Toggle `</>`; the query appears highlighted; edit it manually to `creates IN (sprite) hasBio`; chip bar reflects the change.
- Reload — state restored from URL.

- [ ] **Step 12.4: Lint, type, full test, commit**

```bash
bun run lint && bun run check && bun run test
git add src/routes/users/+page.server.ts src/routes/users/+page.svelte
git commit -m "$(printf 'feat(users): chip-bar filters + HHQL editor on /users\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```

---

## Task 13: Final verification

- [ ] **Step 13.1: Run the whole test suite**

Run: `bun run test`
Expected: 0 failures.

- [ ] **Step 13.2: Run check + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, 0 warnings (both).

- [ ] **Step 13.3: Manual smoke**

Run `bun run dev` and exercise five queries against the live page:
1. `creates = sprite AND downloads > 100` — top sprite creators.
2. `active > -7d hasBio` — active recent users with bios.
3. `placeholder` — only unclaimed.
4. `affiliation ~ aqua` — anyone affiliated with a "team aqua"-like group.
5. Empty query — full roster, sorted by recent activity.

For each, confirm: chip bar reflects what it can, URL updates, no console errors.

- [ ] **Step 13.4: No final commit needed**

If the smoke test surfaces any issue, fix in a small follow-up commit per the same conventions.

---

## Out of scope (explicit non-goals)

- Server-side filtering / SQL emit — re-evaluate at ~5k users.
- Autocomplete inside `HhqlInput` — v2.
- HHQL on `/search`, `/romhacks`, etc. — registry is reusable, but v1 only ships `/users`.
- Adding `pronouns` as a filter dimension — explicitly excluded during brainstorming.
- New Playwright e2e — keep surface unchanged.
