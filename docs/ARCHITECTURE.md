# Architecture and trust boundaries

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

Linux uses `ksni` StatusNotifierItem because the relevant Tauri tray click callback does not satisfy the desired Linux activation semantics. On KDE Wayland, GTK Layer Shell supplies bottom/right anchors, while generic unsupported environments fall back to a frameless Tauri surface. The published v0.1.0 Wayland drag path visibly jitters. After KDE acceptance rejected the WebView-local correction, dev now uses a GTK3 Wayland native bridge bound to GDK's own `wl_pointer` and `zwp_relative_pointer_v1`. Device-relative deltas reach GTK's main thread directly and change Layer Shell margins without JS motion IPC. JS handles pointer-capture start/stop only; it never supplies screen/client movement coordinates. Runtime KDE acceptance is pending; [Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2) stays open. No macOS UI/installer acceptance is implied by icon assets or source compatibility.

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

## Existing quota tooltip integration (dev)

`apps/desktop/ui/quota-details.mjs` maps a complete/partial runner-state
snapshot to presentation-safe strings and strict GitHub Actions job URLs.
`app.mjs` renders these into the pre-existing `quota-tooltip` child
using DOM `textContent`; the three `status-strip` counter elements and
ordering are not replaced. Actions job links are opened only through a
read-only native Tauri command that validates the allowed github.com job
URL path before launching the system browser.

On Linux a separate `quota` view height is accepted by the existing
`set_card_view` operation, using GTK Layer Shell's original bottom anchor.
When hidden or closed, the original 122px compact surface is restored.
The detailed popup does not require Cloudflare or RunnerRouter.

The `runner_state` projection is a future native snapshot extension.
No token, authorization flow or live GitHub reads have been added in
this stage. Native authenticated fetch and OS secret storage are a
separately tracked security boundary.

## Native Actions usage overlay (dev, KDE acceptance pending)

The initial single-WebView quota tooltip was an architecture mismatch
on Wayland: a DOM element cannot visibly escape the compositor's 122px
main surface. A 510px in-flow expansion clipped less but changed the
main window's height and visual movement, and the user rejected it.

The candidate overlay now has a separate `usage` Tauri WebView
(`apps/desktop/ui/quota.html`, `quota.mjs`, `quota.css`) backed on KDE
Wayland by its own transparent GTK3 Layer Shell window using
`Layer::Overlay`. It shares only logical margins with the primary card,
not the WebView's geometry allocation. The main card never requests
`quota` mode. The dedicated usage surface can resize to its own
bounded content, float above the main compact card, and scroll details.
On other platforms a separate managed Tauri window handles the popup.
Neither mode requests a Cloudflare Worker.

Relative-pointer-v1 input still belongs exclusively to the main
surface. The popup is hidden when the main card is hidden or a drag
begins. The overlay's pointer transfer grace is for crossing between
independent native surfaces, not for retrying network or dispatch work.

This architecture is a build-validated *candidate* until KDE physical
acceptance. No source-level unit tests can prove native surface
allocation, compositor placement or the perceived smoothness of drag.
