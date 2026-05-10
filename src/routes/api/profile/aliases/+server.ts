import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { addAlias, listAliasesForUser } from '$lib/server/alias-entries';
import { requireUser } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

const Body = z.object({ value: z.string().min(1).max(80) });

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const items = await listAliasesForUser(db, user.id);
  return json({ items });
};

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await event.request.json());
  } catch (err) {
    if (err instanceof z.ZodError) throw error(400, err.issues[0]?.message ?? 'Invalid request body');
    throw error(400, 'Invalid request body');
  }
  const item = await addAlias(db, user.id, body.value);
  return json({ item });
};
