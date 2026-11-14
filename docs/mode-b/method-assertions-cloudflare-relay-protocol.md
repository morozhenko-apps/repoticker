# Mode B: Cloudflare Relay protocol method-to-direct-test assertions

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, production `apps/relay-cloudflare/src/relay-protocol.mjs` blob `38e04b7b8ba0646caeb1532c01bc615e56f3c45f` (143 lines), audit parent `713739ce38a308529d3396fcbbb523f4a9ad6a0f`.

**All nine exports E_PARTIAL:** each is directly called in both source-reviewed `tests/mode-b-relay-protocol.test.mjs` blob `38a7482196410c863b0bf50cbb9fdaf21c9c2820` (**17 actual test declarations**) and `tests/relay-protocol.test.mjs` blob `07deac9759039b63d9eaf8702478a7f6fc1e659e` (**6 test declarations**). Source supports real functions and fake Request/crypto dependencies; tests did **not** run in this turn and do not prove hosted Cloudflare/DO authorization.

| Source line | Exported method | Evidence |
| ---: | --- | --- |
| 11 | `export function canonicalRepository(value) {` | E_PARTIAL |
| 19 | `export function allowedRepositories(raw) {` | E_PARTIAL |
| 40 | `export function isAllowedRepository(allowlist, value) {` | E_PARTIAL |
| 49 | `export function validDeliveryId(value) {` | E_PARTIAL |
| 53 | `export function parseCursor(raw) {` | E_PARTIAL |
| 60 | `export function cursorFromUrl(url) {` | E_PARTIAL |
| 68 | `export function validatedWorkflowEvent(payload, eventName, allowlist) {` | E_PARTIAL |
| 92 | `export async function boundedRequestBody(request, limit = BODY_LIMIT) {` | E_PARTIAL |
| 125 | `export async function validClientAuthorization(header, expectedSecret) {` | E_PARTIAL |

## Existing actual test branch receipts

- `canonicalRepository`: strict two components, length 100/101 per owner/repo and total 201, wrong types, host/userinfo/traversal rejected, output lowercase. `allowedRepositories`: 1..100 entries, 101 denied, bounded 20100 raw bytes, duplicate/canonical and owner/* wildcard authorization. `isAllowedRepository`: exact current owner or explicit owner wildcard; another owner denied.
- `validDeliveryId`: RFC-4122-like UUID hex structure and normalized lowercase; `parseCursor` enforces decimal 0..15 digits (up to safe integer), rejects leading zero, +/-/fraction/non-string; `cursorFromUrl` rejects repeated/unknown query parameters and >48-byte raw query.
- `validatedWorkflowEvent`: only GitHub `ping` or supported requested/in_progress/completed `workflow_run` statuses, allowlisted owner/repo, strictly decoded UTF-8; output is advisory `workflow_run.*` hint, **not authenticated CI result**.
- `boundedRequestBody`: no body -> empty bytes; Content-Length strict, actual chunk sum <=65536; 65536 accepted, 65537 rejected; empty/malformed chunk, lying length, mid-stream failure safely null. The source releases the reader lock and cancels on overflow.
- `validClientAuthorization`: exact `Bearer ` prefix, base64url ASCII length 32..256 for both expected and received, SHA-256 digests compared across fixed 32-byte XOR loop; wrong credential denied and concurrent verification has no shared auth state. This is protocol-level input checking, not a real Cloudflare route or webhook HMAC signature check.

## Independent Stage 9 and hosted gates

1. Relay worker must authenticate GitHub webhook HMAC separately and restrict `/private` sockets to exact Bearer authorization. Direct `validClientAuthorization` tests cannot prove Cloudflare route never bypasses it.
2. R1 actual `Request.body.getReader` may return streams that error/reject cancellation; error returns null. Test unexpected value types/empty/finalize paths separately if omitted by current 23 cases.
3. Cursor boundary near JS `Number.MAX_SAFE_INTEGER`, replayed UUID in SQLite Durable Object, many sockets and per-owner allowed repositories (including locale Unicode) require cross-Worker/Hub tests. No new public auth or webhook policy without architecture STOP choice.
4. N1 malformed input, N2 100/101, 65536/65537, 32/256/257, N3 network/stream interruption, N4 replay/idempotence, N5 concurrency, N6 corrupt persisted cursor, N7 scope/auth, N8 cursor/time in Hub, N9 socket closure, N10 no payload/credential leak, N12 D1/SQLite failure in actual Durable Object. N11 NA.

No CI/test execution, webhook signing key, Cloudflare worker, production code or live deployment modified; global Stage 3–8 PARTIAL.
