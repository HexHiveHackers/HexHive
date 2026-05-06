import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { verifyAllUploaded } from '$lib/server/uploads';
import { finalizeListing } from '$lib/server/listings';

const FinalizeBody = z.object({
  type: z.enum(['romhack', 'sprite', 'sound', 'script']).default('romhack'),
  listingId: z.string().min(1),
  versionId: z.string().min(1),
  files: z.array(z.object({
    r2Key: z.string().min(1),
    filename: z.string().min(1),
    originalFilename: z.string().min(1),
    size: z.number().int().positive(),
    hash: z.string().nullable().optional()
  })).min(1)
});

export const POST: RequestHandler = async (event) => {
  requireUser(event);

  let body;
  try {
    body = FinalizeBody.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }

  const ok = await verifyAllUploaded(body.files.map((f) => f.r2Key));
  if (!ok) throw error(502, 'One or more files were not received by storage');

  await finalizeListing(db, {
    type: body.type,
    listingId: body.listingId,
    versionId: body.versionId,
    files: body.files.map((f) => ({ ...f, hash: f.hash ?? null }))
  });

  return json({ ok: true });
};
