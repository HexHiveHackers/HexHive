import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$env/dynamic/private';

// When R2 isn't configured (typical in local dev), fall back to a tiny
// filesystem-backed storage rooted at .dev-storage/. The presign* functions
// return same-origin URLs that the browser PUTs to / fetches from; the
// /api/_dev_storage/[...rest] route handles the actual disk I/O.
//
// Detected at module load. To switch to real R2: set R2_ACCOUNT_ID,
// R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (and R2_BUCKET) in .env, restart.
export const isLocalStorage = !env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY;

export const LOCAL_STORAGE_DIR = '.dev-storage';

const client = isLocalStorage
  ? null
  : new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });

const bucket = env.R2_BUCKET;

export async function presignPut(key: string, contentType: string, contentLength: number, expiresIn = 600) {
  if (isLocalStorage) return `/api/_dev_storage/${key}`;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  // biome-ignore lint/style/noNonNullAssertion: client is non-null when isLocalStorage is false
  return getSignedUrl(client!, cmd, { expiresIn });
}

export async function presignGet(key: string, expiresIn = 600) {
  if (isLocalStorage) return `/api/_dev_storage/${key}`;
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  // biome-ignore lint/style/noNonNullAssertion: client is non-null when isLocalStorage is false
  return getSignedUrl(client!, cmd, { expiresIn });
}

export async function headObject(key: string) {
  if (isLocalStorage) {
    const path = join(LOCAL_STORAGE_DIR, key);
    if (!existsSync(path)) throw new Error(`Not found: ${key}`);
    return { ContentLength: statSync(path).size };
  }
  // biome-ignore lint/style/noNonNullAssertion: client is non-null when isLocalStorage is false
  return client!.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}
