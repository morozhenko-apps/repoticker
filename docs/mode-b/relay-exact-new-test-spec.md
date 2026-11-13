# Mode B Relay: confirmed untested branches and exact Stage 9 test specification

Production SHA `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Inspection of `tests/relay-hub.test.mjs`, `relay-protocol.test.mjs`, `relay-worker.test.mjs`, `mode-b-relay-protocol.test.mjs`, and `mode-b-relay-worker.test.mjs` found **no direct runtime test** of `RelayHubController.webSocketClose`, optional WebSocketAutoResponse registration, or the Cloudflare `RelayHub` TypeScript adapter. The rollback-clock and missing-reader failures were not shown by relevant existing assertions.

## Exact missing cases (implement only after Stage 3–8 signoff)

| Case | Source branch | Arrange | Act | Assertions/mutation kills |
| --- | --- | --- | --- | --- |
| L1 | `apps/relay-cloudflare/src/relay-protocol.mjs` `boundedRequestBody` with no reader, claimed Content-Length | construct a Request-like external body with `body=null` and `Content-Length: 1`, plus genuine empty `Content-Length: 0` | call real `boundedRequestBody(request)` | nonzero claimed bytes fail closed (`null`); true empty succeeds only under agreed contract; no call to missing reader. Kill false empty-body assumption. |
| L4 | `apps/relay-cloudflare/src/hub.mjs` constructor lines 15–27 optional `WebSocketRequestResponsePair` + `ctx.setWebSocketAutoResponse` | use SQLite-backed existing fixture and fake only native Cloudflare global + `ctx.setWebSocketAutoResponse` (restore global on teardown) | construct real controller with both capabilities, neither capability and one missing capability | exactly one auto ping/pong pair on supported path, zero on unsupported; SQL initialization remains valid. Kill removed/relaxed guard. |
| L7 | `apps/relay-cloudflare/src/hub.mjs:144–146` `webSocketClose` | fake socket readyState=1 and readyState=3 with spy close | invoke real `hub.webSocketClose(socket,1000,"done")` | open socket receives exact code/reason once; closed socket never reclosed; no exception. Kill `===1` to `!==1` or unconditional close. |
| L8 | `apps/relay-cloudflare/src/hub.mjs` budget/history wall-clock | existing SQLite fixture with mutable `clock.ms`, two legitimate minute buckets and exact 120/min count | move clock backward after admissions, ingest and replay | assert independently defined fail-closed rate and retention semantics; no bypass/duplicate cursor or old private hint. **Do not invent an expected retention contract if source currently behaves differently: first compare with documented invariant; a change to clock policy may be STOP FACTOR.** |
| L9 | `apps/relay-cloudflare/src/index.ts` public Cloudflare Durable Object adapter fetch/message/close | native `DurableObject` base cannot be imported in Node directly; use Wrangler-compatible test harness or checked TypeScript transform with stable fake external base, preserving the actual exported class | instantiate adapter and call all 3 public callbacks | each callback delegates exactly once with unchanged args, returns actual controller Promise and does not introduce public bypass. Structural source regex alone is insufficient. |

## Existing cases that MUST NOT be duplicated

- `relay-hub.test.mjs` already verifies socket backpressure exact 65536/65537, throwing send and durable commit, 512/513 internal payload and unauthorized no-write routes.
- `mode-b-relay-protocol.test.mjs` already checks request body exact overlimit, lying Content-Length, overflowing chunk, mid-stream exception, cursor duplicates and overlong numeric query.
- `mode-b-relay-worker.test.mjs` already tests rejected Durable Object promises converted to redacted no-store 503.

## Isolation and mutation plan

All these tests must call real production methods; only Cloudflare platform/WebSocket/SQLite/clock external interfaces may be faked. No sleep, hosted Worker network, real secret values or local machine DB. Reuse the existing `fixture()` where possible. Expected code and test grouping are contract-documented and await Stage 9, not a production fix.
