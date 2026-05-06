import type { ListingType } from '$lib/db/schema';

export const ROMHACK_LIMITS = {
  perFileBytes: 50 * 1024 * 1024,
  totalBytes: 100 * 1024 * 1024,
  maxFiles: 10,
  allowedExtensions: ['.ips', '.ups', '.bps', '.zip', '.7z'],
} as const;

export const SPRITE_LIMITS = {
  perFileBytes: 5 * 1024 * 1024,
  totalBytes: 50 * 1024 * 1024,
  maxFiles: 200,
  allowedExtensions: ['.png', '.gif', '.bmp', '.zip'],
} as const;

export const SOUND_LIMITS = {
  perFileBytes: 20 * 1024 * 1024,
  totalBytes: 50 * 1024 * 1024,
  maxFiles: 50,
  allowedExtensions: ['.wav', '.ogg', '.mp3', '.s', '.zip'],
} as const;

export const SCRIPT_LIMITS = {
  perFileBytes: 10 * 1024 * 1024,
  totalBytes: 30 * 1024 * 1024,
  maxFiles: 100,
  allowedExtensions: ['.s', '.txt', '.md', '.py', '.c', '.h', '.json', '.zip'],
} as const;

const LIMITS_BY_TYPE = {
  romhack: ROMHACK_LIMITS,
  sprite: SPRITE_LIMITS,
  sound: SOUND_LIMITS,
  script: SCRIPT_LIMITS,
} as const satisfies Record<ListingType, unknown>;

export interface FileMeta {
  filename: string;
  contentType: string;
  size: number;
}

type Result = { ok: true } | { ok: false; error: string };

export function validateUploads(type: ListingType, files: FileMeta[]): Result {
  const limits = LIMITS_BY_TYPE[type];
  if (!files.length) return { ok: false, error: 'At least one file is required' };
  if (files.length > limits.maxFiles) {
    return { ok: false, error: `Too many files (max ${limits.maxFiles})` };
  }

  let total = 0;
  for (const f of files) {
    const ext = `.${(f.filename.split('.').pop() ?? '').toLowerCase()}`;
    if (!(limits.allowedExtensions as readonly string[]).includes(ext)) {
      return { ok: false, error: `Extension ${ext} not allowed for ${type}` };
    }
    if (f.size <= 0) return { ok: false, error: `Empty file: ${f.filename}` };
    if (f.size > limits.perFileBytes) {
      return { ok: false, error: `File ${f.filename} too large (max ${limits.perFileBytes} bytes)` };
    }
    total += f.size;
  }
  if (total > limits.totalBytes) {
    return { ok: false, error: `Total file size too large (max ${limits.totalBytes} bytes)` };
  }
  return { ok: true };
}
