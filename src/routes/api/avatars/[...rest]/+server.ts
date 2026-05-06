import { redirect } from '@sveltejs/kit';
import { presignGet } from '$lib/storage/r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const key = `avatars/${params.rest}`;
  const url = await presignGet(key, 60 * 30);
  throw redirect(303, url);
};
