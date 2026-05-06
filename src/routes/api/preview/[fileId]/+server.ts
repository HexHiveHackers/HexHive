import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { presignGet } from '$lib/storage/r2';
import type { RequestHandler } from './$types';

/**
 * Inline preview endpoint — same as `/api/downloads/[fileId]` but does not
 * increment the listing's download counter. Used by the sprite gallery so
 * scrolling past a thumbnail doesn't pollute download stats.
 */
export type PreviewCtx = { params: Record<string, string> };

export async function _handlePreview({ params }: PreviewCtx): Promise<Response> {
  const fileId = params.fileId ?? '';
  const fileRows = await db.select().from(schema.listingFile).where(eq(schema.listingFile.id, fileId)).limit(1);
  const file = fileRows[0];
  if (!file) throw error(404, 'File not found');
  const url = await presignGet(file.r2Key);
  throw redirect(303, url);
}

export const GET: RequestHandler = _handlePreview;
