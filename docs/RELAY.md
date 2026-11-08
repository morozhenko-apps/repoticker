# Optional Hybrid relay: implementation boundary

RepoTicker currently ships **Simple polling** through the native read-only GitHub REST client. Source for a personal Cloudflare Worker, signed webhook ingress, bounded SQLite Durable Object, WebSocket hibernation and replay exists on `dev`; it is **not deployed** and not yet connected to a native desktop WebSocket client. The Settings connection-mode selector still does **not** activate Hybrid, and Worker URL remains unavailable. The generic Docker/VPS adapter is not implemented.

## Agreed high-level path

- GitHub webhook delivery enters an operator-owned HTTPS relay. Verify `X-Hub-Signature-256` using an operator-provisioned secret and the **unmodified original request body**, before any JSON parsing, acknowledgment or fan-out.
- The relay sends only bounded, scope-checked event metadata to authenticated desktop clients via TLS WebSocket. GitHub user OAuth tokens stay in the operating system's credential store and are never sent to the relay.
- Bounded, per-tenant deduplication uses GitHub delivery IDs plus durable resume cursors. Transient disconnects must not fabricate events or replay stale notifications.
- Native REST polling remains an independently usable fallback and reconciles after reconnect. Webhooks do not execute local Git Fetch, Safe Sync, pull or push.
- The first supported adapter targets Cloudflare Worker + Durable Object; a generic self-hosted Docker/VPS adapter can share the protocol once its security model is fixed.

## Implemented source, not yet an enabled desktop mode

- `src/webhook-verify.mjs` verifies HMAC-SHA256 on the original raw body.
- `src/relay-protocol.mjs` restricts repository identities, allowlists,
  JSON event shapes, UUID delivery IDs, cursor bounds, bearer authentication
  and streaming body size.
- `src/worker.mjs` implements authenticated ingress and replay/stream
  routing. Only signed allowlisted completed workflow events enter storage;
  signed GitHub ping is acknowledged without a hint.
- `src/hub.mjs` implements a single SQLite Durable Object, duplicate
  suppression, max 128 retained hints, 24-hour replay horizon, max 8
  WebSocket clients, max 120 admitted deliveries per minute and replay reset
  signaling. Existing retained hints for a removed repository are filtered.
  WebSockets use Cloudflare hibernation.
- `src/index.ts` and `wrangler.toml` define the Worker and SQLite DO
  binding. No secret values, operator repository lists, external routes,
  CI deployment or production Worker have been configured.
- `crates/repoticker-core/src/relay.rs` parses minimal native protocol
  frames and yields *read-only REST reconciliation* decisions. It is not
  yet wired to a native WebSocket transport or live Settings.
- Node tests are in `tests/relay-{protocol,worker,hub,webhook-signature}.test.mjs`;
  the Rust core module contains protocol and scope tests. Tests are
  **committed, but a full pinned Node/Rust gate on these changes has not
  yet been reported**.

The old Worker HTTP 501 placeholder is replaced in source; this must not
be interpreted as permission to deploy or as a functioning Hybrid desktop
connection.

## Trust-domain decision and remaining security work

The owner selected **Option A, one operator**, for this implementation. Option B
remains explicitly out of scope:

- **A. One operator / one relay trust domain.** Separate webhook and authenticated WebSocket client secrets provisioned by the operator, with the client secret stored in the OS credential vault. The relay serves only that operator's explicitly configured repositories. Simpler to audit and deploy on either Cloudflare or self-hosted infrastructure; each operator manages their own installation and key rotation.
- **B. Multi-tenant shared relay.** A versioned client authentication and account-binding protocol, tenant-scoped authorization at every message/store access, per-tenant quotas and revocation. Allows shared hosting but requires substantially more security infrastructure, abuse protection and operational testing.

Before either mode can be enabled, implement and test: bounded raw-body reads, signature error handling, event allowlist and schema validation, delivery deduplication, authenticated TLS WebSocket upgrades with replay bounds, tenant separation, cursor durability, reconnection, API reconciliation, offline fallback, credential provisioning/rotation and transport abuse limits. Test forged events, wrong-tenant subscriptions, duplicate IDs, expired credentials, malformed frames, replay windows, rate limits and provider outages.

**No hosted deployment, real Webhook URL, Worker secrets or public rollout is authorized by a source-code implementation request.** Native WebSocket transport, OS credential provisioning and revocation, Settings transactions, managed REST fallback, full Node/Rust gates, Wrangler bundling, operator security review and physical KDE/Windows validation are mandatory before Hybrid can be enabled. Secrets must never enter WebView, local plaintext preferences, GitHub Issues or repository history.


## Personal Cloudflare relay implementation plan (2026-11-08)

**Mode A / feature.** Owner selected option A: a **single-operator Cloudflare Worker +
SQLite Durable Object**, not a shared account or SaaS. No service deployment,
external environment mutation, repository webhook creation, secret insertion,
release, or change to `main` is authorized.

### Versioned protocol and trust boundary

- Public HTTPS `POST /v1/github`: GitHub `X-Hub-Signature-256` over the exact
  original bytes; require `X-GitHub-Event: workflow_run`, exact UUID-form
  `X-GitHub-Delivery`, `action: completed`, and an explicitly configured
  operator `ALLOWED_REPOSITORIES` (canonical GitHub owner/repo identities).
  Unknown events are rejected without acknowledgment, not enqueued. Reject
  oversized request bodies *while reading* (max 64 KiB) and malformed JSON
  without logging payload or provider data. `WEBHOOK_SECRET` and
  `RELAY_CLIENT_SECRET` are separate high-entropy secrets, provisioned
  through Cloudflare secret bindings.
- The single Durable Object owns an SQLite append-only monotonic cursor
  journal of `{cursor, delivery_id, repo, time}`. Duplicate delivery IDs
  are idempotent and never broadcast twice; retain at most 128 hints and
  a 24-hour dedup/replay horizon; old cursors require full REST reconciliation.
  No source repository contents, workflow logs, job details, secrets or tokens
  enter the journal. SQL statements are parameterized, storage writes precede
  acknowledgment and outbound notifications. Storage failure returns 503 so
  GitHub may retry. All event hints are **advisory**, never CI conclusions.
- Native authenticated `wss://.../v1/stream?after=<cursor>` with
  `Authorization: Bearer <RELAY_CLIENT_SECRET>`, no query-token,
  cookies, CORS or arbitrary origin forwarding. The Worker validates the
  client bearer in constant-time and supplies a private Durable Object hop.
  Durable Object replays bounded hints or a `reset` frame on a cursor gap.
  WebSocket incoming application frames are restricted to control messages;
  invalid/unexpected payloads close without changing Git or subscription
  scope. Only one trusted operator and explicitly configured repository
  allowlist; no multi-tenant public API or account-binding.
- Authenticated `GET /v1/changes?after=<cursor>` uses the same bounded
  cursor journal as a recovery probe (not an alternative GitHub data feed).
  WebSocket failure, expired replay, authorization failure and provider
  errors always leave authoritative REST polling functional.
- Versioned protocol frames:
  `{"v":1,"type":"hint","cursor":N,"repository":"owner/repo"}`,
  `{"v":1,"type":"reset","cursor":N}`, and
  `{"v":1,"type":"ready","cursor":N}`.
  A hint means **schedule a scoped GitHub REST reconciliation**, not
  report failure, success, clear source history or run local Git actions.
  All unknown protocol versions or frames fail closed.

### Milestones

1. **Worker ingress / trust**: publish no endpoint yet; implement input
   validation, raw HMAC, bearer verification, bounded reads, explicit routing,
   and abuse cases in pure/testable modules. No token in URLs or logs.
2. **Durable Object / replay**: bounded SQLite journal, duplicate
   suppression, hibernatable WebSockets, hard connection limits and recovery
   endpoint. Unit and request/response contract tests with injected platform
   dependencies. No new hosted resources or credentials provisioned.
3. **Desktop native**: native secure credential entry in the OS store,
   authenticated TLS WebSocket client and configurable HTTPS endpoint.
   Do not use WebView for long-lived secret-bearing transport. The client
   must validate frames/scope/cursor and emit bounded *hints only*.
   Reconcile via the existing GitHub REST collector, preserving CI results,
   permissions, throttling and silent notification baselines.
4. **Settings and fallback**: transactional selection of Simple vs Hybrid
   and relay URL; encrypted client credential separate from GitHub OAuth;
   graceful rollback to Simple; tests for disconnect, reauth, stale events,
   process restarts, unknown frames, offline and consent.
5. **Release gate**: full pinned Node26/Rust/Python checks, native KDE and
   Windows acceptance, operator-reviewed Cloudflare setup, explicit
   approved deployment; do not infer physical success from source tests.

**Toolchain constraint:** the current Cargo.lock does not contain a
supported WebSocket client dependency. Adding a Rust WebSocket transport
requires an exact Cargo.lock update and a native build validation.
Do not silently smuggle a bearer token into the WebView to avoid that
toolchain requirement. Until milestones 3–4 are verified, Hybrid stays
unavailable in Settings.

**Rollback:** Worker/DO code is independent of the existing desktop
REST client, Git synchronization, and published releases. Revert
one milestone commit at a time; no deployment or credential migration
should be necessary for unshipped code.

### Development commits and recovery boundary

- `fb213506`: documentation-first selected personal trust model and stages.
- `bf08d2ab`: pure bounded input and client-auth contract with Node tests.
- `7c3313fd`: HTTP webhook ingress, signed ping, private Durable Object bridge.
- `527b9bad`: bounded SQLite journal, WebSocket hibernation and cursors.
- `0ae8c9b6`: operator-only Wrangler configuration and DO/SQLite regression tests.
- `807a30b0`: strict native Rust frame parser and REST-reconciliation decisions.
- `13998145`: replay filtering after operator revokes an allowlisted repository.

Milestones **1 and 2 are implemented in source, not externally accepted**.
Milestone 3 has only the pure native protocol validation implemented.
Milestones 3 (secure native connection), 4 (Settings and fallback),
5 (full CI/native acceptance and deployment) remain open. Do not claim
Hybrid enabled or publish a new desktop candidate until the native
transport dependency and lockfile are resolved.
