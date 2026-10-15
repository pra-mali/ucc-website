#!/usr/bin/env node
/**
 * One-time (re-runnable) importer: pulls posts, selected pages and images from the
 * old WordPress site via its public REST API and writes them into this repo.
 *
 *   node scripts/import-wp.mjs            # full import
 *   WP_BASE=https://old.example.com node scripts/import-wp.mjs
 *
 * Output:
 *   src/content/stories/<slug>.json   one per blog post
 *   src/content/pages/<slug>.json     one per imported page
 *   src/data/photos.json              image list for /photos/
 *   src/data/expeditions.json         image list for /signature-cycling-expedition/
 *   public/uploads/<file>             every image referenced above
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const WP_BASE = (process.env.WP_BASE || 'https://udaipurcycling.club').replace(/\/$/, '');
const UPLOADS_PREFIX = `${WP_BASE}/wp-content/uploads/`;
const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const OUT_STORIES = path.join(ROOT, 'src/content/stories');
const OUT_PAGES = path.join(ROOT, 'src/content/pages');
const OUT_DATA = path.join(ROOT, 'src/data');
const OUT_UPLOADS = path.join(ROOT, 'public/uploads');

// Pages that get their body imported verbatim and served at /<slug>/
const CONTENT_PAGES = [
  'about',
  'ucc-code-of-conduct',
  'udaipurcyclingclub-rules-guidelines',
  'ucc-challenges',
  'privacy-policy',
];
// Pages whose images become data for hand-built Astro pages
const GALLERY_PAGES = {
  photos: 'photos.json',
  'signature-cycling-expedition': 'expeditions.json',
};

const imageQueue = new Map(); // remote url -> local path

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function fetchAll(endpoint) {
  const items = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${WP_BASE}/wp-json/wp/v2/${endpoint}&per_page=100&page=${page}`);
    if (!res.ok) throw new Error(`${res.status} for ${endpoint} page ${page}`);
    items.push(...(await res.json()));
    const total = Number(res.headers.get('x-wp-totalpages') || 1);
    if (page >= total) break;
  }
  return items;
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
function decode(s = '') {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m);
}

function stripTags(html = '') {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\[…\]/g, '…').trim();
}

/** Map a remote upload URL to a local /uploads/ path and queue the download. */
function localise(url) {
  if (!url.startsWith(UPLOADS_PREFIX)) return url;
  const rel = decodeURIComponent(url.slice(UPLOADS_PREFIX.length)).replace(/\\/g, '/');
  // flatten year/month folders if present; keep basename unique enough
  const file = rel.replace(/\//g, '-').replace(/[^\w.\-@]+/g, '_');
  const local = `/uploads/${file}`;
  imageQueue.set(url, path.join(OUT_UPLOADS, file));
  return local;
}

/** Clean WordPress block HTML: drop scripts/srcset, localise images and internal links. */
function cleanHtml(html = '') {
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*>/gi, '')
    .replace(/\s(srcset|sizes|data-id|decoding|fetchpriority)="[^"]*"/g, '')
    .replace(/\sloading="lazy"/g, '')
    .replace(/<p[^>]*>\s*<\/p>/g, '')
    .replace(/\n{3,}/g, '\n\n');
  out = out.replace(/(src|href)="([^"]+)"/g, (m, attr, url) => {
    if (url.startsWith(UPLOADS_PREFIX)) return `${attr}="${localise(url)}"`;
    if (url.startsWith(WP_BASE + '/')) return `${attr}="${url.slice(WP_BASE.length)}"`;
    return m;
  });
  return out.trim();
}

function imagesIn(html = '') {
  const seen = new Set();
  const list = [];
  for (const m of html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)) {
    const src = m[1];
    if (!src.startsWith(UPLOADS_PREFIX) || seen.has(src)) continue;
    seen.add(src);
    const alt = decode((m[0].match(/alt="([^"]*)"/) || [])[1] || '');
    const w = Number((m[0].match(/width="(\d+)"/) || [])[1] || 0);
    const h = Number((m[0].match(/height="(\d+)"/) || [])[1] || 0);
    list.push({ src: localise(src), alt, width: w || undefined, height: h || undefined });
  }
  return list;
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function download(url, dest, attempt = 1) {
  if (await exists(dest)) return 'cached';
  const res = await fetch(url);
  if (!res.ok) {
    if (attempt < 3) return download(url, dest, attempt + 1);
    console.warn(`  ! failed ${res.status} ${url}`);
    return 'failed';
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return 'ok';
}

async function runQueue(limit = 6) {
  const entries = [...imageQueue.entries()];
  let i = 0, ok = 0, cached = 0, failed = 0;
  async function worker() {
    while (i < entries.length) {
      const [url, dest] = entries[i++];
      const r = await download(url, dest);
      if (r === 'ok') ok++; else if (r === 'cached') cached++; else failed++;
      if ((ok + cached + failed) % 25 === 0) console.log(`  images: ${ok + cached + failed}/${entries.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  console.log(`  images done: ${ok} downloaded, ${cached} already present, ${failed} failed`);
}

async function main() {
  await Promise.all([OUT_STORIES, OUT_PAGES, OUT_DATA, OUT_UPLOADS].map((d) => mkdir(d, { recursive: true })));

  console.log('Fetching posts…');
  const posts = await fetchAll('posts?_embed=1&status=publish');
  for (const p of posts) {
    const terms = (p._embedded?.['wp:term'] || []).flat();
    const categories = terms.filter((t) => t.taxonomy === 'category' && t.slug !== 'uncategorized').map((t) => t.name);
    const tags = terms.filter((t) => t.taxonomy === 'post_tag').map((t) => t.name);
    const featured = p._embedded?.['wp:featuredmedia']?.[0];
    const cover = featured?.source_url ? localise(featured.source_url) : null;
    const html = cleanHtml(p.content.rendered);
    const doc = {
      title: decode(p.title.rendered),
      slug: p.slug,
      date: p.date_gmt ? `${p.date_gmt}Z` : p.date,
      updated: p.modified_gmt ? `${p.modified_gmt}Z` : undefined,
      excerpt: stripTags(p.excerpt.rendered),
      cover,
      coverAlt: decode(featured?.alt_text || '') || undefined,
      categories,
      tags,
      author: p._embedded?.author?.[0]?.name || 'Team UCC',
      wpId: p.id,
      wpUrl: p.link,
      html,
    };
    await writeFile(path.join(OUT_STORIES, `${p.slug}.json`), JSON.stringify(doc, null, 2) + '\n');
  }
  console.log(`  ${posts.length} stories written`);

  console.log('Fetching pages…');
  const pages = await fetchAll('pages?status=publish');
  const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
  for (const slug of CONTENT_PAGES) {
    const p = bySlug[slug];
    if (!p) { console.warn(`  ! page not found: ${slug}`); continue; }
    const doc = {
      title: decode(p.title.rendered),
      slug,
      updated: p.modified_gmt ? `${p.modified_gmt}Z` : undefined,
      wpId: p.id,
      wpUrl: p.link,
      html: cleanHtml(p.content.rendered),
    };
    await writeFile(path.join(OUT_PAGES, `${slug}.json`), JSON.stringify(doc, null, 2) + '\n');
  }
  for (const [slug, file] of Object.entries(GALLERY_PAGES)) {
    const p = bySlug[slug];
    if (!p) { console.warn(`  ! page not found: ${slug}`); continue; }
    const images = imagesIn(p.content.rendered).map((img) => ({
      ...img,
      // Expedition tiles are named after their file: "Ride-to-Jaisalmer@300x-1920x1139.png"
      title: img.alt || path.basename(img.src).replace(/@300x.*$/, '').replace(/-\d+x\d+\.\w+$/, '').replace(/\.\w+$/, '').replace(/-/g, ' '),
    }));
    await writeFile(path.join(OUT_DATA, file), JSON.stringify(images, null, 2) + '\n');
    console.log(`  ${slug}: ${images.length} images -> src/data/${file}`);
  }

  console.log(`Downloading ${imageQueue.size} images…`);
  await runQueue();
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
