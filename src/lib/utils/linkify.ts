// Splits free-form text into segments so a renderer can wrap clickable
// parts in <a>. Two kinds of clickable segments are recognised:
//
//  - http(s) URLs typed inline, opened in a new tab.
//  - HexHive user mentions in either of two equivalent shapes —
//    "u/<handle>" (matches the /u/<handle> route shape) or "@<handle>".
//    Both render as the same internal link to /u/<handle>; the original
//    text is preserved as the visible label.
//
// We deliberately don't support markdown — this is for plain-text listing
// descriptions where the user typed a URL or mentioned someone.

export type LinkifySegment =
  | { kind: 'text'; value: string }
  // External link, e.g. an http(s) URL — caller renders with target=_blank.
  | { kind: 'link'; href: string; value: string }
  // Internal HexHive user mention — caller renders as a same-origin link.
  | { kind: 'mention'; href: string; value: string };

// Matches either an http(s) URL or a u/handle / @handle mention. Handles
// must start with a letter so we don't accidentally swallow "@1" or "u/1".
// Trailing punctuation on URLs is excluded by the negative class.
const SEGMENT_RE =
  /(?<url>\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|(?:\bu\/(?<umention>[a-z][a-z0-9_-]{0,31}))|(?:@(?<atmention>[a-z][a-z0-9_-]{0,31}))/gi;

export function linkifySegments(text: string): LinkifySegment[] {
  const out: LinkifySegment[] = [];
  let last = 0;
  for (const m of text.matchAll(SEGMENT_RE)) {
    if (m.index === undefined) continue;
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    if (m.groups?.url) {
      out.push({ kind: 'link', href: m.groups.url, value: m.groups.url });
    } else {
      const handle = m.groups?.umention ?? m.groups?.atmention;
      if (handle) out.push({ kind: 'mention', href: `/u/${handle.toLowerCase()}`, value: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}
