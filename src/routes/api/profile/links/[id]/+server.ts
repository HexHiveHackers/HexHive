import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { removeLink } from '$lib/server/profile-links';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
  const user = requireUser(event);
  await removeLink(db, user.id, event.params.id);
  return json({ ok: true });
};
