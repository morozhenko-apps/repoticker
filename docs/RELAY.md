# Optional Hybrid relay: implementation boundary

RepoTicker currently supports **Simple polling** through the native read-only GitHub REST client. The Settings connection-mode selector does **not** activate Hybrid; Worker URL is unavailable in Simple polling. The Cloudflare Worker entrypoint returns HTTP 501, and the generic Docker/VPS adapter is not yet implemented. These are deliberate fail-closed boundaries.

## Agreed high-level path

- GitHub webhook delivery enters an operator-owned HTTPS relay. Verify `X-Hub-Signature-256` using an operator-provisioned secret and the **unmodified original request body**, before any JSON parsing, acknowledgment or fan-out.
- The relay sends only bounded, scope-checked event metadata to authenticated desktop clients via TLS WebSocket. GitHub user OAuth tokens stay in the operating system's credential store and are never sent to the relay.
- Bounded, per-tenant deduplication uses GitHub delivery IDs plus durable resume cursors. Transient disconnects must not fabricate events or replay stale notifications.
- Native REST polling remains an independently usable fallback and reconciles after reconnect. Webhooks do not execute local Git Fetch, Safe Sync, pull or push.
- The first supported adapter targets Cloudflare Worker + Durable Object; a generic self-hosted Docker/VPS adapter can share the protocol once its security model is fixed.

## Current isolated implementation

`apps/relay-cloudflare/src/webhook-verify.mjs` exports a pure WebCrypto HMAC-SHA256 verifier over `Uint8Array` bytes. It rejects missing secrets, wrong bodies, malformed/missing headers and mismatched signatures; no network, storage, body logging, or persistence is involved. Deterministic tests reside in `tests/relay-webhook-signature.test.mjs`. This function is **not wired to the HTTP endpoint**. The worker still returns 501 for all requests, and no deployment or credential collection is configured.

## Security decision required before public transport

Two sound rollout contracts remain possible:

- **A. One operator / one relay trust domain.** Separate webhook and authenticated WebSocket client secrets provisioned by the operator, with the client secret stored in the OS credential vault. The relay serves only that operator's explicitly configured repositories. Simpler to audit and deploy on either Cloudflare or self-hosted infrastructure; each operator manages their own installation and key rotation.
- **B. Multi-tenant shared relay.** A versioned client authentication and account-binding protocol, tenant-scoped authorization at every message/store access, per-tenant quotas and revocation. Allows shared hosting but requires substantially more security infrastructure, abuse protection and operational testing.

Before either mode can be enabled, implement and test: bounded raw-body reads, signature error handling, event allowlist and schema validation, delivery deduplication, authenticated TLS WebSocket upgrades with replay bounds, tenant separation, cursor durability, reconnection, API reconciliation, offline fallback, credential provisioning/rotation and transport abuse limits. Test forged events, wrong-tenant subscriptions, duplicate IDs, expired credentials, malformed frames, replay windows, rate limits and provider outages.

**No public Hybrid endpoint, persistence schema, WebView credential handling or deployment may be introduced without approval of the authentication/trust-domain contract.**
