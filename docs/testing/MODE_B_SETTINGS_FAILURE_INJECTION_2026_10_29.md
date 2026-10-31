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
- [x] Scoped fixture failure injections and seven test cases implemented.
- [x] Independent source/diff review: all six native command boundaries
  exist in production `settings.mjs`; no production files modified.
- [ ] Exact-SHA CI observed (deferred to next user checkpoint).

## Test implementation / review ledger

- **Wallet initial status failure:** assert Connect/Apply stay unavailable,
  no write IPC is sent, Cancel safely closes.
- **Device challenge rejected:** assert no fake user code/pending state,
  no disconnect and the dialog can close.
- **Config write denied:** assert edited opt-in is still a draft,
  save error visible, no unrelated scope, autostart or disconnect writes.
- **GitHub scope write denied:** assert the persisted account remains the
  previous account, no close, draft can be retried or cancelled.
- **Wallet revoke denied:** assert token never reports removed, native
  account persists, dialog stays open and Cancel remains harmless.
- **Invalid native ignored-child selection:** reject `..` basename,
  display error and do not persist an exclusion.
- **Native picker at maximum exclusions:** 100 existing names block
  the 101st unique name without changing the native configuration.

**Implementation:** one scoped test-only commit in
`tests/settings-github-confirm.test.mjs`. The existing real-controller
fixture has five new optional injected native-command errors.
No production source, Tauri permissions, workflows, release/packaging
code, public user docs, external services, or main/tag refs changed.

**Review performed:** inspected both old and new test source,
verified each six native IPC names exists in the production controller,
and checked the exact GitHub commit diff. This is *static* review.
The seven new tests and new JS coverage percentages have **not**
yet been executed or measured at this commit. A successful Preflight
at the eventual pushed SHA is mandatory before claiming pass.

The previously measured `settings.mjs` V8 fraction decreased after
four added successful full-controller scenarios in the prior stage;
do not attribute a coverage change to this batch without inspecting
the new V8 report's instrumented module population and denominators.

