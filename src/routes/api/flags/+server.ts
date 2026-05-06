import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { createFlag } from '$lib/server/moderation';
import type { RequestHandler } from './$types';

const Body = z.object({
  listingId: z.string().min(1),
  kind: z.enum(['mature', 'spam', 'illegal', 'other']),
  reason: z.string().max(2000).optional(),
});

export const POST: RequestHandler = async (event) => {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }

  const user = event.locals.user;
  const { id } = await createFlag(db, {
    listingId: body.listingId,
    reporterId: user?.id ?? null,
    kind: body.kind,
    reason: body.reason ?? null,
  });
  return json({ id });
};
