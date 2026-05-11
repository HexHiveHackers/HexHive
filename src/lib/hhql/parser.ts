import type { CompareOp, Expr, Literal, ParseError, ParseResult, Span } from './ast';
import { type Token, tokenize } from './tokens';

const COMPARE_OP_STRINGS: ReadonlySet<string> = new Set(['=', '!=', '>', '<', '>=', '<=', '~', '!~']);

function isCompareOp(s: string): s is CompareOp {
  return COMPARE_OP_STRINGS.has(s);
}

class Cursor {
  i = 0;
  errors: ParseError[] = [];

  constructor(
    private readonly tokens: Token[],
    private readonly endPos: number,
  ) {}

  peek(o = 0): Token | undefined {
    return this.tokens[this.i + o];
  }

  next(): Token | undefined {
    return this.tokens[this.i++];
  }

  done(): boolean {
    return this.i >= this.tokens.length;
  }

  eofSpan(): Span {
    return { start: this.endPos, end: this.endPos };
  }

  err(message: string, span: Span): void {
    this.errors.push({ message, span });
  }
}

export function parse(input: string): ParseResult {
  const tokens = tokenize(input);
  const cur = new Cursor(tokens, input.length);
  if (cur.done()) return { ok: true, ast: null };
  const ast = parseOr(cur);
  const trailing = cur.peek();
  if (trailing !== undefined) {
    cur.err(`unexpected token "${String(trailing.value)}"`, { start: trailing.start, end: trailing.end });
  }
  return cur.errors.length === 0 ? { ok: true, ast } : { ok: false, ast, errors: cur.errors };
}

function parseOr(cur: Cursor): Expr | null {
  let left = parseAnd(cur);
  while (left !== null) {
    const t = cur.peek();
    if (t === undefined || t.kind !== 'kw' || t.value !== 'OR') break;
    cur.next();
    const right = parseAnd(cur);
    if (right === null) {
      cur.err('expected expression after OR', cur.eofSpan());
      break;
    }
    left = { kind: 'or', left, right, span: { start: left.span.start, end: right.span.end } };
  }
  return left;
}

function parseAnd(cur: Cursor): Expr | null {
  let left = parseUnary(cur);
  while (left !== null) {
    const t = cur.peek();
    if (t === undefined) break;
    if (t.kind === 'kw' && t.value === 'AND') {
      cur.next();
    } else if (canStartTerm(t)) {
      // implicit AND — do not consume
    } else {
      break;
    }
    const right = parseUnary(cur);
    if (right === null) {
      cur.err('expected expression', cur.eofSpan());
      break;
    }
    left = { kind: 'and', left, right, span: { start: left.span.start, end: right.span.end } };
  }
  return left;
}

function canStartTerm(t: Token): boolean {
  return t.kind === 'ident' || t.kind === 'lparen' || (t.kind === 'kw' && t.value === 'NOT');
}

function parseUnary(cur: Cursor): Expr | null {
  const t = cur.peek();
  if (t === undefined) return null;
  if (t.kind === 'kw' && t.value === 'NOT') {
    const start = t.start;
    cur.next();
    const inner = parseUnary(cur);
    if (inner === null) {
      cur.err('expected expression after NOT', cur.eofSpan());
      return null;
    }
    return { kind: 'not', inner, span: { start, end: inner.span.end } };
  }
  return parseAtom(cur);
}

function parseAtom(cur: Cursor): Expr | null {
  const t = cur.peek();
  if (t === undefined) return null;
  if (t.kind === 'lparen') {
    const start = t.start;
    cur.next();
    const inner = parseOr(cur);
    const close = cur.peek();
    if (close === undefined || close.kind !== 'rparen') {
      cur.err('unbalanced paren', { start, end: (inner?.span.end ?? start) + 1 });
      if (inner !== null) {
        return { kind: 'group', inner, span: { start, end: inner.span.end } };
      }
      return null;
    }
    const end = close.end;
    cur.next();
    if (inner === null) {
      cur.err('empty group', { start, end });
      return null;
    }
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
  if (fieldTok === undefined || fieldTok.kind !== 'ident') return null;
  const field = String(fieldTok.value);
  const fieldSpan: Span = { start: fieldTok.start, end: fieldTok.end };
  const next = cur.peek();

  // bare boolean: nothing follows, or followed by AND/OR/rparen/ident (implicit AND)
  if (
    next === undefined ||
    (next.kind === 'kw' && (next.value === 'AND' || next.value === 'OR')) ||
    next.kind === 'rparen' ||
    next.kind === 'ident'
  ) {
    return { kind: 'bare', field, fieldSpan, negated: false, span: fieldSpan };
  }

  if (next.kind === 'kw' && next.value === 'IN') {
    cur.next();
    return parseIn(cur, field, fieldSpan, false);
  }

  if (next.kind === 'kw' && next.value === 'NOT') {
    // look ahead: "NOT IN" vs bare (NOT belongs to outer parser)
    const after = cur.peek(1);
    if (after !== undefined && after.kind === 'kw' && after.value === 'IN') {
      cur.next(); // consume NOT
      cur.next(); // consume IN
      return parseIn(cur, field, fieldSpan, true);
    }
    // NOT belongs to the outer parser — emit bare clause
    return { kind: 'bare', field, fieldSpan, negated: false, span: fieldSpan };
  }

  if (next.kind === 'kw' && next.value === 'IS') {
    cur.next();
    let negated = false;
    const maybeNot = cur.peek();
    if (maybeNot !== undefined && maybeNot.kind === 'kw' && maybeNot.value === 'NOT') {
      cur.next();
      negated = true;
    }
    const empty = cur.peek();
    if (empty === undefined || empty.kind !== 'kw' || empty.value !== 'EMPTY') {
      cur.err('expected EMPTY', empty !== undefined ? { start: empty.start, end: empty.end } : cur.eofSpan());
      return { kind: 'empty', field, fieldSpan, negated, span: fieldSpan };
    }
    cur.next();
    return { kind: 'empty', field, fieldSpan, negated, span: { start: fieldSpan.start, end: empty.end } };
  }

  if (next.kind === 'op' && typeof next.value === 'string' && isCompareOp(next.value)) {
    const op = next.value;
    cur.next();
    const lit = parseLiteral(cur);
    if (lit === null) {
      cur.err(`expected value after ${op}`, cur.eofSpan());
      return { kind: 'bare', field, fieldSpan, negated: false, span: fieldSpan };
    }
    return { kind: 'compare', field, fieldSpan, op, value: lit, span: { start: fieldSpan.start, end: lit.span.end } };
  }

  cur.err('expected operator or end of clause', { start: next.start, end: next.end });
  return { kind: 'bare', field, fieldSpan, negated: false, span: fieldSpan };
}

function parseIn(cur: Cursor, field: string, fieldSpan: Span, negated: boolean): Expr | null {
  const lparen = cur.peek();
  if (lparen === undefined || lparen.kind !== 'lparen') {
    cur.err('expected (', lparen !== undefined ? { start: lparen.start, end: lparen.end } : cur.eofSpan());
    return { kind: 'in', field, fieldSpan, negated, values: [], span: fieldSpan };
  }
  cur.next();
  const values: Literal[] = [];
  while (true) {
    const t = cur.peek();
    if (t === undefined || t.kind === 'rparen') break;
    const lit = parseLiteral(cur);
    if (lit === null) break;
    values.push(lit);
    const comma = cur.peek();
    if (comma !== undefined && comma.kind === 'comma') cur.next();
  }
  const close = cur.peek();
  if (close === undefined || close.kind !== 'rparen') {
    cur.err('expected )', close !== undefined ? { start: close.start, end: close.end } : cur.eofSpan());
    return { kind: 'in', field, fieldSpan, negated, values, span: fieldSpan };
  }
  cur.next();
  return { kind: 'in', field, fieldSpan, negated, values, span: { start: fieldSpan.start, end: close.end } };
}

function parseLiteral(cur: Cursor): Literal | null {
  const t = cur.peek();
  if (t === undefined) return null;
  if (t.kind === 'string') {
    cur.next();
    return { kind: 'string', value: String(t.value), span: { start: t.start, end: t.end } };
  }
  if (t.kind === 'number') {
    cur.next();
    return { kind: 'number', value: Number(t.value), span: { start: t.start, end: t.end } };
  }
  if (t.kind === 'date') {
    cur.next();
    return { kind: 'date', value: String(t.value), span: { start: t.start, end: t.end } };
  }
  if (t.kind === 'reldate') {
    cur.next();
    return { kind: 'reldate', value: String(t.value), span: { start: t.start, end: t.end } };
  }
  if (t.kind === 'ident') {
    cur.next();
    const v = String(t.value);
    if (v === 'true' || v === 'false') {
      return { kind: 'bool', value: v === 'true', span: { start: t.start, end: t.end } };
    }
    return { kind: 'string', value: v, span: { start: t.start, end: t.end } };
  }
  if (t.kind === 'kw' && (t.value === 'TRUE' || t.value === 'FALSE')) {
    cur.next();
    return { kind: 'bool', value: t.value === 'TRUE', span: { start: t.start, end: t.end } };
  }
  return null;
}
