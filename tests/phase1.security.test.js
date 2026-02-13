const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

test('phase1 security: social dare banner avoids innerHTML for URL-derived fields', async () => {
  const socialPath = path.join(__dirname, '..', 'js', 'social.js');
  const source = await fs.readFile(socialPath, 'utf8');

  assert.doesNotMatch(source, /dareBar\.innerHTML\s*=/);
  assert.match(source, /fromStrong\.textContent\s*=\s*from/);
  assert.match(source, /scoreStrong\.textContent\s*=\s*score/);
});

test('phase1 security: server uses allowlist CORS + helmet and express.static', async () => {
  const serverPath = path.join(__dirname, '..', 'server.js');
  const source = await fs.readFile(serverPath, 'utf8');

  assert.match(source, /const helmet = require\('helmet'\)/);
  assert.match(source, /CORS_ALLOWED_ORIGINS/);
  assert.match(source, /app\.use\(cors\(corsOptions\)\)/);
  assert.doesNotMatch(source, /app\.use\(cors\(\)\)/);

  assert.match(source, /app\.use\(express\.static\(__dirname,\s*\{/);
  assert.doesNotMatch(source, /fs\.readFile\(/);
  assert.doesNotMatch(source, /fs\.existsSync\(/);
});
