import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { getOrCreateProfile, setUsername } from '$lib/server/profiles';
import { username as usernameSchema } from '$lib/schemas/zod-helpers';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const profile = await getOrCreateProfile(db, user.id);
  if (profile.username) throw redirect(303, '/me');
  return {};
};

const Body = z.object({ username: usernameSchema });

export const actions: Actions = {
  default: async (event) => {
    const user = requireUser(event);
    const fd = await event.request.formData();
    const parsed = Body.safeParse({ username: fd.get('username') });
    if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid' });
    try {
      await setUsername(db, user.id, parsed.data.username);
    } catch (e) {
      return fail(400, { error: (e as Error).message });
    }
    throw redirect(303, '/me');
  }
};
