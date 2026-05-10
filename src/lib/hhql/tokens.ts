// Lenient tokenizer for HHQL (HexHive Query Language).
// - Span ranges are half-open: [start, end). `end` is exclusive.
// - Unknown characters are skipped silently.
// - Unterminated strings consume to EOF (no throw; the parser surfaces span errors).
// - A bare `-` not followed by digits+unit tokenizes as an ident, not a sign.
//   The parser treats unexpected idents as errors.
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
    const ch = input[i] ?? '';
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++;
      continue;
    }
    if (ch === '(') {
      out.push({ kind: 'lparen', value: '(', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (ch === ')') {
      out.push({ kind: 'rparen', value: ')', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (ch === ',') {
      out.push({ kind: 'comma', value: ',', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (ch === '"') {
      const start = i;
      i++;
      let value = '';
      while (i < input.length && input[i] !== '"') {
        value += input[i];
        i++;
      }
      i++; // closing quote (or EOF)
      out.push({ kind: 'string', value, start, end: i });
      continue;
    }
    // multi-char ops
    const two = input.slice(i, i + 2);
    if (two === '!=' || two === '>=' || two === '<=' || two === '!~') {
      out.push({ kind: 'op', value: two, start: i, end: i + 2 });
      i += 2;
      continue;
    }
    if (ch === '=' || ch === '>' || ch === '<' || ch === '~') {
      out.push({ kind: 'op', value: ch, start: i, end: i + 1 });
      i++;
      continue;
    }
    // word-shaped: identifier, keyword, reldate, date, number
    const start = i;
    let word = '';
    while (i < input.length && /[A-Za-z0-9_-]/.test(input[i] ?? '')) {
      word += input[i];
      i++;
    }
    if (word === '') {
      i++;
      continue;
    } // skip unknown char silently — lenient lex
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
