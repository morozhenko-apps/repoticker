# Test strategy and acceptance evidence

Tests must protect local Git data, fail closed on unsafe operations, and never fabricate CI/runners state. Distinguish **source tests**, **packaging jobs**, **local OS smoke** and **public release acceptance**. No artificial coverage percentage is claimed.

## Implemented tests

- Rust pure sync classifier: clean/behind, up-to-date, local ahead, diverged, dirty/untracked, unfinished operation, missing upstream, and bounded concurrency.
- Rust Git integration fixtures with temporary local/bare remotes: shallow discovery, direct enrollment, branch states, fetch-only preservation, safe fast-forward, dirty/untracked refusal, divergence and missing upstream.
- JavaScript presentation/unit checks: compact/drawer/settings invariants, runner unknown/online/busy modeling, safe Actions links, real progress and failure presentation, native icon/About data, popup position and idle behavior.
- Node tests for the **distribution** Worker: strict allowed paths, GET/HEAD vs POST, package-index cache rules and by-hash assets.
- Python release-contract tests: version/tag consistency, canonical artifact names/digests, signed APT fixture and gpgv verification, subkey-only signing authority and R2 artifact allowlisting.

**v0.1.0 evidence:** source Preflight on `dev` and `main` passed for commit `21f3b61d9774b931b57a4e3c83f61b2bcf2bb0ee`; local Python release suite passed 8/8 after installing APT packaging tools. Local user smoke covered DEB install/remove, AppImage launch and persistent settings. The Windows and signed public-APT release jobs require distinct evidence. See [CI.md](CI.md).

## Wayland drag controller regression suite (dev, pending physical acceptance)

The `tests/drag-controller.test.mjs` suite exercises the real
`createCardDragController` and its local-coordinate correction:
signed/clamped local anchor error, no oscillation after compositor movement
returns the pointer to its original local offset, a single native IPC
in flight, dropping stale pointer samples, persistence after the GTK update
acknowledgment, and cancellation/hide before a scheduled frame. External
frame scheduling and native IPC are injected; correction/state logic are
not mocked. The source uses `event.clientX/clientY` and never calculates
frame-to-frame `screenX/screenY` deltas.

The native Rust `linux_surface::shift` dispatches an update on GTK's main
thread and awaits the completion signal off that event thread. The
controller's `apply` promise resolves only after that signal; it does
not replay samples captured before the native update. CI validates
compilation, but smooth motion, compositor frame delivery, popup geometry,
multi-monitor behavior and position persistence still need actual KDE
Wayland acceptance in Issue #2.

## Stable, flaky and OS gates

- Ordinary Preflight is the fast source-code gate. A manual `strict.yml` workflow exists for ten repeated core/UI passes; repetition is not evidence of no flaky tests.
- The project does not currently declare an independent known-flaky suite in CI. Any flaky tests added later must remain traceable and separate from required stable checks; failures must not be suppressed.
- Real OS acceptance is **not** established by compiler success, JS model tests or mock UI tests. Verify actual tray interaction, drag behavior, focus, DPI, multi-monitor, autostart, uninstall and process teardown.

## Required next negative and contract cases

1. **Git discovery:** linked worktree admin files, corrupted `.git`, snapshots, symlink loops/escapes, submodules, deep unexpected directories.
2. **Git sync:** staged/unstaged/untracked combinations, unfinished merge/rebase/cherry-pick markers, concurrent ref/head movement, detached head, hook/credential-helper abuse, multiple remotes, timeout/cancellation.
3. **GitHub REST (after implementation):** 401/403/404/429, secondary rate limits, pagination, stale/reconnect, forbidden runner/billing data, malformed payloads, auth/keyring failure.
4. **Relay (after implementation):** invalid/missing HMAC, byte-equivalence cases, replay, out-of-order event IDs, expired cursor, tenant isolation and disconnect recovery.
5. **UI:** native tray left/right click, focus, idle-hide in compact vs drawer, smooth Wayland dragging ([Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2)), multi-monitor, DND and accessibility.
6. **Distribution:** independently verify Linux APT enrollment/signature/readback, index refresh/rollback, clean install/upgrade/removal; Windows installer and unsigned SmartScreen behavior.

Run stable tests at the final validation gate for a change, and known flaky tests separately if such a suite exists. Re-run only relevant failing diagnostics, not the entire suite after each edit. Any asserted test success requires an actual run ID or local exit status.

## Security regression gate: signing provisioning (implemented)

Implemented a deterministic ephemeral-key integration check using a temp GNUPGHOME:
export signing subkeys, verify subkey-only identity, successfully sign/verify
a fixture with the correct passphrase and reject an incorrect passphrase.
The provisioning flow invokes verification before either GitHub signing
Secret write; a source contract test protects this ordering. No local
production keyring is needed. [Preflight #39333453214](https://github.com/morozhenko-apps/repoticker/actions/runs/39333453214) completed successfully, including the stable Rust/UI/release suites and desktop compile gate.

## KDE drag acceptance failure (2026-10-20)

The `clientX/clientY` controller unit tests and Preflight
[#39335945391](https://github.com/morozhenko-apps/repoticker/actions/runs/39335945391)
passed. On Alcotester KDE Wayland, the same controller still produced
jitter and large correction spikes while the GTK surface stayed at
`390x122`. Thus the unit tests validated the local algorithm in a
mocked coordinate frame but did not validate the compositor's actual
event coordinate behavior. Do not treat them as physical acceptance.

A replacement must use a motion source independent of the moving
surface, test button release/cancel/Escape and loss of focus, and verify
convergence across GTK frame presentation, not just IPC completion.

## Native relative-pointer-v1 implementation (awaiting KDE acceptance)

A native GTK3/GDK Wayland bridge at
`apps/desktop/src-tauri/native/wayland_relative_drag.c` uses the protocol
extension on the existing GDK display and pointer, with no socket reader or
manual event queue dispatch. The Rust callback accumulates subpixel motion
before updating compositor-owned bottom/right margins. The JS client only
serializes gesture start/end and pointer-capture release; it never computes
a movement correction from a changing WebView coordinate frame.

The `tests/native-drag.test.mjs` suite exercises the actual gesture
controller, including early release, ordering of slow native start/stop,
quick repeated gestures, unrelated pointers and unsupported protocol
handling. Additional source assertions prevent reintroduction of the
legacy JS move IPC. CI compiles the native Wayland C bridge on Linux,
but does not have a graphical KWin runtime to exercise its event delivery.

Physical acceptance still needs confirmation that KWin emits
`relative_motion` under an implicit button grab while the Layer Shell
surface moves. Error paths must not leave drag active; Save/Hide/restart
must persist the last applied margins with no regression to card geometry
or transparent rounded corners. Do not classify the bug as fixed without
that runtime evidence.

## Split hover and limited billing acceptance (2026-10-21 candidate)

`tests/split-status-hover.test.mjs` validates coverage-aware compact self-hosted total/online/offline, Actions job running/queued, the three independent view kinds, per-runner running assignment by ID, queued candidate compatibility by labels, and bounded display with explicit omissions. `tests/quota-details.test.mjs` guards unknown billing allowance and GitHub job URL validation. `tests/usage-events.test.mjs` exercises the real balloon controller with typed native tooltip events and independent monitor update. `tests/ui-layout.test.mjs` and `tests/quota-surface.test.mjs` protect the unchanged card geometry, separate overlay, native pass-through, strict hover-only lifetime and the new grouped strip.

The existing `open_actions_job` native command remains protected by an allowlist, but noninteractive hover views do not display inoperable action links. Partial API results, runner-inventory denial, missing labels and unavailable billing must never become fabricated zeroes, available minutes or assigned queued jobs.

Final validation is the normal full STABLE Preflight gate (Node model/source tests, Rust formatting/core/Clippy, Linux desktop cargo check). Physical KDE validation must confirm no hover clipping, instant changes between Runners/Tasks/Billing, correct runner/job counts and colors, no residual popup after Hide/Open, stable native drag, and no hidden dependency on an interactive scroll surface. Billing API/scopes and true free allowance calculations are separately blocked pending the security choice in `SPLIT_HOVER_BILLING.md`; no test may pretend they are live.

The CI build gate cannot establish visual acceptance, real GitHub billing entitlement, installation scope, or KWallet authorization on the user's machine.
