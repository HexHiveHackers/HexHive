import { requireUser } from '$lib/server/auth-utils';
import type { PageServerLoad } from './$types';

const TYPES = ['romhack', 'sprite', 'sound', 'script'] as const;

export const load: PageServerLoad = (event) => {
  requireUser(event);
  const t = event.url.searchParams.get('type') ?? '';
  const initialType = (TYPES as readonly string[]).includes(t) ? (t as (typeof TYPES)[number]) : null;
  return { initialType };
};
