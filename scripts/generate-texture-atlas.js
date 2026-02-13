/*
 * Texture atlas manifest generator (Phase 6)
 * Groups image assets per folder into atlas metadata placeholders.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'assets');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'atlases');
const IMG_RE = /\.(png|jpg|jpeg|webp|avif)$/i;

function walk(dir, output = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fp, output);
    else if (IMG_RE.test(entry.name)) output.push(fp);
  }
  return output;
}

function relativeToAssets(file) {
  return path.relative(path.join(__dirname, '..', 'assets'), file).replace(/\\/g, '/');
}

function groupByFolder(files) {
  const groups = new Map();
  for (const file of files) {
    const folder = path.dirname(relativeToAssets(file));
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder).push(file);
  }
  return groups;
}

function createManifest(files) {
  const frames = {};
  files.forEach((f, i) => {
    const key = path.basename(f);
    frames[key] = {
      frame: { x: 0, y: i * 64, w: 64, h: 64 },
      source: relativeToAssets(f)
    };
  });

  return {
    meta: {
      app: 'ScaryGamesAI',
      generatedAt: new Date().toISOString(),
      note: 'Placeholder atlas manifest. Replace with packed atlas coordinates from production packer.'
    },
    frames
  };
}

function run() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.log('[texture-atlas] no assets directory');
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = walk(SOURCE_DIR).filter((f) => !f.includes(`${path.sep}atlases${path.sep}`));
  const groups = groupByFolder(files);

  for (const [folder, groupFiles] of groups.entries()) {
    if (groupFiles.length < 2) continue;
    const safeName = folder.replace(/[\/]/g, '__').replace(/[^a-zA-Z0-9_-]/g, '_') || 'root';
    const manifest = createManifest(groupFiles);
    fs.writeFileSync(path.join(OUT_DIR, `${safeName}.atlas.json`), JSON.stringify(manifest, null, 2));
  }

  console.log(`[texture-atlas] generated atlases in ${OUT_DIR}`);
}

run();
