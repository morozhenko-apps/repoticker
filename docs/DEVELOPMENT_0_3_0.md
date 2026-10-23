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

## Stop factors and invariant boundaries

If later stages require a changed persistent model, GitHub App
permission scope, security boundary, public IPC capability for
untrusted external webviews, or incompatible data model, stop with
2–4 architectural options. A1 remains within the existing internal
read-only command boundary. Never expose credentials or raw provider
responses to webviews; unknown counts are never zero; local Git remains
manual and ff-only.
