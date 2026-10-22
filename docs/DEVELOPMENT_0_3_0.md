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
1. [ ] Native read-only getter with same `read_config` error semantics;
   register in the existing command handler (no filesystem mutation).
2. [ ] Replace monitor's full scan invocation with
   `get_monitor_scope`; preserve selected account and auto-selection.
3. [ ] Deterministic Node contract tests: the collector obtains the
   persisted scope without calling `get_snapshot`; source-level native
   contract check that command reads `read_config`, not git::inspect.
4. [ ] Final CI Preflight stable Rust/JS/native Linux gate **once** after
   planned edits; do not run full Mode B or repeatedly rerun CI.
5. [ ] Commit code and focused tests atomically, update this
   documentation in a **separate docs-only commit**; record exact SHA,
   CI run, and any unvalidated physical acceptance.

Rollback: revert the one code/test commit. No credential migration
or data conversion required, and published v0.2 is unaffected.

### Follow-up stages (not implemented by A1)

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
- **A5: 0.3 release gate**. Version helper/Cargo.lock, final stable
  CI, physical KDE and Windows smoke where possible; publish as a
  new immutable tag only after acceptance. No auto-promotion.

## Stop factors and invariant boundaries

If later stages require a changed persistent model, GitHub App
permission scope, security boundary, public IPC capability for
untrusted external webviews, or incompatible data model, stop with
2–4 architectural options. A1 remains within the existing internal
read-only command boundary. Never expose credentials or raw provider
responses to webviews; unknown counts are never zero; local Git remains
manual and ff-only.
