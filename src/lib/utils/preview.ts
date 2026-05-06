const IMAGE_EXTS = new Set(['.png', '.gif', '.bmp', '.webp', '.jpg', '.jpeg', '.apng']);
const ARCHIVE_EXTS = new Set(['.zip', '.7z', '.rar', '.tar', '.gz']);
// Browser-playable audio (no decoder library required).
const AUDIO_EXTS = new Set(['.wav', '.ogg', '.mp3', '.flac', '.m4a', '.opus']);
// MIDI requires a soft synth + soundfont in the browser.
const MIDI_EXTS = new Set(['.mid', '.midi']);

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

export function isMidiFile(filename: string): boolean {
  return MIDI_EXTS.has(ext(filename));
}

export type FileKind = 'image' | 'archive' | 'audio' | 'midi' | 'other';

export function fileKind(filename: string): FileKind {
  if (isImageFile(filename)) return 'image';
  if (isArchiveFile(filename)) return 'archive';
  if (isAudioFile(filename)) return 'audio';
  if (isMidiFile(filename)) return 'midi';
  return 'other';
}

/**
 * MIME type for a filename, used in `<audio>` `type=` hints. Only emits
 * something for the formats we know browsers handle natively; MIDI is
 * intentionally absent (handled by the soft-synth component).
 */
export function audioMimeType(filename: string): string | null {
  const e = ext(filename);
  switch (e) {
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    case '.mp3':
      return 'audio/mpeg';
    case '.flac':
      return 'audio/flac';
    case '.m4a':
      return 'audio/mp4';
    case '.opus':
      return 'audio/ogg; codecs=opus';
    default:
      return null;
  }
}
