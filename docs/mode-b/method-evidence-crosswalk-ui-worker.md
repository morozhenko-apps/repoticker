# Mode B: existing assertion-to-branch crosswalk, first evidence migration

**MODE B Stage 4–8, documentation-only.** Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `ed65a0be3f677b29b16797400e7ab90b8f365340`. Four real production modules and their exact tested source blobs:

| Production source | Git blob SHA | Actual reviewed suite(s) and blob SHA |
| --- | --- | --- |
| `apps/desktop/ui/scan-refresh.mjs` | `f6cd5b81e67aef20db2275f7886268d2b5e14cbf` | `tests/scan-refresh.test.mjs` `315fbb4c3373628046016dc80fd4adc498e53a5c` |
| `apps/desktop/ui/native-drag.mjs` | `9b330948793155617477da4c736228ee8fe1cf7f` | `tests/native-drag.test.mjs` `2fa9fb3f8be3e9dc847f50b3b3b0a33ae13f8c0b` |
| `apps/relay-cloudflare/src/webhook-verify.mjs` | `fb10ad624fb5763b09db9254cd196f8b582be136` | `tests/relay-webhook-signature.test.mjs` `02fc58716c076793b04d787e8d4e72191a9f4b53` |
| `apps/relay-cloudflare/src/worker.mjs` | `b13759d89d6c93ace5b23bfe89345f796042143d` | `tests/mode-b-relay-worker.test.mjs` `753cd7c403f69b31dc0093bce442206c4ff06a34`, `tests/relay-worker.test.mjs` `4c17eabff1a2a6b4befed985541e37569f3daa52` |

**Evidence status, not execution:** 41 distinct source-inspected test bodies: 7 scan, 5 native drag, 5 verifier, 16 Mode B Worker and 8 Worker baseline. **37** invoke real production functions with assertions, **four** inspect source strings only: scan lines 95/152, drag line 92, verifier line 48. A test body is not one source branch and has not been executed in this documentation continuation. Pure external adapters are injected, never the production method under test.

E = real production function + exact observable assertion; I = private helper through a real public call; S = source-regex only; P = independent outcome not proven in inspected tests; OS/HOST = physical OS or Worker hosting. **E is partial, never an assertion of complete path coverage.**

## Stage 4 exact source-guard-to-test assertion crosswalk

### A. Local scan queue and spinner

| Guard/independent outcome (exact source lines) | Evidence owner and asserted result | Remaining outcome |
| --- | --- | --- |
| `scan-refresh.mjs:10–11` Boolean active AND no cache | **E** scan test :145 four true/false combinations with exact expected spinner Boolean | P malformed nonboolean flags, actual DOM busy binding (app integration) |
| `:16–18` three required function callbacks | **E** scan :87 scan/publish/onError absent throws TypeError before scanning | P bad `onBusyChange` type, undefined options object destructuring |
| `:35–39` initial vs duplicate refresh | **E** scan :17 same Promise for three active requests, exactly one scan initially | P request from synchronous `scan` reentrancy |
| `:23–32` invalidation suppresses old success | **E** scan :17 first and second stale result never published, third latest published, exact 3 scans | P invalidation fired from inside `publish` callback |
| `:29–31` superseded rejected scan | **E** scan :56 old failure not reported and subsequent success published | P several concurrent invalidations with changed failure provenance |
| `:29–31` terminal rejected scan | **E** scan :56 current terminal failure reported, next explicit retry succeeds | P `onError` itself throws, returned Promise final state |
| `:40–44` busy callback whole transaction | **E** scan :115 busy [true,false] even when invalidated scan followed by another; later failure toggles again | P `onBusyChange(true)` or `onBusyChange(false)` throwing |
| `:27–30` publishing callback failure | **P** no inspected direct assertion | Characterize whether `publish` exception is passed to `onError` and whether recovery/next refresh is possible |
| `app.mjs` integration boundary | **S only** scan :95 and :152 inspect source regex for the composition/spinner, not an imported real app controller | **P/OS** A1 DOM/Tauri event/scan-vs-monitor revision; do not promote app coverage |

### B. Native drag queue and gesture ownership

| Guard/independent outcome | Evidence owner and asserted result | Remaining outcome |
| --- | --- | --- |
| `native-drag.mjs:16–19` no active session / reject duplicate | **E** drag :15 begin(5)=true, begin(6)=false | P missing/non-numeric pointer ID admission (source does not validate it) |
| `:26–28` incorrect pointer and matching release | **E** drag :15 end(4) ignored, end(5) calls exactly one stop | P repeated end, default end(null), start/end with equal unusual IDs |
| `:9–12,20,31` queued start then stop | **E/I** drag :34 deferred start, end before resolve, exact start then stop | P queued stop rejects and later start must still be serialized |
| `:9–12,16–31` successive gestures | **E/I** drag :51 two rapid sessions, exact start/stop/start/stop, no overlapping seat operations | P old rejected start completing after a new session begins |
| `:20–23` rejected start and conditional ownership clear | **E** drag :77 error callback receives fixed failure, new begin succeeds | P old session failure must never nullify a newer session; callback itself throws |
| `:31` rejected stop and error callback | **P** no inspected direct assertion | Error reported once, no permanent queued-chain poison, follow-on begin works |
| `app.mjs` native pointer boundary | **S only** drag :92 checks absence of obsolete JS motion IPC and presence of Wayland C symbols | **P/OS** real card pointercapture/hide/lostpointercapture and KDE Wayland seat lifecycle |

### C. Raw-body HMAC verifier

| Guard/independent outcome | Evidence owner and asserted result | Remaining outcome |
| --- | --- | --- |
| `webhook-verify.mjs:6–8` wrong raw body/header/secret type | **E** verifier :40 rejects invalid body types and secret null/empty/nonstring | P `Uint8Array(0)` with valid self-signature and non-ASCII/empty secret policy differences |
| `:3,9–10` strict sha256 lower-hex format | **E** verifier :29 missing, sha1, uppercase, length 63/65, nonhex, commas, newline, whitespace, object all rejected | P weird zero-width/Unicode header normalization (should reject) |
| `:11–18` valid HMAC verify | **E** verifier :12 known digest fixture, UTF-8 Russian JSON with trailing newline both true | P signed empty body, crypto adapter rejected import/verify |
| `:11–18` changed body/key | **E** verifier :21 byte-level whitespace/newline/body change, empty vs signed nonempty, wrong key all false | P valid 65,536-byte raw signed body as independent Worker boundary |
| `index.ts` entrypoint wiring | **S only** verifier :48 checks static references to Worker handler and signature code | **HOST** TypeScript entrypoint plus live Cloudflare Worker binding integration |

### D. Cloudflare Worker trust/route branches

| Guard/independent outcome | Evidence owner and asserted result | Remaining outcome |
| --- | --- | --- |
| `worker.mjs:51–56` missing env/binding, invalid client secret/allowlist | **E** Mode B Worker :64 returns 503, zero DO calls for nine env variations and null | P `idFromName` / `get` throw after valid binding; error response remains redacted |
| `:57–65` route and HTTP method | **E** Mode B Worker :85, :92 exact 404 for unknown routes and 405 for five wrong methods, no DO | P same route with trailing slash and config-vs-route precedence |
| `:10–15` webhook secret/query/content-type | **E** Mode B Worker :170/:179 returns 503/400/415 on bad input, no DO | P length 31/32, accepted charset variant |
| `:16–19` size before HMAC and HMAC failure | **E** Mode B Worker :194 rejects 65,537 bytes with 413, :179 rejects forged signature with 401; no DO | P exactly **65,536** valid signed JSON and invalid UTF-8 signed body |
| `:20–24` event/schema, ping, delivery ID | **E** Mode B Worker :179/:200 reject 422 or ping 204 without DO; Worker baseline :42/:60 test owner wildcard and workflow action schema | P ping with malformed delivery (source bypass is intentional), signed malformed JSON after HMAC |
| `:25–31` minimal fixed DO hint + status | **E** Mode B Worker :206 one POST to /ingest with exact v/delivery/canonical repo, bearer only in header, 202; :219 maps 500/429/401/throw to empty 503 | P non-202 2xx/3xx responses and combined Worker→real Hub replay |
| `:34–38` native bearer + browser-Origin/Cookie denial | **E** Mode B Worker :104 bad/missing auth =>401; :118 present Origin/Cookie =>403, no DO | P present-but-empty Origin/Cookie and wrong auth with forged browser headers precedence |
| `:39–40` cursor parser + empty/duplicate/overflow | **E** Mode B Worker :128 eight rejection cases =>400 no DO; :138 forwards 0,11,max-safe | P exact 48/49-character query limit, encoded/ambiguous key variants |
| `:41–47` WebSocket Upgrade | **E** Mode B Worker :154 missing/h2c=>426, valid websocket forwards /stream?after=5 with native bearer header | P mixed-case/whitespace headers, real 101 host response |
| `:43–48` only fixed internal targets | **E** Mode B Worker :138 and :154 check /changes, /stream and authorized header; public URL has no bearer | P unexpected inbound headers never forwarded, hosted Worker adapter behavior |
| `:66–68` outer error boundary | **E** Mode B Worker :219/:227 thrown DO fetch maps to no-store empty 503; :64/:85/:92 invalid status use same fail helper | P throwing binding getter/idFromName/get, failing body read and crypto.subtle; no leakage on every failure |
| Concurrent independent requests | **E** Mode B Worker :234 five concurrent reads preserve all individual cursors and auth headers | P concurrent duplicate signed writes and Durable Object SQLite idempotency; five reads do not prove write deduplication |

These examples **do not** imply full Worker end-to-end protection from provider or platform failures. Direct test of the real JS `handleRelayRequest` with injected DO stub is not the same as executing the Cloudflare TypeScript adapter, real SQLite hub, or hosted routing.

## Stage 5: evidence-supported partial negative category mapping (NOT a cell promotion)

The global 80×13 matrix only accepts `✔` when **all applicable** outcomes within a cell are proven, `✖` for justified NA and `?` otherwise. A local `E+P` below means **some asserted branches and some independently unproven outcomes**: keep the global `?`.

| File | Positive | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| scan-refresh | E+P | E+P | E+P | E+P | E+P | E+P | E+P | E+P | NA | OS/P | P | NA | E+P |
| native-drag | E+P | E+P | E+P | P | E+P | E+P | P | P | NA | OS/P | P | NA | P |
| webhook-verify | E+P | E+P | E+P | P | P | P | E+P | E+P | NA | NA | P | NA | NA |
| worker | E+P | E+P | E+P | E+P | E+P | E+P | E+P | E+P | NA | HOST/P | E+P | NA | E+P |

**Applicability nuance:** Existing source aggregate marks N3/N10/N12 differently for some pure modules. This local table is a *review checklist*, not an automatic correction of 230 global NAs. N3 for pure scan/drag refers to injected external callback failure, not their own network transport; N12 for pure queues is generally downstream storage only. Before changing any aggregate `✖`, prove that the actual function owns an independently testable side effect, rather than transplanting a consumer's category. Likewise N7 for scan/drag describes caller-controlled IDs or callback contracts, **not** an authorization mechanism.

## Stage 6–8 closeout decision and next case ownership

- **Case inventory reuse:** retain the existing [trust-slice Stage 7 16 independent-body estimate](stage-4-8-trust-closure-slice.md), plus [card/monitor/scan A1 case plan](stage-4-8-card-monitor-scan-slice.md). This crosswalk identifies **existing evidence** and must NOT add 37 or 41 to the planned new-test count.
- **Missing independent cases:** SC1 publish failure and callback failure semantics; SC2 reentrant/trailing invalidation; DG1 old-session rejection vs new session; DG2 rejected stop/callback error; WH1 empty signed payload and crypto fault; RW1 exact body cap and signed invalid encoding; RW2 binding/crypto exceptions; RW3 native-only headers and cursor boundaries; RW4 duplicate Worker→Hub writes, RW5 hosted TypeScript adapter. Check case-list overlap before Stage 9.
- **E/P/OS/NA:** for each method, retain cited E/I subset, open P boundary and OS/HOST. None of the four full-file Stage 5 cells should be green; full behavior remains **PARTIAL**.
- **Mutation targets:** invalidation suppression, failed start ownership, queued stop serialization, HMAC verification, 65,536 size guard, native-only bearer, public error redaction, fixed DO scope; all **planned** kills, no mutation-run evidence.
- **Physical/host gates:** native Wayland gesture and actual Tauri DOM, Cloudflare Worker binding/WSS/DO SQLite and real crypto context. No product/authorization/secret behavior changed.

**Status:** source-to-assertion ownership improved for these four files only. Global Stages 3–8 still **PARTIAL**. No tests, CI, build, production, secret or deployment activity occurred.
