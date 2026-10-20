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


## Decision 2026-10-20 — native Wayland relative-pointer-v1 (selected)

Owner chose **option 2: native relative-pointer protocol**, preserving the normal
system cursor during card dragging; do not implement browser Pointer Lock.

### Architecture / constraints

- Integrate the `zwp_relative_pointer_manager_v1` global into the **existing
  GDK Wayland wl_display** and bind a relative-pointer object to GDK's owned
  `wl_pointer`. Never create a competing Wayland connection, consume GDK's
  pointer listener, or dispatch the socket from a second thread.
- Generate protocol client code at Linux build time via `wayland-scanner`
  using the OS-installed `wayland-protocols` XML; compile a small native
  GTK3/GDK/Wayland bridge. Non-Linux builds must not require Linux headers.
  Reuse current Rust dependencies (no Cargo.lock drift).
- GTK main-thread relative-motion handler alone applies `dx/dy` to Layer
  Shell's bottom/right margins. It maintains fractional residuals for
  subpixel motion, clamps persisted margins to configured limits and never
  uses JS client/screen coordinates for movement. UI signals start/stop only.
- Gesture lifecycle: primary left-button press on noninteractive card area
  starts a session; button release, pointer cancel, capture loss, Escape,
  card hide and application quit deactivate motion and persist the last
  applied margins. A late start acknowledgment cannot resurrect a released
  session. GDK's `wl_pointer` and display remain GDK-owned.
- If the compositor does not advertise relative-pointer-v1, **fail
  explicitly** and do not fall back to the known-jittering JS implementation.
  The SNI tray, compact dimensions, transparent corners and non-Linux native
  window drag remain unchanged.
- Protocol events are delivered only with pointer focus. Treat any loss of
  WebView capture/focus as gesture termination; physical KWin acceptance
  must confirm that the implicit button grab sustains focus while moving.
- Keep the published `v0.1.0` package unchanged. Rollback point is the
  immediately preceding `dev` commit `989362b`.

### Ordered stages / evidence

- [x] Read compositor protocol and GDK Wayland ownership APIs; confirm
  selected architectural contract in SSOT.
- [x] Implement native bridge and Linux build requirements in a **code-only**
  commit (`b5c9ba9`, formatting fix `e3f5b21`); remove legacy WebView
  screen/client movement path and delta-based native IPC.
- [x] Add native state and JS gesture regressions (same code commit).
- [x] Run the final stable gate: Rust fmt, core tests, Clippy,
  JS/Node tests, Python release tests and full Linux desktop cargo check.
  The generated Wayland bridge compiled successfully in
  [Preflight #39381563028](https://github.com/morozhenko-apps/repoticker/actions/runs/39381563028)
  for implementation commit `e3f5b21` (all four jobs succeeded).
  Physical KWin/GTK relative-motion delivery remains unverified.
- [ ] On Alcotester, test KDE Wayland slow/fast movement, button release,
  cancel, Hide/Open/restart persistence, exact 390x122 geometry, corners,
  unsupported-protocol errors and any multi-display behavior.
- [ ] Only after acceptance, close Issue #2 and consider the next package
  version. Windows and macOS builds remain isolated from Linux bridge.

Implementation details: the C bridge uses borrowed GDK `wl_display` and
`wl_pointer`, binds the relative-pointer-v1 manager through GDK's registry
queue, receives physical deltas on GTK's main thread, and calls Rust through
an FFI callback to adjust layer margins. It preserves fractional motion,
normal cursor visibility, existing position persistence and the 390x122
compact card. Linux build.rs generates the protocol C glue via Wayland
scanner; CI/release Linux jobs install the platform dependencies. The
non-Linux Tauri native-drag path remains unchanged. Existing JS
anchor-error tests were deleted because they no longer exercise production
logic; native gesture lifecycle tests exercise current code.

Physical limitations to verify: the extension is only available while the
compositor supplies pointer focus and a proper implicit grab. A compositor
that does not advertise the extension returns a visible drag error rather
than silently re-enabling jitter-prone client-coordinate dragging.


## P2 delivery: GitHub Actions runner occupancy and queue (2026-10-20)

**Mode A / priority: first GitHub integration feature.** User need:
display how many organization self-hosted runners are busy/idle/offline,
which jobs are executing, and how many compatible queued jobs are waiting,
without opening GitHub Actions manually.

### Architecture decision from existing product contract

Default: **desktop -> authenticated GitHub REST API**, with no hosted service.
This preserves the pre-existing Simple mode and the ability for other users
to install RepoTicker without a Cloudflare account. GitHub REST authorization
is scoped to each user's accounts/organizations and stored via OS secret
storage, not inside WebView JavaScript, configuration JSON or telemetry.
An existing private Cloudflare project, RunnerRouter, currently consumes
signed push webhooks and reads organization runner inventory to route jobs.
It has no monitoring or queue endpoint; it must NOT become a mandatory
RepoTicker dependency. Optional authenticated event-source integration could
be added later after a separate API/security decision.

### Source-of-truth definitions

- **Busy**: number of organization runners with `status=online` and
  `busy=true`. **Idle**: `online` and `busy=false`. **Offline** separate.
  Never interpret `offline` as available capacity.
- **Running jobs**: unique jobs with `status=in_progress` assigned via
  `runner_id` to a known organization runner. The `busy` capacity count
  remains independently authoritative even when job details cannot be read.
- **Queued for eligible self-hosted runners**: unique jobs with
  `status=queued`, unassigned `runner_id`, and requested labels including
  `self-hosted` that are a subset of a known runner's labels. Queued jobs
  may not yet have an assigned runner/group. This is a *compatible label
  backlog across selected visible repositories*, not GitHub's private
  dispatcher queue. Jobs with unknown labels/groups are `unclassified`,
  never confidently counted as zero.
- **In progress** and **queued** are job counts, not workflow run counts.
  A single workflow can have concurrent jobs or internal dependencies.
  A job waiting for approval/environment is not assumed to be runner-queued.
- **Coverage**: counts are exact only across complete, permission-accessible
  repository and runner pagination. Capped, denied, stale or missing sources
  mark queue/running counts `partial/unknown`, never an authoritative zero.
  Record the last successful collection time.

### Delivery stages

- [ ] **Stage 1 — data model and contract tests:** pure functions for
  runner capacity, label-compatible backlog, active job detail,
  deduplication and incomplete/unknown states. No credentials or networking.
  Regression fixtures must cover busy/idle/offline; queued behind an
  in-progress workflow; GitHub-hosted exclusion; queued without labels;
  duplicate jobs; and denied/unavailable data.
- [ ] **Stage 2 — GitHub REST source:** native authorized GET transport,
  bounded pagination and concurrency, per-repository active workflow/job
  enumeration, rate limit and HTTP error handling, scoped organization.
  No global Actions-queue endpoint exists; apply explicit coverage limits.
- [ ] **Stage 3 — OS secret storage and enrollment:** least-privilege
  GitHub auth flow with org self-hosted runner read and selected repo Actions
  read. No token in JavaScript, logs, config files or publicly hosted Worker.
- [ ] **Stage 4 — desktop projection:** actual tray/card `Runners`,
  `Running`, `Queued`, per-runner busy/idle/offline and job links;
  partial and stale badges; rate-limit-aware refresh when open.
- [ ] **Stage 5 — real acceptance:** selected organization repos including
  concurrent runner jobs, busy followed by queued, cancellation/failed
  permissions, reconnect, no accessible repos and runner label mismatch.
  Verify on user's Alcotester runner and another clean user configuration.

### Security, scaling and rollback

Read-only GitHub endpoints only. Limit repositories/runs/jobs/pages and
propagate truncation as incomplete; do not scan the entire organization on
every UI paint. Use ETag/conditional requests and adaptive rate-limit-aware
refresh at the transport stage. Allow each user to select monitored
repositories; repository enumeration must not silently include private repos.
When reporting queue for a runner, account for runner group/access restrictions
or conservatively label the estimate `label-compatible`. Separate code
and docs commits. Keep `main`, public v0.1.0 and existing RunnerRouter
unchanged until authenticated runtime and physical acceptance are complete.


### Requirement correction — all active jobs, split by execution lane

The primary **Running** and **Queued** counters sum *all visible active
GitHub Actions jobs* in the selected account/organization repository scope,
regardless of hosting lane. The same counters' expanded panel breaks each
number into **self-hosted**, **GitHub-hosted**, and **unclassified**; job
details must remain linked to their repository/run. The count of busy
self-hosted runner registrations is a **separate availability metric**,
not an alternative definition of running jobs.

GitHub-hosted job concurrency is an account/organization plan quota (e.g.
GitHub Free standard capacity may allow 20 concurrent jobs), not a single
permanent runner shared between repositories. Temporary hosted job machines
are not enumerated from the organization self-hosted runners endpoint.
Self-hosted org registrations can serve multiple repositories according
to runner-group access policies. No subscription plan or capacity number
may be guessed from the client.

Counting rules:
- `runningTotal` includes every distinct `in_progress` job, even when
  its runner is GitHub-hosted, unknown or absent in org inventory.
- `queuedTotal` includes every distinct `queued` job, even if its
  requested labels are unavailable or incompatible with local runners.
  Jobs waiting on approvals/environments are tracked separately, not
  silently classified as queue capacity demand.
- `selfHosted`: proven by organization runner ID or explicit
  `self-hosted` requested label; `githubHosted`: recognized standard
  GitHub-hosted runner label when no self-hosted evidence exists;
  others are `unclassified`. Breakdowns must always sum to their totals.
  Unknown group/runner affiliation must never silently be guessed.
- Across organization repositories, all totals are **monitoring scope**
  dependent. Offer an opt-in "all accessible organization repositories"
  scope in addition to selecting individual repositories. Enumerate
  repository pages rather than assuming one runner per repo; propagate
  denied, missing or truncated sources as partial/unknown counts.
- Exact total counts require complete jobs pagination for every monitored
  repository. Organization runner inventory may fail independently; in
  that case total running/queued jobs remain available, while runner
  occupancy and any runner-ID-only lane attribution are partial.
- Compact card initially shows total `Running` and `Queued`, plus
  runner occupancy. Expanded UI shows all three lanes and details. No
  mandatory RunnerRouter or Cloudflare dependency.

Do not auto-enroll every private repository without authorization:
"all accessible" is an explicit scope choice, and coverage reflects
the selected visibility and GitHub API permissions.


## P2 UI integration: existing usage tooltip (2026-10-20)

**Mode A; user-approved invariant:** the existing status-strip indicators,
their labels/order, typography, size and relative/bottom-anchored position
must remain unchanged. Put all lane/job/runner detail inside the **existing**
`ⓘ` GitHub usage/limits popup (`quota-anchor`/`quota-tooltip`), rather
than creating an extra section, fourth counter or new window.

### Why the existing tooltip requires temporary native resizing

Current compact Layer Shell card is 390x122 and its rounded `.card` root
uses `overflow:hidden`. A long tooltip positioned above `quota-anchor`
is clipped, so CSS-only expansion cannot show the information. While this
popup is open, request `set_card_view("quota")` (same 510px
bottom-anchored Layer Shell surface as the repository drawer), preserving
the status strip and four actions at the same screen positions. Use an
internally scrollable quota tooltip above the existing icon. Collapse
back to `compact` on pointer leave, focus exit, Escape or Hide; when
repository drawer is already expanded, avoid another native resize.
No new OS window. No changes to Git root/editor state.

### Popup data contract

- Existing three strip fields stay `Runners`, `Running`, `Queued`.
  `Running` and `Queued` represent **total** jobs across selected repos.
  `Runners` retains its current online-runner meaning.
- Popup reuses the existing usage guidance, then shows capacity
  (`online/busy/idle/offline`), two job lane breakdowns
  (`self-hosted/GitHub-hosted/unclassified`), visible runner statuses,
  a bounded set of safe links to active GitHub Actions jobs and `checkedAt`.
- Explicit partial/unknown, not fabricated zero, when sources have gaps.
  Render strings with `textContent`, validate HTTPS github.com Action
  links, and never render secret/token data. Details can be read with
  pointer hover and keyboard focus.
- The **native get_snapshot** may initially lack `runner_state` because
  GitHub login / native REST transport is not yet connected. The popup
  must then show an accurate `Not connected` explanation, with no fake
  metrics or disabled-but-clickable controls. Existing numeric strips remain
  `—` until authorized source succeeds.
- The popup does not infer billing minutes/quota from runner job counts.
  Retain separate "Usage limits: unavailable without permissions" wording.

### Delivery and validation

- [x] Separate pure popup view-model and tests covering no data, complete
  lane data, incomplete data, safe job links, no secrets.
- [x] Extend the existing anchored DOM tooltip without moving or visually
  altering the three main counters or action bar.
- [x] Add native `quota` card-view height using current compositor
  positioning (bottom remains fixed); restore original height on close,
  Hide and Escape, including failure paths.
- [x] Final Preflight for implementation `c623f4a`:
  [Actions run #39424742140](https://github.com/morozhenko-apps/repoticker/actions/runs/39424742140).
  Rust formatting/core/Clippy, Node UI + release-contract tests,
  Linux desktop compilation, and aggregate Preflight succeeded (4/4).
  Real native KDE popup hover/focus/geometry still needs acceptance.
- [ ] Physically accept mouse/keyboard tooltip behavior and compositor
  geometry on Alcotester, after Wayland drag #2 is separately verified.
- [ ] Integrate the existing bounded collector through native authenticated
  GitHub REST plus OS secret storage in a **separate** stage; do not
  connect to private RunnerRouter and do not ask users to deploy a Worker.

Rollback: documentation-only plan commit, then a code-only popup commit.
Published v0.1.0, main, signing and RunnerRouter remain unchanged.


## P2 GitHub App authorization decision — 2026-10-20

**Owner decision:** Option A, a reusable **GitHub App** for RepoTicker.
Use OAuth 2.0 **Device Authorization Grant** for native desktop; do not
introduce client-secret distribution, a mandatory OAuth callback server,
a required Cloudflare Worker or a user-managed Personal Access Token.

### Public application registration (one-time owner-controlled prerequisite)

Register a GitHub App named RepoTicker (or an available variant), owned
by the product publisher, installation availability **Any account**,
with **Enable Device Flow** and expiring user tokens enabled. Disable
webhook delivery if no webhook event is needed in the direct REST mode.
Minimal permissions:
- Repository: **Actions: read** (Metadata: read is automatic).
- Organization: **Self-hosted runners: read**.
- Nothing writable, and no billing read requirement for basic job counts.

Install this App into the organization(s) and selected repositories
being monitored. User access tokens are the **intersection** of App
permissions, the installation's repository selection and the signed-in
user's own permissions. Organization runner enumeration additionally
requires the user to have organization admin access. Non-admin users
must still get usable repo job totals while runner inventory is marked
unavailable; never substitute a false zero.

The product publisher supplies the public **Client ID** (not numeric
App ID, not client secret) at build/release configuration time.
Device Flow does not require a client secret. An unconfigured developer
build shows a helpful "GitHub App not configured" state and MUST NOT
silently authenticate against the developer's personal account.
The GitHub App registration and org installation are **user-owned
external operations**; the agent must not invent a Client ID or ask
for a private key/client secret.

GitHub canonical docs:
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
- https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
- https://docs.github.com/en/rest/actions/self-hosted-runners
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens

### Native security and lifecycle contract

1. Settings > GitHub > Connect begins Device Flow on native side:
   \`POST https://github.com/login/device/code\` (Client ID only).
   Display only \`user_code\`, \`verification_uri\`, expiration and
   explicit "Open GitHub" / "Cancel" controls in WebView. Never expose
   \`device_code\` or access/refresh tokens to JavaScript.
2. Native polling uses \`POST https://github.com/login/oauth/access_token\`
   with the grant \`urn:ietf:params:oauth:grant-type:device_code\`.
   Honor server \`interval\`, \`slow_down\` and token expiration;
   \`authorization_pending\` is expected, not a failure. Cancellation
   and window close terminate active attempts. No tight polling, arbitrary
   retry loops or leaking tokens into logs.
3. Request \`offline_access\` to consistently obtain an expiring access
   token and refresh token. Rotate refresh tokens atomically; old refresh
   tokens become unusable after rotation. Refresh device-origin tokens
   without client secret, preserving server expiration and reauthentication
   on denied/invalid grants. Never persist them in \`config.json\`.
4. Native HTTP with strict GitHub hosts, HTTPS only, bounded bodies,
   conservative pagination/timeouts, meaningful \`401/403/429\` and
   rate-limit handling, cancellation and scoped repository selection.
   Only non-sensitive progress/connection metadata and filtered Actions
   job summaries are passed to the WebView.
5. OS secret store: supported Linux Secret Service/KWallet integration,
   Windows Credential Manager, macOS Keychain, via a maintained native
   cross-platform credential library. Fail closed if the store is
   unavailable or locked. No plaintext fallback, custom password file,
   environment token or JS localStorage.
6. On Disconnect, revoke/invalidate when supported, remove local
   token material and clear all cached authenticated statistics. Do not
   claim remote revocation success when its API cannot be called.
7. Account/org selection must be explicit, portable and changeable.
   A selected organization is not hard-coded to morozhenko-apps.
   The existing Worker URL setting remains optional and unused in
   the direct GitHub App path.

### Implementation stages and validation

- [x] **A1 implemented (CI pending):** Pure Rust Device Flow lifecycle and expiry policy, commit 78fecb4, with tests for pending/slowdown, denial, cancellation, phishing URL and refresh. No credentials/network. Preflight: https://github.com/morozhenko-apps/repoticker/actions/runs/39438762603.
- [ ] **A2:** Native authenticated GitHub HTTP and OS credential-store
  adapters, real Device Flow and refresh, using a maintained library.
  Commit updated \`Cargo.lock\` with new dependencies. Never bypass
  \`--locked\` release source reproducibility.
- [ ] **A3:** Settings controls for connecting, authorization status,
  choosing organization/selected repositories/all accessible scope and
  disconnect. Keep the 3 compact counters and existing quota popup intact.
- [ ] **A4:** Native collector and snapshot integration; adaptive ETag/
  rate-limit-aware refresh, jobs across self-hosted and GitHub-hosted lanes,
  independent runner inventory access, explicit partial coverage.
- [ ] **A5:** Final stable CI gate once after planned changes; KDE physical
  acceptance with actual GitHub App installation/user grant, expiration,
  403 on runner inventory, rate-limit and complete disconnection. Do not
  close Wayland drag #2 by inference or publish new v0.1.x without tests.

**Rollback:** steps in independent code commits, documentation in separate
docs-only commits. The public v0.1.0 tag, main branch and production
RunnerRouter stay unchanged. Until the publisher registers the App and
provides its public Client ID, the live OAuth connection cannot be exercised.

**Avoided design:** an ephemeral localhost OAuth callback or browser
auth flow requiring bundled GitHub client secret. GitHub's supported
Device Flow is more appropriate for an untrusted native client and
requires no third-party authentication relay.

GitHub App registration and deployment steps: [GitHub App guide](GITHUB_APP.md).

## Forward-looking GitHub App read permissions audit — 2026-10-20

Before registration, review [docs/GITHUB_APP.md](GITHUB_APP.md) as
the registration source of truth. The original A1 design specified only
Actions:read and organization Self-hosted runners:read, enough for
current job counts but *not* all planned read-side features.

**Read-only near-term bundle:** repository Actions, Checks, Commit
statuses, Pull requests, Contents, Deployments; organization Self-hosted
runners. Metadata:read is implied. This supports optional PR/commit
checks and releases/deployments without asking existing installers to
approve additional permissions for each new read-only feature.

**Admin/usage decision:** billed usage for organizations requires
Organization Administration:read; per-user billing requires Account
Plan:read, where the enhanced billing API is available. Requesting
Administration:read has a materially broader administrative visibility
footprint and may deter organizational installation. It cannot be
opted in solely in desktop UI if the publisher App globally requests
that scope. Product owner should approve that trade-off before
publishing the App to "Any account".

**Deliberately not requested:** Actions:write (workflow dispatch,
rerun, cancel), repo Contents/PR/Deployments:write and any runner/
organization administration write. Optional background local safe
pull requires no additional GitHub App write permission.

GitHub requires installed organizations to approve new
repository/organization scopes, and authorized users to approve new
account scopes; upgrades cannot legitimately avoid renewed consent.

## KDE physical acceptance update and quota-popup clipping (2026-10-20)

User tested native Wayland relative-pointer-v1 implementation on Alcotester:
**normal card dragging no longer jitters**. This specifically satisfies
smooth-motion acceptance for Issue #2, while saved position after a restart
is still awaiting separate verification. Do not conflate the success of
drag with the unrelated clipping of the Actions/usage popup.

**Confirmed UI regression:** in the 122px compact view, the existing
`ⓘ` Actions limits tooltip is clipped, whereas it is visible with the
510px repository drawer open. The current tooltip is a positioned child
of `.quota-anchor` within the bottom status strip and relies on an async
native height change from hover. On KDE, this is insufficient to guarantee
visible space at the time it is rendered.

**Architectural UI correction:** keep a **single existing
`quota-tooltip`**, but promote it to a flex item within the main card,
above the status strip and below the repository drawer. When it opens,
the same bottom-anchored native GTK surface expands to 510px, the popup
occupies the available *in-window* area with vertical scrolling, and the
three counters/four actions do not change order, size or on-screen
bottom-relative placement. When Repos is already expanded, show quota
content in that same 510px space, temporarily hiding the drawer until
close; do not resize again. Preserve pointer/keyboard focus and Escape
handling. Collapse correctly on Hide, focus exit and pointer exit.
No second window, CSS overflow workaround or platform-specific offsets.

- [x] Code-only popup layout and lifecycle change and source tests:
  `09c3107` (UI) plus `c2f824b` (test fix). The tooltip is now
  an in-flow flex child, not an absolute child of the status icon.
- [ ] Final desktop CI: [Preflight #39470123745](https://github.com/morozhenko-apps/repoticker/actions/runs/39470123745)
  for SHA `c2f824b` (Node/Rust/desktop jobs already passed; aggregate gate
  completion pending at this documentation snapshot).
- [ ] Physical KDE verification tracked in
  [Issue #3](https://github.com/morozhenko-apps/repoticker/issues/3):
  compact/Repos hover+focus, scrolling, Escape, Hide/Open and unchanged
  three indicators/four buttons.

**Publisher GitHub App created:** owner `morozhenko-apps`,
numeric App ID `5399579`, public Client ID
`Iv23liyFAFdT7NCSkpIj`. Device Flow must use Client ID, never numeric
App ID. The App's actual installed repository selection/permission list
must still be confirmed before real API acceptance. Client secret and
private key must not be generated or copied into the desktop bundle.
