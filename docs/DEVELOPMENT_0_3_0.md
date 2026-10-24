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

## A2b implementation checkpoint — 2026-10-22

Code + focused tests committed on `dev` as
[`ba65f2c`](https://github.com/morozhenko-apps/repoticker/commit/ba65f2cf76fea6c2d98139ef11382e54b51573c0)
without changing `main`, release tags or version metadata.

- A dedicated read-only `github_monitor_snapshot` native command
  returns three sanitized values directly from `MonitorCache` and
  does not touch local Git or the credential store.
- GitHub monitor/auth/scope events now update only the compact
  metric strip; the repository list and its scroll are unchanged.
  Local config changes, startup and completed Git actions continue
  to call the full scan.
- A revision check retains newer monitor data when a previously
  started Git scan returns late. An IPC request sequence rejects
  out-of-order replies between concurrent remote-state events.
- Pure Node tests cover partial-state merging, stale result ordering,
  invalid presentation and source contracts for event routing.
  Rust tests cover the native cache projection and initial status.
- [Preflight #39854735114](https://github.com/morozhenko-apps/repoticker/actions/runs/39854735114)
  was queued for the code commit. **Do not mark CI passed until
  the run completes.**
- The submitted physical trace preceded this change. To validate
  improvement, rebuild from updated `dev`, capture a new opt-in
  startup log and compare the number of `git.snapshot_ipc` spans
  and collect-to-card delay. Longer-term Git repository inspection
  may still need separate optimization.

## A3 — enforce one global REST concurrency cap per collection

**Mode A refactor; documented before implementation (2026-10-22).**

Evidence: the existing `collectRunnerState` uses
`boundedMap(selectedRepos, concurrency, ...)` then, within each
repository worker, another `boundedMap(selectedIds, concurrency, ...)`
for jobs. At the default `concurrency=4`, four repositories may
each launch four job-page requests, so as many as **16 concurrent**
GitHub REST operations can occur in one collection. This violates
the implied per-collection concurrency budget, increases API burst
pressure, and is not needed for correctness. The actual number
observed in the owner's trace was not measured directly.

Decision: keep the existing `boundedMap` for deterministic
repo/job traversal and existing coverage semantics, but wrap its
injected `get(path)` with a **single FIFO request limiter** created
once per `collectRunnerState` invocation. Every request for runners,
runs, and jobs passes through that one limiter; at most `concurrency`
requests can be active for this collection, regardless of nested
workers. The limiter releases slots on both resolution and rejection.
Do **not** sleep/retry, expand GitHub App permissions, expose bearer
tokens, change stable response types, or turn unknown counters
into zero. This is explicitly **per collection**, not an invented
global cap across unrelated Settings/Billing WebViews.

Implementation stages:
1. [x] Added FIFO request limiter to the collector; every runners,
   runs and nested jobs read shares one concurrency budget.
2. [x] Added deterministic Node test with four repositories and
   sixteen active queued jobs; asserts full queue counts and
   maximum concurrent GitHub REST requests of two when configured.
3. [x] Added rejected-job request regression: no credential
   leakage and partial/unknown coverage remains authoritative.
4. [ ] Preflight for exact code/test SHA
   `3d811a7792e5835630196e3f1c1475b696dfb5d4`:
   [run #39856749723](https://github.com/morozhenko-apps/repoticker/actions/runs/39856749723).
   At documentation checkpoint JS and Rust jobs passed; Linux
   desktop compile still pending. Do not call overall CI green yet.
5. [x] Code and focused tests committed atomically;
   completion/evidence documented in this **separate docs-only commit**.
   The combined physical/Mode B gate is independently tracked in
   [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).

Risk: limiting REST bursts can increase collection latency in large
active-run sets; preserving the existing per-repo traversal and
full-coverage/unknown handling is essential. Compare the future
integrated cold/warm trace before tuning the concurrency budget.
Rollback: revert the one code/test commit. No persistent migration
or release needed. Keep `main` and immutable v0.2.0 untouched.

## Deferred aggregate verification contract

The owner chose not to perform a full physical/manual regression after
each development slice. Comprehensive KDE/Windows/GitHub/installer
acceptance and the complete Mode B test program before the RC are
tracked as [GitHub issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).
Targeted regression tests and branch Preflight remain mandatory for
each relevant code change. Do not conflate deferred system acceptance
with a passing per-commit test suite or claim release readiness.

## A4 — rate-limit and offline recovery without request storms (2026-10-23)

**Root cause and scope.** The current native GitHub REST command
classifies 403/429 as a redacted `rate_limited` string but throws
away `Retry-After` / `X-RateLimit-Reset`. Other WebViews and
subsequent collector requests can immediately repeat the same
request. The monitor's 60-second scheduling tick is already bounded,
but it does not explicitly honor a server-supplied reset deadline.
A partial collector can retain known job/runner counts; it cannot
treat uncollected counts as zero. Existing `githubFailureReason`
sanitizes provider error bodies, and the UI does not have access to
a bearer token.

**Decision (internal native transport, no OAuth scope/model changes):**

1. [x] Add a process-wide, in-memory `GitHubRateGate` in the Tauri
   app state, shared across all native GitHub read-only REST IPC
   callers. Respect a bounded integer `Retry-After` first,
   `X-RateLimit-Reset` when the primary budget is depleted,
   otherwise use one conservative fixed fallback. For HTTP 403,
   enforce only when the existing classification identifies rate
   limiting; for 429 always enforce. Never log raw headers, HTTP
   bodies, URLs or tokens. Gate with a monotonic deadline; do not
   persist it or sleep inside HTTP requests. Expired state
   automatically stops blocking.
2. [x] Expose an internal read-only `github_api_cooldown_seconds`
   returning the remaining bounded whole seconds (or zero).
   This contains no token, account or REST metadata. The native
   gate is authoritative even if the webview restarts. No
   public API or on-disk configuration change.
3. [x] In `startGithubMonitoring`, consume the native cooldown
   after an identified `rate_limited` failure including a
   *partial* collector failure. Continue using the existing
   app-lifetime 60-second schedule tick, but skip refreshes
   while the deadline has not expired, even for explicit
   card-show requests. Never poll more frequently, never
   schedule arbitrary sleeps, and allow normal monitoring
   after cooldown. Explicit disconnect must still update
   auth/presentation immediately, without GitHub REST.
4. [x] On a full network or rate-limit failure, expose the known
   `network`/`rate_limited` cause and render live counts as
   **unknown** (not zero or silently stale). On *partial* failures,
   preserve only explicitly covered counts from the collector;
   retain existing redacted status messages. Do not add a
   visually unsupported stale-badge API or display old numbers
   as live.
5. [x] Focused Rust tests for bounded reset header parsing,
   monotonic gate expiration and distinction between 403
   permission vs rate limit; Node tests with injected fake
   clock/tick ensuring 429 cooldown suppresses REST requests,
   negative/offline failures don't fabricate zeros and the
   collector's partial failure path still communicates
   `rate_limited`. Existing Device Flow, credentials and Git
   operations must be untouched.
6. [ ] Single final stable Preflight on code/test candidate;
   classify any external APT mirror timeouts separately from
   build/test defects. Document final results in a **separate
   docs-only commit** and link aggregate physical acceptance
   [#15](https://github.com/morozhenko-apps/repoticker/issues/15).
   No `main` promotion or version bump.

**Boundaries:** HTTP-date `Retry-After` is not parsed without a
new parser dependency; for unsupported forms, the bounded fallback
applies unless numeric reset is present. This is intentionally a
safe backoff, not a retry library. Network recovery runs on the
existing monitor schedule; offline network errors do not trigger
subminute retries. There are no new permissions, persisted formats,
backend services, or unauthenticated API requests.

**Previous CI classification:** Exact code/test SHA `3d811a7`
passed Rust/JS; desktop did not compile because the GitHub runner
timed out fetching the Ubuntu `libwebkit2gtk-4.1-0` apt package
after multiple mirrors failed (not a compiler error). Full job
[result](https://github.com/morozhenko-apps/repoticker/actions/runs/39856749723).
Keep that evidence explicit rather than treating it as a code failure
or marking Linux desktop successful.

## A4 implementation and evidence (2026-10-23)

This is the next continuous `dev` work slice; it is **not** a new
published RepoTicker version. Code/tests are at
[`4543dfe`](https://github.com/morozhenko-apps/repoticker/commit/4543dfe852cb4e75f21aa15b403ca4e15200c025),
followed by a disconnect-correctness fix `d12f743`, a dedicated
regression test `6df3846` and Rustfmt-only `0da9625`.

- [x] A single in-memory native `GitHubRateGate` now protects
  all Tauri GitHub API GET IPC callers. Numeric `Retry-After`
  takes priority, otherwise `X-RateLimit-Reset` when recognized,
  otherwise bounded 120-second fallback. Gate is monotonic,
  clamps to 24 h, and does not expose headers/URLs/tokens.
- [x] Internal read-only IPC `github_api_cooldown_seconds`
  returns only remaining whole seconds, so the WebView can skip
  collections that cannot succeed before the server deadline.
- [x] The monitor recognizes both complete and partial
  `rate_limited` responses. When the gate is active, it
  blocks further REST collection even if the card is shown.
  The normal fixed one-minute scheduling tick is unchanged;
  there are no tight retries or independent polling loops.
  Explicit GitHub disconnect is processed immediately via native
  status even while REST cooldown applies.
- [x] Native parsing and deadline tests cover HTTP 429,
  depleted-primary-budget 403, normal permission-denied 403,
  bounded/unparseable headers and monotonic deadline retention.
  Deterministic JS fake-clock tests cover forced/timer
  refresh suppression, partial counts staying unknown,
  offline successful-to-unavailable transition, and
  disconnect during cooldown.
- [x] Source CI [Preflight #39910983490](https://github.com/morozhenko-apps/repoticker/actions/runs/39910983490)
  completed **SUCCESS 4/4**, exact source SHA
  `0da9625c5d37a7d4c17e235fa9808ec5681fb89b`,
  including Linux desktop compile. GitHub 429/offline physical
  acceptance remains separate in issue #15.
- [ ] Real 403/429, offline, locked wallet and account-change
  physical acceptance remain deferred to
  [aggregate acceptance issue #15](https://github.com/morozhenko-apps/repoticker/issues/15)
  and [auth issue #4](https://github.com/morozhenko-apps/repoticker/issues/4).
  No release/tag/branch promotion is requested.

Caveat: with HTTP-date-form `Retry-After` and no numeric reset
header, the conservative fallback is used. Remote monitoring
shows unknown live totals rather than silently carrying stale
numbers through a full network failure; known partial counts
remain visible only with coverage explicitly marked incomplete.
This slice does not add durable stale data storage or new
persistent settings.

## A5 — reuse one native REST HTTP client (2026-10-23)

**Mode A / refactor; plan recorded before changing code.**

Source evidence: `github_api_get` currently calls
`reqwest::Client::builder()` for **every** read-only GitHub REST GET.
A monitoring pass can issue dozens of reads. Building one client
per request prevents its connection pool from reusing keep-alive
connections across a pass, and can add repeated TLS/connect
overhead. The owner's earlier trace has 78 run-list requests
around 0.49 seconds each, but contains no TCP/TLS timing.
Therefore the impact is plausible, **not yet measured**.

Decision: create `GitHubRestClient`, a Tauri-managed service with
`OnceLock<Result<reqwest::Client, &'static str>>` holding
exactly the same nonredirecting, 15-second timeout client used by
`github_api_get` today. Initialize it lazily on first approved
REST read; share a borrowed client reference across all reads
from card, Settings and usage WebViews. The `bearer_auth(token)`
header remains **per request**, never a client default. No token
or response JSON is stored in this transport; GitHub status is
always refetched with normal authentication and cooldown checks.
Existing strict path whitelist, redacted error vocabulary, 2 MiB
body limit and native rate gate remain unchanged.

1. [x] Extract the reqwest client builder into the managed
   `GitHubRestClient` using Tauri `State` lookup; no new
   permissions or persistent data.
2. [x] Replace only the per-request builder in `github_api_get`
   with the borrowed reusable client.
3. [x] Add Rust tests proving client is reused (pointer identity)
   and preserving required timeout and redirect policy, plus
   a source/behavior contract for per-request bearer auth
   instead of stored credentials.
4. [ ] Run the normal stable Preflight once on the finished
   code/test commit, record exact SHA and CI result.
5. [x] Update implementation/evidence in a **separate
   documentation-only commit**. Defer physical
   before/after startup measurements to
   [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).

**Risk / rollback:** keep-alive reuse can change transport-level
connection behavior or retain pooled sockets between polls;
response projection, GET semantics and access control must not
change. Compare live latency and scope-change/disconnect behavior
during the deferred integrated test gate; when auth changes, no
credential is stored on this reusable transport. Revert the
single code/test commit to return to a client per request.
No version bump, `main` promotion or public release.

## A5 — shared REST client implementation checkpoint (2026-10-23)

- [x] Code commit [`0ef3837`](https://github.com/morozhenko-apps/repoticker/commit/0ef3837d40cd026ebf5877f566117f5b2fad06be)
  adds `GitHubRestClient` as a Tauri-managed, lazily initialized
  process-local `reqwest::Client`. Native requests now reuse
  transport connections, keeping the original no-redirect and
  15-second timeout configuration. The shared client does
  **not** cache JSON or store default Authorization headers;
  every request still obtains a native token and applies
  `.bearer_auth(&token)` separately.
- [x] A focused Rust test asserts that one native client is
  reused and its default request has **no Authorization header**.
  Separate Node source-contract tests in [`4ec49e4`](https://github.com/morozhenko-apps/repoticker/commit/4ec49e40d3e11e7d778de18bbf1bfc4c3c37cb4f)
  enforce one client builder and unchanged transport/security
  boundaries. Runtime execution of the native Rust unit test
  itself must be separately evidenced; the normal Preflight
  runs core Rust tests and desktop `cargo check`, not desktop
  unit-test binaries.
- [ ] Latest code/test CI
  [#39952610734](https://github.com/morozhenko-apps/repoticker/actions/runs/39952610734)
  targets exact code/test + Rustfmt SHA
  `08eef2bac620b542d5523634485b583ea03daa58`.
  At this checkpoint Rust format/core/Clippy and JS passed,
  Linux desktop compile was **still in progress**. The
  earlier run found one extraneous blank line and was
  superseded by `08eef2b`; no behavior change.
  Normal Preflight does not run native Rust unit binaries.
  Do not mark full CI green until desktop compilation passes.
- [ ] Physical cold/warm REST latency comparison and live
  account-switch/disconnect boundary remain in
  [deferred integration #15](https://github.com/morozhenko-apps/repoticker/issues/15).
  No release, version bump or main promotion is requested.

Why this scope: per-collection GitHub API response caching or
shared private installation/repository payload caching would
require explicit validation of identity/scope invalidation,
credential transitions and response freshness. The A5
transport-only refactor avoids introducing those semantics
or a new privacy/authorization boundary.

## A6 race review — auth serialization and monitor publication

Additional review found two cross-boundary race windows that must be
closed **before** ETag is accepted:

- **Disconnect vs token read**: an authorized REST request can be
  taking its token while the user disconnects. ETag invalidation
  must happen while holding the existing native
  `GitHubAuthManager.vault_gate` and before credential deletion
  (not before acquiring that gate). This establishes an order:
  any token acquired before disconnect carries the old ETag
  generation and cannot be returned later; after deletion the
  credential cannot be acquired. Cache generation is always
  checked on the return path, including 304 and successful 200.
- **Monitor scope/auth events vs an in-flight collector**:
  an old scoped collection may finish after a new Monitor account
  is selected or credentials have changed. Track a local
  collector generation, advance it on scope/auth changes, and
  discard obsolete results/errors rather than publishing stale
  metrics or a false disconnected state. A bounded rerun
  already exists and remains the only rescheduling mechanism.
  No additional polling is introduced.
- **Concurrent 200 writes**: the cache must not allow an old
  200 response to replace a newer ETag under the same
  generation. Each save compares the ETag observed when the
  request started with the latest cache ETag before updating.
- **Validation:** native cache tests for invalidation, late 200
  and 304/missing-entry behavior; fake delayed collector test
  for account/auth change during an in-flight request.
  Full physical testing remains deferred in #15.

These corrections are internal to the existing native/session
security boundary and do not change credential storage, app
permissions, persisted data or published release semantics.

## A6 — authenticated conditional ETag reads (implementation plan, 2026-10-23)

GitHub's official REST best practices describe authenticated
`If-None-Match` requests, which may return `304 Not Modified`
when the same representation is unchanged. Only such a **server
validated** result may reuse an earlier representation; a prior
successful response alone does not prove currentness. This slice
reduces payload transfer and may spare primary rate-limit quota,
but it does **not** avoid the conditional HTTP request.

Design / security invariants:
1. [ ] Add a bounded, process-local **native** ETag cache; key by
   the exact already-validated GET path (query and pagination
   included) and an in-memory authorization/scope **generation**.
   Store only the existing sanitized `project()` representation
   and an allowlisted, short valid ETag, never bearer tokens,
   refresh tokens, provider bodies/headers or disk data.
   Exclude billing responses. Cap to 64 entries, 64 KiB
   per projected value and FIFO eviction.
2. [ ] Apply `If-None-Match` only when a same-generation
   cached projection exists. A successful 200 projects and
   validates JSON as usual, then updates the cache. A 304 is
   accepted only when the **current native generation still
   matches**, the exact URL matches and the ETag entry is present.
   Never convert 304 with a missing/mismatched entry into an
   empty array or zero. Errors, 401/403 and offline response
   paths preserve sanitized failure/unknown semantics.
3. [ ] Invalidate cached data and advance generation on OAuth
   begin/reconnect, successful new authorization, disconnect,
   native access-token refresh and changed Monitor account.
   Reject late in-flight responses from prior generations
   rather than permitting old private data to reappear.
   A new process starts with an empty cache, even if the OS
   keyring retains the credential.
4. [ ] Keep strict existing URL whitelist, native access token
   per request, global REST rate gate, 15-second timeout,
   TLS HTTP client pooling, max body size and event cadence
   unchanged. Never cache API permissions or use a disk cache.
5. [ ] Deterministic Rust native-cache tests for bounded
   capacity, invalidation, exact-path/ETag matching, and
   304/current vs 304/missing; Node source/security
   contracts. Record CI on exact SHA; desktop native tests
   remain part of the deferred explicit native test gate
   [#15](https://github.com/morozhenko-apps/repoticker/issues/15).
   Keep docs changes separate from code.
6. [ ] Compare physical rate-limit/payload results only during
   the deferred integrated tests, not after every slice.
   Published `v0.2.0` / `main` remain untouched.

Rollback: revert the ETag code/test commit. No migration or
persistent settings change.

## A6 implementation checkpoint — 2026-10-23

Code and focused regressions implemented exclusively on `dev`,
starting with [`05b08e1`](https://github.com/morozhenko-apps/repoticker/commit/05b08e119065ffdd7eac6b0bea0ef37349a5cbcb).
Follow-up correctness and formatting commits:
`cbb1c69`, `b93a065`, `2c11bef`, `e12b59b`,
`414a4be`, and `51936a4`.
They do **not** alter the published `v0.2.0` tag or `main`.

- [x] Native `GitHubETagCache`: bounded to 64 entries,
  max 64 KiB of sanitized JSON per entry, exact validated
  request paths, bounded validated ETag, memory only.
  Billing summaries are excluded. Native conditional
  requests use authenticated `If-None-Match`.
- [x] Strict 304 handling: only a matching entry in the
  current auth/scope generation may satisfy a 304.
  Missing/evicted/mismatched cache is reported as unknown
  rather than stale/zero data. A fresh 200 still passes
  normal JSON parsing, maximum-body validation and
  `project()`, with no ETag requirement for success.
- [x] Authoritative invalidation at Device Flow begin,
  credential grant, native refresh, disconnect and Monitor
  scope write. In-flight older HTTP results are guarded.
  Disconnect invalidation occurs under the pre-existing
  vault lock so it serializes with token reads.
- [x] Monitor collection revision guard prevents an old
  account's delayed results/errors from replacing the
  newly selected account or disconnected state. No new
  poll/sleep/retry loop added.
- [x] Native cache tests cover matching/absent 304, auth
  generation invalidation, out-of-order 200, bounds,
  invalid ETags and uncached billing.
  Node contracts cover callsite invariants, and fake
  collector tests cover account/scope transitions.
- [ ] **Final code/test gate pending:** [Preflight
  #39989254643](https://github.com/morozhenko-apps/repoticker/actions/runs/39989254643)
  on `e626be70de0a9ea970e4b3d82aef996920be9970`.
  An earlier candidate [#39988906679](https://github.com/morozhenko-apps/repoticker/actions/runs/39988906679)
  passed Rust format/core/Clippy and reached desktop compile,
  but its JS suite failed because a source-contract regex
  incorrectly prohibited valid Rustfmt whitespace before
  `.invalidate()`. The regex was corrected in `e626be7`;
  it still asserts the required invalidation. Initial ETag
  Rust syntax and formatting failures were already repaired.
  Do not mark the final candidate CI-green until the exact
  latest SHA passes all required jobs. No physical acceptance yet.
- [ ] Combined KDE/Windows regression, live ETag/304,
  identity switch, rate-limit/backoff, cold/warm timing
  remain deferred to [#15](https://github.com/morozhenko-apps/repoticker/issues/15).
  The normal desktop Preflight compiles desktop but does not
  execute all desktop-native Rust unit-test binaries.

**Key limitation:** no response is served merely because it
was seen before. A cached projection is used only after a
successful authorized server `304 Not Modified`; the
network request is still made. At most a subset of the
many paginated Actions requests fit in 64 in-memory entries.
Do not claim a measured speedup, quota reduction or complete
live recovery without physical evidence.

## A6 follow-up: atomic GitHub bearer/ETag generation pairing

**Mode A correctness fix, 2026-10-23.**

- Confirmed race window: native REST previously awaited
  `github_access_token` and only afterwards read
  `GitHubETagCache.snapshot(path)`; a credential switch could
  take place between those operations. Invalidating old cached
  JSON did not prevent associating an earlier token with a
  later generation.
- Changed the native-only accessor to
  `github_access_token_with_cache(app, path)` returning the
  bearer token **and exact-path cache lookup together**, while
  holding the existing `vault_gate` lock. Refresh-token
  rotation invalidates ETags before this snapshot. The
  disconnect path also invalidates ETags while holding the
  same vault lock, so the order is now deterministic.
- Core Git safety, persistent format, HTTP payload
  projection, API permission boundaries and UI-visible
  credential contract are unchanged. The accessor remains
  **native-only**, never a JavaScript IPC command.
- Source/contract regression asserts native lock coverage,
  cache snapshot ordering, unchanged native per-request
  bearer auth and absence of the old unsafe two-step
  callsite.
- Implementation [`10b5c82`](https://github.com/morozhenko-apps/repoticker/commit/10b5c82217a685f97058d69b7374fa5b33604e82),
  plus Rustfmt correction `8445641`.
  [Exact code/test Preflight #39991004085](https://github.com/morozhenko-apps/repoticker/actions/runs/39991004085)
  **not finished at this documentation checkpoint**.
  Do not label it passed until all jobs complete.
- **Still deferred**: physical session-switch and logout
  timing, native desktop Rust unit-test binaries and
  combined KDE/Windows acceptance in [#15](https://github.com/morozhenko-apps/repoticker/issues/15).

**Next planned final feature before RC:** after all remaining
functional/platform work, implement
[L10N-20 with 20 context audits](localization/LOCALE_CONTEXT_AUDIT.md)
per [issue #16](https://github.com/morozhenko-apps/repoticker/issues/16).
Then freeze v0.9.0 and run complete Mode B. This
localization scope is a **future feature**, not an
implemented translation in the current `dev` binary.

## A7 — immediate GitHub monitor invalidation during in-flight reads

**Mode A, root-cause-driven correctness repair, 2026-10-23.**

Source evidence from `apps/desktop/ui/github-monitor.mjs`:
`selectionRevision` protects the *completion* of a pending remote
collector, but a monitor/account/auth event during `busy=true`
only sets `rerun=true`. It leaves the old-account
`MonitorCache.runner_state` visible until the earlier
network collection completes. The existing tests released the
slow collector before asserting the new scope or disconnect
state; they did not test the immediate transition. Separately,
`github_monitor_publish` is an async IPC that writes the
native cache, so an already-started old revision can race
with a newly requested presentation.

Expected: no previous-account statistics remain visible after
a scope switch or disconnect. A pending old GitHub request is
not a prerequisite to invalidating the current displayed
metrics. A native publication from an old revision must
not overwrite the most recent auth/scope transition.

Decision, preserving internal IPC/persistent contracts:
1. [x] Serialize card-monitor publication IPC calls
   **within the monitor controller** using one promise chain.
   Check the initiating `selectionRevision` when each
   queued publication executes. Never log tokens or move
   credentials outside the existing native vault.
2. [x] On account-scope or auth event, advance revision
   and immediately request cache invalidation:
   disconnect → `connected=false`, `runnerState=null`;
   connect/scope transition → `runnerState=null` with
   explicit `Checking GitHub connection...` (unknown,
   not fabricated disconnected/zero). Do this even when
   `busy=true`, without running GitHub REST.
3. [x] Keep at most one pending forced rerun. The old
   collector will be discarded on revision mismatch.
   Preserve the fixed monitoring cadence, token/rate-limit
   handling, Git status and `unknown != zero` invariant.
   Do not add sleeps, polling or force network calls on
   every card/show event.
4. [x] Deterministic JS tests with held collectors and
   delayed native `github_monitor_publish` proving that
   disconnection and scope selection invalidate previous
   visible metrics BEFORE the old network request resolves;
   old queued publication cannot overwrite a new state.
   Reconfirm existing forced-refresh/cooldown semantics.
5. [ ] One final stable Preflight after the production +
   regression edit; if CI fails, diagnose and rerun only
   affected checks then the required gate. Document exact
   SHA/evidence separately, and retain physical checks in
   [#15](https://github.com/morozhenko-apps/repoticker/issues/15).

Rollback: revert one code-and-test commit. No new
permissions, persisted configuration, UI fields, or change
to the user-selected account model. A directly invoked
`github_monitor_publish` is a local Tauri command; the
serialization guarantee covers the monitor controller's
calls, not hypothetical third-party WebViews.

### A7 implementation checkpoint (2026-10-23)

- Source fix [`d060651`](https://github.com/morozhenko-apps/repoticker/commit/d0606514a856fd8ead8daba0be8d098fd5a891e0)
  immediately clears cached runner/job metrics on auth and scope
  events, without waiting for prior GitHub REST collection.
  Native presentation publications use one serialized promise
  chain with generation check. A connected/scope transition
  displays `Checking GitHub connection...`, disconnect clears
  credentials-derived UI counts without representing unknown
  values as zero.
- Follow-up [`5375ace`](https://github.com/morozhenko-apps/repoticker/commit/5375aced030bf7c2f23c04333d79bbdc47b4ed3f)
  explicitly stamps **all** async refresh publications with
  their originating revision. Even when `applyCooldown` awaits
  native rate-limit metadata, a scope switch suppresses the
  obsolete result.
- Focused regressions at [`5c47778`](https://github.com/morozhenko-apps/repoticker/commit/5c4777807205254d120e19f1723f512aa5e80222)
  and corrected fake-clock expectation [`b6cb4fb`](https://github.com/morozhenko-apps/repoticker/commit/b6cb4fbcedf3ae7a05cd9399a9ac344870906a45)
  hold an old collector *unresolved* while a disconnect or
  account change occurs; they assert immediate unknown/cleared
  metrics, no old result leak, a serialized delayed native
  publication, and stale cooldown completion rejection.
- [ ] [Exact-code Preflight #39993970289](https://github.com/morozhenko-apps/repoticker/actions/runs/39993970289)
  for `b6cb4fbcedf3ae7a05cd9399a9ac344870906a45`
  was **pending** at this checkpoint. The prior
  [run #39993630373](https://github.com/morozhenko-apps/repoticker/actions/runs/39993630373)
  passed Rust format/core/Clippy and found one
  JavaScript test-expectation mismatch: the new scope
  cannot bypass the existing native process-wide
  rate-limit cooldown. The corrected deterministic
  test uses a fake clock and asserts unknown data during
  cooldown followed by fresh collection after expiration;
  product cooldown logic was **not** weakened. The final
  run must pass before calling this slice CI-validated.
- Physical KDE/Windows credential and old-scope visible
  transition checks are deferred to
  [integration issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).
  No version bump, release or `main` promotion.

**Boundedness note:** at most one forced *REST rerun* can be
pending, but the native publication chain serializes each
queued UI status event rather than claiming a universal hard
limit on its count. This prevents completion-order reversals
without inventing a new server-side permission model.

## A8 — opt-in repository selection for GitHub monitor (2026-10-23)

**Mode A feature; documented before code.** Owner requested the next
GitHub monitored-repository selection implementation after confirmed
Preflight [#39993970289](https://github.com/morozhenko-apps/repoticker/actions/runs/39993970289)
**SUCCESS 4/4** on the previous code candidate. Work continues only
on `dev` without release/version bump.

### Source and architectural contract

Current `Config` persists `github_monitor_org: Option<String>`
but no repository selection; collector enumerates authorized
installation repos and monitors up to 100, marking truncated
inventories incomplete. Existing `github_set_monitor_org`
writes the selected account, and Settings only commits the
account when the user confirms **OK**.

Two stable representations were evaluated:
- **A (selected)**: additive `github_monitor_repositories: Vec<String>`
  with `#[serde(default)]`. Empty means **all accessible repos**
  (the exact legacy behavior); nonempty means an explicitly
  selected subset for the single current Monitor account.
  On real account change reset to all. Strict validation ensures
  <=100 unique `owner/repo` values matching selected account.
  Pros: backward compatible, small persistent extension, no
  config migration, transactional with the account update.
  Cons: switching away from an account intentionally discards its
  prior subset; zero-of-zero selection is not a monitoring mode.
- **B (deferred alternative)**: optional per-account selection map.
  Pros: restores subsets after account switches.
  Cons: larger data model, lifecycle/identity/security complexity,
  and retention of private repository names for accounts no longer
  selected, beyond the current single-monitor product model.

Use **A**, consistent with the user's approval to proceed with a
compatible selection extension; no external app/Cloudflare service.
A future account-specific preference product requirement would need
a distinct explicit decision, not a silent migration.

### Staged implementation, invariants and validation

1. [x] Extend `Config` with a defaulted repo-name vector and
   add config-only native `get_monitor_selection` returning
   `{ org, repositories }` from a **single config read**.
   Keep existing `get_monitor_scope` and other public/read-only
   contracts. Extend existing `github_set_monitor_org` with an
   *optional* list. Old callers with no list preserve a prior
   same-org subset, resetting to all on org change; new Settings
   commits account and list atomically. Reject invalid/cross-owner
   names, counts >100 and duplicates; don't persist GitHub credentials
   or change local Git paths. Invalidate ETag and emit the existing
   scope event only after a successful save.
2. [x] Settings offers an `All accessible` (default) vs
   `Selected` mode and a bounded, scrollable set of checkboxes.
   Populate them through the existing authorized installation
   repository REST endpoints, with normal paging and zero new
   GitHub permissions. Selection remains a draft until **OK**.
   Account change resets the draft subset to All; Cancel preserves
   the on-disk choice. Display unavailable/partial inventory
   honestly and avoid losing saved selections silently. No new
   persistent UI/window state beyond the config vector.
3. [x] Collector filters the enumerated authorized repos
   **before** the expensive Actions runs/jobs requests.
   With nonempty selected list, require complete coverage of
   those exact selected repo names; a missing selected repo,
   interrupted/incomplete pagination or permission loss makes
   job running/queued coverage unknown rather than silently
   counting a smaller subset as complete. For all-repos mode
   retain the existing explicit 100-repo upper bound and
   truncation/unknown semantics. No change to org runner count
   or global native REST concurrency/rate gate.
4. [x] Native format/default/validation and Settings/monitor
   deterministic tests for legacy config, all/default,
   subset selection, cross-org injection, >100 names, invalid
   names, account-switch reset, partial/missing repos, pagination
   and OK/Cancel rollback; use source-contract tests where
   desktop Rust native unit binaries are deferred. Existing
   ETag generation and in-flight monitor revision checks must
   continue to invalidate stale metrics on a commit.
5. [ ] One final stable Preflight after the code/test edit;
   documentation evidence in a separate docs-only commit.
   Combined physical KDE/Windows/UI/auth/account selection
   acceptance remains in [#15](https://github.com/morozhenko-apps/repoticker/issues/15).
   Do not start full Mode B or L10N-20 until its roadmap gate.

**Rollback:** revert one code/test commit. The additive,
serde-defaulted field is safely ignored by the published old
binary, but **downgrading and then rewriting settings with the
old binary discards the new subset**. The released v0.2.0
continues to monitor all available repos; no behavior claim
about reverse-migration retaining new selection. Avoid promoting
to `main` or publishing a release without platform acceptance.

### A8 implementation checkpoint (2026-10-23)

- Code/test implementation
  [`d91c209`](https://github.com/morozhenko-apps/repoticker/commit/d91c2091d3f191ff7282f8e0625f04e92bfc192b)
  and Settings UI
  [`2166b59`](https://github.com/morozhenko-apps/repoticker/commit/2166b59dfa0c498f19f9abc87f85ab190e83f8c1).
  Focused diagnostic fixes
  [`d5a1d32`](https://github.com/morozhenko-apps/repoticker/commit/d5a1d3258835371250b23d0b2dc6a4a03fa222a9)
  and additional native/Settings regression tests
  [`00a43ab`](https://github.com/morozhenko-apps/repoticker/commit/00a43ab2ba5f5f9ba1f36c05a46d42a3377d621a).
  Code and docs were **committed separately**; no release tag
  or version metadata was modified.
- New optional persisted JSON property
  `github_monitor_repositories: Vec<String>` defaults to
  the old all-repositories behavior on pre-existing config files.
  Strict native owner/repo validation and 100-selected-repo cap
  prevent injection or accidental cross-account configuration.
- Native `get_monitor_selection` reads owner and selected
  repositories in **one** config transaction. The existing
  `github_set_monitor_org` accepts an optional repositories
  argument and writes the two values together; previous
  same-org callers remain compatible, and switching accounts
  clears their old selection. The old `get_monitor_scope`
  remains registered for compatibility.
- Settings exposes all vs selected mode and search/filter
  for up to 100 displayed at once from at most 10 authorized
  repository pages; no additional GitHub permissions.
  A saved selection remains a draft until OK, Cancel does
  not write it, and unavailable inventory does not erase
  previously saved names. More than 100 chosen repos
  cannot be committed.
- Collector filters authorized repository names *before*
  requesting Actions runs/jobs; a missing previously
  selected repo blocks misleading complete coverage and
  reports unavailable/unknown instead of zero. All mode
  retains the existing 100-repo cap and incomplete coverage
  semantics. Native token/rate-limit/ETag and local Git
  safety boundaries are unchanged.
- **Current final code/test candidate:** `fe858862e81bb615333e2cd0419bc5bbe8165578`;
  [Preflight #39996749369](https://github.com/morozhenko-apps/repoticker/actions/runs/39996749369)
  **pending at this checkpoint**. Earlier exact-SHA
  [#39996389975](https://github.com/morozhenko-apps/repoticker/actions/runs/39996389975)
  passed JS but found only Rustfmt whitespace differences
  in the newly added native unit assertions; adjusted in
  separate formatting commit `fe85886`. The previous
  corrected `d5a1d32` candidate passed Rust and JS,
  with Linux desktop still running when superseded.
  Do not claim final CI green until all jobs complete.
  Native Rust desktop unit tests are not executed by
  the normal desktop `cargo check` Preflight.
- **Deferred physical gate #15:** repeat KDE/Windows Settings
  open/Cancel/OK, switch accounts with an existing selection,
  offline list failure preserving selections, a revoked
  repository, >100 repos and search/filter, old
  `config.json` migration and downgrade caveat.
  Do not begin Mode B until all other features and
  L10N-20 (#16) have completed.

## Stop factors and invariant boundaries

If later stages require a changed persistent model, GitHub App
permission scope, security boundary, public IPC capability for
untrusted external webviews, or incompatible data model, stop with
2–4 architectural options. A1 remains within the existing internal
read-only command boundary. Never expose credentials or raw provider
responses to webviews; unknown counts are never zero; local Git remains
manual and ff-only.

## A9 — Settings installation inventory parity and stale-response safety (planned 2026-10-23)

**Mode A, P2 reliability; documentation before implementation.** A8's exact
code candidate `fe858862e81bb615333e2cd0419bc5bbe8165578`
passed [Preflight #39996749369](https://github.com/morozhenko-apps/repoticker/actions/runs/39996749369):
Card model/JS, Rust core/Clippy, Linux desktop compile, and aggregate gate
were all **success**. This verifies source/compile checks, not KDE/Windows
physical repository-picker acceptance, which remains tracked by #15.

### Source evidence and failure hypothesis

The monitor controller's `listAvailableInstallations` requests up to ten
100-item pages and explicitly returns `complete: false` when truncated.
Settings `refreshMonitorScopes` requests only
`/user/installations?per_page=100&page=1`, then treats that page as the
complete authorized account set. With more than 100 installations, an
authorized account that falls on a later page can be absent from Settings
despite being discovered by monitoring. Settings also has no generation
guard around this multi-request account refresh; a late request can
repopulate the dropdown after an auth change.

Other candidates to distinguish with fixtures: malformed pagination
responses, duplicate account names, actual authorization loss, rate
limiting, and overlapping account-list refreshes. The confirmed primary
cause of page-two omission is the hardcoded first-page request. The
stale-response risk follows from missing post-await state checks; this
is an identified race path, not a claim of physical reproduction.

### Stages, contracts and rollback

1. [x] Extract the existing pure installation-pagination function into a
   shared UI module. Monitor and Settings must call **the same**
   implementation; preserve the monitor's public export and the
   existing 10-page / 100-item-per-page bounds and API permissions.
2. [x] Settings loads the complete bounded installation inventory,
   preserves an explicitly edited uncommitted account, and reports
   incomplete enumeration without implying that absent accounts are
   unauthorized. No new persisted fields, permissions, polling cadence,
   or local Git operations.
3. [x] Guard async Settings account-list publications against outdated
   refreshes and disconnects; stale successes/errors must not rewrite
   the current DOM/account state. Clear account/repo controls when the
   native connection is confirmed absent.
4. [x] Add deterministic Settings controller tests for a selected
   installation on the second page, 10-page truncation messaging,
   and stale in-flight completion after disconnect. Preserve the A8
   transactional OK/Cancel and selected-repo invariants.
5. [ ] Run one final STABLE Preflight on the code/test candidate. Record
   exact SHA, per-job status, and any unfixed limitations in a
   **separate docs-only commit**. Keep KDE/Windows, revoked/expired
   token and real >100-account acceptance deferred to #15.

The page bound remains the existing API-resource protection; incomplete
enumeration is **unknown**, not an assertion of complete account access.
No security boundary, public native IPC, Git safety, GitHub App scope,
persistent config format, release tag or `main` change is authorized
by this slice. Rollback is a revert of the A9 code/test commit, preserving
the released v0.2.0 binary and all persisted settings.

### A9 implementation status

- Code plus regressions: `1991f696` on `dev`.
- VM test fixture compatibility correction: `88563cfd`. The initial
  candidate passed the new cases but the legacy classic-script harness
  could not parse the Settings ESM import; it now injects the real helper.
- Final stable workflow: https://github.com/morozhenko-apps/repoticker/actions/runs/40000453665
  (pending at this checkpoint). Native desktop Rust tests and physical
  KDE/Windows authorization/selection acceptance remain deferred to #15.

## A10 — avoid Git scans when opening the usage popup (2026-10-24)

**Mode A — Feature/Refactor.** Limited to existing v0.3 performance
and auth-state correctness issue #12. No public GitHub scopes,
persisted settings, native command contracts, release/version
changes, or main promotion. Baseline source `9960789` passed
[Preflight #40111915215](https://github.com/morozhenko-apps/repoticker/actions/runs/40111915215)
4/4 with 263 tests; physical KDE startup timing still pending.

### Evidence and root cause

Current `apps/desktop/ui/quota.mjs::refresh()` runs on its
initial WebView load and on GitHub auth/scope events. It calls
native `get_snapshot` to acquire monitor status and the
configured organization. Native `get_snapshot` invokes `scan()`
which discovers every enrolled local repository and inspects
them. Yet the standalone usage popup never renders local Git
rows. Its monitor-updated handler already uses the lightweight
`github_monitor_snapshot`, showing that these full scans are
unnecessary. This hidden duplicated path remains after the
main-card monitor-only scan fix and can block tooltip startup
for the duration of an entire Git pass.

Potential alternate delay causes: native wallet lookup, REST
installation/job pagination, billing API data collection,
slow viewport measurement, missed GTK shown events, stale
async responses, and native Git inspect. Code path confirms
the unnecessary Git scan; we do not infer a measured speedup.

### Design and compatibility

1. [x] Replace usage popup's full `get_snapshot` with only
   `github_monitor_snapshot` (native in-memory cache) and
   `get_monitor_scope` (config-only account selection). Both
   commands already exist; preserve their schemas and
   original window permissions. No token, repo path, or
   GitHub REST data is passed into new UI boundaries.
2. [x] Read native `get_usage_popup_kind` AFTER the other
   asynchronous reads, preserving the last authoritative
   hover target. Continue to discard stale IPC completions
   using the existing `refreshId` generation.
3. [x] Keep the explicitly configured account (including
   null as All) and the monitor state's validated
   auto-selected organization fallback for opt-in Billing;
   clear old account billing projections when scope changes
   or native reports disconnected. Preserve unknown/not
   connected/connecting honesty and avoid extra REST fetches.
4. [x] Test the **real** usage controller with native IPC
   fixture: no full Git scan on startup, auth, scope, or
   monitor events; selected-org billing and native hover
   reconciliation still work. Add source-level assertion
   preventing reintroduction of `get_snapshot` in the
   detached popup. Run exact-SHA Rustfmt/core/Clippy,
   JS/Python release and Linux desktop compile.
5. [x] Record CI results and KDE cold/warm measurement
   instructions/remaining physical blockers in #12/#15;
   do not assert timing improvements without logs.

### Rollback and limits

Revert the A10 executable commit to restore popup full scan.
Local Git scanning for the main card and after actual Git
configuration/actions is intentionally unchanged. This
slice cannot establish startup-wallclock gains without
fresh KDE traces from the target host; the full
authorization and REST stages may still dominate.

### A10 implementation and validation checkpoint

- Docs-first plan: [`b3041ee`](https://github.com/morozhenko-apps/repoticker/commit/b3041ee46f89de9a2452767a8432b0132f2fd946).
- `quota.mjs` source [`0d9433a`](https://github.com/morozhenko-apps/repoticker/commit/0d9433ac68922c2ec073139e8871333c2dbd3e20)
  uses existing native `github_monitor_snapshot` and
  config-only `get_monitor_scope` concurrently for popup
  initialization, authorization and account-scope events.
  The active native hover kind is fetched last and
  async responses are still ignored after revision change.
  No new IPC command, permission, authentication scope
  or persisted model was introduced.
- [`4f8d0ca`](https://github.com/morozhenko-apps/repoticker/commit/4f8d0cad2e4363f3519c12a3675d41054a095adb)
  extends the real detached WebView controller test to
  verify startup and subsequent auth/scope refreshes
  trigger no full local Git snapshot, preserving billing
  account fallback and hover-type reconciliation.
  [`c7a2c97`](https://github.com/morozhenko-apps/repoticker/commit/c7a2c97a4307c7dbc67e1d56e00cf46a100319a1)
  adds the source guard preventing `get_snapshot` from
  returning to the detached popup.
- Exact executable/test SHA:
  `c7a2c97a4307c7dbc67e1d56e00cf46a100319a1`.
  [Preflight #40116265535](https://github.com/morozhenko-apps/repoticker/actions/runs/40116265535)
  reported **SUCCESS** for 78 Rust tests (45 unit, 30
  integration, 3 GitHub origin), Rustfmt and Clippy,
  plus **173 JS and 12 Python contract tests**, zero
  failures. Linux desktop compile and final aggregate
  were pending at this checkpoint; do not assert 4/4
  before their exact-SHA results are confirmed.
- This is source/API evidence, **not** a measured cold/warm
  KDE speedup. Issue #12 remains open pending two new
  cold/warm trace logs on the actual target host.
- The native MonitorCache already initializes with
  `Checking GitHub connection...` and Settings already
  displays `Checking connection...` until authoritative
  credential state. No cosmetic unverified connection
  flag was introduced by this slice.

### A10 final exact-source CI result

- [Preflight #40116265535](https://github.com/morozhenko-apps/repoticker/actions/runs/40116265535)
  **COMPLETED 4/4 SUCCESS** for executable/test source
  `c7a2c97a4307c7dbc67e1d56e00cf46a100319a1`:
  Rustfmt, 45 unit + 30 Git integration + 3 GitHub
  origin integration = **78 Rust PASS**, Clippy PASS;
  **173 Node PASS**, **12 Python release contract PASS**;
  Linux desktop compilation and aggregate Preflight PASS.
  Total **263 tests, zero failures**.
- This establishes source/test and Linux compile correctness
  for the monitor-only popup refactor, **not** target-host
  cold/warm latency improvements, GTK hover reliability,
  actual KWallet/REST network throughput or Windows
  physical runtime behavior.
- A10 is code complete; parent startup issue #12 remains
  **OPEN** for reproducible current-dev KDE cold/warm logs
  and real auth/offline/live tooltip validation. See the
  physical collection instructions earlier in this document
  and the issue comment documenting the exact gate.
- `main` and published v0.2.0 remain unchanged; there
  is no authorized release or version increment.

## A11 — stable metric refresh geometry, Cargo lockfile hygiene and KDE timing (2026-10-24)

**Mode A — Feature/Refactor.** Current dev base `d58f4e1` has
all A10 Preflight jobs green. The user reports the latest
desktop run now shows indicators and other content after
**approximately 8 seconds**. This is one user-observed
end-to-end interval without a new `REPOTICKER_STARTUP_DEBUG=1`
trace, cold/warm classification or separate GitHub REST
milestones. Do not equate it with the previous trace's
~8.21s first local card versus ~18.23s first remote display,
or claim an exact speedup. Keep #12 open for repeatable
cold/warm measurements.

### Root-cause evidence and decision

- The compact card's status strip has fixed `height: 25px`
  and narrow flex alignment. Both manual metric buttons set
  `aria-busy=true` while refresh is in flight. Existing CSS
  adds `.metric-caption::after { content: ' ↻'; }` only
  in the busy state. This inserts an extra inline glyph
  into a flex item, changes its intrinsic width and can
  reallocate space around the adjacent status controls.
  That is the confirmed layout-changing style path; the
  exact visual offset on KDE still needs physical validation.
- Alternatives considered: native focus outline (adds no
  box space), fixed status-strip padding (unchanged on click),
  conditional pseudo-element (changes text width), delayed
  network results (change numbers but not padding), and
  expanded drawer state (not triggered by metric click).
  Remove the conditional inline content, not the refresh
  semantics, and render a **positioned, in-place progress
  underline** on the same 23px button. Its pseudo element
  must be absolutely positioned, off by default, and must
  not affect parent flex width or row height.
- The workspace has a **tracked root Cargo.lock** and
  `.gitignore` explicitly states it is committed for
  reproducible app releases. Never ignore or blindly
  auto-commit it. A local modified Cargo.lock is not
  viewable via GitHub repo APIs; the exact local diff
  remains unknown. Compare `git diff -- Cargo.lock` to
  Cargo.toml changes. Commit an intentional dependency
  resolution update alongside its manifest change; if
  changes are incidental, restore the lockfile after review.
  Pin `--locked` in CI cargo build/test/check commands
  so dependency-graph drift fails rather than silently
  producing an unrelated lockfile modification.

### Stages and acceptance

1. [x] Replace busy caption text insertion with an
   absolutely positioned progress indicator inside the
   existing fixed-size metric button. Respect prefers-
   reduced-motion. Keep both independent refresh clicks,
   aria-busy, current numbers and tooltip behavior.
2. [x] Add CSS/HTML source contract ensuring busy state
   never adds inline layout content and the 25px strip,
   23px buttons and four primary buttons remain stable.
3. [x] Apply `--locked` to core and desktop Cargo CI
   commands without changing manifests, dependencies or
   the tracked lockfile. Add a release/source contract
   proving lockfile version-control and CI fail-closed
   behavior. Do not modify or auto-stage user local
   Cargo.lock; release workflow already checks Cargo
   metadata with --locked.
4. [ ] One final exact-SHA stable Preflight: Rustfmt,
   Rust tests/Clippy, Node/JS tests, Python release
   contracts, Linux desktop check and aggregate. Record
   evidence in a separate docs-only commit.
5. [ ] Document ~8s user observation in issue #12
   as an uninstrumented data point, and leave native KDE
   geometry/cold-warm verification pending in #12/#15.

### Rollback and scope

No new persisted setting, UI dimension, credential permission,
Git command, release tag or main-branch merge. Revert CSS
and test/CI commit if regressions occur. No release
approval is implied by Preflight success.

### A11 implementation and CI checkpoint

- CSS + regression tests [`b8dc34d`](https://github.com/morozhenko-apps/repoticker/commit/b8dc34d4902899c2e9a2ae0b5b9978033b174cf5):
  replaced the busy-only inline `↻` caption glyph with a
  **non-flowing, absolutely positioned** underline inside
  each existing 23px Runners/Tasks button. No card height,
  status-strip height, UI event, API action or count model
  was changed. The positioned pseudo indicator reserves no
  flex width; reduced-motion users see it without animation.
  A source contract checks the fixed 25px strip, absence of
  inline busy caption insertion and unchanged four action
  columns.
- Preflight pinned with `--locked`: [`bb3d954`](https://github.com/morozhenko-apps/repoticker/commit/bb3d954eff2dcfa47f8be84ee65be9428de871f6).
  Manual Strict Rust test loop pinned: [`debc4b9`](https://github.com/morozhenko-apps/repoticker/commit/debc4b9c2222d95a87c529032348ad7f88264feb).
  Release already calls `cargo metadata --locked`.
  Lockfile/source regression: [`08ed79e`](https://github.com/morozhenko-apps/repoticker/commit/08ed79e89a290a98fdee2c9db8852fec5041dfd9).
- Exact executable/test candidate:
  `08ed79e89a290a98fdee2c9db8852fec5041dfd9`.
  [Preflight #40122126070](https://github.com/morozhenko-apps/repoticker/actions/runs/40122126070)
  was pending at this checkpoint. Treat source/test acceptance
  as **PENDING**, not success, until all four jobs pass.
- Root Cargo.lock itself and all manifests remain untouched.
  The user workstation's dirty Cargo file is not visible
  through connected GitHub and its diff is not verified;
  do not automatically commit or restore it without
  inspecting whether it reflects intentional manifest
  changes. Inspect with `git status --short` and
  `git diff -- Cargo.lock`; use `git restore -- Cargo.lock`
  only when a reviewed change is incidental.
- The user's approximately 8-second initial display is
  recorded in issue #12 as a single uninstrumented
  observation, not a cold/warm benchmark or confirmed SLA.
  Native KDE geometry verification and comparative
  startup logs remain open; no `main` change or release.

### A11 resolved lockfile drift diagnosis (pending repair)

- Preflight [#40122126070](https://github.com/morozhenko-apps/repoticker/actions/runs/40122126070)
  for source/test SHA `08ed79e` **failed intentionally**
  after locked mode was enabled: both `cargo test --locked`
  and `cargo check --locked` reported
  `cannot update the lock file ... Cargo.lock because
  --locked was passed`. The JS and 14 Python release
  contract tests passed. This is direct evidence that
  the committed Cargo.lock is incompatible with current
  resolver state in a fresh Linux CI environment, explaining
  recurring local uncommitted changes; the exact diff
  remains to be inspected.
- **Repair plan:** temporarily run an unlocked full
  `cargo metadata` command in an isolated GitHub Actions
  checkout, print sanitized Cargo.lock content in bounded
  CI log chunks (public dependency metadata only), reconstruct
  the exact candidate and compare package resolution changes
  before committing. Do not relax production `--locked`,
  overwrite the user's local Cargo.lock or force a new
  unrelated package update. Remove the diagnostic step
  after recovery and repeat exact-SHA stable Preflight.
- This is a reproducibility fix to the already tracked
  workspace lockfile. No manifest/API/persisted setting
  change is necessary; lockfile resolution changes are
  reviewed explicitly before commit.

### A11 verified minimal Cargo.lock repair

- Debug Preflight [#40122451687](https://github.com/morozhenko-apps/repoticker/actions/runs/40122451687)
  used a short-lived diagnostic step in the isolated runner
  to resolve the entire dependency graph and expose only
  the public generated `Cargo.lock` bytes. Its Rust tests/
  Clippy and UI/release jobs passed after the diagnostic
  generated the correct lockfile; the separate desktop
  job correctly failed because it did not have that fix.
- Exact comparison of the committed lockfile with the
  fresh resolver output showed **only one 44-byte addition**
  to `[[package]] repoticker-core`:
  `dependencies = ["serde", "serde_json"]`. All
  **522 package names, versions and checksums were unchanged**.
  This is the confirmed root cause of repeated local
  Cargo.lock modifications after build.
- [`4657a9f`](https://github.com/morozhenko-apps/repoticker/commit/4657a9fdd7a35fbaf82882cf9dc5d0f8a0766860)
  commits exactly the CI-generated lockfile bytes; an
  explicit full-content equality check passed before
  writing the tracked file. No dependency upgrades,
  manifest changes, or user local changes were made.
- [`af48ae5`](https://github.com/morozhenko-apps/repoticker/commit/af48ae58f67bdfda468909ed0386c0de18e0e4fd)
  removes the temporary lockfile diagnostic code,
  preserving permanent `--locked` enforcement.
- Final code/test Preflight for `af48ae58f67bdfda468909ed0386c0de18e0e4fd`
  must be checked before claiming 4/4. Real KDE
  top-padding acceptance and repeatable ~8-second
  startup measurement remain open in #12.

### A11 post-repair source validation

- Final independent source/test SHA:
  `af48ae58f67bdfda468909ed0386c0de18e0e4fd`.
  [Preflight #40122702868](https://github.com/morozhenko-apps/repoticker/actions/runs/40122702868)
  confirms **SUCCESS** for Rustfmt, **45 unit + 30 Git
  integration + 3 GitHub origin = 78 Rust tests**
  with `--locked`, and Clippy `--locked -D warnings`.
  The UI/release contract job is also **SUCCESS**:
  175 Node tests and 14 Python contract tests passed.
  Total **267 tests** passed without failures.
- The Linux desktop compile and final Preflight aggregate
  were still in progress at this checkpoint. Do not claim
  full 4/4 source completion until those jobs also pass.
- Live KDE metric-button geometry is not physically accepted;
  the CSS source contract verifies no busy-state inline
  content and fixed heights. User-controlled local
  uncommitted lockfile diffs cannot be inspected through
  GitHub; after user reviews the diff, refreshing from dev
  should bring the minimal committed lockfile correction.
