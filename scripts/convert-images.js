/*
 * Image conversion pipeline (WebP/AVIF)
 * Requires optional dependency: sharp
 */

const fs = require('fs');
const path = require('path');

let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[convert-images] sharp not installed; skipping conversion');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..', 'assets');
const EXT_RE = /\.(png|jpg|jpeg)$/i;
const RESPONSIVE_WIDTHS = [480, 960, 1440];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fp, out);
    else if (EXT_RE.test(entry.name)) out.push(fp);
  }
  return out;
}

async function run() {
  if (!fs.existsSync(ROOT)) {
    console.log('[convert-images] assets directory not found; skipping');
    return;
  }

  const files = walk(ROOT);
  for (const file of files) {
    const base = file.replace(EXT_RE, '');

    await sharp(file).webp({ quality: 82 }).toFile(`${base}.webp`);
    await sharp(file).avif({ quality: 52 }).toFile(`${base}.avif`);

    for (const width of RESPONSIVE_WIDTHS) {
      await sharp(file)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(`${base}-${width}w.webp`);

      await sharp(file)
        .resize({ width, withoutEnlargement: true })
        .avif({ quality: 50 })
        .toFile(`${base}-${width}w.avif`);
    }

    console.log(`[convert-images] ${path.relative(ROOT, file)}`);
  }

  console.log(`[convert-images] complete: ${files.length} files, widths=${RESPONSIVE_WIDTHS.join(',')}`);
}

run().catch((err) => {
  console.error('[convert-images] failed:', err.message);
  process.exit(1);
});
