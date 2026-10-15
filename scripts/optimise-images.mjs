/**
 * One-off image optimiser for public/uploads.
 *
 * Files copied verbatim from WordPress are often multi-megapixel originals.
 * This script, in place and keeping every file name (so no URL changes):
 *   - auto-orients by EXIF and strips metadata
 *   - shrinks anything wider than MAX_WIDTH px (never enlarges)
 *   - re-encodes JPEG (mozjpeg, progressive) and PNG (palette-quantised)
 *   - only overwrites a file when the result is actually smaller
 *
 * Usage:  node scripts/optimise-images.mjs [--dry-run] [--dir public/uploads]
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const dirArg = args[args.indexOf('--dir') + 1];
const ROOT = path.resolve(args.includes('--dir') && dirArg ? dirArg : 'public/uploads');

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 80;
const PNG_QUALITY = 80;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function optimise(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return null;

  // Read into memory first: on Windows sharp keeps a path input open, which blocks writing back to the same file.
  const input = await readFile(file);
  const before = input.length;
  const image = sharp(input, { failOn: 'none' }).rotate(); // rotate() bakes in EXIF orientation before metadata is stripped
  const meta = await image.metadata();
  const resized = meta.width && meta.width > MAX_WIDTH;
  if (resized) image.resize({ width: MAX_WIDTH, withoutEnlargement: true });

  let out;
  if (ext === '.png') {
    out = await image.png({ quality: PNG_QUALITY, palette: true, compressionLevel: 9 }).toBuffer();
  } else {
    out = await image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true }).toBuffer();
  }

  const after = out.length;
  if (after >= before) return { file, before, after: before, skipped: true, resized: false };
  if (!DRY) await writeFile(file, out);
  return { file, before, after, resized };
}

let totalBefore = 0, totalAfter = 0, changed = 0, skipped = 0, resizedCount = 0;
for await (const file of walk(ROOT)) {
  const r = await optimise(file).catch((e) => { console.error(`FAILED ${file}: ${e.message}`); return null; });
  if (!r) continue;
  totalBefore += r.before;
  totalAfter += r.after;
  if (r.skipped) { skipped++; continue; }
  changed++;
  if (r.resized) resizedCount++;
  console.log(`${path.relative(ROOT, r.file)}  ${kb(r.before)} -> ${kb(r.after)}${r.resized ? ' (resized)' : ''}`);
}
console.log(`\n${DRY ? '[dry run] ' : ''}${changed} files rewritten (${resizedCount} resized), ${skipped} already optimal.`);
console.log(`Total: ${kb(totalBefore)} -> ${kb(totalAfter)} (${((1 - totalAfter / totalBefore) * 100).toFixed(0)}% smaller)`);
