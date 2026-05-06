import type { RequestHandler } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { presignGet } from '$lib/storage/r2';
import { incrementDownloads } from '$lib/server/listings';

export const GET: RequestHandler = async ({ params }) => {
  const fileRows = await db
    .select()
    .from(schema.listingFile)
    .where(eq(schema.listingFile.id, params.fileId))
    .limit(1);
  const file = fileRows[0];
  if (!file) throw error(404, 'File not found');

  const verRows = await db
    .select()
    .from(schema.listingVersion)
    .where(eq(schema.listingVersion.id, file.versionId))
    .limit(1);
  const ver = verRows[0];
  if (!ver) throw error(404, 'File not found');

  await incrementDownloads(db, ver.listingId);
  const url = await presignGet(file.r2Key);
  throw redirect(303, url);
};
