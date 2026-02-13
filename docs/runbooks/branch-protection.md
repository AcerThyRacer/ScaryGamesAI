# Branch Protection Runbook (Phase 6)

This runbook enforces merge safety for `main` with required quality gates.

## Required repository settings

- Protect branch: `main`
- Require pull requests before merge
- Require at least `1` approval
- Require code owner review
- Dismiss stale pull request approvals on new commits
- Require conversation resolution before merge
- Require linear history
- Include administrators in protections
- Disallow force pushes and branch deletions
- Require status checks to pass before merge:
  - `quality`

`quality` is produced by [ci-cd.yml](../../.github/workflows/ci-cd.yml) and includes:

- migration verify gate
- lint
- unit tests
- integration tests
- e2e smoke tests
- build
- bundle budget enforcement

## Automated setup via script

Use [enforce-branch-protection.js](../../scripts/enforce-branch-protection.js):

```bash
GITHUB_TOKEN=ghp_xxx \
GITHUB_OWNER=your-org-or-user \
GITHUB_REPO=ScaryGamesAI \
GITHUB_BRANCH=main \
REQUIRED_CHECKS=quality \
node scripts/enforce-branch-protection.js
```

Notes:

- Token must include repository administration permissions.
- Re-run script whenever required check contexts change.

## Manual verification checklist

1. Open GitHub repository Settings → Branches.
2. Confirm protection/ruleset for `main` includes all required settings above.
3. Open an active pull request and confirm merge is blocked until `quality` passes.
4. Confirm direct push to `main` is blocked for non-exempt users.
5. Confirm CODEOWNERS auto-request review is working.
