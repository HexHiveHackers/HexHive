import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getToolBySlug } from '$lib/data/tools';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import type { PageServerLoad } from './$types';

function slugifyAuthor(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 32) || 'unknown'
  );
}

export const load: PageServerLoad = async ({ params }) => {
  const tool = getToolBySlug(params.slug);
  if (!tool) throw error(404, 'Tool not found');

  const userId = `seed-tool-${slugifyAuthor(tool.author)}`;
  const rows = await db
    .select({
      isPlaceholder: schema.user.isPlaceholder,
      username: schema.profile.username,
      homepageUrl: schema.profile.homepageUrl,
    })
    .from(schema.user)
    .leftJoin(schema.profile, eq(schema.profile.userId, schema.user.id))
    .where(eq(schema.user.id, userId))
    .limit(1);
  const credit = rows[0]
    ? {
        username: rows[0].username ?? '',
        isPlaceholder: rows[0].isPlaceholder,
        homepageUrl: rows[0].homepageUrl ?? tool.authorUrl ?? null,
      }
    : null;

  return { tool, credit };
};
