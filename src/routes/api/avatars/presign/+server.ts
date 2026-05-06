import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '$lib/server/auth-utils';
import { presignAvatarUpload } from '$lib/server/avatars';
import type { RequestHandler } from './$types';

const Body = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await event.request.json());
  } catch {
    throw error(400, 'Invalid request body');
  }

  try {
    const { key, url } = await presignAvatarUpload({ userId: user.id, ...body });
    return json({ key, url });
  } catch (e) {
    throw error(400, (e as Error).message);
  }
};
