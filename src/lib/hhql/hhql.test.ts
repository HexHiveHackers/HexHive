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
