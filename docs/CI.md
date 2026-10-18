# CI baseline (adapted from rQuickShare)

Source baseline reviewed on 2026-10-18:
- `morozhenko-apps/rquickshare/.github/workflows/lint.yml` (Preflight; Rust format, frontend lint/typecheck/tests, core Rust tests, Clippy; fast branches).
- `morozhenko-apps/rquickshare/.github/workflows/build.yml` (explicit manual package smoke).
- `docs/native-tagged-release.md` (strict repeated release verification gated on exact immutable SHA, credentials isolated).

RepoTicker takes the invariants, not Quick Share's test harness, Tauri dependencies or release credential model.

## Workflows

`preflight.yml`: push dev/main, PR into dev/main and manual. Permission `contents:read`, per-ref cancel-in-progress. Jobs:
- Rust format + core tests + Clippy.
- Frontend syntax and Node built-in test runner.
- Desktop Tauri compile smoke on Ubuntu 24.04 with Linux native dependencies.
- Final aggregate result for branch protection.

`strict.yml`: manual 10 consecutive passes of core and UI tests on a single checkout SHA. No release, artifact publishing, deploy credentials, key material or long-lived secrets. This is an early safety regression gate; it is **not** certification of a completed product.

## Branch policy

`dev` for development; `main` for reviewed stable snapshots. Fast preflight on both. Review a PR into main after CI green. Recommended GitHub rulesets (must be configured by repository owner; code cannot enable them by itself):
- protect main from force pushes/deletion;
- require PR review and successful `Preflight result`;
- allow only verified updates; restrict privileged workflow edits.
- do not add release secrets until release workflow and packages are explicitly approved.

No configured branch protection, passing run, shipped binary or release is claimed by documentation alone.

## Next CI gates

1. Real OS testing on KDE Wayland, Windows and macOS, including tray placement, notification focus and teardown.
2. Git adapter tests with temporary bare/remotes, dirty/index/untracked, diverged, detached HEAD, missing upstream and corrupt worktree metadata.
3. GitHub API fixtures, pagination, timeout/429, rate-limit behavior, token rejection and stale state.
4. Signed webhook vectors, replay/idempotency and disconnect/reconnect reconciliation.
5. Desktop packaging build and smoke per supported OS, followed by protected tagged release.

Before declaring a gate green, inspect actual run ID, exact source commit and failing/passing job results. Never confuse configured checks with completed tests.
