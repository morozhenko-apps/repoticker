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

## Implementation evidence — prepared after planning

Implemented in isolated commits, not yet verified on CI:

| Checkpoint | Implemented source | Status |
| --- | --- | --- |
| Candidate trigger completeness | `.github/workflows/desktop-acceptance-candidates.yml` adds whole Tauri native Rust / Rust core / native capabilities+icons / WebView source patterns; preserves existing exact version and release package paths | Source complete; CI pending |
| Trigger contract positive/negative | `tests/test_release_native_candidate_paths.py`: representative native source edits must trigger; README/Markdown-only must not; locked Windows/KDE builds must remain unpublished | Test authored; CI pending |
| Settings repo pagination saturation | `tests/settings-github-confirm.test.mjs`: exactly 10 × 100 unique repo page entries; only 100 rendered concurrently; filter can reach page-10 item; draft not persisted before OK | Test authored; CI pending |
| Settings repo permission denial | Same test file: saved selected subset survives failing repo inventory and Cancel without changing native scope | Test authored; CI pending |
| Settings cross-account in-flight race | Same file: late account-A repo list cannot override already loaded account-B rows after scope change; neither choice is committed before OK | Test authored; CI pending |
| Corrupt installation list | Same file: one valid and one invalid installation must not auto-authorize a guessed account | Test authored; CI pending |

**No product logic or persistence contract was changed.**
The deterministic Settings fixture was extended with a controlled
repository-page source, synthetic denial and an unresolved old-account
reply. It does not make network calls or launch a WebView.

## Exact-source CI evidence policy

The preexisting SHA
`c5c6f4ec77b33305cd2d05e6cca8d189f68ca990`
passed [Preflight #40962453233](https://github.com/morozhenko-apps/repoticker/actions/runs/40962453233).
Its instrumented JS totals were **63.32% line, 58.36% branch and
49.65% function**; `settings.mjs` was **58.07% line,
50.00% branch and 48.44% function**. These numbers are baseline
only. A changed SHA must obtain its own measured V8 results.

Windows native and NSIS acceptance on that SHA was **not scheduled**,
because the candidate trigger did not include the changed
`github_api.rs` and `github_etag_cache.rs`. A new exact-SHA
Windows/KDE candidate run is a required verification of this fix.

Mode B Stage 12 remains open even if these targeted tests pass; the
remaining unvisited branches of `settings.mjs` and platform-specific
native code still require evidence or explicit, justified exclusion.
