import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { finalizeListing } from '$lib/server/listings';
import { verifyAllUploaded } from '$lib/server/uploads';
import type { RequestHandler } from './$types';

const FinalizeBody = z.object({
  type: z.enum(['romhack', 'sprite', 'sound', 'script']).default('romhack'),
  listingId: z.string().min(1),
  versionId: z.string().min(1),
  files: z
    .array(
      z.object({
        r2Key: z.string().min(1),
        filename: z.string().min(1),
        originalFilename: z.string().min(1),
        size: z.number().int().positive(),
        hash: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

export type FinalizeCtx = {
  request: Request;
  locals: App.Locals;
  url: URL;
};

export async function handleFinalize(event: FinalizeCtx) {
  requireUser(event);

  let body: z.infer<typeof FinalizeBody>;
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
    files: body.files.map((f) => ({ ...f, hash: f.hash ?? null })),
  });

  return json({ ok: true });
}

export const POST: RequestHandler = handleFinalize;
