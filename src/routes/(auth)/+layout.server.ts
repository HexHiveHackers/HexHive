import { redirect } from '@sveltejs/kit';
import { enabledSocialProviders } from '$lib/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(303, '/');
  return { enabledSocialProviders };
};
