import type { Expr, Literal } from './ast';

// Canonical emit: AND is always explicit. The parser still accepts implicit
// AND (whitespace between clauses) for human-typed queries, but anything we
// emit reads unambiguously.
export function emit(ast: Expr): string {
  switch (ast.kind) {
    case 'and':
      return `${emit(ast.left)} AND ${emit(ast.right)}`;
    case 'or':
      return `${emit(ast.left)} OR ${emit(ast.right)}`;
    case 'not':
      return `NOT ${emit(ast.inner)}`;
    case 'group':
      return `(${emit(ast.inner)})`;
    case 'bare':
      return ast.negated ? `NOT ${ast.field}` : ast.field;
    case 'empty':
      return `${ast.field} IS ${ast.negated ? 'NOT ' : ''}EMPTY`;
    case 'in':
      return `${ast.field} ${ast.negated ? 'NOT IN' : 'IN'} (${ast.values.map(emitLiteral).join(', ')})`;
    case 'compare':
      return `${ast.field} ${ast.op} ${emitLiteral(ast.value)}`;
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
