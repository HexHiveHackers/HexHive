import type { Expr, Literal } from './ast';

export function emit(ast: Expr): string {
  return emitExpr(ast, containsOr(ast));
}

function containsOr(e: Expr): boolean {
  switch (e.kind) {
    case 'or':
      return true;
    case 'and':
      return containsOr(e.left) || containsOr(e.right);
    case 'not':
      return containsOr(e.inner);
    case 'group':
      return containsOr(e.inner);
    default:
      return false;
  }
}

function emitExpr(e: Expr, explicitAnd: boolean): string {
  switch (e.kind) {
    case 'and':
      return `${emitExpr(e.left, explicitAnd)}${explicitAnd ? ' AND ' : ' '}${emitExpr(e.right, explicitAnd)}`;
    case 'or':
      return `${emitExpr(e.left, explicitAnd)} OR ${emitExpr(e.right, explicitAnd)}`;
    case 'not':
      return `NOT ${emitExpr(e.inner, explicitAnd)}`;
    case 'group':
      return `(${emitExpr(e.inner, explicitAnd)})`;
    case 'bare':
      return e.negated ? `NOT ${e.field}` : e.field;
    case 'empty':
      return `${e.field} IS ${e.negated ? 'NOT ' : ''}EMPTY`;
    case 'in':
      return `${e.field} ${e.negated ? 'NOT IN' : 'IN'} (${e.values.map(emitLiteral).join(', ')})`;
    case 'compare':
      return `${e.field} ${e.op} ${emitLiteral(e.value)}`;
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
