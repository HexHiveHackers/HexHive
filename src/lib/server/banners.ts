import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { presignPut } from '$lib/storage/r2';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

// Same animated-image story as avatars; banners are larger so the cap
// is bumped to 5 MB.
const ALLOWED_EXT = ['png', 'apng', 'jpg', 'jpeg', 'gif', 'webp'] as const;
const MAX_SIZE = 5 * 1024 * 1024;

export type BannerPresignInput = {
  userId: string;
  contentType: string;
  size: number;
  filename: string;
};

export async function presignBannerUpload(input: BannerPresignInput): Promise<{ key: string; url: string }> {
  if (input.size > MAX_SIZE) throw new Error('Banner must be under 5 MB');
  const ext = (input.filename.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) {
    throw new Error(`Unsupported banner type .${ext}`);
  }
  const key = `banners/${input.userId}/${newId(12)}.${ext}`;
  const url = await presignPut(key, input.contentType, input.size);
  return { key, url };
}

export async function setBannerKey(db: DB, userId: string, key: string): Promise<void> {
  await db
    .update(schema.profile)
    .set({ bannerKey: key, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}

export async function clearBanner(db: DB, userId: string): Promise<void> {
  await db
    .update(schema.profile)
    .set({ bannerKey: null, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}
