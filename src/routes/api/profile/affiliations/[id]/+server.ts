import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { detachAffiliation } from '$lib/server/affiliations';
import { requireUser } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
  const user = requireUser(event);
  await detachAffiliation(db, user.id, event.params.id);
  return json({ ok: true });
};
