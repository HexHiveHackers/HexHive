import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { removeAlias } from '$lib/server/alias-entries';
import { requireUser } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
  const user = requireUser(event);
  await removeAlias(db, user.id, event.params.id);
  return json({ ok: true });
};
