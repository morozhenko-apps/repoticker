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
origin URL. The UI can reveal Hybrid setup before a secret exists, while Save remains
blocked until a validated URL, connected GitHub account, selected scope and
stored native relay secret are confirmed. Cancel leaves the config unchanged;
Save writes mode and URL together as one config transaction. If credentials, network, scope or WebSocket are
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

## Event-driven scheduling and lost-delivery recovery (2026-11-08)

### Motivation and native contract

The previous monitor used the same 2–7 minute full REST cycle in Simple and Hybrid,
regardless of an online WebSocket. Webhook-triggered REST calls therefore increased
GitHub API consumption without replacing any routine collection. The one
`lastAttempt` timestamp also risked postponing independent safety checks when
task hints arrived frequently. The relay admitted only `workflow_run.completed`,
so queued/running transitions relied entirely on polling.

Hybrid is a **source of early invalidation hints**, never a source of CI
conclusions or an alternative credential endpoint. GitHub REST remains the
authoritative read, including queued/running status and completed conclusions.
Keep one GitHub OAuth credential in the native vault; keep relay bearer distinct.
Do not change the versioned hint frame, Durable Object journal or stored config.

- Simple polling, native `polling`, `connecting`, `fallback`, missing or
  unknown transport status: retain the established adaptive 2–7 minute
  full REST polling schedule. A transport failure after a confirmed online
  period immediately schedules a guarded full reconciliation.
- Native `online` Hybrid: CI task snapshots are refreshed by scope-checked
  relay hints (`tasks`), and a full REST reconciliation is scheduled on a
  15-minute safety interval to catch missed deliveries or cursor gaps,
  subject to network availability and the existing GitHub API cooldown. The separate
  runner capacity metric refresh remains at the existing adaptive cadence.
  Use independent last-full and last-runner clocks so frequent task hints
  cannot indefinitely starve either periodic check. Preserve the native
  rate-limit cooldown gate and existing single-flight coalescing.
- The UI must obtain the initial native-only `relay_connection_status`
  without trusting user-supplied connection state; `repoticker-relay-state`
  events update scheduling on transitions. Discard stale asynchronous
  initial status reads after newer state events. Unknown state fails open
  to **more REST reconciliation**, not to false CI success.
- Accept signed, allowlisted GitHub `workflow_run` activity
  `requested`, `in_progress` and `completed` with an appropriate
  underlying workflow run status. GitHub's queued transition is reported
  as `requested`, **not** an action named `queued`. The relay sends
  identical minimal repository-only hints for all three; never forward
  action/status/conclusion, workflow logs, OAuth or repository content.
- GitHub does **not automatically redeliver failed webhooks**. A 503
  signals failure but must not be treated as guaranteed retry. Native
  15-minute full REST reconciliation is the bounded eventual recovery
  for failed, rejected, oversized, throttled or missed webhook deliveries
  while the client is online; disconnected clients retain shorter polling.
  Manual/API redelivery is an operator maintenance action requiring
  separate authorization. Do not add GitHub admin credentials to the Worker.
- Retain fail-closed HMAC checks on original raw bytes, the operator
  allowlist, deduplication, 64-KiB body ceiling, SQLite 128-hint/24-hour
  bounds, 8 sockets, 120 admitted deliveries/minute and 15-second native
  hint burst gate. Oversized real payloads remain a known acceptance risk:
  changing the ceiling requires separate traffic-size evidence and security
  review; do not silently weaken it.

### Validation, rollback and admission

Add deterministic fake-clock tests for Simple vs online Hybrid scheduling,
transitions through connecting/fallback, runner-only refresh, sustained
hint load without starving a full reconciliation, failed and late state IPC
reads, GitHub cooldown, webhook requested/in_progress/completed schemas,
unknown action/invalid status, and signature/delivery id/allowlist safety.
Use unchanged transport frames to retain backward compatibility with
accepted clients and Durable Object data. A remote Node/Rust CI success
does not establish physical KDE/Windows or deployed Cloudflare acceptance.

Rollback executable changes independently: (1) webhook activity allowlist
and its tests, (2) monitor scheduling and its tests. No production
deployment, secret provisioning, webhook registration, `main`, tags or
shared R2 changes are authorized.

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


## CI gate triage and remediation (2026-11-08)

**Mode B.** The read-only lock resolver completed successfully as run
[`42472887846`](https://github.com/morozhenko-apps/repoticker/actions/runs/42472887846)
from exact source `33a7479f70e535a6dde650317c2de4836d4055c7`.
The downloaded seven-file artifact contains `Cargo.lock`, a
`RELAY_CARGO_LOCK_DIFF.patch`, `RELAY_RUSTFMT_DIFF.patch`,
source SHA, SHA256 checksum, changed file manifest, and a no-release
marker. `Cargo.lock` SHA256 verified:
`36ad49adbcff67e5077f1342b515c1531c167199f4c51c61d5458781a2935cc3`.
Its Git blob SHA is `80ee9e38627cbb29e3cc4e64aae12d233a4c1c69`.
The lock diff includes `tokio-tungstenite 0.30.0` and its exact
registry checksums. It is valid lock evidence, not a pass for
`cargo check --locked` or a build artifact.

Owner's CI runs `42472887767`, `42472887792`, and `42473056655`
independently confirm:
- Linux/Windows locked Rust compilation fails because the committed
  `Cargo.lock` lacks new native WSS dependencies.
- The Rust format gate requires the exact upstream rustfmt delta.
- JS preflight fails in five cases: missing 10 new Settings translations
  per non-EN/RU language (starting with ES); three RelayHub tests
  contradictory with rate budget, wiped cursors and minute ledger
  behavior; one Settings controls fixture invokes a new event handler
  without its required event argument.

Six investigated causes (test/log backed): (1) missing manifest/lock
sync; (2) rustfmt formatting drift; (3) new UI strings missing from
the 18 extended languages; (4) snapshot tests exceeding the intended
120 deliveries/minute; (5) relay replay high-watermark erased when
the history table expires; (6) stale fixture invocation and minute
retention expectations. The most urgent independent blockers are
(1) native dependency lock drift and (3–6) JS source/test contract
defects. CI reports exact lines; none of this justifies weakening
`--locked`, locale parity, rate limits, or auth controls.

**Repair plan / rollback:**

1. Verify the artifact's source SHA and checksum, compare lock patch
   against the actual `dev` manifest and lockfile; commit the exact
   generated lock bytes, never substitute a guessed version.
2. Apply only the trusted rustfmt diff from the same generated artifact
   to still-matching Rust source paths. Stop if a hunk has drifted.
3. Fill 10 missing UI translations in each of the 18 extended locale
   dictionaries (preserve existing keys and RTL semantics).
4. Keep rate limiter at 120 new deliveries/minute. Spread the 129
   retention test events over two minute buckets instead of
   weakening capacity checks; persist the actual SQLite AUTOINCREMENT
   high watermark for replay reset after all rows expire; bound minute
   rate-budget rows by cleaning the previous minute.
5. Fix only the Settings fixture's synthetic event to pass a target,
   preserving production handler semantics and native Keyring gate.
6. Execute a single complete final Node26 and Rust locked
   format/core/desktop test gate. If results identify new real
   defects, capture logs, fix with regression coverage and repeat
   affected gates. Only after a green gate prepare unpublished
   Linux/Windows candidates. No `main`, tags, hosted service changes.

Rollback commits are isolated by category: lock, formatting,
localization, relay replay/rate test, Settings fixture. Fail-closed
Simple polling and CI status provenance are not changed.


### Rust compile diagnosis from native CI

Run `42474351491` (source `dac843c`) passed the full JS job
but failed desktop compile with exactly three Rust type errors:

- `E0277` on `RelayPhaseEvent` and `ReconcileEvent`: Tauri
  `Emitter::emit<S: Serialize + Clone>` requires Clone.
- `E0308`: `tauri::async_runtime::spawn` returns Tauri's
  runtime handle enum, not `tokio::task::JoinHandle<()>`,
  even though both expose an `abort()` operation.

Five considered compile hypotheses: missing `Clone` on event payloads,
handle wrapper mismatch, missing Cargo dependency, wrong Tokio runtime
entry, and failed platform-specific GTK feature configuration.
The compiler directly identifies the **first two**, while the
dependency graph resolved and source checking progressed to
`repoticker` itself. Fix by deriving Clone on the two
secret-free immutable payload structs and storing the exact
`tauri::async_runtime::JoinHandle<()>` returned by Tauri.
This retains task cancellation from the GUI setup thread;
switching to unscoped `tokio::spawn` is not justified.

Validation: one final locked build and Rust tests on Linux/Windows,
with compiler output as the authority. No disabled checks or new
external dependencies are necessary. Rollback is a single
transport-source commit.


### Cloudflare Worker validation without deployment

The native desktop gate does not compile Cloudflare's `src/index.ts`
entrypoint, Durable Object migration or Wrangler TOML. Add a separate
**read-only, no-publishing** GitHub Actions workflow triggered only by
relay source/configuration or its own workflow file:

1. Check out the exact source SHA with no persisted token.
2. Install pinned Node 26.13.0 and execute
   `node --test tests/relay-*.test.mjs`, including actual Node SQLite
   in-memory journal behavior.
3. Use **Wrangler 4.158.0**, pinned to the npm release verified
   November 8, 2026, to run
   `wrangler deploy --dry-run --outdir <temporary>` from
   `apps/relay-cloudflare`. This compiles and validates Worker/DO
   packaging but cannot deploy or create a public endpoint.
4. Assert the temporary bundle exists and is nonempty, with no
   uploaded artifacts, operator credentials, Cloudflare API token,
   webhook registration or live Cloudflare calls.
5. Fail clearly on package resolution, TypeScript bundling, TOML
   migration or runtime import errors. Keep desktop gates separate
   and preserve unpublished artifact cleanup policies.

Rollback: remove the dedicated workflow only; there are no
persistent resources or data changes. This check is a build-level
gate, **not** a substitute for the operator's later signed webhook,
WebSocket authentication, replay, outage and revocation live QA.


## Automated acceptance receipt (2026-11-08)

### Completed

- Native Rust Tauri event-contract repair
  [`98f229db9`](https://github.com/morozhenko-apps/repoticker/commit/98f229db91624ac2e67eeb1cdba626a1af152a0c)
  resolves the actual `E0277` (two `Serialize + Clone`
  event payloads) and `E0308` (Tauri task handle) diagnostics.
- [Preflight `42474725172`](https://github.com/morozhenko-apps/repoticker/actions/runs/42474725172)
  on exact native source `98f229db91624ac2e67eeb1cdba626a1af152a0c`
  **passed all applicable jobs**. Evidence: pinned Node26
  **609/609** tests; Rust core **77/77** unit,
  **30/30** Git integration, **3/3** remote;
  desktop Linux **76/76** native unit; `cargo fmt
  --all --check`, locked core Clippy `-D warnings`,
  and `cargo check --locked -p repoticker` succeeded.
- Worker source gate
  [`35c7a0ee`](https://github.com/morozhenko-apps/repoticker/commit/35c7a0ee5accfb758e7e369fab1d50436aa4706a)
  includes a standalone GitHub Actions workflow with
  **contents:read**, pinned Node26/Wrangler 4.158.0,
  no operator secrets and **no deployment**.
  [Run `42475220430`](https://github.com/morozhenko-apps/repoticker/actions/runs/42475220430)
  passed 25/25 focused relay/SQLite tests and
  `wrangler deploy --dry-run`, producing a temporary
  bundle of **15.65 KiB** (no uploaded artifact).
- Source code on both paths retains read-only GitHub REST
  as authority; the relay never supplies CI conclusions
  and does not execute local Git operations.

### Remaining (do not mark release ready)

- [Native acceptance `42474725125`](https://github.com/morozhenko-apps/repoticker/actions/runs/42474725125)
  on source `98f229db9` is **still in progress at
  the last observation**: Linux DEB/AppImage bundling
  and Windows NSIS. Both are unpublished QA artifacts;
  their uploads set `retention-days: 7`.
  A successful preflight is **not** proof these
  bundles were created.
- Check each job conclusion and verify artifact
  `SOURCE_SHA.txt`, checksums and `NOT_A_RELEASE.txt`
  before directing any installation.
- Physical KDE Wayland and Windows native
  Settings/prompt/Keyring/reconnect/offline tests,
  GitHub webhook integration and Cloudflare operator
  deployment remain independently unverified.
- No `main` merge, tag, release, Cloudflare secret,
  R2 bucket or webhook changes are authorized.
