import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { addLink, listLinksForUser } from '$lib/server/profile-links';
import type { RequestHandler } from './$types';

const Body = z.object({
  url: z.string().url().max(300),
  label: z.string().max(80).optional(),
});

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const items = await listLinksForUser(db, user.id);
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
  const item = await addLink(db, user.id, { url: body.url, label: body.label ?? null });
  return json({ item });
};
