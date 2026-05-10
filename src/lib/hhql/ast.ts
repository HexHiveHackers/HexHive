export type CompareOp = '=' | '!=' | '>' | '<' | '>=' | '<=' | '~' | '!~';

export interface Span {
  start: number;
  end: number;
}

export type Literal =
  | { kind: 'string'; value: string; span: Span }
  | { kind: 'number'; value: number; span: Span }
  | { kind: 'date'; value: string; span: Span } // ISO YYYY-MM-DD
  | { kind: 'reldate'; value: string; span: Span } // -7d / -2w / -1m / -1y
  | { kind: 'bool'; value: boolean; span: Span };

export type Expr =
  | { kind: 'compare'; field: string; fieldSpan: Span; op: CompareOp; value: Literal; span: Span }
  | { kind: 'in'; field: string; fieldSpan: Span; negated: boolean; values: Literal[]; span: Span }
  | { kind: 'empty'; field: string; fieldSpan: Span; negated: boolean; span: Span }
  | { kind: 'bare'; field: string; fieldSpan: Span; negated: boolean; span: Span } // hasBio / NOT hasBio
  | { kind: 'and'; left: Expr; right: Expr; span: Span }
  | { kind: 'or'; left: Expr; right: Expr; span: Span }
  | { kind: 'not'; inner: Expr; span: Span }
  | { kind: 'group'; inner: Expr; span: Span };

export interface ParseError {
  message: string;
  span: Span;
}

export type ParseResult = { ok: true; ast: Expr | null } | { ok: false; ast: Expr | null; errors: ParseError[] };
