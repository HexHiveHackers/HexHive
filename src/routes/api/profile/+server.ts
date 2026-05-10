import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { contactEmail as contactEmailSchema, username as usernameSchema } from '$lib/schemas/zod-helpers';
import { requireUser } from '$lib/server/auth-utils';
import { clearAvatar, setAvatarKey } from '$lib/server/avatars';
import { clearBanner, setBannerKey } from '$lib/server/banners';
import { setBio, setContactEmail, setHideActivity, setPronouns, setUsername } from '$lib/server/profiles';
import type { RequestHandler } from './$types';

const Body = z.object({
  username: usernameSchema.optional(),
  pronouns: z.string().max(80).optional(),
  bio: z.string().max(2000).optional(),
  contactEmail: contactEmailSchema.optional(),
  avatarKey: z.string().min(1).max(200).nullable().optional(),
  bannerKey: z.string().min(1).max(200).nullable().optional(),
  hideActivity: z.boolean().optional(),
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
  if (body.pronouns !== undefined) await setPronouns(db, user.id, body.pronouns);
  if (body.bio !== undefined) await setBio(db, user.id, body.bio);
  if (body.contactEmail !== undefined) await setContactEmail(db, user.id, body.contactEmail);
  if (body.avatarKey === null) await clearAvatar(db, user.id);
  else if (body.avatarKey !== undefined) await setAvatarKey(db, user.id, body.avatarKey);
  if (body.bannerKey === null) await clearBanner(db, user.id);
  else if (body.bannerKey !== undefined) await setBannerKey(db, user.id, body.bannerKey);
  if (body.hideActivity !== undefined) await setHideActivity(db, user.id, body.hideActivity);
  return json({ ok: true });
};
