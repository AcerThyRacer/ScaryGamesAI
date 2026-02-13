const test = require('node:test');
const assert = require('node:assert/strict');

test('e2e smoke: service worker script includes current version marker', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');

  const swPath = path.join(__dirname, '..', 'sw.js');
  const swSource = await fs.readFile(swPath, 'utf8');

  assert.match(swSource, /const SW_VERSION\s*=\s*'sgai-v2'/);
  assert.match(swSource, /const API_CACHE_ALLOWLIST\s*=\s*new Set\(\[/);
  assert.match(swSource, /API_CACHE_ALLOWLIST\.has\(url\.pathname\)/);
  assert.match(swSource, /event\.respondWith\(fetch\(request\)\)/);
});
