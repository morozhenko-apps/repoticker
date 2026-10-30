# Mode B — Settings authorization draft isolation and device-flow diagnostics

Baseline source: `a0facc0e0f3a082c50ccd10a56bee7a7e367e67c`. Mode B risk-first test and targeted fix, 2026-10-30.

## Exact baseline evidence

- [Preflight #40973073782](https://github.com/morozhenko-apps/repoticker/actions/runs/40973073782): **508/508** Node tests passed; Rust formatting, core/native Linux tests and Clippy passed.
- [Unpublished Windows/KDE acceptance #40973073783](https://github.com/morozhenko-apps/repoticker/actions/runs/40973073783): both OS candidate jobs passed.
- V8 measured `settings.mjs`: **62.56% line, 52.03% branch**; selected UI-source aggregate **56.10% branch**. Neither measures the entire repository.

## Root cause: draft disconnect vs asynchronous reconciliation

`settings.mjs` implements GitHub disconnect as a **transactional draft**:
the wallet credential is retained until OK invokes `github_disconnect`;
Cancel must discard that draft.

However `repoticker-github-auth` is an asynchronous reconciliation event
that invokes `refreshGithub`. A credential-status result while the
user has a pending disconnect currently sets `githubConnected = true`
and redraws the settings as Authorized, obscuring the user's explicit
pending-disconnect intent. It must not accept an old wallet state as
permission to undo the draft. The existing `monitorScopesRevision`
invalidates in-flight requests that started **before** a disconnect,
but it does not prevent a **new** refresh that starts after the draft.

## Acceptance scenarios

1. **N5/N7 transactional race:** with existing authorization, choose
   Disconnect; assert no credential deletion until OK; dispatch a
   subsequent native authorization event; Pending disconnect must remain
   visible, selection controls hidden, Apply still enabled and the
   account unchanged. Cancel must preserve the old token.
2. **N3/N6 device-code clipboard failure:** start a provisional device
   challenge; deny clipboard IPC; retain the public verification code
   and pending state, show manual Ctrl+C fallback, and permit Cancel
   without mistaking the copy failure for an auth failure.
3. **N3 device-page launch failure:** reject `github_open_device_page`;
   surface a sanitized error and retain the pending authorization
   rather than committing any settings.
4. **N7 untrusted reason strings:** a failed native auth status with an
   unknown reason must use the fixed safe label, not echo arbitrary
   diagnostic data into the Settings WebView. Known reason categories
   must use their fixed localized messages.
5. **N5 native pending phase on opening Settings:** opening during
   authorization must display pending, disable Apply and enable a
   clean cancellation path without revoking a previously saved token.

## Change and proof policy

- Record the test contract **before** editing source.
- Extend the existing deterministic real-controller IPC fixture.
- Fix only `refreshGithub` draft-disconnect reconciliation; preserve
  revision checks and all existing cancellation/OK semantics.
- Tests and production code get separate atomic commits. Follow with
  docs-only evidence; push only once to `dev`, no new branch.
- Native auth's `github_cancel` is an infallible command; do not
  invent a provider failure for it. No new OAuth permissions or
  public interfaces are needed.
- Stop after the push; the new exact-SHA CI result is pending and no
  post-change coverage or passing-test counts may be claimed.

Mode B remains open after this targeted risk reduction.

## Progress

- [x] Baseline CI and event/draft production behavior reviewed.
- [x] Risk and test plan captured before implementation.
- [ ] Deterministic tests and minimal source repair.
- [ ] Diff and source-contract review.
- [ ] Exact-SHA Preflight and OS acceptance evidence.
