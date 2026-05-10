import { db } from '$lib/db';
import { listDirectoryUsers } from '$lib/server/profiles';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const users = await listDirectoryUsers(db);
  return {
    users: users.map((u) => ({
      username: u.username,
      name: u.name,
      avatarKey: u.avatarKey,
      pronouns: u.pronouns,
      bio: u.bio,
      lastActive: u.lastActive ? u.lastActive.getTime() : null,
      joinedAt: u.joinedAt.getTime(),
    })),
  };
};
