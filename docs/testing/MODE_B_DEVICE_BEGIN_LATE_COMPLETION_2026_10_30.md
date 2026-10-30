# Mode B — pending device-code request and Settings cancellation

Date: 2026-10-30. Baseline `7a8eea8c9580943563c8de86a59f1fc5c7baec3c`.

## Evidence

- [Preflight #41096225911](https://github.com/morozhenko-apps/repoticker/actions/runs/41096225911) passed **541/541** JS tests; Rust format, core tests, Clippy and Linux desktop successful.
- [Unpublished Windows/KDE acceptance #41096225876](https://github.com/morozhenko-apps/repoticker/actions/runs/41096225876) succeeded.
- V8 selected-source coverage at this SHA: `settings.mjs` **57.51% lines, 52.38% branches**, all included JS sources **57.90% lines, 51.82% branches**. Not whole-product coverage.

## Native/JS contract

Native `github_session.rs::github_begin` invalidates previous
attempts and checks its active generation before delivering a public
device code; `github_cancel` invalidates an active attempt.
WebView `settings.mjs`, however, currently accepts any resolved
`github_begin` promise even if the user has meanwhile dismissed
Settings or a later `repoticker-settings-opened` event has replaced
the visible form.

The status polling timer is an internal native in-memory phase query
and must not be restarted by a stale WebView continuation after
Cancel/reopen. Avoid sending extra OAuth requests or deleting existing
wallet credentials.

## Test contract

1. A deferred `github_begin` is single-flight. Cancel Settings
   before it resolves; native `github_cancel` occurs once,
   settings closes, and a late successful challenge cannot populate
   the verification code, reveal device controls, or begin polling.
2. A deferred `github_begin` is overtaken by a new full Settings
   initialization. Its old result cannot overwrite the refreshed
   status, public code or modal state. The native pending phase
   may still legitimately be shown without a code.
3. A rejected device challenge containing sensitive native detail
   must display a fixed localized GitHub authorization error,
   not interpolate `String(error)` into the WebView. No wallet
   cleanup is needed if authorization never began.

## Root cause and change boundary

Six candidates considered: duplicate Connect, stale device challenge
after Settings Cancel, stale device challenge after reopen,
unnecessary wallet cleanup, timer resurrected by late completion, and
native error-text propagation. The already-tested single-flight guard
excludes duplicate Connect. This package addresses **WebView
generation invalidation** and **fixed failure presentation**.

- Use one monotonic request revision for Settings device-code
  completion, invalidated before Cancel and before each full refresh.
- Ignore both successful and failed results of stale requests,
  including stale `finally` mutations.
- Keep native OAuth, wallet storage, event permissions, config schema
  and public command signatures unchanged.
- Docs, test, code and docs evidence as separate commits. One
  non-forced `dev` fast-forward; stop on the new exact-SHA CI.
  Neither a local test pass nor new coverage is asserted before CI.
- Mode B remains open.

## Implementation ledger and evidence boundary

- Plan commit: `12be2db8b19b465d72a0f188b2a291a392504450`.
- Tests commit: `f048445140818e2ef8e9cd52e8c69771a364d2d9`.
  Three live-controller tests use the existing deterministic WebView
  fixture and a controlled deferred native `github_begin` promise.
  They assert no late code after Settings Cancel, no late code after
  a new `repoticker-settings-opened` event, and redaction of
  native challenge rejection details. The original begin-failure
  regression also now expects the fixed error label.
- Source commit: `76f070af8446f2e3acb171fbdf19240d6b4c1666`.
  The JS Settings controller increments a dedicated
  `githubBeginRevision` on begin, full Settings refresh,
  Cancel Settings, and Cancel Device Flow. The resolved/rejected
  promise and its `finally` mutate the UI only when that
  revision remains active. Reopen also clears the previous
  button-disabled state. Failed begin uses the fixed translated
  `GitHub authorization failed.` message.
- Static diff review confirmed changes limited to `settings.mjs`,
  `settings-github-confirm.test.mjs` and this document; the
  existing single-flight test and native OAuth command contracts
  are untouched.
- The **new** tests have **not** been executed at the staged SHA.
  No new pass rate, coverage number, physical acceptance or
  successful build is asserted. Prior green results apply only
  to the baseline SHA.

Checkpoint procedure: one safe fast-forward on `dev`, then stop.
Review the new Preflight and unpublished platform acceptance only
on a subsequent owner-requested checkpoint; never poll an active
workflow within this turn.
