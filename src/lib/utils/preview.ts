const IMAGE_EXTS = new Set(['.png', '.gif', '.bmp', '.webp', '.jpg', '.jpeg', '.apng']);
const ARCHIVE_EXTS = new Set(['.zip', '.7z', '.rar', '.tar', '.gz']);
const AUDIO_EXTS = new Set(['.wav', '.ogg', '.mp3', '.flac', '.m4a']);

function ext(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i < 0 ? '' : filename.slice(i).toLowerCase();
}

export function isImageFile(filename: string): boolean {
  return IMAGE_EXTS.has(ext(filename));
}

export function isArchiveFile(filename: string): boolean {
  return ARCHIVE_EXTS.has(ext(filename));
}

export function isAudioFile(filename: string): boolean {
  return AUDIO_EXTS.has(ext(filename));
}

export function fileKind(filename: string): 'image' | 'archive' | 'audio' | 'other' {
  if (isImageFile(filename)) return 'image';
  if (isArchiveFile(filename)) return 'archive';
  if (isAudioFile(filename)) return 'audio';
  return 'other';
}
