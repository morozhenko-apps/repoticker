# Native Hybrid Relay Transport

## Decision

RepoTicker uses a **native Tokio WebSocket client** for the approved personal
Cloudflare relay. Use tokio-tungstenite 0.30 with rustls and OS trust roots;
the operator bearer credential is read inside Rust from the dedicated OS
Keyring entry. Do not use a WebView socket, JavaScript password form or
generic WebSocket plugin that exposes tokens to an untrusted WebView.

Polling is the default. Hybrid is additive: the existing read-only GitHub
REST monitor, rate budget, CI status provenance and native notification
silent-baseline rules remain authoritative. Relay never mutates local Git.
Its messages are only hints to reconcile through GitHub REST.

## Configuration and lifecycle

Persist only `connection_mode` (polling/hybrid) and a canonical HTTPS
`relay_url` in the existing version-tolerant atomic config. The URL is an
origin, not a credential: HTTPS, host present, no user info, query, fragment,
path other than `/`, no non-443 port, bounded length and no nonpublic
localhost target. Convert it to WSS with `/v1/stream?after=<cursor>`.
The secret stays exclusively in the existing native Keyring entry
`com.morozhenko.repoticker.relay / personal-hybrid-client-v1`.

Selecting Hybrid requires a nonempty monitored GitHub account and a validated
origin URL. The UI can only enable it after confirming a stored native relay
secret. Cancel leaves the config unchanged; Save writes mode and URL together
as one config transaction. If credentials, network, scope or WebSocket are
unavailable, keep REST polling functional, surface nonsecret availability,
and do not retain or fabricate CI status.

The native transport is bound to a single app-runtime generation and exactly
the configured account and selected repositories. Restart/abort it after
scope changes, GitHub authorization transitions, credential replacement/
deletion, mode or URL edits, and process shutdown. Ignore late results from
older generations. One WebSocket per process; no WebView-provided network
headers, arbitrary URLs or raw frames. Native TLS verifies the server with
system trust roots; no redirects, insecure transports, auth query params,
cookies or certificate-validation bypasses.

Each connection carries a strictly validated bearer only in the native
WebSocket upgrade header (header marked sensitive). The desktop accepts
only `hint`, `reset` and `ready` frames validated by the existing
`repoticker-core::relay` parser, bounded by WebSocket message/frame
limits. It tracks an in-process replay cursor; gap/reset/ready triggers
a bounded full REST reconciliation, while matching hints trigger tasks
refresh. A 15-second burst gate already coalesces duplicate native triggers.
On reconnect, REST reconciliation is always performed, independently of the
replay cursor; process restart starts at cursor zero and may receive reset.

Untrusted websocket frames, invalid versions, auth rejection and transport
errors terminate the stream; the independently scheduled REST monitor
continues. Reconnect with capped exponential backoff and a cancel-aware
task; no polling spin, unbounded buffers, background Git actions or recursive
reconnect tasks. Never log bearer, payloads, private repository names or URL.

## Validation and rollback

Milestones:

1. Pure canonical URL, scope and frame-contract tests, keyring custody
   established (already implemented).
2. Native Rust WSS stream and generation-bound supervisor; tests for
   reconciliation/gaps/auth/scope/failover, with injectable dependencies
   where practical.
3. Transactional Settings selection, credential readiness, error handling;
   complete EN/RU translations, 20-locale fallback and existing dialog tests.
4. Reproducible `Cargo.lock` refresh on a trusted Cargo runner, then the
   complete pinned Node26, Rust fmt/clippy/test and Linux/Windows locked-build
   gates. Never hand-edit a guessed lockfile.
5. Physical KDE/Windows tests and operator-managed Cloudflare deployment,
   only after separate approval. Leave the issue open until these pass.

Rollback points: config/schema+UI, transport supervisor and dependency change
are separate commits. Unknown or damaged config falls back only via the
existing validated backup behavior, never by erasing preferences. A
feature-disabled or failed relay always preserves Simple REST monitoring.

CI provenance: native acceptance builders require `cargo --locked`.
If Cargo is unavailable in the authoring runtime, the dependency+manifest
commit must be followed by a reproducible runner-generated lockfile before
acceptance is considered valid; document and stop, not claim success.
