import { headObject, presignPut } from '$lib/storage/r2';
import { newId } from '$lib/utils/ids';

export interface PresignRequestFile {
  filename: string;
  contentType: string;
  size: number;
}

export interface PresignedFile {
  r2Key: string;
  url: string;
  filename: string;
  originalFilename: string;
  size: number;
}

export async function presignFor(input: {
  listingId: string;
  versionId: string;
  files: PresignRequestFile[];
}): Promise<PresignedFile[]> {
  return Promise.all(
    input.files.map(async (f) => {
      const safe = f.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const r2Key = `${input.listingId}/${input.versionId}/${newId(8)}-${safe}`;
      const url = await presignPut(r2Key, f.contentType, f.size);
      return {
        r2Key,
        url,
        filename: r2Key.split('/').pop()!,
        originalFilename: f.filename,
        size: f.size,
      };
    }),
  );
}

export async function verifyAllUploaded(r2Keys: string[]): Promise<boolean> {
  for (const key of r2Keys) {
    try {
      await headObject(key);
    } catch {
      return false;
    }
  }
  return true;
}
