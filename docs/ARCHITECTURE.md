# Architecture and boundaries

## Components

1. `repoticker-core`: pure sync decisions plus the real, shell-free, local Git process adapter (discovery, inspect, fetch, ff-only) with integration fixtures.
2. Desktop Tauri shell: tray and compact card, with platform-independent state projection; OS-specific placement and lifecycle need physical testing.
3. Local Git adapter: calls installed Git with explicit argument vectors and relies on existing Git credentials/LFS configuration. No Git credentials enter JS. Manual operations are callable from UI and tray.
4. GitHub provider: future REST API actions/runners/billing clients; least-privilege auth stored in OS credential store.
5. Event engine: future cache, deduplication, reconnect/reconciliation scheduler, notifications.
6. Relay protocol: future independently versioned event envelope for Cloudflare and generic self-hosted implementations.
7. Platform adapters: future notification, keychain, autostart, tray positioning and secure external-browser opening.

## Operating modes

### Simple Polling (default)

Desktop -> GitHub REST (authenticated by user) -> state cache -> tray UI. No inbound ports, relay, server, domain or proprietary account required. API rate limits and offline state are first-class. Prefer conditional requests and adaptive per-resource scheduling.

### Hybrid (opt-in)

GitHub webhooks -> user's HTTPS relay -> authenticated outbound client WebSocket -> local event engine. Concurrent low-frequency polling repairs missed/out-of-order deliveries and captures billing/runner snapshots that webhooks don't provide.

Relay implementations: Cloudflare Worker + Durable Objects with authenticated per-user/per-installation channels, and provider-neutral Docker/VPS service. Compatible protocol; no Cloudflare assumptions in desktop logic. Relay is user-deployed using docs and a URL; desktop does not provision infrastructure.

## Trust boundaries

- GitHub payloads (including metadata) are untrusted until verified. Validate GitHub HMAC-SHA256 using raw body, bound payload size, reject replay and wrong repository/installation.
- Relay->client stream is separately authenticated with revocable client credentials and verified TLS. Replay by event ID/cursor; never broadcast across tenants.
- The relay should not store GitHub API credentials. Minimize event data and retain only bounded metadata; redact secrets from logs.
- An event must never directly invoke a pull or shell command. Fetch then re-evaluate repository state and execute native Git ff-only with failure isolation.
- Local uncommitted tracked/untracked changes, unfinished operations and divergent branches block auto pull.
- Distinguish stale cache, network error and permission denial. Never display estimated quotas as exact.

## Current executable boundaries

The Tauri shell now loads enrolled roots from its local app config, enumerates direct child Git checkouts, displays real local state, and supports manual fetch/safe pull. Git operations are serialized within this process and launched on a blocking worker thread. Repo details and errors return to the UI; no remote authentication is implemented inside the app. There is no automatic background fetch/pull, GitHub Actions API client, Cloudflare/self-hosted relay, packaged binary, or physically accepted KDE/Windows/macOS integration. See `docs/GIT_PROVIDER.md` for current known limits.

## Packaging and portability

Tauri 2 is selected provisionally for a common UI; Rust for core. GTK/WebKit dependencies are platform-specific build requirements. Known Linux limitation: Tauri 2's standard tray-icon click callback is unsupported on Linux, and show-menu-on-left-click is unsupported. The shell's **Open card** context menu is an interim entry point. rQuickShare-style primary-click opening, tray placement and edge-aware popover need a dedicated Linux adapter. KDE Wayland card anchoring, GNOME tray support, Windows/macOS notification and packaging behaviors must be physically verified. Do not mistake a cross-compiled binary for product acceptance.
