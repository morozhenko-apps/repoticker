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
