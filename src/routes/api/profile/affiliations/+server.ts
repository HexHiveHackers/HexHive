import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { attachAffiliation, listAffiliationsForUser } from '$lib/server/affiliations';
import { requireUser } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

const Body = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(120).optional(),
  url: z.string().url().max(300).optional().or(z.literal('')),
});

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const items = await listAffiliationsForUser(db, user.id);
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
  const item = await attachAffiliation(db, user.id, {
    name: body.name,
    role: body.role ?? null,
    url: body.url && body.url !== '' ? body.url : null,
  });
  return json({ item });
};
