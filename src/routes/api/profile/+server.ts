import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { contactEmail as contactEmailSchema, username as usernameSchema } from '$lib/schemas/zod-helpers';
import { requireUser } from '$lib/server/auth-utils';
import { clearAvatar, setAvatarKey } from '$lib/server/avatars';
import { setBio, setContactEmail, setUsername } from '$lib/server/profiles';
import type { RequestHandler } from './$types';

const Body = z.object({
  username: usernameSchema.optional(),
  bio: z.string().max(2000).optional(),
  contactEmail: contactEmailSchema.optional(),
  avatarKey: z.string().min(1).max(200).nullable().optional(),
});

export const PATCH: RequestHandler = async (event) => {
  const user = requireUser(event);
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await event.request.json());
  } catch (err) {
    // Surface the first field-specific Zod message so the client form
    // can render it instead of the generic "Invalid request body".
    if (err instanceof z.ZodError) {
      throw error(400, err.issues[0]?.message ?? 'Invalid request body');
    }
    throw error(400, 'Invalid request body');
  }
  if (body.username !== undefined) {
    try {
      await setUsername(db, user.id, body.username);
    } catch (e) {
      throw error(400, (e as Error).message);
    }
  }
  if (body.bio !== undefined) await setBio(db, user.id, body.bio);
  if (body.contactEmail !== undefined) await setContactEmail(db, user.id, body.contactEmail);
  if (body.avatarKey === null) await clearAvatar(db, user.id);
  else if (body.avatarKey !== undefined) await setAvatarKey(db, user.id, body.avatarKey);
  return json({ ok: true });
};
