import { listTools } from '$lib/data/tools';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
  return { tools: listTools() };
};
