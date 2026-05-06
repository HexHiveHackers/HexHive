import type { LayoutServerLoad } from './$types';
import { requireAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async (event) => {
	await requireAdmin(event);
	return {};
};
