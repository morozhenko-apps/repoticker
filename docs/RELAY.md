# Optional Hybrid relay: implementation boundary

RepoTicker uses **Simple polling** as the default authoritative GitHub REST monitor. The `dev` branch has a native TLS WebSocket client, a personal Cloudflare Worker / SQLite Durable Object, OS Keyring secret entry and transactional Hybrid Settings. The native Cargo lock is committed and unpublished Linux/Windows acceptance bundles were built, but physical acceptance and operator-authorized deployment are still pending. **Hybrid is not a hosted RepoTicker service or a released feature.** No Cloudflare account, secrets, hosted routes or GitHub webhooks have been changed. A generic Docker/VPS adapter remains outside this phase.


## Hybrid Settings and operator provisioning

The **CI event source** and **CI notification type** are separate settings. Source choices: direct GitHub REST polling (default), or operator-owned Hybrid webhook hints with REST reconciliation. The notification type (off / failures / successes / both) is independent and is not rewritten when source changes. Hybrid only changes the refresh trigger; webhook hints must never become authoritative workflow results.

Settings must permit selecting Hybrid to inspect its setup form **before** credentials exist. Show the HTTPS Worker origin, native OS-Keyring Set/Forget controls and setup guidance only when Hybrid is selected. Never require a secret merely to open the form. Keep **Save disabled** for an incomplete Hybrid draft (missing validated Worker URL, native relay secret, or authorized GitHub monitoring scope); Cancel preserves the persisted mode/URL. Simple polling is always available, even if the relay is unavailable. Secret operations are immediate native keyring changes, independent from the Settings OK/Cancel draft.

No GitHub device authorization code, RepoTicker-issued token or public relay key exists. The **single operator** generates `RELAY_CLIENT_SECRET` locally, supplies it to their own Cloudflare Worker secret binding and enters **the same value** using RepoTicker's native OS secret prompt. On an Ubuntu system with OpenSSL, the operator can generate a 64-character base64url secret (never check it into source):

```sh
openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\\n'
```

Use a **different** `WEBHOOK_SECRET` for GitHub's webhook signature, and configure the private `ALLOWED_REPOSITORIES` list. After separately approved Cloudflare deployment, enter the deployed HTTPS Worker origin (not the `/v1/github` path) in Settings. GitHub's `workflow_run` webhook endpoint is `https://YOUR-WORKER-ORIGIN/v1/github`; the native client uses a separate authenticated WSS endpoint. Do not paste either secret into URLs, WebView fields, logs, Issues or git history. The repository contains **no default relay endpoint** and neither installing the desktop app nor choosing Hybrid deploys one. See `apps/relay-cloudflare/README.md` for the operator's requirements.

This is documented configuration guidance, **not authorization to deploy**, create Cloudflare resources, upload secrets, register a GitHub webhook, alter the shared R2 bucket or change `main`. Validation must cover pre-credential reveal, notification/source independence, the guarded Save, Keyring-only custody, 20 locales, fallback and installed KDE/Windows behavior.

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
- `crates/repoticker-core/src/relay.rs` validates native protocol frames
  and scopes. `apps/desktop/src-tauri/src/relay_transport.rs` connects
  to a validated `wss://` origin with native Rustls and a separate
  OS-Keyring bearer, handling cursor replay, keepalive, bounded reconnect
  and read-only REST reconciliation. `relay_endpoint.rs` rejects
  non-HTTPS or credential-bearing Worker URL input; Settings persists
  only mode and nonsecret URL through the atomic config transaction.
  The native transport remains uncompiled/unaccepted until the
  Cargo.lock handoff and full native acceptance gate pass.
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
Milestone 3 has the pure native protocol validation and the credential-free
`repoticker-relay-reconcile` bridge implemented: the current GitHub monitor
accepts only `tasks`/`all` native reconciliation triggers, rate-limits
them independently to one per kind per 15 seconds, and routes them only
through the existing authenticated GitHub REST collection. It never
accepts GitHub conclusions from relay events or dispatches local Git.
The secure native network connection and credential provisioning remain
unimplemented.
Milestones 3 (secure native connection), 4 (Settings and fallback),
5 (full CI/native acceptance and deployment) remain open. Do not claim
Hybrid enabled or publish a new desktop candidate until the native
transport dependency and lockfile are resolved.

- `efa0a948`: bounded, credential-free native reconcile signal bridge to
  the existing GitHub monitor, with a deterministic burst, reset and
  notification-opt-out regression.


## Native relay secret custody

The owner selected OS-native secret entry, never a WebView password field.

- `relay_secret.rs` uses GTK 3's hidden password dialog on Linux,
  transient to the Settings GTK window; on Windows it uses Win32
  Credential UI with password-only input and `DO_NOT_PERSIST`.
  The native dialog is single-flight.
- Only invocations originating from the trusted Settings WebviewWindow
  are admitted. Native commands have no WebView-provided `secret` argument:
  they return a boolean credential status, an accepted/cancelled result,
  or a fixed redacted failure. They never return credential bytes.
- Relay credentials use a separate Keyring service/account
  (`com.morozhenko.repoticker.relay`,
  `personal-hybrid-client-v1`), isolated from GitHub OAuth.
  Values are validated as base64url ASCII of length 32–256.
  Owned secret buffers are volatile-zeroed through a Drop guard even
  on failure; Win32 input buffers are zeroed before returning.
  The native prompt refuses a late write after Settings closes.
- Settings offers Set/Forget buttons with an accessible stored/
  not configured/unavailable status. These actions are immediately
  committed to the OS keyring in the separate native dialog, not to
  `config.json` or the transactional Settings OK/Cancel draft.
  The UI must clearly communicate that distinction.
- The dev Settings UI conditionally offers Hybrid only after the
  native Keyring reports an available secret and GitHub is connected,
  while always allowing rollback to polling. This is **source under
  test**, not a supported deployed mode. No official release until
  the genuine Cargo.lock, Linux/Windows compilation and installed
  acceptance pass.
  No secret-bearing WebView transport or unverified manual fallback.

Rollback: revert the focused native credential and Settings commits
without affecting the GitHub OAuth keyring entry or Simple polling.
