# Mode B: Relay protocol validation, bounded body streaming and raw HMAC verification (L1)

Prepared parent `aff31f048e46a574b080d71c5d0da36745b5d141`; `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Sources:
- `apps/relay-cloudflare/src/relay-protocol.mjs` blob `38e04b7b8ba0646caeb1532c01bc615e56f3c45f`, 143 lines;
- `apps/relay-cloudflare/src/webhook-verify.mjs` blob `fb10ad624fb5763b09db9254cd196f8b582be136`, 20 lines.
Executable test sources: `tests/relay-protocol.test.mjs` (6 tests, blob `07deac9759039b63d9eaf8702478a7f6fc1e659e`), `tests/mode-b-relay-protocol.test.mjs` (17 tests, blob `38a7482196410c863b0bf50cbb9fdaf21c9c2820`), `tests/relay-webhook-signature.test.mjs` (4 direct HMAC tests and 1 static packaging test, blob `02fc58716c076793b04d787e8d4e72191a9f4b53`).

**Source/test assertions were inspected; no tests were executed.** This is a method-by-method supplement to `branch-map-relay.md`, not completion of the 80-file Mode B audit.

## Domain invariants

Every permitted hint references a validated canonical `owner/repository`, never a provider workflow status/conclusion. The allowlist may authorize a single exact repository or one owner wildcard but never all owners. The cursor is an exact decimal safe integer and ambiguous query arguments fail closed. The untrusted request body is bounded before HMAC, and verification uses its original raw bytes. Only native Authorization: Bearer with an exact bounded secret is accepted. No raw token or full GitHub webhook may enter a public response, SQLite hint, debug log or query parameter.

## Actual executable assertion ledger

| Existing test group | Direct real method assertions |
| --- | --- |
| `relay-protocol` allowlist validation and scoped owner | Exact list canonicalization, duplicates and malformed names denied; owner wildcard accepts future children but no cross-owner/cross-path; malformed wildcard denied |
| `mode-b-relay-protocol` component boundaries | 100-character owner and 100-character repo accepted; 101 on either rejected; Unicode, nested path, dot, punctuation and nonstring values rejected |
| `mode-b-relay-protocol` 100/101 allowlist and malformed source | 100 unique names accepted, 101st rejected, casefold duplicate denied, scoped and unscoped combinations exact; malformed or overlong configuration denied |
| `mode-b-relay-protocol` delivery ID and cursor | Real UUID syntax with case canonicalization; exact safe decimal including zero, max safe integer, negative/leading zero/unsafe/too many digits rejected |
| `mode-b-relay-protocol` URL query | Missing/one `after` accepted, unknown/duplicate/negative/leading zero/encoded whitespace/long numeric rejected |
| `mode-b-relay-protocol` event action/status | Requested/in_progress/completed supported combinations, unavailable provider fields omitted, bad action/status and invalid UTF-8 rejected |
| `mode-b-relay-protocol` empty, exact and over body | Real Request with zero bytes, one byte and **exact BODY_LIMIT 65,536** accepted; 65,537 rejected |
| `mode-b-relay-protocol` bad limit/content length | Limit 0, -1, +1, 1.5, NaN, Infinity and null denied; malformed/false Content-Length denied; actual exactly matching 2 byte accepted |
| `mode-b-relay-protocol` chunked body and failed stream | Chunked read over a four-byte limit rejected on first overflow; midstream private exception becomes `null` without propagated provider error |
| `mode-b-relay-protocol` bearer boundaries | Correct/mismatched 32 and 256 character secrets, malformed charset/header and concurrent verification with independent results |
| `relay-webhook-signature` real raw body HMAC | Known HMAC-SHA256 vector; raw JSON including UTF-8 Russian text and trailing newline verifies exactly; changed whitespace, newline, content or key rejects |
| `relay-webhook-signature` malformed signatures/input | Invalid header type/algorithm/case/hex/length/trailing data and invalid body/secret types all return false without executing a public network call |
| `relay-webhook-signature` packaging test | Reads index/Worker source text for auth and class references; **S only**, not an executable Cloudflare adapter assertion |

## Exact method-to-branch map

| Production method | Independent conditions and output | Direct evidence or missing branch |
| --- | --- | --- |
| `canonicalRepository(value)` | String vs other; >201 UTF-16 code units guard, exactly two slash components, each 1–100 ASCII allowed bytes, exclude dot/double-dot; lowercase canonical result | E exact 100/101, malformed types, path traversal, case; ? UTF-16 surrogate edge vs URL decoding and overlong numeric-style names |
| `allowedRepositories(raw)` | String nonempty and <=20,100; comma 1–100; trim each; exact repo or owner/* only; duplicate after casefold rejects whole config | E 100/101 and duplicates/wildcards; ? exact 20,100/20,101 length and empty comma members with unusual Unicode whitespace |
| `isAllowedRepository(allowlist,value)` | Require Set, canonical valid name, exact match or owner/*, never global or cross-owner | E both allowlist forms and forbidden values; ? malicious Set subclass/hostile iterator, not normal user input |
| `validDeliveryId(value)` | String UUID `8-4-4-4-12` hexadecimal pattern with case-insensitive match, lowercase result | E valid, invalid UUID/case; ? each nibble/hyphen position individually and nonstring enum |
| `parseCursor(raw)` | Absent ->0, exact decimal regex zero or 1..16 digits without leading zero, Number.isSafeInteger gate | E 0/1/MAX/overflow/malformed; ? 16 digit below MAX vs 17 digits and string `+0` guard mutations |
| `cursorFromUrl(url)` | URL parse; raw `search.length<=48`; at most one key and it must be `after`; parseCursor handles null/malformed | E unknown/duplicate/overlong numeric; ? exact raw 48/49 search length and percent-encoded property/key equality; invalid URL constructor throws to route catch |
| `validatedWorkflowEvent(payload,eventName,allowlist)` | Exact event ping short-circuits before payload parse; workflow_run only with Set, fatal UTF-8 decode + JSON parse, action/status table, canonical allowlisted repo, emit only kind/repo | E supported action/status, bad JSON/UTF-8, other owner; ? missing bytes with ping, provider object malicious prototype and all status-table cross combinations; ping is signed at Worker ingress before this call |
| `boundedRequestBody(request,limit)` | Invalid limit null; Content-Length missing vs strict 1..12 decimal digits <=limit; no body reader returns empty byte array; else stream reads Uint8Array chunks <=limit, reader cancel on invalid, verify actual byte count matches header, flatten into exact bytes; catch read errors; release lock finally | E exact 0/65,536/65,537, bad limits/headers, chunk overflow, midstream error. **L1**: no-reader with explicit nonzero Content-Length bypasses final count check and returns empty; no direct test. ? non-Uint8Array chunk, failed cancellation, error during releaseLock, consumed/locked body |
| `validClientAuthorization(header,expectedSecret)` | Expected secret string length 32–256; header starts case-exact `Bearer `; supplied length/charset and expected charset; digest both using SHA-256, compare 32 bytes with accumulated XOR; only exact match true | E 31/32/256/257, malformed header, mismatch and concurrent requests; ? `crypto.subtle.digest` rejection and malformed digest adapter, should be transformed into redacted 503 at outer request layer |
| `verifyGithubWebhookSignature(rawBody,signatureHeader,secret)` | Exact Uint8Array and nonempty secret, exact `sha256=` +64 lowercase hex, convert bytes, import HMAC SHA-256 key, `crypto.subtle.verify` over untouched raw body | E known vector, changed raw bytes/key, invalid types/header. ? external `importKey`/`verify` rejects, and non-Uint8Array subclasses; outer Worker catches to fixed 503 |

## L1 precise missing assertion and expected contract distinction

The current no-body-reader path is:

```js
const reader = request.body?.getReader();
if (!reader) return new Uint8Array(0);
```

The check for `size !== Number(lengthHeader)` occurs only **after** a real reader loop. Therefore a Request-like object with `body=null` and `Content-Length: 1` returns an empty byte array, instead of rejecting the mismatch. This is a **source-derived discrepancy hypothesis**, not a reproduced runtime defect or proof that a browser will generate such a request. Its intended fail-closed behavior is already recorded as L1 in `relay-exact-new-test-spec.md`. A Stage 9 test must exercise the actual `boundedRequestBody` under the external Request contract and assert `null` for a claimed nonzero length with no reader; zero/absent length may accept actual zero bytes. If this test fails, follow the root cause protocol before any production fix. The input/HTTP boundary is security-relevant, but **do not silently rewrite its public request semantics without the established contract**.

## Positive and N1–N12 matrix

| Category | Status | Open branches |
| --- | --- | --- |
| Positive | E partial | Identity/allowlist/hint parsing, bounded valid body, exact HMAC and native bearer |
| N1 | E partial | Malformed names/headers/JSON/UUID, non-Uint8Array stream and no-body mismatch L1 |
| N2 | E partial | 100/101 repo name, 100/101 allowlist, 65,536/65,537 body, 31/32/256/257 secret; raw query 48/49 |
| N3 | E partial / ? | Stream failure becomes null, external crypto failure redaction not directly injected |
| N4 | E partial | Stateless validators idempotent, repeated cursor/body stream consumption requires explicit behavior |
| N5 | E partial | Concurrent token verification; reader already locked and concurrent request-body clone untested |
| N6 | E partial | Bad JSON/UTF-8, unknown event/status and bad Content-Length; absent reader claiming bytes L1 |
| N7 | E partial | Strict owner permissions, bearer, raw signed HMAC, query ambiguity; L1 fail-closed |
| N8 | NA | Cursor values not wall clock; history/rate rollback is `hub.mjs` L8 |
| N9 | E partial / ? | Aborted stream, request cancellation while reading, lock release |
| N10 | E partial | No provider conclusion/payload projected; crypto/stream exception cannot leak through Worker |
| N11 | NA | No entitlements |
| N12 | NA | In-memory validation only; durable SQL/Keyring failures covered elsewhere |

## Stage 9 exact obligation and mutations

- RP1/L1: body=null with Content-Length 0/1/absent, underlying body locked/already consumed, invalid chunk types and rejected reader.cancel/releaseLock. Use external stream adapter only, not a mocked validator.
- RP2: query string length exactly 48/49 (not only a 60-digit cursor), duplicate/percent-encoded `after`, empty/undefined, max integer and all malformed neighbor values. Assert unchanged original URL never forwarded on reject.
- RP3: allowlist raw 20,100/20,101 characters with legitimate 100 entries, control/Unicode whitespace and duplicated scoped owners; verify no partial valid Set escapes.
- RP4: body HMAC success and changed one-byte/whitespace/unicode raw payload, importKey/verify reject, and outer redacted Worker 503; do not log secret.
- RP5: independently mutate status/action table entries and each component identity check; no provider conclusion, workflow name or tokens ever returned.

Mutation-sensitive guards: remove upper bounds, change 100 to 101, accept unscoped wildcard, allow extra query, wrong `Number.isSafeInteger` sign, accept invalid header with no reader, skip body byte limit or raw HMAC, stop comparing token digests. Every important guard must be killed by an executable assertion.

**CI evidence distinction:** `.github/workflows/relay-worker-dry-run.yml` invokes only `node --test tests/relay-*.test.mjs`; it excludes `mode-b-relay-*.test.mjs` by filename. However `.github/workflows/strict.yml` explicitly executes `node --test tests/*.test.mjs`, which **includes** both Mode B relay suites. Thus this is a *narrow per-Worker dry-run gate*, not a claim that all repository CI omits Mode B tests. No workflow change is proposed before full pipeline audit.

No production/test/CI changes or test executions in this commit. Global Mode B Stage 3–8 stays PARTIAL.
