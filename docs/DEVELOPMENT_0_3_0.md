# RepoTicker v0.3.0 — P2 monitoring reliability and startup

Status: **Mode A implementation started**, 2026-10-22.
Development branch: `dev`. Published stable-from-this-series baseline:
[v0.2.0](https://github.com/morozhenko-apps/repoticker/releases/tag/v0.2.0)
(tag `v0.2.0`, exact source `c16c435078133929c7bf640b7c25eb52074d0f1c`).
**Never move the existing tag or rewrite its published APT assets.**
Only `dev` and `main` are permanent branches.

Authority: [approved version roadmap](VERSION_ROADMAP_TO_1_0.md)
and [startup defect #12](https://github.com/morozhenko-apps/repoticker/issues/12).
Normal focused tests apply. The exhaustive Mode B program begins only
at the **v0.9.0 release-candidate gate**.

**Development cadence (owner decision, 2026-10-22):** Keep implementing
reliability slices on `dev` and validate changes as needed; neither
A1/A2/A3 nor the proposed `0.3.0` checkpoint requires an immediate public
release. Only cut a new immutable intermediate version if progress becomes
extended or a useful release-ready increment warrants it. Do not bump
Cargo/Tauri versions or promote `main` as a routine step after each slice.
The v0.3–v0.8 labels are planning buckets and can be consolidated.
Mandatory complete Mode B at the v0.9 RC and v1.0 stable acceptance
remain unchanged.

## Accepted release and open aftercare

- v0.2.0 tagged release CI and protected signed APT/R2 publication
  succeeded; public DEB/AppImage/unsigned NSIS are available.
- On Alcotester, `sudo apt update` exposed
  `repo-ticker 0.2.0` as repository candidate (priority 500),
  matching locally installed v0.2.0 (dpkg priority 100).
  This verifies the signed repository metadata is readable via APT
  but **does not replay a 0.1→0.2 signed-repository upgrade transaction**.
- The unrelated `i386` architecture notices originate from
  `pkg.cloudflareclient.com` and `pkg.cloudflare.com/cloudflared`,
  not RepoTicker. The 70 upgradeable system packages are unrelated.
- [Windows physical verification #13](https://github.com/morozhenko-apps/repoticker/issues/13)
  remains open by explicit owner decision. Live expired/revoked keyring
  and offline handling remain open in [#4](https://github.com/morozhenko-apps/repoticker/issues/4).
- The first-load regression [#12](https://github.com/morozhenko-apps/repoticker/issues/12)
  is now in the v0.3 work queue; the observed delayed phases and false
  `Not connected` are not considered fixed.

## Approved v0.3.0 functional scope

P2 monitoring hardening only: token expiry/refresh/revocation lifecycle;
sanitized GitHub REST 401/403/404/429 and permission failures; rate-limit-aware
scheduling; explicit offline/stale semantics; conditional HTTP requests
(ETag/If-None-Match only where correct); repository-monitor selection;
and measured startup concurrency/correct connection states.
Do not widen GitHub App privileges or touch local Git ff-only invariants.

No new webhook relay/Worker, unattended Git mutation, notifications or
local-Git hardening in v0.3.0. Those belong to later roadmap versions.
Do not bump Cargo/Tauri versions to v0.3.0 before release freeze and
its official Cargo version helper.

## First implementation slice: remove unnecessary Git scan from monitor startup

### Evidence and hypotheses (not yet measured)

Expected: the GitHub monitor needs only the configured monitored account,
a native KWallet auth result, and authorized read-only GitHub API. The local
card's repository discovery must operate independently.

Confirmed in current v0.2.0 source:
- `get_snapshot` invokes `scan` with `spawn_blocking`.
  `scan` calls `git::discover_all` and `git::inspect` for **every**
  enrolled repository, then reads the in-memory monitor summary.
- `startGithubMonitoring` calls `get_snapshot` before
  `collectForAccount` **solely** to read `github_monitor_org`.
  Consequently an entire local Git scan is a synchronous prerequisite
  for the GitHub network monitoring stage.
- Settings `refresh()` also awaits a complete `get_snapshot` before
  it reads `github_auth_status`; the latter checks OS wallet access.
  This is a **separate** cause candidate, to address in later stages.
- The monitor refresh cadence is 2–7 minutes after initial results and
  does not itself explain a first-load delay without timestamps.
  `github_auth_status` may wait on the native vault gate; its actual
  latency is not established by the reported screenshots.

Plausible additional delay sources that require instrumentation:
1. Slow local git::inspect over numerous repositories;
2. KWallet/Secret Service response or token-refresh lock contention;
3. Sequential GitHub App installation/repository pagination;
4. Actions run/job collection and bounded concurrency;
5. Duplicate full `get_snapshot` scans from card/Settings/usage WebView;
6. Separate native/UI monitor events landing after a panel opens;
7. Network outage/API throttling, stale state reconciliation.
These are **hypotheses**, not individually confirmed root causes.

### Decision and rationale

**Slice A1:** add one read-only native Tauri IPC
`get_monitor_scope` returning only persisted `github_monitor_org`
(`Option<String>`); replace the GitHub monitor's use of
`get_snapshot` with the smaller command. Keep `get_snapshot`
unchanged for card/Settings, retain config as SSOT, and preserve the
existing scope-change event and cancellation/permissions semantics.

Why: removes a confirmed unnecessary serialization edge without
changing the public app model, persistent format, security boundary,
remote API privileges, or Git safety. It is **not** a complete startup
solution and does not pretend to cure keyring/Settings/Git scanning delays.

Scope and rollback:
1. [x] Native read-only getter with same `read_config` error semantics;
   register in the existing command handler (no filesystem mutation).
2. [x] Replace monitor's full scan invocation with
   `get_monitor_scope`; preserve selected account and auto-selection.
3. [x] Deterministic Node contract tests: the collector obtains the
   persisted scope without calling `get_snapshot`; source-level native
   contract check that command reads `read_config`, not git::inspect.
4. [x] Final CI Preflight stable Rust/JS/native Linux gate **once** after
   planned edits; [run #39848341263](https://github.com/morozhenko-apps/repoticker/actions/runs/39848341263)
   **SUCCESS 4/4** on exact code/test SHA
   `66cfa3a34590a5bd53dd45dba2e6cc8ee97453d4`.
   No full Mode B or repeated test suite.
5. [x] Commit code and focused tests atomically (`66cfa3a`),
   documentation separately (`5fa5db3` and this checkpoint).
   Source CI is green, but **KDE cold/warm startup time and
   complete problem resolution remain unvalidated**.

Rollback: revert the one code/test commit. No credential migration
or data conversion required, and published v0.2 is unaffected.

### A1 checkpoint (2026-10-22)

- **Code + directly related focused tests committed to `dev`**:
  `66cfa3a34590a5bd53dd45dba2e6cc8ee97453d4`
  (`refactor: decouple GitHub monitor scope from full local Git scan`).
- Tauri now registers the read-only `get_monitor_scope` command that
  uses existing `read_config`. The monitor's first collection now
  invokes that command rather than `get_snapshot`; the latter remains
  unchanged for the card and Settings.
- Node contract tests verify a configured account is selected, no
  `get_snapshot` call is made and startup publishes the expected
  connecting and no-access status without touching local Git.
- **Not yet validated at this checkpoint:** latest CI and real cold/warm
  startup measurements. No latency reduction is claimed until measured.
  The UI can still display temporary false `Not connected` from
  independent Settings/auth state, and local repo display still scans
  the Git tree; both are explicitly scheduled in later stages.

### A1 final verification

- The commit `66cfa3a` passed
  [Preflight #39848341263](https://github.com/morozhenko-apps/repoticker/actions/runs/39848341263):
  Node UI/source contracts, Rust formatting/core/Clippy, Linux desktop
  compile, aggregate Preflight all **successful**.
- There are no changes to GitHub OAuth scopes, external HTTP behavior,
  token storage, local Git mutation rules or persisted configuration.
- This **does not** demonstrate that the reported startup delay has
  disappeared. Proceed to A2 profiling and A3 honest startup state.
- v0.2 delivery issue #9 was closed after APT version availability
  confirmation, and aftercare was transferred to #4 (auth),
  #13 (Windows) and #14 (independent signed upgrade).

## Follow-up stages (not implemented by A1)

- **A2: measured startup boundaries**. Capture monotonic time
  from native first paint, local scan, credential-store read,
  first data and per API stage without repository/token logging.
  Record cold/warm times before optimizing; remove diagnostics or
  retain only opt-in nonsecret timing if approved.
- **A3: honest auth/loading presentation**. Reconcile
  `checking`/authenticated-collecting/unknown-data/disconnected
  states without a misleading early Connect CTA. No new durable
  credential state unless explicitly accepted.
- **A4: operational hardening**. Rate-reset-aware bounded
  scheduling, offline/stale, token expiry and authorization failures,
  ETag correctness, account/repository selection with focused tests.
- **A5: optional intermediate release gate**. Only when the owner
  decides a release is useful: use the version helper/Cargo.lock,
  final stable CI and physical smoke, then publish a new immutable
  tag after acceptance. Otherwise continue development on `dev`
  without version bump, promotion or tag.

## Next implementation: Settings startup without local Git scan — 2026-10-22

**Code + focused tests:** `dev` commit
`d099c1704f90cdfa47dc232c294d92c183554cc3`.

The shipped 0.2.0 Settings startup first awaited `get_snapshot`,
which ran `git::discover_all` and `git::inspect` across every
configured root, **then** read `github_auth_status` and read the wallet
**again** via `refreshGithub`. Listing the Monitor account made
yet another `get_snapshot` request concurrently with the installations
REST call. This created unnecessary local Git and credential-store work
before the settings could display authorized state.

Architectural correction on `dev`:

- A small native `get_settings_config` IPC returns only persisted,
  nonsecret `roots`, `language` and `github_monitor_org`;
  no local Git scan and no secret store read. Existing `get_snapshot`
  remains authoritative for the card's live repository inspection.
- Settings first checks persisted config and native wallet status
  **concurrently** with `Promise.all`, using the resulting initial
  native auth result rather than immediately reading KWallet a
  second time. Monitor scope selection obtains a config-only
  `get_monitor_scope` value instead of a full snapshot.
- Initial Settings presentation now says **Checking connection...**
  and hides Connect/Disconnect while native auth has not been checked.
  A thrown wallet read leaves **Connection unavailable**, not a
  falsely authoritative disconnected state; the failure message is
  displayed. Actual absence of credentials resolves to Not connected.
- Focused Settings fixtures now use the lightweight native read
  commands, check no `get_snapshot` call occurs, and verify a
  single initial wallet read and initial non-misleading status.

**CI / physical status:** implementation was committed, but final
Preflight and independent cold/warm timing evidence must be checked
before considering this correction accepted. This removes known
serialization and false initial Settings labels but is **not**
evidence that the owner's entire staggered startup delay is fixed.
Network and Git inspection still take time in their legitimate
independent paths. No new release/version bump is required.

## Slice A2 — bounded, opt-in startup instrumentation (implementation plan)

**Decision:** do not guess which of the remaining cold-start phases is
slow. Instrument actual call durations in native Rust and monotonic,
process-relative milestone timestamps in the UI. Keep the diagnostics
disabled by default. Owner can explicitly start a *locally rebuilt*
`dev` AppImage with `REPOTICKER_STARTUP_DEBUG=1`; this flag must not be
persisted, deployed, or sent as telemetry.

- Native trace helper uses process-relative `Instant` and a duration
  guard, emitting `RepoTicker startup: stage=... since_ms=...
  duration_ms=...` to stderr **only** with the exact flag value `1`.
- Timed spans: full local `get_snapshot`, Git discovery, aggregated
  inspection, Settings config-only read, monitor scope read, native
  wallet authorization check, token acquisition/refresh, and categories
  of read-only REST requests. No request paths, repo/user names,
  account IDs, tokens, response bodies, header values or credentials.
- UI milestones via a fixed, bounded **allowlist of stage names** in
  native IPC: card boot and initial snapshot; GitHub monitor auth,
  selected scope and completed runner/job collection; Settings first
  config/auth resolution and installation list. Reject or silently
  ignore unrecognized strings so untrusted WebView content cannot
  inject arbitrary log text. Diagnostics must not block UI or remote
  calls.
- Deterministic source/logic tests must confirm the opt-in flag,
  allowlisted milestones, nonsecret spans, and exact native command
  registration. The final normal Preflight is run once after the
  implementation edits; no full Mode B, no version bump or publication.
- Record **real** cold and warm measurements on Alcotester before
  attributing the remaining delay to any subsystem. If the user
  does not physically run the instrumented build, leave performance
  conclusions marked as unverified.

**Potential subsequent architectural optimization already identified
but not covered by timing alone:** `app.mjs` currently subscribes the
`repoticker-monitor-updated` event to the **full**
`get_snapshot`/local Git inspection instead of a cached read-only
monitor delta. A focused cache-boundary change can remove that edge if
instrumentation confirms its impact; do not alter Git safety or
monitor count semantics without a regression test.

## A2 instrumentation checkpoint (2026-10-22)

- **Implementation commit**:
  [`0d7f02a`](https://github.com/morozhenko-apps/repoticker/commit/0d7f02a1e84ff6d28bd578db91f0aea3670b7fe7);
  subsequent Rustfmt-only adjustment `b61e580`.
- `apps/desktop/src-tauri/src/startup_diagnostics.rs` provides a
  **disabled-by-default** timer and an explicitly allowlisted stage
  handler. It logs strictly fixed stage labels and numeric durations;
  unrecognized labels are ignored and may not inject arbitrary strings.
- Native sampled durations include full `get_snapshot`,
  `git::discover_all`, aggregate `git::inspect`, config-only
  monitor/Settings reads, KWallet authorization, token acquisition
  and each validated REST category. JS milestone traces cover card,
  Settings and GitHub monitor lifecycle; they are fire-and-forget,
  never block UI.
- Scope of logging: **only** with
  `REPOTICKER_STARTUP_DEBUG=1` at application launch. Exact REST
  URLs/paths, repository and organization names, tokens, device
  codes, provider headers/bodies, and config values are not logged.
- Focused tests confirm the allowlist rejects arbitrary text,
  instrumentation hooks run in the expected monitor order and
  full-repository snapshots are still decoupled from initial
  GitHub-monitor and Settings configuration reads.
- **Latest source CI:** [Preflight
  #39851495575](https://github.com/morozhenko-apps/repoticker/actions/runs/39851495575)
  initially identified one Rustfmt-only difference. Corrected in
  `b61e580`. **Do not call this final CI green until the post-format
  head run is verified.**

### Physical cold/warm collection (owner's KDE desktop)

Do not run the installed APT binary simultaneously with the instrumented
AppImage. A build from current `dev` retains version markers `0.2.0`
because this is continuous unreleased development; it is **not** the
published `v0.2.0` source, and must never be distributed under that tag.

From `~/Documents/GitHub/repoticker`:

```bash
git switch dev
git pull --ff-only
cargo tauri build --bundles appimage

APPIMAGE="$PWD/target/release/bundle/appimage/RepoTicker_0.2.0_amd64.AppImage"
REPOTICKER_STARTUP_DEBUG=1 "$APPIMAGE" 2> /tmp/repoticker-dev-cold.log

# After closing the AppImage from the tray, review:
grep '^RepoTicker startup:' /tmp/repoticker-dev-cold.log
```

Repeat the launch in a **new process** using a different log filename
(`/tmp/repoticker-dev-warm.log`). For cold runs, record whether
KWallet was already unlocked and whether GitHub network was online;
do not artificially clear credentials, drop Linux filesystem caches
or remove user settings. Log lines are process-relative
`since_ms` and per-phase `duration_ms`, not absolute clock times.
Remote request categories may produce multiple repeated samples.

Compare stages: `card.start`, `git.scan_total`,
`card.snapshot_ready`, `settings.start`,
`github.auth_status`, `github.wallet_read`,
`monitor.auth_ready`, `monitor.scope_ready`,
`monitor.collect_ready`, `card.monitor_ready`.
The instrumentation only describes timing; no root-cause
claim is warranted until actual measurements are supplied.

## A2b — measured startup and monitor-only refresh plan (2026-10-22)

The owner provided an instrumented physical KDE AppImage launch log and
reports substantially faster startup than the previous minute-scale
observation. The trace measures process-relative events:
- Settings authorization ready at 1,156 ms; KWallet initial read 15 ms.
- Card first local snapshot at 8,211 ms.
- GitHub monitor collection completed at 13,618 ms; card displayed
  monitor data at 18,230 ms.
- Seven full local Git scans completed before 18,815 ms, each roughly
  5–7 seconds (inspection dominates; discovery around 60–100 ms).
- 78 REST run-list requests, averaging about 0.49 seconds each.
  Token acquisition averaged a few milliseconds.

Confirmed unnecessary work from source: `app.mjs` reacts to
`repoticker-monitor-updated`, GitHub authorization, and monitor-scope
events by calling full `get_snapshot`, scanning all local Git repos.
A monitor event only changes cached remote metrics, not local Git.

A2b decision: expose a read-only `github_monitor_snapshot` from the
existing native `MonitorCache` returning connected, runner_state and
monitor_message. Route monitor-related events through the cached
snapshot and render only the metric strip, without rebuilding the
repository list. Keep full local Git scans on initial card load,
config changes and actual Git action completion. Prevent older
in-flight full snapshots from rolling back newer monitor state.
Add deterministic regression tests for native projection,
partial view behavior and event routing. No persistent changes,
new authorization permissions, version bump or release.

This is a measured bottleneck and a source-supported refactor, not
proof that all remote API latency has been fixed. After CI, compare
physical cold-start traces and specifically the count of full Git
scans and monitor-collection-to-visible delay.

## Stop factors and invariant boundaries

If later stages require a changed persistent model, GitHub App
permission scope, security boundary, public IPC capability for
untrusted external webviews, or incompatible data model, stop with
2–4 architectural options. A1 remains within the existing internal
read-only command boundary. Never expose credentials or raw provider
responses to webviews; unknown counts are never zero; local Git remains
manual and ff-only.
