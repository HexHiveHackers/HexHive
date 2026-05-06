import type { PageServerLoad } from './$types';
import { requireUser } from '$lib/server/auth-utils';

export const load: PageServerLoad = async (event) => {
  requireUser(event);
  return {};
};
