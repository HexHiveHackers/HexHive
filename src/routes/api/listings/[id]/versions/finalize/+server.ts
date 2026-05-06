import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { verifyAllUploaded } from '$lib/server/uploads';
import { newId } from '$lib/utils/ids';
import { getListingForAuthor } from '$lib/server/versions';

const Body = z.object({
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
  const user = requireUser(event);
  const listing = await getListingForAuthor(db, event.params.id, user.id);
  if (!listing) throw error(404, 'Not found');

  let body;
  try { body = Body.parse(await event.request.json()); }
  catch { throw error(400, 'Invalid request body'); }

  const ok = await verifyAllUploaded(body.files.map((f) => f.r2Key));
  if (!ok) throw error(502, 'One or more files were not received by storage');

  for (const f of body.files) {
    await db.insert(schema.listingFile).values({
      id: newId(),
      versionId: body.versionId,
      r2Key: f.r2Key,
      filename: f.filename,
      originalFilename: f.originalFilename,
      size: f.size,
      hash: f.hash ?? null
    });
  }
  if (listing.type !== 'romhack') {
    const total = body.files.reduce((s, f) => s + f.size, 0);
    await db
      .update(schema.assetHiveMeta)
      .set({ fileCount: body.files.length, totalSize: total })
      .where(eq(schema.assetHiveMeta.listingId, listing.id));
  }
  await db.update(schema.listing).set({ updatedAt: new Date() }).where(eq(schema.listing.id, listing.id));
  return json({ ok: true });
};
