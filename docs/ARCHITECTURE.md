# Architecture and boundaries

## Components

1. `repoticker-core`: pure, testable domain types and decisions (currently includes safe sync classifier).
2. Desktop Tauri shell: tray and compact card, with platform-independent state projection; OS-specific placement and lifecycle need physical testing.
3. Local Git adapter: future process-level integration with the user's installed Git, credentials and LFS. Never read remote tokens into JS.
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

The Tauri shell presently returns an *empty* snapshot from a stub command; it does not enumerate repos or call GitHub. The Rust core only classifies an already inspected repository state. The Cloudflare and self-hosted relay code is not yet functional. No action should imply production readiness.

## Packaging and portability

Tauri 2 is selected provisionally for a common UI; Rust for core. GTK/WebKit dependencies are platform-specific build requirements. Linux KDE Wayland card anchoring, GNOME tray support, Windows/macOS notification and packaging behaviors must be physically verified. Do not mistake a cross-compiled binary for product acceptance.
