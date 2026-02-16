const test = require('node:test');
const assert = require('node:assert/strict');

test('e2e smoke: service worker script includes current version marker', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');

  const swPath = path.join(__dirname, '..', 'sw.js');
  const swSource = await fs.readFile(swPath, 'utf8');

  // Version bumps are expected; assert presence + correct format instead of pinning to a single value.
  assert.match(swSource, /const SW_VERSION\s*=\s*'sgai-v\d+'/);
  assert.match(swSource, /const API_CACHE_ALLOWLIST\s*=\s*new Set\(\[/);
  assert.match(swSource, /API_CACHE_ALLOWLIST\.has\(url\.pathname\)/);
  assert.match(swSource, /event\.respondWith\(fetch\(request\)\)/);
});
