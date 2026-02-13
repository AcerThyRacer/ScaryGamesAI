/*
 * Runtime guardrail checks for CI/regression protection.
 * Ensures key security/performance gates remain wired in automation.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readText(relativePath) {
  const full = path.join(ROOT, relativePath);
  return fs.readFileSync(full, 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function hasScript(scripts, name) {
  return !!(scripts && typeof scripts[name] === 'string' && scripts[name].trim());
}

function includesAll(value, fragments) {
  const source = String(value || '');
  return fragments.every((part) => source.includes(part));
}

function evaluateGuardrails(snapshot) {
  const failures = [];

  const scripts = snapshot.packageJson && snapshot.packageJson.scripts
    ? snapshot.packageJson.scripts
    : {};

  const requiredScripts = [
    'lint',
    'test:unit',
    'test:integration',
    'test:e2e',
    'build',
    'ci:bundle-budget',
    'ci:guardrails',
    'ci:quality'
  ];

  requiredScripts.forEach((name) => {
    if (!hasScript(scripts, name)) {
      failures.push(`Missing npm script: ${name}`);
    }
  });

  if (hasScript(scripts, 'ci:quality')) {
    const requiredChain = [
      'npm run lint',
      'npm run test:unit',
      'npm run test:integration',
      'npm run test:e2e',
      'npm run build',
      'npm run ci:bundle-budget',
      'npm run ci:guardrails'
    ];

    if (!includesAll(scripts['ci:quality'], requiredChain)) {
      failures.push('npm script ci:quality does not include all required quality stages');
    }
  }

  const workflow = String(snapshot.ciWorkflow || '');
  if (!workflow.includes('npm run ci:bundle-budget')) {
    failures.push('Workflow missing bundle budget stage (npm run ci:bundle-budget)');
  }
  if (!workflow.includes('npm run ci:guardrails')) {
    failures.push('Workflow missing runtime guardrail stage (npm run ci:guardrails)');
  }

  const observabilitySource = String(snapshot.observabilitySource || '');
  if (!/recordSecurityEvent/.test(observabilitySource) || !/recordPerfEvent/.test(observabilitySource)) {
    failures.push('services/observability.js must expose recordSecurityEvent and recordPerfEvent');
  }

  const authSource = String(snapshot.authMiddlewareSource || '');
  if (!/recordSecurityEvent/.test(authSource)) {
    failures.push('middleware/auth.js should emit security telemetry through recordSecurityEvent');
  }

  const rateLimitSource = String(snapshot.rateLimitSource || '');
  if (!/rate_limit\.exceeded/.test(rateLimitSource)) {
    failures.push('middleware/rateLimit.js should emit rate_limit.exceeded telemetry');
  }

  return failures;
}

function loadRepositorySnapshot() {
  return {
    packageJson: readJson('package.json'),
    ciWorkflow: readText('.github/workflows/ci-cd.yml'),
    observabilitySource: readText('services/observability.js'),
    authMiddlewareSource: readText('middleware/auth.js'),
    rateLimitSource: readText('middleware/rateLimit.js')
  };
}

function run() {
  const snapshot = loadRepositorySnapshot();
  const failures = evaluateGuardrails(snapshot);

  if (failures.length) {
    console.error('[ci-guardrails] FAILED');
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log('[ci-guardrails] PASSED');
  console.log(' - Runtime guardrails are wired in package scripts, CI workflow, and telemetry hooks');
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error('[ci-guardrails] FAILED:', error.message);
    process.exit(1);
  }
}

module.exports = {
  evaluateGuardrails,
  loadRepositorySnapshot
};
