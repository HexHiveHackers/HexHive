import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { requireAdmin } from '$lib/server/admin';
import { actOnFlag, dismissFlag, listOpenFlags } from '$lib/server/moderation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  await requireAdmin(event);
  return { flags: await listOpenFlags(db) };
};

export const actions: Actions = {
  dismiss: async (event) => {
    await requireAdmin(event);
    const fd = await event.request.formData();
    const flagId = String(fd.get('flagId'));
    await dismissFlag(db, flagId);
    throw redirect(303, '/admin/flags');
  },
  hide: async (event) => {
    await requireAdmin(event);
    const fd = await event.request.formData();
    await actOnFlag(db, { flagId: String(fd.get('flagId')), action: 'hide' });
    throw redirect(303, '/admin/flags');
  },
  mature: async (event) => {
    await requireAdmin(event);
    const fd = await event.request.formData();
    await actOnFlag(db, { flagId: String(fd.get('flagId')), action: 'mature' });
    throw redirect(303, '/admin/flags');
  },
};
