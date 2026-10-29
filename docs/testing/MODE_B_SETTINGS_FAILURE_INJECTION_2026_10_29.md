# Mode B — Settings failure-injection verification

**Date:** 2026-10-29. **Baseline SHA:** `e430f75ff2b8d1c0e7879dd86d1e7189f8ca2f38`.
**Mode:** B (testing); no product behavior or persistent-format changes.

## Observed baseline

The exact SHA passed [Preflight #40968800725](https://github.com/morozhenko-apps/repoticker/actions/runs/40968800725)
(498/498 Node, Rust formatting, core/native Linux tests, Clippy)
and [unpublished Windows/KDE acceptance #40968800854](https://github.com/morozhenko-apps/repoticker/actions/runs/40968800854).
V8 coverage is **62.60% lines, 57.61% branches, 49.31% functions**
across included UI sources; `settings.mjs` is **45.80% lines,
46.24% branches, 38.33% functions**. Four additional previous-stage
Settings tests passed. These are measured, SHA-specific figures,
not a claim of entire application coverage.

## Root risk and contract

`settings.mjs` is a stateful Tauri WebView controller. The current
positive-path tests cover standard Save/Cancel and one failed
autostart registration, but its negative IPC paths are not
exercised as an explicit group. External OS wallet, device
authorization, config writes, GitHub scope writes and wallet revocation
must never silently present success or erase an existing credential.
All error cases remain within the existing transactional UI contract.

The existing deterministic `tests/settings-github-confirm.test.mjs`
fixture executes the real `settings.mjs` ESM controller with mocked
DOM and native `invoke` transport. Extend it with explicit
command-scoped failure injection and tests for:

1. Failed initial wallet status: connection remains unavailable,
   no authorization or save controls enable, no state is written.
2. Failed device-code request: no pending/connected UI, the
   provisional session can be cancelled without revoking a prior token.
3. Failed `save_settings`: dialog stays open, unchanged
   native monitoring and autostart; draft remains available to retry.
4. Failed `github_set_monitor_org`: existing authorized scope
   remains unchanged, dialog stays open and draft is not accepted.
5. Failed `github_disconnect`: existing credential remains
   valid; dialog stays open and explicit disconnect still needs OK.
6. Invalid ignored-child folder from native picker and overflow
   at the 100-name cap: no dirty persisted state and no silent add.

## Execution plan and rollback

- Add a **docs-only** plan commit before changing tests.
- Modify only the existing Settings IPC fixture and add independent,
  deterministic tests. Do not introduce sleeps or test-only
  branches in production. Retain existing positive cases.
- Add a separate **docs-only** progress/evidence commit; do not
  invent post-change pass counts or new coverage percentages.
- Batch a single fast-forward `dev` update, run normal CI once
  as the final execution gate, and stop without polling.
- Roll back only the focused test commit if it conflicts with a
  proven production contract. No public API, permissions, branch
  protections, user-visible controls, `main` or release changes.
- This advances Mode B risk coverage, not exhaustive Stage 12 signoff.

## Progress

- [x] Baseline CI, source contracts and existing fixture reviewed.
- [x] Risk-based test plan recorded before code changes.
- [ ] Scoped fixture failure injections and test cases implemented.
- [ ] Independent diff/commit review and test evidence ledger.
- [ ] Exact-SHA CI observed (deferred to next user checkpoint).
