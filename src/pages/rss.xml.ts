/**
 * RSS feed of club stories at /rss.xml. Feed readers, Google and AI crawlers
 * use it to discover new stories quickly. No extra dependency needed.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
  const stories = (await getCollection('stories', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const items = stories.map((s) => {
    const url = new URL(`/${s.data.slug || s.id}/`, site.url).toString();
    const img = s.data.cover ? new URL(s.data.cover, site.url).toString() : null;
    return `    <item>
      <title>${esc(s.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${s.data.date.toUTCString()}</pubDate>
      <dc:creator>${esc(s.data.author)}</dc:creator>
${s.data.categories.map((c) => `      <category>${esc(c)}</category>`).join('\n')}
      <description>${esc(s.data.excerpt || '')}</description>${img ? `\n      <enclosure url="${esc(img)}" type="image/${img.endsWith('.png') ? 'png' : img.endsWith('.webp') ? 'webp' : 'jpeg'}" length="0" />` : ''}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(site.name)} — Rider stories</title>
    <link>${site.url}/blogs/</link>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc('Ride reports, member achievements, expeditions and newsletters from ' + site.name + ' riders.')}</description>
    <language>en-in</language>
    <lastBuildDate>${(stories[0]?.data.date ?? new Date()).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
