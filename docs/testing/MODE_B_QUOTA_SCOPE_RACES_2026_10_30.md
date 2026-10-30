# Mode B — detached quota WebView: cross-account provenance and IPC races

**Date:** 2026-10-30. **Baseline SHA:** `26a432ead1e83953c27fa35f92c3f544ba6385d5`.

## Verified baseline

- [Preflight #41017819333](https://github.com/morozhenko-apps/repoticker/actions/runs/41017819333) **passed**, 513/513 Node tests, Rust core/native Linux, Rustfmt and Clippy.
- [Unpublished Windows/KDE acceptance #41017819197](https://github.com/morozhenko-apps/repoticker/actions/runs/41017819197) **passed** both OS jobs.
- V8 `quota.mjs`: **91.35% lines, 72.86% branches, 81.48% functions**. Aggregate selected UI: **60.03% lines, 55.46% branches, 47.92% functions**. These are exact-SHA selected-source metrics, not whole-repository coverage.

## Risk / root cause

`quota.mjs::selectedOrganization` currently selects
`snapshot.github_monitor_org || snapshot.runner_state.scope.organization`.
The monitor-only update event reads a new native monitor snapshot without
re-reading configuration, intentionally avoiding expensive local Git
discovery. Thus an old configured organization can coexist briefly
with a *different* organization's new runner snapshot. Preferring the
old organization for fresh billing in that state creates cross-account
billing provenance confusion.

The controller already invalidates old asynchronous billing requests
when the selected scope changes. That safeguard is insufficient while
the selected scope itself remains an old-but-nonempty value.

## Design decision and acceptance cases

- **N5/N7/N10 identity parity:** when explicit configured account and
  native monitor evidence both name nonempty *different* accounts,
  `selectedOrganization` must fail closed as the empty scope rather
  than requesting billing for either mismatched account. Case-only
  differences are the same GitHub identity. If native scope is absent,
  preserve the explicit Settings choice; with no explicit scope,
  preserve the validated native suggestion.
- **N5 stale async:** an older initial popup snapshot cannot repaint
  a newer `repoticker-monitor-updated` event; newest counts stay.
- **N3 error handling:** a failed lightweight monitor IPC paints
  unavailable rather than inventing counts, while preserving the
  no-`get_snapshot` invariant.
- **N5 billing generation:** a late result for a previous organization
  must not overwrite a new account's quota after scope change.
- **N7 diagnostic privacy:** no raw failed GitHub REST exception may
  appear in the detached popup.

## Implementation constraints

1. Add real-popup tests via deterministic IPC/WebView fixture,
   using `node:test` and finite promise controls, not timers,
   network calls or a graphical display.
2. Use minimal, pure fail-closed guard in `selectedOrganization`;
   leave the native trust boundary, transparent tooltip geometry,
   billing cache, permissions and public APIs untouched.
3. Separate docs, test and production code commits. One
   fast-forward push to `dev`, no releases or new long-lived branches.
4. Record the implemented coverage contract; new exact-SHA CI
   remains unverified until the owner asks for the result. Stop
   after push, do not poll CI.

Mode B Stage 12 remains open; this covers a subset of the popup
race and billing paths, not global coverage completion.

## Progress

- [x] Source-based cross-scope risk identified; verified green baseline.
- [x] Decision and acceptance scenarios recorded before implementation.
- [ ] Deterministic popup tests implemented.
- [ ] Production guard and source review.
- [ ] New exact-SHA CI.
