import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { RomhackInput } from '$lib/schemas/romhack';
import { SpriteInput } from '$lib/schemas/sprite';
import { SoundInput } from '$lib/schemas/sound';
import { ScriptInput } from '$lib/schemas/script';
import { validateUploads, type FileMeta } from '$lib/utils/file-types';
import { presignFor } from '$lib/server/uploads';
import { createListingDraft } from '$lib/server/listings';
import type { ListingTypedInput } from '$lib/server/meta-writers';

const FileMetaSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive()
});

const PresignBody = z.discriminatedUnion('type', [
  z.object({ type: z.literal('romhack'), input: RomhackInput, files: z.array(FileMetaSchema).min(1) }),
  z.object({ type: z.literal('sprite'),  input: SpriteInput,  files: z.array(FileMetaSchema).min(1) }),
  z.object({ type: z.literal('sound'),   input: SoundInput,   files: z.array(FileMetaSchema).min(1) }),
  z.object({ type: z.literal('script'),  input: ScriptInput,  files: z.array(FileMetaSchema).min(1) })
]);

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);

  let parsed;
  try {
    parsed = PresignBody.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }

  const validation = validateUploads(parsed.type, parsed.files as FileMeta[]);
  if (!validation.ok) throw error(400, validation.error);

  const ti = { type: parsed.type, input: parsed.input } as ListingTypedInput;
  const draft = await createListingDraft(db, { authorId: user.id, ti });

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
