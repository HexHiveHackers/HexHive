import { error } from '@sveltejs/kit';
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import * as schema from '$lib/db/schema';
import { requireUser } from './auth-utils';

export async function requireAdmin(
	event: Pick<RequestEvent | ServerLoadEvent, 'locals' | 'url'>
) {
	const user = requireUser(event);
	const rows = await db
		.select({ isAdmin: schema.user.isAdmin })
		.from(schema.user)
		.where(eq(schema.user.id, user.id))
		.limit(1);
	if (!rows[0]?.isAdmin) throw error(403, 'Forbidden');
	return user;
}
