import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Backwards-compat redirect — type-specific upload paths now go through the
// unified wizard at /upload?type=<t>.
export const load: PageServerLoad = () => {
  throw redirect(307, '/upload?type=script');
};
