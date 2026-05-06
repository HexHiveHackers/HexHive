import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const nano = customAlphabet(alphabet, 21);

export function newId(length = 21): string {
  return length === 21 ? nano() : customAlphabet(alphabet, length)();
}

export function slugify(input: string): string {
  const cleaned = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || newId(8);
}

export async function uniqueSlug(
  candidate: string,
  isTaken: (s: string) => Promise<boolean>
): Promise<string> {
  if (!(await isTaken(candidate))) return candidate;
  for (let i = 2; i < 1000; i++) {
    const s = `${candidate}-${i}`;
    if (!(await isTaken(s))) return s;
  }
  return `${candidate}-${newId(6)}`;
}
