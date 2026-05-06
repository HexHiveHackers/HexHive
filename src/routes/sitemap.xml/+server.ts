import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { listRomhacks, listAssetHives } from '$lib/server/listings';

export const GET: RequestHandler = async ({ url }) => {
  const [romhacks, sprites, sounds, scripts] = await Promise.all([
    listRomhacks(db, { limit: 5000 }),
    listAssetHives(db, 'sprite', { limit: 5000 }),
    listAssetHives(db, 'sound', { limit: 5000 }),
    listAssetHives(db, 'script', { limit: 5000 })
  ]);

  const u = (path: string) => `${url.origin}${path}`;
  const entries: string[] = [
    `  <url><loc>${u('/')}</loc></url>`,
    ...['/romhacks', '/sprites', '/sounds', '/scripts'].map((p) => `  <url><loc>${u(p)}</loc></url>`),
    ...romhacks.map((r) => `  <url><loc>${u(`/romhacks/${r.slug}`)}</loc></url>`),
    ...sprites.map((r) => `  <url><loc>${u(`/sprites/${r.slug}`)}</loc></url>`),
    ...sounds.map((r) => `  <url><loc>${u(`/sounds/${r.slug}`)}</loc></url>`),
    ...scripts.map((r) => `  <url><loc>${u(`/scripts/${r.slug}`)}</loc></url>`)
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'content-type': 'application/xml' } });
};
