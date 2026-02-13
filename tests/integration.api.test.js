const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('integration: cache service defines namespace support', () => {
  const file = path.join(__dirname, '..', 'services', 'cacheService.js');
  const source = fs.readFileSync(file, 'utf8');

  assert.match(source, /this\.namespace\s*=\s*process\.env\.CACHE_NAMESPACE\s*\|\|\s*'sgai'/);
  assert.match(source, /increment\(key,\s*ttlSeconds\s*=\s*60\)/);
});
