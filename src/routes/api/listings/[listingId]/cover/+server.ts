import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import type { RequestHandler } from './$types';

const Body = z.object({ fileId: z.string().nullable() });

export type SetCoverCtx = {
  params: Record<string, string>;
  request: Request;
  locals: { user?: { id: string } | null };
};

export async function _handleSetCover(event: SetCoverCtx): Promise<Response> {
  const user = event.locals.user;
  if (!user) throw error(401, 'Sign-in required');

  const listingId = event.params.listingId ?? '';
  const rows = await db.select().from(schema.listing).where(eq(schema.listing.id, listingId)).limit(1);
  const listing = rows[0];
  if (!listing) throw error(404, 'Listing not found');
  if (listing.authorId !== user.id) throw error(403, 'Only the author can change the cover');

  const parsed = Body.safeParse(await event.request.json().catch(() => null));
  if (!parsed.success) throw error(400, 'Invalid body');
  const { fileId } = parsed.data;

  if (fileId) {
    // Verify the file belongs to a version of this listing.
    const fileRows = await db
      .select({ id: schema.listingFile.id })
      .from(schema.listingFile)
      .innerJoin(schema.listingVersion, eq(schema.listingVersion.id, schema.listingFile.versionId))
      .where(eq(schema.listingFile.id, fileId))
      .limit(1);
    const verRow = await db
      .select({ listingId: schema.listingVersion.listingId })
      .from(schema.listingVersion)
      .innerJoin(schema.listingFile, eq(schema.listingFile.versionId, schema.listingVersion.id))
      .where(eq(schema.listingFile.id, fileId))
      .limit(1);
    if (!fileRows[0] || !verRow[0] || verRow[0].listingId !== listingId) {
      throw error(400, 'File does not belong to this listing');
    }
  }

  await db
    .update(schema.listing)
    .set({ thumbnailFileId: fileId, updatedAt: new Date() })
    .where(eq(schema.listing.id, listingId));

  return json({ ok: true });
}

export const POST: RequestHandler = _handleSetCover;
