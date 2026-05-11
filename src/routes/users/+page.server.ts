import { db } from '$lib/db';
import { enrichDirectoryUsers } from '$lib/server/users-directory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const users = await enrichDirectoryUsers(db);
  return {
    users,
    q: url.searchParams.get('q') ?? '',
    sort: url.searchParams.get('sort') ?? 'active:desc',
  };
};
