import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { error } from '@sveltejs/kit';
import { isLocalStorage, LOCAL_STORAGE_DIR } from '$lib/storage/r2';
import type { RequestHandler } from './$types';

// Filesystem-backed storage adapter for local dev — only active when
// R2 isn't configured. Returns 404 in production-style deployments so
// stale references can't accidentally serve from disk.

const ROOT = resolve(LOCAL_STORAGE_DIR);

function safePath(rest: string): string {
  const path = normalize(join(ROOT, rest));
  if (path !== ROOT && !path.startsWith(ROOT + sep)) {
    throw error(400, 'Bad path');
  }
  return path;
}

export const PUT: RequestHandler = async ({ params, request }) => {
  if (!isLocalStorage) throw error(404, 'Not found');
  const path = safePath(params.rest);
  await mkdir(dirname(path), { recursive: true });
  const buf = Buffer.from(await request.arrayBuffer());
  await writeFile(path, buf);
  return new Response('OK', { status: 200 });
};

export const GET: RequestHandler = async ({ params }) => {
  if (!isLocalStorage) throw error(404, 'Not found');
  const path = safePath(params.rest);
  if (!existsSync(path)) throw error(404, 'Not found');
  const buf = await readFile(path);
  // Best-effort content type from extension.
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const contentType =
    ext === 'png'
      ? 'image/png'
      : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'gif'
          ? 'image/gif'
          : ext === 'webp'
            ? 'image/webp'
            : 'application/octet-stream';
  return new Response(buf, {
    headers: {
      'content-type': contentType,
      'content-length': String(statSync(path).size),
      'cache-control': 'public, max-age=300',
    },
  });
};
