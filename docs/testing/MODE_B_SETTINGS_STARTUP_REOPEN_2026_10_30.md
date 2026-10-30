# Mode B — Settings startup and reopen race contract

Date: 2026-10-30. Baseline `56d9cff464fc68c29ad76695a3ab3f5454617b7b`.

## Verified prior evidence

[Preflight #41058934277](https://github.com/morozhenko-apps/repoticker/actions/runs/41058934277)
passed **529/529 Node tests**, Linux native desktop, Rust format/core tests
and Clippy. Selected V8 UI source aggregate: **59.57% lines,
54.69% branches, 47.72% functions**; `settings.mjs`: **46.79%
lines, 46.00% branches, 38.98% functions**. The measured file
percentages vary with test instrumentation; do not present these
as product-wide coverage or a strictly monotonic trend.

## Root cause identified from live controller source

The Settings startup calls `refresh()` with a catch that only
renders `message(error)`. Unlike the `repoticker-settings-opened`
event catch, initial failure never clears `githubChecking`,
so the GitHub indicator can remain at "Checking connection...".
The reopen catch renders a native rejection string directly and
does not disable an earlier editable draft after a failed reload.

There is also no refresh generation guard: a slow original
`get_settings_config` response can arrive after a newer reopen
request, replacing the current form model and language.

Possible fault sources considered: rejected settings read, rejected
wallet read, unsupported autostart status, overlapping reopen calls,
late old response, and differing error handlers. The existing
autostart read is explicitly optional (`.catch(() => null)`).
The actionable issues are uncoordinated lifecycle handling and
lack of a single generation check.

## Acceptance requirements

1. First config read fails: UI reports "Connection unavailable" and
   "Cannot initialize settings.", never remains "Checking connection...",
   never displays raw exception or enables Apply.
2. First wallet read fails: same safe unavailable state; no
   credential command, save or monitoring write is performed.
3. Previously valid edited draft, then failed reopen: Apply must be
   disabled, even when the prior draft had uncommitted edits; no
   stale save on a programmatic click. A subsequent successful reopen
   must restore a clean trusted form.
4. Delayed original config read resolves *after* a successful reopen:
   old roots, language and selections cannot overwrite the newer
   configuration. A late failure cannot override a newer success.
5. Only the currently active request may report initialization failure.
   Preserve the existing native auth and repository revision guards.

## Implementation

- Add a single monotonic Settings refresh revision; test failure and
  delayed-completion order with controlled promises, not timers.
- Share one safe failure path between startup and reopened Settings.
  A failed initialization disables Apply until a **successful** read.
  Initial form state, existing native refresh and Cancel behavior
  otherwise remain unchanged.
- Keep changes limited to `apps/desktop/ui/settings.mjs`,
  its existing real-controller test fixture, and this test note.
- Write separate docs, tests, code, and docs evidence commits.
  One fast-forward to `dev`, no temporary branch, no release/main
  changes. Stop after push; CI results remain unverified until
  a new user checkpoint.

Mode B Stage 12 is not completed by this targeted fix.

## Progress

- [x] Prior exact-SHA CI checked once.
- [x] Failure and race mechanisms inspected in actual source.
- [x] Acceptance plan documented before code change.
- [x] Four new real-controller failure-injection tests added;
  one existing wallet-failure expectation updated to a safe message.
- [x] One source fix and exact diff review completed.
- [ ] Exact-SHA CI: not executed or measured at this commit.

## Implementation ledger

**Test commit** `e89a507219004322b415e1969dc6a78d85177e42`:
four independent test cases exercise (1) initial config read failure,
(2) failed reopened Settings with an uncommitted preference edit and
recovery after a subsequent successful reload, (3) late original
config read after a newer successful reopen, and (4) a late rejection
after successful reopen. The fixture captures native `invoke` calls,
injects deterministic first-request promises and native read errors
and provides an explicit reopened-window event. No native event was
invented.

**Code commit** `6cf45c579db3eaa9e10f0f6c494984bce09d0f60`:
`settings.mjs::refresh` increments a monotonic generation on each
opening, blocks Apply while reading, ignores stale success/failure,
and handles the current generation's error in one localized,
non-disclosing path. Any failed config/auth initialization disables
Apply until successful reload. The programmatic Apply handler has
the matching guard. Existing wallet, autostart, folder and monitoring
transactions remain in their original order.

**Static checks:** exact GitHub diff contains only the controller,
its test fixture and this doc. All four test declarations are present;
no accidental `message(error, true)` remains in the startup handler;
native event listener still opens Settings, and both
`settingsLoading` and `settingsInitFailed` gate Save.

**Execution limits:** no local full checkout exists; the runtime
cannot resolve GitHub for an independent Node execution. This is
a code-level inspection, **not a new test pass**. The exact pushed
SHA must pass Preflight; it also triggers unpublished platform
acceptance due to its WebView production change. Do not poll active
Actions jobs or infer their result. New source coverage remains
unmeasured.

