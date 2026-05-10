import type { CompareOp, Expr, Literal } from './ast';
import type { FieldRegistry, FieldSpec } from './fields';

export function evaluate<Row>(ast: Expr, row: Row, registry: FieldRegistry<Row>): boolean {
  switch (ast.kind) {
    case 'and':
      return evaluate(ast.left, row, registry) && evaluate(ast.right, row, registry);
    case 'or':
      return evaluate(ast.left, row, registry) || evaluate(ast.right, row, registry);
    case 'not':
      return !evaluate(ast.inner, row, registry);
    case 'group':
      return evaluate(ast.inner, row, registry);
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

function arrayContainsAny(
  haystack: string | string[] | number | boolean | null | undefined,
  wanted: string[],
): boolean {
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
    const expected = lit.kind === 'bool' ? lit.value : literalToString(lit).toLowerCase() === 'true';
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
    const arr = Array.isArray(raw)
      ? raw.map((x) => String(x).toLowerCase())
      : raw == null
        ? []
        : [String(raw).toLowerCase()];
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
    case '=':
      return a === b;
    case '!=':
      return a !== b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    default:
      return false;
  }
}

function cmpString(a: string, op: CompareOp, b: string): boolean {
  switch (op) {
    case '=':
      return a === b;
    case '!=':
      return a !== b;
    case '~':
      return a.includes(b);
    case '!~':
      return !a.includes(b);
    default:
      return false;
  }
}

function literalToTimestamp(lit: Literal): number | null {
  if (lit.kind === 'date') return Date.parse(lit.value);
  if (lit.kind === 'reldate') {
    const m = /^-(\d+)([dwmy])$/.exec(lit.value);
    if (!m) return null;
    const n = Number(m[1]);
    const unit = m[2];
    const ms =
      unit === 'd' ? 86_400_000 : unit === 'w' ? 7 * 86_400_000 : unit === 'm' ? 30 * 86_400_000 : 365 * 86_400_000;
    return Date.now() - n * ms;
  }
  if (lit.kind === 'number') return lit.value;
  return null;
}
