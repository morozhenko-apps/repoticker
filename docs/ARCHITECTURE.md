# Architecture and trust boundaries

## Current `dev` CI notification trust boundary (2026-10-24)

This section supersedes the original **v0.1.0** status table below for
the current development branch. Public `v0.2.0` remains unchanged.

- `github_api_get` makes outbound authenticated, bounded GitHub REST
  requests for `status=completed`; only validated
  `id`, `run_attempt`, `conclusion` and `updated_at`
  reach the JavaScript transition engine. No local HTTP listener
  or webhook relay is involved.
- `ci_failure_notifications` defaults OFF for new/legacy config.
  Settings has transactional OK/Cancel; a config-only monitor read
  transports the flag without scanning local Git repos.
- Completed-run collection and a scoped, bounded per-run-attempt
  history identify new failures; first reads/reconnection are silent.
  Errors, incomplete current-job coverage and missing jobs do not
  imply failure. At most five new alerts are sent per monitor cycle.
- `ci_notifications.rs` checks persisted opt-in, monitor scope,
  sanitized repository, run ID, attempt and native OS permission.
  It uses the official Tauri notification plugin, with no generic
  JavaScript notify capability, token handling or arbitrary text/URL.
- The exact executable SHA `5a027460` passed
  [Preflight #40129124638](https://github.com/morozhenko-apps/repoticker/actions/runs/40129124638),
  4/4 including `cargo check --locked` on Linux.
  Actual KDE and installed Windows OS alert delivery remains pending.
  Autostart and Hybrid relay are separate decisions.

## Runtime components and status

| Component | v0.1.0 status | Role |
| --- | --- | --- |
| `repoticker-core` | Implemented and covered by Rust integration tests | Git root normalization/discovery, status, eligibility and native Git fetch/ff-only operations; bounded independent work |
| Tauri desktop | Implemented; Linux local smoke | Tray and UI, state projection, transactional settings, action IPC and per-user config |
| Linux SNI + GTK Layer Shell | Implemented; acceptance incomplete | Native tray left-click/context menu and anchored KDE Wayland card |
| GitHub REST provider | Planned | Auth, Actions runs/jobs, self-hosted runners, rate limits and usage data |
| Event/cache/notification engine | Planned | Poll scheduling, reconnect, state transitions and optional safe sync |
| Hybrid webhook relay | Planned | User-operated Cloudflare DO or Docker/VPS relay and authenticated event delivery |
| R2 download Worker | Implemented as separate deployment component | Read-only public distribution of installer and signed-APT objects; **not** a GitHub events relay |

## Current data flow

1. The user adds an absolute repository root through Settings; config is stored under the OS application config directory. On Linux the app identifier is `com.morozhenko.repoticker`; the default file is `~/.config/com.morozhenko.repoticker/config.json`.
2. The Rust core discovers only the enrolled root and valid direct-child checkouts, asks installed Git for local/upstream information and returns a snapshot. No GitHub CI network requests are performed.
3. A manual Fetch calls configured Git remotes without an interpolated shell command. Parallelism is bounded at four independent checkouts; one failure does not cancel others.
4. A manual Safe pull uses **already-fetched refs** and a fresh eligibility check, then sequentially invokes native Git fast-forward only. It does not contact the network.
5. Progress events are delivered to the UI; total completion refers to repositories completed, not Git network transfer bytes. Only errors become user-visible transient results.

Config persistence currently uses JSON writes without atomic rename/migration; crash recovery is future hardening. RepoTicker relies on the user's existing Git authentication/helpers and does not read Git secrets into its JS layer.

## Presentation boundaries

Linux uses `ksni` StatusNotifierItem because the relevant Tauri tray click callback does not satisfy the desired Linux activation semantics. On KDE Wayland, GTK Layer Shell supplies bottom/right anchors, while generic unsupported environments fall back to a frameless Tauri surface. The published v0.1.0 Wayland drag path visibly jitters. After KDE acceptance rejected the WebView-local correction, dev now uses a GTK3 Wayland native bridge bound to GDK's own `wl_pointer` and `zwp_relative_pointer_v1`. Device-relative deltas reach GTK's main thread directly and change Layer Shell margins without JS motion IPC. JS handles pointer-capture start/stop only; it never supplies screen/client movement coordinates. KDE Wayland acceptance was confirmed in the current `dev` build on 2026-10-20, and [Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2) is closed. The older published `v0.1.0` remains unchanged. No macOS UI/installer acceptance is implied by icon assets or source compatibility.

The app must display `unknown` instead of zero or success when GitHub CI/runners/quota data are not available. Direct Actions URLs may be opened only following a user action and validated according to the security contract.

## Future operating modes

**Simple:** authenticated desktop-to-GitHub REST polling with conditional requests, per-resource scheduling, bounded cache, rate-limit handling and startup/reconnect reconciliation. This is a planned connection mode, **not currently active background polling**.

**Hybrid (opt-in):** GitHub signed webhook -> user-controlled HTTPS relay -> authenticated WebSocket client -> event hint -> authoritative GitHub REST reconciliation. Cloudflare Worker + Durable Objects and a generic Docker/VPS relay must share a versioned, tested envelope. This feature is not implemented.

## Security boundaries

- Git metadata, remote URLs, API payloads and webhook hints are untrusted. Never construct shell commands from network data or run arbitrary git mutation on webhook receipt.
- Auto pull, if added later, must fail closed for dirty/untracked changes, unfinished operations, local ahead/divergence, missing upstream or stale authorization.
- Webhook ingest must verify raw-body HMAC-SHA256, payload size and replay/delivery ID; relay must enforce client authentication, TLS, isolation, bounded retention and resume.
- GitHub credentials must be least-privilege and held in native secret storage rather than JS or relay persistence.
- Cloudflare release signing authority stays in a protected GitHub environment; only the signing subkey is exported to CI, not the local certification key.

## Release and support boundaries

Version consistency and a tracked `Cargo.lock` are release gates. A `v*` tag pointing at current `main` HEAD builds Linux DEB/AppImage and Windows NSIS; signed APT/R2 publication and GitHub Release happen only after successful builds, public readback and approved deployment. macOS is currently skipped. See [RELEASE.md](RELEASE.md), [PRODUCT.md](PRODUCT.md), [GIT_PROVIDER.md](GIT_PROVIDER.md), [RELAY.md](RELAY.md) and [ROADMAP.md](ROADMAP.md).

## Native Wayland hover surface and monitored status (dev candidate)

The established 390x122 KDE Wayland card continues to use the GDK-owned native relative-pointer bridge and GTK Layer Shell. The read-only hover overlay is a separate non-focusable pointer-pass-through Layer Shell window, bottom/right anchored on the card's monitor, with a 12px vertical separation and independently measured 118–320px height. The application never adds a focusable scrolling WebView to the compact card.

Current unmerged feature-branch UX has **two** compact status groups rather than the initial three: organization self-hosted registered runners (total/online/offline), and monitored Actions jobs (running/queued). Three independent hover triggers reuse one existing overlay and switch by a validated native event kind (`runners`, `tasks`, `billing`). The billing view has only separate organization and personal-account free allowance information, presently unknown; it is not derived from runner counts or Actions jobs. A queued job is not assigned to a runner; compatibility by labels is presented as a candidate, not as a reservation.

Native HTTPS bearer tokens remain in the OS secret store and never enter JavaScript. The billing transport and expanded OAuth scopes are not implemented; [SPLIT_HOVER_BILLING.md](SPLIT_HOVER_BILLING.md) records the security decision requiring explicit user choice. Published v0.1.0, main, and the native Wayland drag integration are unchanged. Physical KDE acceptance of the new tooltip UX is outstanding.
