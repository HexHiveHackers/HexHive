import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { RomhackInput } from '$lib/schemas/romhack';
import { validateUploads, type FileMeta } from '$lib/utils/file-types';
import { presignFor } from '$lib/server/uploads';
import { createRomhackDraft } from '$lib/server/listings';

const FileMetaSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive()
});

const PresignBody = z.object({
  type: z.enum(['romhack']),
  input: RomhackInput,
  files: z.array(FileMetaSchema).min(1)
});

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  let parsed;
  try {
    parsed = PresignBody.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }

  const validation = validateUploads('romhack', parsed.files as FileMeta[]);
  if (!validation.ok) throw error(400, validation.error);

  const draft = await createRomhackDraft(db, { authorId: user.id, input: parsed.input });
  const uploads = await presignFor({
    listingId: draft.listingId,
    versionId: draft.versionId,
    files: parsed.files
  });

  return json({
    listingId: draft.listingId,
    versionId: draft.versionId,
    slug: draft.slug,
    uploads
  });
};
