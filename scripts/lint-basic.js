/*
 * Lightweight repo lint gate:
 * - JS syntax validation via `node --check`
 * - Ensures CI has a deterministic lint stage without external deps
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist']);
const JS_EXT_RE = /\.js$/i;
const LINT_TARGETS = [
  'server.js',
  'sw.js',
  'vite.config.js',
  'api',
  'middleware',
  'services',
  'models',
  'config',
  'scripts',
  'tests',
  'js/page-shell.js',
  'js/perf-entry.js',
  'js/image-optimizer.js',
  'js/game-utils.js'
];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fp, out);
      continue;
    }

    if (JS_EXT_RE.test(entry.name)) {
      out.push(fp);
    }
  }
  return out;
}

function collectTargets() {
  const files = [];

  for (const target of LINT_TARGETS) {
    const fullPath = path.join(ROOT, target);
    if (!fs.existsSync(fullPath)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (JS_EXT_RE.test(fullPath) || path.basename(fullPath) === 'vite.config.js') {
      files.push(fullPath);
    }
  }

  return Array.from(new Set(files));
}

function checkSyntax(file) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return {
      ok: false,
      file,
      output: (result.stderr || result.stdout || 'Unknown syntax error').trim()
    };
  }

  return { ok: true, file };
}

function run() {
  const files = collectTargets();
  const failures = [];

  for (const file of files) {
    const result = checkSyntax(file);
    if (!result.ok) failures.push(result);
  }

  if (failures.length) {
    console.error('[lint-basic] FAILED');
    failures.forEach((failure) => {
      console.error(`\n--- ${path.relative(ROOT, failure.file)} ---`);
      console.error(failure.output);
    });
    process.exit(1);
  }

  console.log(`[lint-basic] PASSED (${files.length} JS files checked)`);
}

run();
