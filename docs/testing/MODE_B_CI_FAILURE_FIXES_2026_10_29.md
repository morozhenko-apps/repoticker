# Mode B CI failure root-cause and repair — 2026-10-29

## Frozen evidence

Exact SHA: `c507201398ce18479e54a61c250a6bb7805504b4`. GitHub Actions
[Preflight #40959460474](https://github.com/morozhenko-apps/repoticker/actions/runs/40959460474)
and [unpublished OS candidates #40959460394](https://github.com/morozhenko-apps/repoticker/actions/runs/40959460394)
both completed **failure**.

| Gate | Actual result |
| --- | --- |
| V8 JS unit pass | 494 executed, 492 pass, 2 fail; all 12 executable mutation checks pass |
| Native Linux Tauri | 64/66 pass; same two billing-projection assertions fail |
| Native Windows Tauri | 68/70 pass; same two billing-projection assertions fail |
| KDE DEB/AppImage candidate | Successful |
| Windows NSIS candidate | Blocked by native test failure, packaging skipped |
| Rust format | Failed on four changed files; core tests and Clippy skipped |
| Node V8 all-source coverage | 63.32% lines, 58.31% branches, 49.65% functions |

## Root-cause decisions (not test bypasses)

1. **Billing numeric representation.** `project_billing` validates
   `grossQuantity` through `as_f64` and then emits that floating
   conversion into JSON. Integral source values become `20.0` and
   `0.0`; the JS consumption is numerically equivalent, but existing
   native API contracts require the provider's validated JSON number
   representation. Preserve the original validated numeric JSON
   `Value` in the allowlisted projection instead of casting the
   payload to `f64`. Add both integral and fractional assertions.
   Continue rejecting negative/nonfinite/invalid data.

2. **Installation pagination fixture.** The failing
   `github-monitor.test.mjs` fixture returns the same 100
   ID/login pairs on all ten pages. The new collector correctly
   deduplicates identical installation identities, yielding 100
   unique items. Make this fixture return 100 distinct entries on
   *each* page to prove 1000 distinct results with `complete=false`.
   Existing tests independently assert overlapping page
   deduplication. Never remove that production check.

3. **Scope provenance fixture.** The failing `mode-b-monitor-edges`
   partial tasks refresh passes a hand-built `previousState`
   without `scope`. A prior snapshot without ownership evidence
   must not be reused. Supply the known same-org/same-selection
   scope in this fixture, preserving the positive test's intended
   assertion. The separate negative test continues to refuse
   reuse when scope is absent.

4. **Rust formatting.** Normalize only files identified in the
   `cargo fmt --all -- --check` diff:
   `github_api.rs`, `github_etag_cache.rs`,
   `config_store.rs`, `github_auth.rs`.
   This is whitespace and `rustfmt` expression layout, not
   disabling the format gate.

## Verification and cutover

One isolated documentation commit, followed by one focused source/test
commit on `dev`. Review exact source diff/commit ancestry, then
allow a single Preflight and unpublished OS candidate run on the
new exact SHA; never force a rerun of the failed old SHA or poll
while jobs are running. Keep `main`, release tags, signing,
APT/R2 publication and owner-accepted manual QA untouched.

A green build is **not** a Mode B closeout: measured V8 branch
coverage remains 58.31% for all JS source, and native Rust/Python
branch coverage and whole-code mutation review remain open.
