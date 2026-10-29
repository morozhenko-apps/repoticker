# Mode B — settings inventory and native acceptance CI contract

Baseline `c5c6f4ec77b33305cd2d05e6cca8d189f68ca990`. Date 2026-10-29.

## Evidence, scope and architecture

The last Preflight #40962453233 is green (494/494 Node,
Linux native, Rust core and Clippy). Its V8 report measured **63.32%
lines, 58.36% branches, 49.65% functions across selected UI source**.
The main deficit is the stateful `settings.mjs` controller (58.07%
lines / 50.00% branches / 48.44% functions), while billing and
runner collection already have >95% branch coverage.

Unpublished acceptance workflow `desktop-acceptance-candidates.yml`
currently matches only specific native source files. GitHub therefore
did not schedule Windows native test/NSIS build for the last
`github_api.rs` and `github_etag_cache.rs` changes, despite
Preflight compiling Linux. This is an incomplete code-path trigger,
not evidence that Windows native is green on the latest SHA.

No new public interface, security policy, persistent format or product
behavior is authorized by this testing-only stage.

## Stage order

1. **Native acceptance trigger integrity** (CI infrastructure):
   match the native Tauri Rust source tree, Rust core source tree,
   native assets/capabilities, and WebView JS changes as well as the
   established version/packaging paths, but exclude docs-only churn.
   Add a deterministic Python contract test that parses the workflow
   push paths and checks actual representative source changes would
   trigger acceptance. Do not loosen main/tag publishing controls.
2. **Settings live-controller branch coverage**: extend the
   existing `settings-github-confirm.test.mjs` deterministic
   WebView + IPC fixture without changing `settings.mjs`.
   Exercise repo inventory pagination exhaustion, partial/stale
   owner-repository read, bounded error recovery and exact
   transactional scope selection. Keep saved repo selection and
   owner identity untouched if an external read is denied or
   if an old owner request resolves after the new owner.
3. **Evidence / traceability**: record new test names and the
   measured coverage baseline separately. No invented post-change
   coverage numbers or mutation results.
4. **Single verification**: commit docs separately from code,
   then push one coherent fast-forward to `dev`; automatic
   Preflight and Windows/KDE acceptance must then execute at
   the same new commit SHA. Stop; no CI polling.

## Risks / rollback

- Risk: Windows acceptance takes substantial compute time. Restrict
  push paths to production application code, native manifests and
  packaging contracts rather than Markdown or arbitrary test docs.
- Risk: asynchronous Settings fixture depends on browser event order.
  Inject an explicit deferred promise and use deterministic
  event/microtask completion, not sleeps or network APIs.
- Roll back the individual commit if any test exposes a production
  architectural conflict; no workaround that reuses an unauthorized
  scope. Existing acceptance of physical OS and locale QA remains.

This is **Mode B** testing/infrastructure. Passing this increment
does NOT conclude exhaustive all-method/branch/mutation coverage.
