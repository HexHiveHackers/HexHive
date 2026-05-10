import { error } from '@sveltejs/kit';
import { getToolBySlug } from '$lib/data/tools';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
  const tool = getToolBySlug(params.slug);
  if (!tool) throw error(404, 'Tool not found');
  return { tool };
};
