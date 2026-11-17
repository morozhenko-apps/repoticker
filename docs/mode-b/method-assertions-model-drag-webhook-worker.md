# Mode B: UI model/native drag and Cloudflare Worker trust entrypoints

Source-equivalent baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `638ea00fdeac788e808c277b2ee1b044077df164`. Exact blobs: `model.mjs=b15f7e33ebbb6cb4c613243231781844eedc63ed`, `native-drag.mjs=9b330948793155617477da4c736228ee8fe1cf7f`, `webhook-verify.mjs=fb10ad624fb5763b09db9254cd196f8b582be136`, `worker.mjs=b13759d89d6c93ace5b23bfe89345f796042143d`.

Direct test source inspected: `tests/ui.test.mjs`, `tests/quota-details.test.mjs`, `tests/native-drag.test.mjs`, `tests/relay-webhook-signature.test.mjs`, `tests/mode-b-relay-worker.test.mjs`, `tests/relay-worker.test.mjs`. These invoke actual production functions with fake external adapters (native start/stop, Durable Object). No suite rerun in this pass.

## Stage 3/4 method-to-assertion receipts

| Source:line | Classification | Existing assertion versus gap |
| --- | --- | --- |
| `model.mjs:1 summarize` | E_PARTIAL | Real `tests/ui.test.mjs` calls summarize with empty and populated snapshots; lacks full negative/NaN/huge/partial runner table and unknown-conservation proof |
| `model.mjs:14 safeRunUrl` | E_PARTIAL | Real `ui.test.mjs` permits exact Actions run path, denies javascript, wrong hostname, settings and undefined; **source does not expressly reject username/password, port, query or fragment** as `safeActionsJobUrl` does. Characterize observed policy and native opener boundary; security trust change needs explicit decision |
| `model.mjs:27 safeActionsJobUrl` | E_PARTIAL | Direct `quota-details.test.mjs` rejects javascript, evil subdomain, userinfo, secrets route, query/fragment and accepts canonical job URL; missing encoded path, extra slash, port, run ID 0/large, repo component 100/101 and malformed type |
| `model.mjs:34 validName` | INLINE | Lexical closure declared inside `safeActionsJobUrl`; exercised indirectly through its real test, not independent API; exact ASCII/name/dot and 100/101 tables remain pending |
| `model.mjs:35 validNumber` | INLINE | Lexical closure declared inside `safeActionsJobUrl`; positive run/job digits and invalid path case indirectly; accepts all digits including 0/leading-zero by source, policy must be characterized |
| `native-drag.mjs:5 createNativeDragGesture` | E_PARTIAL | Real tests start/end, mismatched pointer, deferred start/stop serialization across two gestures, start rejection and recovery. Missing stop failure, late old start reject after newer begin and owner cross-gesture |
| `native-drag.mjs:9 enqueue` | I_PARTIAL | Private closure invoked by real gesture tests; queued.then(action) with caught tail preserves admission order after rejection. Missing exact failure ordering and error callback exception behavior |
| `webhook-verify.mjs:5 verifyGithubWebhookSignature` | E_PARTIAL | Direct real SHA-256 HMAC tests signed UTF-8 raw bodies, byte mutation, wrong secret, malformed length/prefix/missing header and wrong input type. Missing empty Uint8Array accepted? signed empty-body boundary, zero/high Unicode secret, external crypto import/verify rejection and 65,536 exact |
| `worker.mjs:51 handleRelayRequest` | E_PARTIAL | Real Worker direct tests exercise route method gates, malformed env/allowlist, 401/403/404/405/413/415/422/426/503, valid ingress, changes cursor, WSS header, DO failure and redaction, concurrent read forwarding. Missing exact BODY_LIMIT, malformed provider header exceptions and 503 on response-construction failures |

## Stage 5/6 risks and interactions

- **N1/N2:** unknown and malformed URL/type, runner metrics, digit/name/path and byte-size boundaries, webhook signature schema and per-route HTTP status; 0/1/MAX cases are not all asserted.
- **N3/N4/N5:** real Worker DO failure and concurrent reads covered; native drag queued stop and late-gesture failure need exact deferred tests, Worker under concurrent webhook replay must defer idempotency to real Durable Object rather than front door.
- **N6/N7/N10:** HMAC is computed on exact raw bytes, untrusted provider payload parsed only after verification; do not infer deploy secrets or production Cloudflare configuration safety. UI safeRunUrl accepts a broader class than safeActionsJobUrl according to source, do not silently tighten contract.
- **N8:** no source wall-clock/locale in these functions. **N9:** native drag actual KDE compositor requires OS smoke; Worker shutdown managed by hosting platform. **N11:** NA. **N12:** durable/persistent writes live in DO, not this Worker front door.

**Stage 9 independent case groups:** MD1–MD2 source-exact URL validation/opening; DG1 stop failure/late pointer and exact native seat lifecycle; WH1 signed byte bounds and crypto failure; WK1 ingress strict size/error table, WK2 credential/DO scope concurrency and redacted responses. Actual mutation kills must include changed origin guard, skipped signature verification, skipped native drag stop ordering and fail-open Worker binding.

No implementation change, test, hosted deployment, CI, final STABLE/FLAKY gate or physical OS run occurred. Stage 3–8 remain PARTIAL.
