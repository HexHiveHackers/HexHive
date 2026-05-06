import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { db } from '$lib/db';
import { setUsername, setBio } from '$lib/server/profiles';
import { setAvatarKey, clearAvatar } from '$lib/server/avatars';
import { username as usernameSchema } from '$lib/schemas/zod-helpers';

const Body = z.object({
  username: usernameSchema.optional(),
  bio: z.string().max(2000).optional(),
  avatarKey: z.string().min(1).max(200).nullable().optional()
});

export const PATCH: RequestHandler = async (event) => {
  const user = requireUser(event);
  let body;
  try {
    body = Body.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }
  if (body.username !== undefined) {
    try { await setUsername(db, user.id, body.username); }
    catch (e) { throw error(400, (e as Error).message); }
  }
  if (body.bio !== undefined) await setBio(db, user.id, body.bio);
  if (body.avatarKey === null) await clearAvatar(db, user.id);
  else if (body.avatarKey !== undefined) await setAvatarKey(db, user.id, body.avatarKey);
  return json({ ok: true });
};
