import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { presignFor } from '$lib/server/uploads';
import { createNextVersion, getListingForAuthor } from '$lib/server/versions';
import { type FileMeta, validateUploads } from '$lib/utils/file-types';
import type { RequestHandler } from './$types';

const Body = z.object({
  version: z.string().min(1).max(40),
  changelog: z.string().max(10_000).optional(),
  files: z
    .array(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().min(1),
        size: z.number().int().positive(),
      }),
    )
    .min(1),
});

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const listing = await getListingForAuthor(db, event.params.id, user.id);
  if (!listing) throw error(404, 'Not found');

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }

  const v = validateUploads(listing.type, body.files as FileMeta[]);
  if (!v.ok) throw error(400, v.error);

  const next = await createNextVersion(db, {
    listingId: listing.id,
    version: body.version,
    changelog: body.changelog ?? null,
  });
  const uploads = await presignFor({
    listingId: listing.id,
    versionId: next.id,
    files: body.files,
  });
  return json({ versionId: next.id, uploads });
};
