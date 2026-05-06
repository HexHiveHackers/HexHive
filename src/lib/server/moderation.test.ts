import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { createFlag, listOpenFlags, dismissFlag, actOnFlag } from './moderation';
import { createListingDraft, finalizeListing } from './listings';

let db: ReturnType<typeof drizzle<typeof schema>>;
let listingId: string;

beforeAll(async () => {
	const c = createClient({ url: ':memory:' });
	db = drizzle(c, { schema });
	await migrate(db, { migrationsFolder: './drizzle' });
	await db.insert(schema.user).values({ id: 'u1', name: 'A', email: 'a@x.com' });

	const draft = await createListingDraft(db, {
		authorId: 'u1',
		ti: {
			type: 'romhack',
			input: {
				title: 'Mod test',
				description: '',
				permissions: ['Credit'],
				baseRom: 'Emerald',
				baseRomVersion: 'v1.0',
				baseRomRegion: 'English',
				release: '1',
				categories: [],
				states: [],
				tags: [],
				screenshots: [],
				boxart: [],
				trailer: []
			}
		}
	});
	await finalizeListing(db, {
		type: 'romhack',
		listingId: draft.listingId,
		versionId: draft.versionId,
		files: [{ r2Key: 'k', filename: 'p.ips', originalFilename: 'p.ips', size: 1, hash: null }]
	});
	listingId = draft.listingId;
});

describe('moderation', () => {
	it('createFlag inserts an open flag visible in listOpenFlags', async () => {
		const { id } = await createFlag(db, { listingId, reporterId: null, kind: 'mature' });
		const open = await listOpenFlags(db);
		expect(open.some((f) => f.id === id)).toBe(true);
	});

	it('dismissFlag removes it from listOpenFlags', async () => {
		const { id } = await createFlag(db, { listingId, reporterId: null, kind: 'spam' });
		await dismissFlag(db, id);
		const open = await listOpenFlags(db);
		expect(open.some((f) => f.id === id)).toBe(false);
	});

	it("actOnFlag('hide') hides the listing and reviews the flag", async () => {
		const { id } = await createFlag(db, { listingId, reporterId: null, kind: 'illegal' });
		await actOnFlag(db, { flagId: id, action: 'hide' });
		const listing = (
			await db.select().from(schema.listing).where(eq(schema.listing.id, listingId)).limit(1)
		)[0];
		expect(listing.status).toBe('hidden');
	});

	it("actOnFlag('mature') sets mature=true on the listing", async () => {
		// Re-publish for this test
		await db
			.update(schema.listing)
			.set({ status: 'published', mature: false })
			.where(eq(schema.listing.id, listingId));
		const { id } = await createFlag(db, { listingId, reporterId: null, kind: 'mature' });
		await actOnFlag(db, { flagId: id, action: 'mature' });
		const listing = (
			await db.select().from(schema.listing).where(eq(schema.listing.id, listingId)).limit(1)
		)[0];
		expect(listing.mature).toBe(true);
	});
});
