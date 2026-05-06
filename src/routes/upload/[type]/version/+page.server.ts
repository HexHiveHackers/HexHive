import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { requireUser } from '$lib/server/auth-utils';
import { getListingForAuthor } from '$lib/server/versions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const id = event.url.searchParams.get('id');
  if (!id) throw error(400, 'Missing ?id=');
  const listing = await getListingForAuthor(db, id, user.id);
  if (!listing) throw error(404, 'Listing not found');
  if (listing.type !== event.params.type) throw error(400, 'Type mismatch');
  return { listing: { id: listing.id, type: listing.type, slug: listing.slug, title: listing.title } };
};
