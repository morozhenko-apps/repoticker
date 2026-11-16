# Mode B: Cloudflare RelayHubController SQLite and WebSocket behavior

Prepared parent: `ef1e605914ca178123edfc0af06bcff24aa40dbe`. Baseline production: `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Primary source: `apps/relay-cloudflare/src/hub.mjs`, blob `30cea0f820e9862233baa768090c3e63772118b9`, 148 lines. Executable test source: `tests/relay-hub.test.mjs`, blob `aea46ed8b601f4317dac5c8aae9f22c9ae5061d3`, 19 Node tests. This is source/test assertion inspection, **not execution**.

The external test fixture uses actual `node:sqlite` in-memory `DatabaseSync` through a contract-shaped Durable Object SQL/transaction adapter, a controlled millisecond clock, an injected WebSocket pair, and an injected WebSocket Response factory. It calls the real `RelayHubController`; only Cloudflare platform services are mocked. Thus SQLite transaction/SQL behavior has stronger evidence than source-contract regex checks, but **real Cloudflare DO host callbacks remain L9**.

## Existing 19 direct behavioral tests and the assertions they establish

| Existing test (short exact stem) | Concrete evidence (E) |
| --- | --- |
| verified delivery stored/retried | Same delivery twice returns 202, writes exactly one hint/cursor; two distinct deliveries yield cursors [1,2]; public batch excludes delivery, secret, conclusion and token |
| >128 webhook deliveries | 129 legitimate deliveries distributed across two real minute buckets; SQL journal count 128; oldest cursor reset; fresh cursor returns bounded 128 ordered hints |
| WebSocket subscriber | Upgraded 101 with replay hint→ready, later ingest emits new hint, unrecognized client JSON closes socket |
| old journal and WebSocket cap | Exactly 8 open sockets, ninth 429; age expiration retains AUTOINCREMENT high watermark and requires reset |
| unauthorized or malformed internal request | Wrong bearer 401, unauthorized repository 422, duplicate after 400, body 513 bytes 413; no SQL hint write |
| excessive signed deliveries | 120 new in one minute succeed, 121st 429, duplicate admitted without extra budget, next legitimate minute accepted; SQL retained budget row count 1 |
| storage failure during insert | Dropping hints table causes an actual rejected ingest; **does not alone assert rollback of budget** |
| subscriber cursor 999 | Reconnect sends reset→ready and latest cursor |
| revoked allowlist on replay | Already stored hint omitted after env allowlist changes, cursor stays latest |
| owner/* allowlist | Owner-scoped new repo accepted, cross-owner denied; revoked scope hides prior stored history and denies future ingress |
| concurrent duplicate delivery | 24 concurrent requests to actual controller yield one SQL row and one rate admission, same cursor |
| failed SQL insert after rate increment | Real SQLite trigger `RAISE(ABORT)` rolls back budget and hint transaction; dropping trigger permits legitimate retry |
| exact history age | At `HISTORY_AGE_MS` included; at age+1ms reset with no hints, high-watermark remains 1 |
| socket backpressure | buffer 65,537 closes only offending peer; 65,536 delivers, exact cursor 1 |
| socket.send throws | Failed peer closed, healthy peer receives hint, persisted SQL write remains committed |
| socket message | Exact string "ping" sends "pong"; arbitrary client message closes |
| invalid durable routes | Missing/wrong route/method/bearer/cursor/upgrade -> fixed statuses, no SQL writes, no-store |
| internal payload 512/513 | 512 bytes accepted, 513 returns 413, stored row count remains one |
| revoked invalid allowlist | Runtime `*/*` makes read return 503 with no-store and empty body |

Do not infer the following from those tests: successful Cloudflare platform `WebSocketRequestResponsePair` configuration, public `RelayHub.webSocketClose` callback, the TypeScript adapter actually being invoked, real Durable Object host migrations, or regression suite execution during this review.

## Exact methods and independent branches

| Production function | Branches/decisions | E vs remaining obligation |
| --- | --- | --- |
| module `fail`/`json` | Fixed public status, no-store; batch uses JSON content type and full minimal schema | E valid 200/status/error in 19 tests; ? every status's empty body and all no-store headers |
| `constructor` | Assign external now/pair/socket factories or defaults; open two SQLite tables; conditionally register auto-response only when global `WebSocketRequestResponsePair` is constructible AND `ctx.setWebSocketAutoResponse` exists | E actual SQL create under injected ctx; **L4 missing true/false auto-response;** ? schema initialization throws; real host default pair |
| `history` latest | `sqlite_sequence` row absent -> cursor=0, present nonzero high-watermark even after deletion; `oldest` row null or available | E high-watermark after deletion and fresh history; ? no journal and nonzero after, negative/stale input derived from checked public parser |
| `history` reset | after>newest OR newest>after with oldest missing or after<oldest-1; reset returns no hints; otherwise bounded cursor>after AND creation>=now-24h, limit 128 | E after 999, stale+128, retention at bound, fresh; **L8 rollback clock** semantics missing |
| `history` allowlist | Recompute runtime allowlist on read and postfilter rows, emit only v/type/cursor/repository | E revoked history, owner scope and privacy canaries; ? DB rows injected malformed/unknown repository, malformed stored cursor |
| `ingest` | Begin atomic transaction, delete aged hints, check duplicate delivery before budget, 120/min admission, insert/update minute budget, delete prior minute rows, insert hint, prune 128, return accepted+minimal hint | E duplicates, 120/121, two minutes, real insert rollback, 128 capacity; ? **L8 backward time** with existing future rate/hints, cleanup failure for DELETE, corrupted SQLite sequence and very large numeric values |
| `broadcast` | No hint -> no events; JSON serialize, iterate current sockets; buffered>65,536 close; send success/failure; on failure close attempted and close exception swallowed to keep healthy peers | E 65,536/65,537, throw send and healthy peer; ? null hint without socket calls, close itself throwing, socket list throws, malformed socket |
| `fetch` auth/config | Valid bearer vs invalid 401 before routes/DB, allowlist missing 503, route/method preflights | E unauthorized, missing allowlist and methods, internal POST/GET/error statuses; ? credential crypto rejection and null ctx getWebSockets in real host |
| `fetch` POST ingest | bounded body 512, parse JSON success/failure, canonical repo, delivery id, v=1, authorization; 202/429 and broadcast | E 512/513, wrong repo/duplicate/rate; ? separately malformed JSON 400, missing/v2/delivery-invalid 422 without writes and no broadcast |
| `fetch` GET /changes | method/path valid, cursorFromUrl, history and minimal JSON batch | E broad; ? no-reader claimed Content-Length inherits L1 in protocol layer |
| `fetch` GET /stream | upgrade exact websocket, socket count<8, history reset/replay; pair created, ctx.acceptWebSocket; reset OR ordered hints, always ready; socketResponse | E 8/9, hint/ready, reset/ready; ? pair creation fails, accept fails, replay send fails, native Cloudflare upgrades/Close lifecycle |
| `webSocketMessage` | exact string ping -> pong; any other string/ArrayBuffer -> close(1008) | E text ping and unauthorized JSON; ? binary ArrayBuffer/empty/oversized client message |
| `webSocketClose` | readyState===1 calls close(code,reason), other state does nothing | **L7 no direct runtime assertion** (open and already closed); no physical close proof |

## Interaction checks and status

- **Allowed owner scope × signed webhook × revocation:** E real hub at ingest and replay; fresh subscription after changed env remains filtered.
- **Duplicate delivery × rate budget × minute rollover:** E duplicate bypasses budget increment and rollover permits next minute. **Rollback minute (L8) remains untested and its intended policy unresolved**, not a license to change storage semantics.
- **Socket capacity × subscriber backlog × new hint:** E 8/9 and backpressure 65,536/65,537 independently; combined retained WSS frame replay under a slow peer remains ?.
- **SQLite failing insert × quota budget:** E actual rollback and retry; database full/locked while oldest-hint prune remains ? external fault injection.
- **Reconnect × 24h history × 128 retention × revoked repositories:** E individual and several pairs; exact three-way interaction with leap/future clock remains ?.
- **Disconnect/quitting socket × close callback:** L7 and L9 remain untested at host adapter level.

## Positive + N1–N12

| Category | Status | Remaining obligations |
| --- | --- | --- |
| Positive | E partial | SQLite ingress/replay/stream, not host DO class callback |
| N1 | E partial | Invalid bearer, route, payload size, repo; direct malformed JSON/v2/delivery omissions and binary WS missing |
| N2 | E partial | 120/121, 128/129, 8/9, 512/513, 65,536/65,537, 24h/+1ms |
| N3 | E partial / ? | Send exception isolated; SQLite read/write/close failures beyond insert rollback |
| N4 | E partial | Duplicate retry and concurrency, WebSocketClose double-close missing |
| N5 | E partial / ? | Concurrent 24 duplicate, separate users/subscribers and close during broadcast missing |
| N6 | E partial | Revoked allowlist and expired history; corrupted stored rows / alternate schema missing |
| N7 | E partial | Native bearer and per-repo authorization; true Cloudflare host callback boundary L9 pending |
| N8 | **L8 missing** | Backward wall clock affecting per-minute quota, cleanup and replay age |
| N9 | **L7/L9 missing** | Durable Object WSS close, abnormal client close and host lifecycle |
| N10 | E partial | Fixed minimal hints and no-store; real host diagnostic logs not covered |
| N11 | NA | No paid entitlements |
| N12 | E partial | Real SQLite transaction rollback, many other disk/SQL-fault branches untested |

## Stage 9 mandatory additions (after full global Stage 3–8)

- L4 `GivenAutoResponseCapability_WhenConstructing_ThenInstallExactlyOnePingPongPair`: real controller with injected Cloudflare global; no schema shortcut and no actual network.
- L7 `GivenOpenAndClosedSocket_WhenPlatformCloses_ThenCloseOnlyOpenExactlyOnce`: real `webSocketClose`.
- L8 `GivenClockMovesBackward_WhenBudgetAndHistoryObserved_ThenConserveRateAndPrivacy`: **contract policy required before any behavior change**; characterize current behavior via deterministic clock/SQLite test first, STOP FACTOR if persisted time policy must change.
- H1: table-driven malformed JSON, missing/v2 fields, malformed delivery and repo; no SQL inserts, no broadcast.
- H2: throwing close during broadcast, failing socket factory/accept/replay, and error propagation through outer Worker as redacted 503.
- H3: empty history, future cursor, malformed persisted rows, stale high-watermark and simultaneous cutoff/budget scenarios.
- L9 is covered separately by `index.ts` DO host-adapter map.

Important mutations to kill: `>=120` vs `>120`, `>65536` vs `>=65536`, `created_at >=` vs `>`, omit SQL transaction, treat duplicate as new, skip revocation filtering, expose `delivery`, bypass close guard, skip ready/reset. No mutation was executed.

The existing `docs/mode-b/branch-map-relay.md` remains an earlier domain overview. This module-specific appendix records exact executable test assertions to prevent duplicated tests. No Worker deployment, production edit, CI or tests executed. Global Mode B Stage 3–8 stays PARTIAL.
