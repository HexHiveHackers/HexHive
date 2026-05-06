import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/libsql';
import * as schema from '$lib/db/schema';
import { presignPut } from '$lib/storage/r2';
import { newId } from '$lib/utils/ids';

type DB = ReturnType<typeof drizzle<typeof schema>>;

const ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp'] as const;
const MAX_SIZE = 2 * 1024 * 1024;

export type AvatarPresignInput = {
  userId: string;
  contentType: string;
  size: number;
  filename: string;
};

export async function presignAvatarUpload(
  input: AvatarPresignInput
): Promise<{ key: string; url: string }> {
  if (input.size > MAX_SIZE) throw new Error('Avatar must be under 2 MB');
  const ext = (input.filename.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext as (typeof ALLOWED_EXT)[number])) {
    throw new Error(`Unsupported avatar type .${ext}`);
  }
  const key = `avatars/${input.userId}/${newId(12)}.${ext}`;
  const url = await presignPut(key, input.contentType, input.size);
  return { key, url };
}

export async function setAvatarKey(db: DB, userId: string, key: string): Promise<void> {
  await db
    .update(schema.profile)
    .set({ avatarKey: key, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}

export async function clearAvatar(db: DB, userId: string): Promise<void> {
  await db
    .update(schema.profile)
    .set({ avatarKey: null, updatedAt: new Date() })
    .where(eq(schema.profile.userId, userId));
}
