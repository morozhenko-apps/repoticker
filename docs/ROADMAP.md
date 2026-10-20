# Roadmap and delivery evidence

This document separates **implemented source code**, **verified tests**, **physical acceptance** and **future development**. A checked item does not imply every operating system or public distribution channel is accepted. No delivery date is promised.

Evidence snapshot: 2026-10-19, `v0.1.0` published from `21f3b61d9774b931b57a4e3c83f61b2bcf2bb0ee`. [Release workflow #39319748009](https://github.com/morozhenko-apps/repoticker/actions/runs/39319748009) completed successfully on attempt 3; signed APT/R2 publication and GitHub Release succeeded. This is not independent end-user APT acceptance.

## P0 — Local Git desktop foundation

### Implemented

- [x] Tauri 2 desktop shell, Apache-2.0 licensing, icons, About window and Linux SNI tray integration.
- [x] Compact card, repository drawer, four actions, error-only notices, settings window, saved root enrollment and language preference.
- [x] KDE Wayland GTK Layer Shell popup, compositor bottom/right anchor, persisted position and transparent rounded corners.
- [x] Hide after 15 seconds of inactivity while compact; do not idle-hide an open repository drawer.
- [x] Explicit Git root enrollment; shallow discovery; branch/upstream/ahead/behind/dirty inspection.
- [x] Manual parallel Fetch (bounded to four distinct repositories) and sequential offline ff-only Safe pull against fetched refs.
- [x] Real completed-repository progress events, per-row in-flight overlay and nonpersistent error reporting.
- [x] Committed `Cargo.lock`, release version consistency checks, Rust/JS/Python integration tests and Linux desktop compile smoke.
- [x] Preflight passed for exact `v0.1.0` source SHA on `dev` and `main`. [Main run #39309058200](https://github.com/morozhenko-apps/repoticker/actions/runs/39309058200).
- [x] Ubuntu KDE local smoke of DEB installation/removal, AppImage startup and persistence of per-user settings.
- [x] Dedicated read-only Cloudflare R2 download Worker and tagged Linux/Windows packaging + signed APT publishing workflow defined.
- [x] Isolated GPG signing subkey and protected `apt-release` environment configured; encrypted private-key backup checked against Google Drive and decrypted locally.

### Not yet accepted or unfinished

- [ ] Close the [Wayland dragging jitter regression (#2)](https://github.com/morozhenko-apps/repoticker/issues/2) without regressing anchoring or compact sizing.
- [ ] Physically accept tray/card behavior across monitors, scaling, panel arrangements, focus, screen bounds, hide/reopen and supported desktop environments.
- [x] Confirm tagged Linux DEB/AppImage and Windows NSIS build jobs, canonical artifacts and checksums; physical Windows runtime testing remains outstanding.
- [x] Confirm protected signing job, R2 upload/public readback and [public GitHub Release v0.1.0](https://github.com/morozhenko-apps/repoticker/releases/tag/v0.1.0).
- [x] Independently verify signed `InRelease` with `gpgv`, enroll the source with `signed-by`, run `apt update`, resolve candidate `repo-ticker 0.1.0`, and download it via APT on Ubuntu 26.04 amd64 (2026-10-19, Alcotester).
- [ ] Install via APT on Alcotester and verify installed package, tray startup, persistence and normal package lifecycle. A future-version upgrade and uninstall still require a separate controlled acceptance.
- [ ] Define APT index refresh/expiry and rollback strategy; verify Cloudflare release assets and keyring are reachable before advertising installation instructions.
- [ ] Verify autostart, lifecycle and uninstall semantics across supported platforms.

## P1 — Git provider hardening and Linux usability

- [ ] Replace drag feedback/coordinate loop on KDE Wayland with smooth stable motion; add focused regression coverage.
- [ ] Cancel/timeout long-running Git processes and SSH prompts without unsafe state changes.
- [ ] Strengthen concurrent external Git client interference, staged changes, linked worktrees, multiple remotes, submodules, hooks and adversarial configuration coverage.
- [ ] Configurable ignore paths beyond built-in exclusions; better discovery semantics without unexpected recursive scans.
- [ ] Atomic configuration writes and migration/recovery coverage.
- [ ] Full English/Russian interface translation, not only preference persistence.

## P2 — GitHub REST monitoring (not implemented)

- [ ] Least-privilege GitHub authorization stored through OS-native secret storage.
- [ ] Runs and jobs API client, status projection and safe direct links to GitHub Actions.
- [ ] Self-hosted runner online/offline and busy/idle where API permissions permit; distinguish unknown from zero.
- [ ] Adaptive conditional polling, handling 401/403/404/429 and secondary rate limits, bounded cache and stale indicators.
- [ ] Startup/resume reconciliation and user-controlled filtering/notifications on meaningful CI transitions.
- [ ] Optional trustworthy usage/quota data, never fabricate GitHub-hosted pool capacity or billing numbers.

## P3 — Optional automation and Hybrid relay (not implemented)

- [ ] Explicit opt-in background Git synchronization with existing ff-only safety boundaries and a documented schedule.
- [ ] Versioned authenticated relay protocol, signed webhook ingestion, replay/deduplication and tenant isolation.
- [ ] Self-deployed Cloudflare Worker + Durable Object transport and interoperable Docker/VPS implementation.
- [ ] Authenticated WebSocket, reconnection cursor and authoritative REST polling fallback.
- [ ] Chaos/failure-injection and security acceptance tests before enabling Hybrid mode.

The **release download Worker** (`infra/download-worker`) is an existing distribution component. It is **not** the planned GitHub webhook relay (`apps/relay-*`).

## P4 — Cross-platform polish and ongoing maintenance

- [ ] Real Windows package/install/uninstall/tray/settings acceptance; code signing when available.
- [ ] macOS support only after Apple signing/notarization and physical acceptance.
- [ ] Native notifications, autostart, accessibility and high-DPI/multi-monitor testing.
- [ ] Keep implementation, evidence, feature support and release documentation synchronized; maintain separate documentation-only commits.

## P1 implementation sequence and validation

**Stage A — Release signing-secret provisioning (implemented; CI passed).**
The v0.1.0 release initially failed because the existing script accepted an entered
subkey passphrase without verifying that the exported **subkey-only** CI bundle
could sign in a clean GNUPGHOME. Keep the encrypted full-key backup workflow
unchanged. Before publishing either signing secret, the implementation imports the scoped
subkey into a temporary private GNUPGHOME, verifies inventory and fingerprint,
produces a real clearsigned fixture with the supplied passphrase, and verifies
the signature using the public key. It fails closed before any GitHub Secret
write on invalid input, cleans temporary keyring/passphrase materials on exit,
and tests correct, incorrect and corrupt-key cases using ephemeral keys.
[Preflight #39333453214](https://github.com/morozhenko-apps/repoticker/actions/runs/39333453214) passed for implementation commit `9b2971f`.

**Stage B — KDE Wayland drag jitter investigation (Issue #2; pending
instrumented local reproduction).**
**Confirmed by Alcotester trace (2026-10-19):** the WebView reported
alternating screen-space drag deltas (e.g. (-20,+28), (+22,-28),
(-15,+25)) while GTK kept its exact 390x122 allocation. Changing
compositor-owned bottom/right margins feeds back into the WebView's
screenX/screenY event frame. The current algorithm accumulates those
alternating deltas and considers a move IPC complete as soon as it schedules
a GTK main-thread update, not when the update actually executes.

**Architectural correction (preserve GTK Layer Shell, do not bypass it):**
1. Keep the pointer's original **clientX/clientY inside the WebView** as a
   fixed grab anchor; each later event supplies current local coordinates.
   Move by the current anchor error, not by summed deltas between consecutive
   unstable screen-space events. Window-induced coordinate shifts reduce the
   error to zero instead of creating a new absolute motion.
2. Serialize one native move command at a time; make the IPC resolve **after**
   the GTK main-thread margin update was applied, not merely scheduled.
   Drop stale intermediate pointer samples instead of replaying accumulated
   deltas, and schedule a new correction only on a fresh pointer event.
3. Keep the existing native pointer drag for unsupported Linux compositor,
   Windows and future macOS paths. Release/cancel/hide must not persist
   before an in-flight native update has completed.
4. Regression-test the error correction, pointer lifecycle and single-flight
   behavior with deterministic JS tests. Complete stable CI, then perform
   KDE Wayland physical acceptance before closing Issue #2.

**Acceptance invariant:** never change the 390x122 compact allocation,
bottom/right anchoring, saved margin field names or transparent corners.
No arbitrary sleep/retry or User-Agent/window manager workaround.
Preserve GTK bottom/right anchor, exact compact height, transparent rounded
corners and saved config margins. First collect reproducible pointer/margin
geometry evidence on KDE Wayland. A scoped `REPOTICKER_UI_DEBUG=1` native
trace was added in `linux_surface::shift` on dev to report **relative**
pointer deltas, before/after anchors and GTK allocation during drag. Run
`REPOTICKER_UI_DEBUG=1 cargo run -p repoticker-desktop` with the installed
v0.1.0 tray process closed, then drag the card steadily in one direction and
check whether the reported delta signs flip or the allocations reconfigure
without corresponding user movement. These are diagnostic data, not
confirmation that a fix has been made. Only then choose a frame-stable
coordinate-to-margin implementation that does not accumulate stale deltas.
Add deterministic pointer sequence/cancel/hide regression tests, run final
stable checks, and accept smooth dragging manually on Alcotester.
No new tag or production deployment until Linux physical acceptance succeeds.

**Rollback boundaries:** Stage A edits signing provisioning and its tests only;
Stage B will be a separate implementation commit. The published v0.1.0 tag and
APT package remain immutable throughout.



### Wayland drag implementation and remaining acceptance

- [x] Confirm coordinate-frame feedback via `REPOTICKER_UI_DEBUG` trace on
  Alcotester: the same drag produced alternating signed deltas without
  changes to the GTK 390x122 compact allocation.
- [x] Replace cumulative screen-space deltas with fixed client-space pointer
  grab-anchor correction in `apps/desktop/ui/drag.mjs`, one in-flight move
  command, no replay of stale pointer samples, and cancellation-safe
  persistence. See implementation commit `2deaf46`.
- [x] Have the asynchronous Tauri move command wait until the GTK main-thread
  Layer Shell margin update actually executed before resolving the IPC.
- [x] Add deterministic JS controller tests for anchor convergence, serial
  IPC, pending persistence, cancellation and stale activation.
- [x] Confirm the final Preflight Rust/JS/Python/desktop compile gate for
  implementation commit `2deaf46` ([CI run #39335945391](https://github.com/morozhenko-apps/repoticker/actions/runs/39335945391) succeeded).
- [ ] Physically verify smooth dragging on Alcotester KDE Wayland in
  both directions and across Hide/Open and restart; do not close Issue #2
  before acceptance.
- [ ] Confirm 390x122 compact geometry, transparent rounded corners and
  persisted bottom/right margin fields remain unchanged. No update of the
  published APT package until the next separately tagged release.

## Wayland drag: v0.1.0-dev local-coordinate fix rejected in KDE acceptance (2026-10-20)

**Status: OPEN, not accepted.** Alcotester physically tested the candidate
at commit `4a7b0f0`. Drag jitter decreased, but did not disappear. The
new `clientX/clientY` anchor continues to produce spuriously large
corrections (e.g. `(-133,+22)`, `(+114,+17)`, `(-115,-14)`) while
the GTK allocated size stays exactly `390x122`. Fast/slow GTK resize or
layout reallocation is therefore not the observed source of those jolts.

**Root design limitation:** both `screenX/Y` and `clientX/Y` are samples
derived from a moving Wayland surface. The GTK-main-thread completion
acknowledgment only means `set_layer_shell_margin` was invoked; it does NOT
mean KWin has committed/presented the new layer surface position to WebKit.
Consequently serial IPC and local grab-anchor corrections cannot eliminate
coordinate/commit feedback. More thresholds, sleeps, or arbitrary event
filtering are not acceptable corrections.

**Architectural decision required before replacing this input contract:**
- Standard WebKitGTK **Pointer Lock API**: explicit lock only during drag;
  `movementX/movementY` are compositor-backed relative deltas, independent
  of moving surface coordinates. The native pointer is hidden while locked
  and Escape releases lock. Could draw a temporary synthetic drag cursor
  over the card to preserve the user's point-of-grab visual cue. Verify
  KWin/WebKit support and pointer release/permission paths in a real device.
- **Native Wayland relative-pointer-v1 protocol** in GTK integration:
  receive movement deltas separately from the WebView's local coordinate
  frame. Preserves the normal visible cursor, but adds protocol/session
  handling and substantial Wayland-specific lifecycle and input-seat
  complexity; needs direct KWin acceptance.

Both retain Layer Shell bottom/right margins, exact compact geometry and
transparency; no global input capture or X11 assumptions. Do not change
the input contract until the user chooses the UX/architecture tradeoff.
The published v0.1.0 and `main` remain unchanged. Issue #2 stays open.
