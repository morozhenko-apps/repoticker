# Mode B: Cloudflare Worker HTTP entry, webhook validation and native private subscription

Prepared parent: `105a16235f81dd94074058eb8acfbe1d7da77868`. Production baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Source: `apps/relay-cloudflare/src/worker.mjs`, blob `b13759d89d6c93ace5b23bfe89345f796042143d`, 71 lines. Existing direct behavior suites: `tests/relay-worker.test.mjs` (8 tests; blob `4c17eabff1a2a6b4befed985541e37569f3daa52`) and `tests/mode-b-relay-worker.test.mjs` (16 tests; blob `753cd7c403f69b31dc0093bce442206c4ff06a34`). **Source/test inspection only; no test execution.**

## Security contract

The public Worker is the only edge entrypoint. `/v1/github` accepts a raw, signed GitHub webhook for an operator allowlist and forwards only the version, delivery UUID and canonical repository to the operator's Durable Object. `/v1/changes` and `/v1/stream` accept a native bearer secret; Origin/Cookie browser requests are rejected. Only private DO requests carry the bearer and only internal fixed URLs are used; public responses are bounded and free of provider errors or secrets. The Worker cannot turn a Relay hint into an authoritative GitHub Actions CI outcome.

## Existing real Worker execution and strong assertions

| Existing test(s) | Observable behavior actually asserted |
| --- | --- |
| `relay-worker` signed allowed completion, signed organization webhook, supported requested/in_progress/completed | Signed allowlisted event gives HTTP 202 and one DO request with exactly `{v:1, delivery, repository}`; owner wildcard matches only current/future owner children, status/action pairs admitted as hints |
| `relay-worker` invalid signature/schema/ID/owner; signed ping | Invalid metadata denied before DO, valid signed GitHub ping responds 204 with no durable write |
| `relay-worker` Durable failure, private subscription, wrong method/query | Bad DO result converted to retryable public 503, private missing/wrong auth denied, wrong route/method/query not forwarded |
| `mode-b-relay-worker` missing bindings | Real `handleRelayRequest` with missing/null hub, missing/short/257-character client secret, missing/empty/invalid/duplicate allowlist returns 503 without DO, even on unknown path; null env 503 |
| `mode-b-relay-worker` unknown path and wrong method | Valid configuration yields 404 for unsupported path; POST/PUT changes, POST stream, GET/HEAD github return 405 before DO |
| `mode-b-relay-worker` native-only auth | Missing/malformed/case-wrong bearer yields 401, browser Origin or Cookie yields 403; all produce empty no-store response without DO |
| `mode-b-relay-worker` cursor + query | Empty, negative, leading zero, duplicate, unknown key, >2^53-1, oversized query denied before DO |
| `mode-b-relay-worker` changes forwarding | `/v1/changes` no after, after 11 and max safe integer all forward to fixed internal `/changes` with exact normalized cursor; URL contains no bearer; header does |
| `mode-b-relay-worker` upgrade | Missing/h2c Upgrade returns 426 without DO; valid websocket upgrade forwards to fixed `/stream?after=5` and native bearer header |
| `mode-b-relay-worker` webhook config/metadata | Missing/short webhook secret 503; arbitrary query 400, unsupported content type/charset 415, wrong HMAC 401, unsupported event and malformed delivery 422; no DO |
| `mode-b-relay-worker` 65,537 byte payload and signed ping | Over-limit body gives 413 before DO, signed ping 204 without DO |
| `mode-b-relay-worker` valid completion and DO error | One exact minimal internal POST body; DO 500/429/401 or thrown exception maps to empty no-store 503, not leaked upstream body |
| `mode-b-relay-worker` private DO error and 5 concurrent reads | Rejected private DO read yields no-store 503; concurrent independent cursors 0,1,9,10,999 are each forwarded unchanged with native secret only in headers |

All quoted behavior is from executable assertions of real `handleRelayRequest` and its private functions, with an injected DO stub. They do **not** execute the TypeScript default export adapter in `index.ts` or live Cloudflare routing: L9 remains an independent requirement.

## Complete method-level branch map

| Production function | Branch/guard and expected outcome | Covered and open |
| --- | --- | --- |
| module `fail` | Response(null) with status and `cache-control:no-store`; no raw provider detail | E broad fixed statuses and empty body in mode-b suite; ? unusual external Response failure |
| module `stub` | Hub binding `idFromName("personal-v1")`, `get` and DO fetch; fixed object ID, no user-selected tenant | E fixture asserts fixed ID; ? missing/broken `idFromName` or `get` throws and outer 503 (covered generally DO throw but not each method) |
| `ingest` webhook config | WEBHOOK_SECRET nonstring, length<32 ->503; valid secret continue | E undefined/null/empty/short; ? length exactly 31/32, very long string and permitted charset contract |
| `ingest` request validation | Query empty else 400; Content-Type exact JSON with optional charset=utf-8 else 415; body <=65,536 or 413; original raw-byte signature valid else 401 | E bad query/type/signature and 65,537; ? exact 65,536 valid signed JSON, charset varied casing/whitespace, lying content length L1 |
| `ingest` event validation | Version/status/repository allowlist via `validatedWorkflowEvent`; no event 422; signed ping 204 before delivery/DO; valid delivery UUID else 422 | E signed ping, completion, invalid event/delivery; ? malformed JSON/UTF-8 after correct HMAC, valid ping with malformed absent delivery (ping bypass is intentional source behavior) |
| `ingest` private DO write | Fixed POST https://relay.internal/ingest, version/delivery/repository only; required bearer internal header; DO 202 ->202, all other/throw ->503; no redirect/proxy choice | E exact body/header/status and DO 500/429/401/exception; ? unexpected 204/3xx/201 and malformed DO response body, should remain fail-closed |
| `subscribe` native authorization | Missing/wrong/malformed bearer 401; valid native only; Origin or Cookie present ->403 | E cases; ? both Origin+Cookie individually and empty string headers (present should deny), wrong type via synthetic request fixture |
| `subscribe` query | `cursorFromUrl` rejects malformed/extra/duplicate/unsafe after before DO | E 8 named invalid examples and valid 0/11/max; ? exact search length 48/49, percent-encoded query key boundaries |
| `subscribe` WSS | WebSocket Upgrade header must lower-case to websocket; missing/wrong ->426 | E missing/h2c and accepted lowercase; ? uppercase/mixed-case, whitespace and duplicate header behavior |
| `subscribe` target | Only hardcoded internal /stream or /changes with exactly after; per-request secret in Authorization header, upgrade only when WSS; no public URL token | E exact target and five concurrent cursors; ? unrelated Cookie/Header forwarding must remain absent, Socket 101 real host response |
| `handleRelayRequest` config | Null/missing env/binding/secret/allowlist fail 503 before DO; valid continue | E 9 runtime config variations, invalid wildcard and duplicates |
| `handleRelayRequest` routes | /v1/github POST, /v1/changes GET, /v1/stream GET; wrong method 405; other path 404 | E five wrong-method and unknown-path cases; ? mixed trailing slash/query on route (URL pathname exact string match), unexpected HEAD |
| `handleRelayRequest` outer fault boundary | Await inner ingress/subscribe, catch synchronous or async errors and map to fixed empty no-store 503 | E rejected DO promises for ingress/GET; ? missing ctx methods, thrown `crypto.subtle` and body reader release errors, no external raw reason |

## Independent interaction matrix

| Dimensions | Current evidence / pending |
| --- | --- |
| Signed event × allowlist × delivery UUID × privacy | E permitted and forbidden cases; missing combinations from the exact provider status schema remain in protocol module |
| Payload 65,536/65,537 × false/missing Content-Length × valid HMAC | E over-limit, protocol layer tests mismatch/chunk; direct Worker true 65,536 signed-body success ? |
| Correct bearer × Origin/Cookie × after cursor × WSS upgrade | E unauthorized/forbidden/valid WSS branches independently; combined case matrix ? |
| Concurrent changes requests × separate cursor × one DO binding | E five independent forwarded cursors; disconnect/rebind during request ? |
| Durable write error × public 503 × duplicate upstream delivery | E redacted 503; end-to-end real DO transaction+upstream retry requires combined Worker+Hub fixture |
| Valid signed ping × malformed delivery × no DB write | E signed ping no write; verify deliberate bypass branch explicitly |
| Config/Keyring secret absent × existing stored history | E missing bindings no DO; actual Cloudflare runtime binding removal and Worker host behavior are OS/host acceptance |

## Positive + N1..N12 cells

| Class | Status | Missing exact cases |
| --- | --- | --- |
| Positive | E partial | Real Worker function signed webhook, WSS forwarding and minimal response, not actual TypeScript entrypoint |
| N1 | E partial | Malformed content/query/delivery, exact signed-body limit and UTF-8 HMAC test |
| N2 | E partial | 65,537 cap, max safe cursor; exact 65,536 and 48/49 query bytes |
| N3 | E partial | DO 500/429/401/exception maps 503; external DNS/TLS belongs to native client |
| N4 | E partial / ? | Duplicate events handled in hub; actual Worker→Hub duplicate retry combined |
| N5 | E partial | Five concurrent change reads; config change/in-flight DO interleaving pending |
| N6 | E partial | Invalid env/allowlist, wrong metadata; corrupted provider JSON/UTF-8 by signed bytes pending |
| N7 | E partial | Signed webhook, native-only bearer, Origin/Cookie, fixed routes, restricted scope |
| N8 | NA here | Worker has no calendar/clock; hub minute/age policy is L8 |
| N9 | E partial / host | Missing upgrade, changed client connection, abnormal WSS close L9 |
| N10 | E partial | Public empty no-store errors, no private provider fields in DO body; host-level logging and redirects pending |
| N11 | NA | RepoTicker has no paid entitlement |
| N12 | E partial / ? | Injected DO failure and retryable 503; real SQL failure covered in hub suite independently |

## Stage 9 obligations and killable mutants

- RW1: signed JSON body at exactly 65,536 with matching/mismatching header and 65,537; assert 202 vs 413 and no DO on rejection. Include UTF-8 invalid bytes signed with correct HMAC.
- RW2: synthetic outer adapter errors in `idFromName`, `get`, crypto failure and body reader cancellation; public error must be redacted and no hints persisted.
- RW3: full `subscribe` matrix with present-but-empty Origin/Cookie and mixed-case/invalid Upgrade plus cursor query 48/49 and encoded ambiguities.
- RW4: Worker→real Hub (external fake only platform/SQL) for duplicate signed webhook retry, 120/min rate, SQL rollback, stale cursor and revoked allowlist, verifying privacy after each hop.
- RW5: L9 TypeScript public fetch/DO callback adapter in a host-compatible test harness, preserving actual controller methods and argument identity.

Mutations: bypass raw HMAC, accept browser Origin, leak secret into internal URL, strip path validation, skip body cap, treat any DO 2xx as 202, forward provider conclusion/token, return raw DO errors, drop await within try boundary. Every mutation must be killed by a real assertion; no new tests have been implemented or executed at this stage.

No change to Cloudflare operator bindings, secrets, Worker, CI, external HTTP or published `dev`. Overall Stage 3–8 PARTIAL.
