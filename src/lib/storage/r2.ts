import { env } from '$env/dynamic/private';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

const bucket = env.R2_BUCKET;

export async function presignPut(key: string, contentType: string, contentLength: number, expiresIn = 600) {
  const cmd = new PutObjectCommand({
    Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength
  });
  return getSignedUrl(client, cmd, { expiresIn });
}

export async function presignGet(key: string, expiresIn = 600) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}

export async function headObject(key: string) {
  return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}
