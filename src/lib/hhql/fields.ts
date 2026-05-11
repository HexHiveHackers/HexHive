export type FieldType = 'string' | 'string[]' | 'number' | 'date' | 'bool' | 'enum' | 'enum[]';

export interface FieldSpec<Row> {
  name: string; // canonical, lowercase
  aliases?: string[]; // resolved by registry
  type: FieldType;
  enumValues?: readonly string[]; // for type 'enum' / 'enum[]'
  // Read the raw value from a row. Strings are compared case-insensitively.
  // Dates must be returned as a number (ms since epoch) or null.
  // Bools are returned as boolean. Arrays as the underlying array.
  read: (row: Row) => string | string[] | number | boolean | null | undefined;
}

export interface FieldRegistry<Row> {
  fields: ReadonlyArray<FieldSpec<Row>>;
  resolve: (name: string) => FieldSpec<Row> | undefined;
}

export function buildRegistry<Row>(fields: ReadonlyArray<FieldSpec<Row>>): FieldRegistry<Row> {
  const map = new Map<string, FieldSpec<Row>>();
  for (const f of fields) {
    map.set(f.name.toLowerCase(), f);
    for (const alias of f.aliases ?? []) {
      map.set(alias.toLowerCase(), f);
    }
  }
  return { fields, resolve: (n) => map.get(n.toLowerCase()) };
}
