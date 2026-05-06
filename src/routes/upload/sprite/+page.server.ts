import { requireUser } from '$lib/server/auth-utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  requireUser(event);
  return {};
};
