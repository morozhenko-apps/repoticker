# Mode B Stage 4–8: URL admission, native gesture, Worker trust closure slice

**Mode B planning only.** Source baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `c9856a5665eb337589d90beca91b8ee1395693e7`. Cross-check existing [URL branch map](branch-map-model-github-url-admission.md), [Worker router map](branch-map-relay-worker-router.md) and [method receipts](method-assertions-model-drag-webhook-worker.md) before executing Stage 9.

This slice is a **closed planning/evidence ledger for 3 production files** (`model.mjs`, `native-drag.mjs`, `worker.mjs`) plus the separate HMAC boundary `webhook-verify.mjs`. It is **not a completion certificate for those files**: every listed P or OS entry remains open until executed at the final gate, and security STOP decisions are not decided by this audit.

### Evidence ownership and Stage 4 executable decision map

E = real function call with exact assertions inspected in existing test source (not a new execution). I = real function exercised through enclosing caller. P = an independently observable branch missing an inspected assertion. OS = only supported by platform acceptance.

| Method/guard | E/I exact existing tests and outcome | Missing independently observable outcome |
| --- | --- | --- |
| `summarize`: fallback arrays and numeric metrics | E `tests/ui.test.mjs`: empty snapshot all 0, 2 repos behind=3, online=2/busy=1, running=2/failed=1 | P null repo element, negative/fractional/string/Infinity behind and CI counts; preserve legacy-zero policy without authorizing modern monitor zero |
| `safeRunUrl`: type/scheme/host/path | E `tests/ui.test.mjs`: valid GitHub Actions URL, wrong host, javascript scheme, settings path, undefined | P exact userinfo/password/port/query/fragment/encoded-dot/empty components, 0/leading zeros/max digit, trailing slash; source currently returns parsed.href without excluding auth/search/hash/port |
| `safeActionsJobUrl`: strict route | E `tests/quota-details.test.mjs`: canonical, javascript, evil host, userinfo, query, fragment, settings path | P independent custom port, password only, 0/leading zeros/max ID, dot/encoded dot, Unicode/100/101 owner, double separators, encoded slash |
| `validName`/`validNumber` closures | I through `safeActionsJobUrl` direct cases, no public entrypoints | P boundary cases above must exercise real enclosing export; no invented standalone export |
| `createNativeDragGesture.begin/end` | E `tests/native-drag.test.mjs`: first begin true, second false, unrelated end ignored, start-before-stop with pending start, rapid two-gesture serialization, start rejection frees session | P stop rejection, old pending start failure while new session active, repeated end, begin after stop rejection, error callback throwing, start sync throw |
| `enqueue` | I through actual deferred gesture tests, verifies task admission order | P queued rejected start then stop then new start; onError exception behavior; no real compositor pointer movement proof |
| `verifyGithubWebhookSignature` | E `tests/relay-webhook-signature.test.mjs`: correct raw SHA256/HMAC, UTF-8 bytes, altered bytes/secret, malformed prefix/length/case, input types | P signed empty-body, exact 65536 byte signed body, correct-signature invalid UTF-8, rejected `crypto.subtle.importKey`/`verify` |
| `handleRelayRequest`: config/route | E `tests/mode-b-relay-worker.test.mjs`: missing env/invalid secret/allowlist =>503 no DO, wrong methods=>405, unknown=>404 | P failing `idFromName`/`get`, trailing slash paths, GET with malformed absolute URL, method-and-invalid-binding precedence |
| Worker webhook ingress | E same test: malformed query/content-type/signature/event/delivery =>400/415/401/422, over limit 65537=>413, signed ping=>204, valid completion=>one minimal DO hint and 202 | P **exact 65536** byte signed valid JSON, invalid UTF-8 signed body, 31/32 webhook secret, signed ping with malformed delivery, DO 201/204/3xx |
| Worker subscribe | E same: wrong auth 401, Origin/Cookie 403, cursor bad 400, malformed Upgrade 426, valid 0/11/max and websocket 5 forwarded | P present-but-empty Origin/Cookie, 48/49 cursor-search byte limit, encoded query parameter and mixed-case Upgrade |
| Worker DO and top-level catch | E same: DO 500/429/401 or throws => no-store, empty 503; five concurrent change requests preserve separate cursors | P `crypto.subtle` and request-body reader throw, DO get/idFromName throw, unauthorized+bad cursor precedence, concurrent duplicate *write* with actual Hub (vs five reads) |

### Stage 5: Positive and N1–N12 with domain-specific applicability

| Case class | Evidence and disposition |
| --- | --- |
| Positive | E all four real source functions through direct Node calls; P exact critical boundary outputs and native/host execution |
| N1 | E wrong scheme/type/host/path/HMAC/method/secret; P encoded separators, malformed URL objects, invalid UTF-8 signed body |
| N2 | E cursor >2^53−1, 65537 bytes, normal counters; P exact 65536 bytes, 48/49 query, numeric ID 0/1/MAX, 31/32 secret |
| N3 | E Worker DO error mapped to 503; P injected crypto failure/transport read errors; NA pure URL and gesture queue |
| N4 | E drag duplicate begin and deferred stop, no duplicate hints claimed; P duplicate signed webhook into real Hub and repeated end after failure |
| N5 | E five concurrent Worker reads, two sequential gestures with delayed start; P reentrant gestures after start/stop failures, duplicate concurrent DO writes |
| N6 | E missing runtime binding and wrong metadata/secret; P corrupted nested model, malformed raw JSON/UTF-8 with valid HMAC |
| N7 | E exact host and job URL strict fields, HMAC auth, browser headers denied, allowlist; P run URL userinfo/query discrepancy, real Hub scope |
| N8 | NA for these exact functions: no wall-clock, locale or timezone branch |
| N9 | E rejected Upgrade, gesture release sequence; OS actual Wayland/KDE relative-pointer lifecycle and live Cloudflare upgrade |
| N10 | E Worker returns no-store empty errors and minimal hint, job URL strips userinfo/query by rejecting; P run URL reflection policy, crypto error leak under host |
| N11 | NA no entitlement/purchase contract |
| N12 | E simulated DO unavailable; P actual Hub transaction/replay and failure-after-write; NA pure model and gesture state |

### Stage 6: interaction/effective independent pairs

- **X-U1** run vs job URL × credentials/query/hash × caller native opener. Hold GitHub host/action path fixed and vary only the auth/query component: do not conflate validators or claim browser safety from URL parsing.
- **X-D1** start pending × end old ID × new begin ID. Assert exact temporal trace and one current gesture owner; old start rejection must not clear new session.
- **X-D2** stop rejected × immediately new begin. Assert callback error and exact queued operation order without timers.
- **X-W1** signed webhook × allowed repository × invalid UTF-8/size boundary. Only forward after raw-byte verification and event schema; no DO call on invalid input.
- **X-W2** native bearer × Origin/Cookie × valid cursor × websocket upgrade. Any browser headers deny before DO, even for valid secrets.
- **X-W3** two same signed deliveries × real Hub duplicate suppression × read cursor. Worker-only fake DO tests cannot prove persistent deduplication.
- **X-W4** DO 2xx-but-not-202 × valid webhook; public outcome 503 and no false 202 claim.

### Stage 7: exact incremental distinct-test estimate (not passing tests)

| Case IDs | Planned independent test case | Minimum count |
| --- | --- | ---: |
| MD1 | Table of `safeRunUrl` exact current behavior with 12 candidate strings and expected full URLs/null, including userinfo/port/query/fragment | 1 |
| MD2 | Matched `safeActionsJobUrl` strict table using same 12 variants and 100/101 name lengths | 1 |
| MD3 | Legacy `summarize` malformed/null/Infinity and offline busy runner table | 1 |
| DG1 | Deferred start rejects after an old pointer ends and new begins, with exact trace and owner | 1 |
| DG2 | Rejected stop, follow-on start and callback exception characterization | 1 |
| WH1 | Exact raw signed HMAC boundary/invalid UTF-8 table and rejected external crypto adapter | 2 |
| RW1 | Exact 65536 signed body acceptance and 65537 failure; 31/32 secret bounds | 2 |
| RW2 | Bad Durable Object binding and crypto/body-reader exceptions produce fixed redacted 503 | 2 |
| RW3 | Authorization/browser header/Upgrade/query 48/49 combinatoric table | 2 |
| RW4 | Worker→real Hub duplicate delivery and durable failure/replay transaction (fake only environment/SQL port) | 2 |
| RW5 | Real TypeScript Worker public adapter with injected external platform | 1 |
| **Total** | **16 planned distinct test bodies minimum**, with parameterized subcases; no new implementation or test execution yet | **15** |

Counting rule: one independent test body may contain several parameterized values but only one invariant. No existing tests are recounted as new work. A script source regex or mocked subject method never satisfies an independent case. This is a *local four-file slice*, not the global total.

### Stage 8: per-file assertion closure

| Production file | Existing direct evidence | Planned test gaps | Host gate | Status |
| --- | --- | --- | --- | --- |
| `apps/desktop/ui/model.mjs` | E `tests/ui.test.mjs` + `tests/quota-details.test.mjs` | MD1–MD3 | Native caller/opener trust trace, OS click | PARTIAL / security policy STOP before changing URL admission |
| `apps/desktop/ui/native-drag.mjs` | E `tests/native-drag.test.mjs` | DG1–DG2 | KDE Wayland input seat and physical pointer cancellation | PARTIAL |
| `apps/relay-cloudflare/src/webhook-verify.mjs` | E `tests/relay-webhook-signature.test.mjs` | WH1 | Actual platform crypto/Worker registration | PARTIAL |
| `apps/relay-cloudflare/src/worker.mjs` | E `tests/mode-b-relay-worker.test.mjs`, `tests/relay-worker.test.mjs` | RW1–RW5 | Operator Cloudflare/DO live acceptance | PARTIAL |

### Stage 10 mutation-kill obligations (planned, not executed)

`MD1/MD2` kill hostname/scheme relaxations and accidental job-query acceptance without prejudging run URL policy. `DG1/DG2` kill resetting a newer session on old callback, removing start/stop serialization or swallowing stop rejection. `WH1/RW1` kill signature skip and body size off-by-one. `RW2/RW3` kill bare exception leak and native-only header bypass. `RW4` kill duplicate persistence and stale cursor replay. `RW5` kill missing Worker handler delegation. No mutation score claimed.

**STOP:** Do not change `safeRunUrl` admissible URL shapes or the Worker authorization/trust contracts on this branch. The entire record is characterization/planning; actual security policy choices need the explicit decision process. No normal STABLE or FLAKY suite was executed.
