/*
 * Enforces frontend bundle size budgets in CI.
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

const MAX_JS_KB = Number(process.env.BUNDLE_MAX_JS_KB || 220);
const MAX_CSS_KB = Number(process.env.BUNDLE_MAX_CSS_KB || 220);
const MAX_TOTAL_JS_KB = Number(process.env.BUNDLE_MAX_TOTAL_JS_KB || 1400);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fp, out);
    } else {
      out.push(fp);
    }
  }
  return out;
}

function kb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function readAssetSizes() {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error('dist/assets not found. Run "npm run build" before bundle budget checks.');
  }

  const files = walk(ASSETS_DIR);
  const jsFiles = [];
  const cssFiles = [];

  files.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    const size = fs.statSync(file).size;
    const record = {
      file: path.relative(DIST_DIR, file).replace(/\\/g, '/'),
      size,
      sizeKb: kb(size)
    };

    if (ext === '.js') jsFiles.push(record);
    if (ext === '.css') cssFiles.push(record);
  });

  return { jsFiles, cssFiles };
}

function check() {
  const { jsFiles, cssFiles } = readAssetSizes();
  const failures = [];

  const totalJsBytes = jsFiles.reduce((sum, file) => sum + file.size, 0);
  const totalJsKb = kb(totalJsBytes);

  jsFiles.forEach((file) => {
    if (file.sizeKb > MAX_JS_KB) {
      failures.push(`JS budget exceeded: ${file.file} = ${file.sizeKb}KB (limit ${MAX_JS_KB}KB)`);
    }
  });

  cssFiles.forEach((file) => {
    if (file.sizeKb > MAX_CSS_KB) {
      failures.push(`CSS budget exceeded: ${file.file} = ${file.sizeKb}KB (limit ${MAX_CSS_KB}KB)`);
    }
  });

  if (totalJsKb > MAX_TOTAL_JS_KB) {
    failures.push(`Total JS budget exceeded: ${totalJsKb}KB (limit ${MAX_TOTAL_JS_KB}KB)`);
  }

  if (failures.length) {
    console.error('[bundle-budget] FAILED');
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log('[bundle-budget] PASSED');
  console.log(` - JS files: ${jsFiles.length}, total ${totalJsKb}KB`);
  console.log(` - CSS files: ${cssFiles.length}`);
}

try {
  check();
} catch (error) {
  console.error('[bundle-budget] FAILED:', error.message);
  process.exit(1);
}
