import { db } from '$lib/db';
import { getOrCreateProfile } from '$lib/server/profiles';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) return { user: null };
  const profile = await getOrCreateProfile(db, locals.user.id);
  return {
    user: {
      id: locals.user.id,
      name: locals.user.name,
      username: profile.username,
      avatarKey: profile.avatarKey,
    },
  };
};
