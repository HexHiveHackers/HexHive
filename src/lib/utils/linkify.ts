// Splits free-form text into segments, marking http(s) URLs as link
// segments so the renderer can wrap them in <a>. We deliberately don't
// support markdown — this is for plain-text listing descriptions where
// the user typed a URL and we want it to be clickable.

export type LinkifySegment = { kind: 'text'; value: string } | { kind: 'link'; href: string; value: string };

const URL_RE = /\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/g;

export function linkifySegments(text: string): LinkifySegment[] {
  const out: LinkifySegment[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    if (m.index === undefined) continue;
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    out.push({ kind: 'link', href: m[0], value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}
