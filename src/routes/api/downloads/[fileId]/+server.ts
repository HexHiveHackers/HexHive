import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { incrementDownloads } from '$lib/server/listings';
import { presignGet } from '$lib/storage/r2';
import type { RequestHandler } from './$types';

export type DownloadCtx = { params: Record<string, string> };

export async function handleDownload({ params }: DownloadCtx): Promise<Response> {
  const fileId = params.fileId ?? '';
  const fileRows = await db.select().from(schema.listingFile).where(eq(schema.listingFile.id, fileId)).limit(1);
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
}

export const GET: RequestHandler = handleDownload;
