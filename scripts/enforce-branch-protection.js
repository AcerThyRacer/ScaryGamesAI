/*
 * Apply GitHub branch protection settings for required quality gates.
 *
 * Usage:
 *   GITHUB_TOKEN=... GITHUB_OWNER=org GITHUB_REPO=repo node scripts/enforce-branch-protection.js
 *
 * Optional:
 *   GITHUB_BRANCH=main
 *   REQUIRED_CHECKS=quality
 */

const https = require('https');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[branch-protection] Missing required env var: ${name}`);
  }
  return value;
}

function apiRequest({ method, path, token, body }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const req = https.request(
      {
        hostname: 'api.github.com',
        method,
        path,
        headers: {
          'User-Agent': 'ScaryGamesAI-branch-protection-script',
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
              }
            : {})
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const isJson = (res.headers['content-type'] || '').includes('application/json');
          const parsed = isJson && raw ? JSON.parse(raw) : raw;

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: parsed });
            return;
          }

          reject(
            new Error(
              `[branch-protection] GitHub API ${res.statusCode}: ${
                typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
              }`
            )
          );
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  const token = requireEnv('GITHUB_TOKEN');
  const owner = requireEnv('GITHUB_OWNER');
  const repo = requireEnv('GITHUB_REPO');
  const branch = process.env.GITHUB_BRANCH || 'main';
  const requiredChecks = (process.env.REQUIRED_CHECKS || 'quality')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!requiredChecks.length) {
    throw new Error('[branch-protection] REQUIRED_CHECKS cannot be empty');
  }

  const protectionPayload = {
    required_status_checks: {
      strict: true,
      contexts: requiredChecks
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
      required_approving_review_count: 1,
      require_last_push_approval: false
    },
    restrictions: null,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: false,
    required_conversation_resolution: true,
    lock_branch: false,
    allow_fork_syncing: true
  };

  const path = `/repos/${owner}/${repo}/branches/${branch}/protection`;
  await apiRequest({
    method: 'PUT',
    path,
    token,
    body: protectionPayload
  });

  console.log(
    `[branch-protection] Applied protection for ${owner}/${repo}:${branch} with checks: ${requiredChecks.join(', ')}`
  );
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
