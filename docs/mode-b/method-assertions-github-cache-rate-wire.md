# Mode B: GitHub ETag cache, RateGate and native OAuth wire schema method assertions

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Audit parent `21b4b6c866797f73377c687c5c5f08944f9ac672`. Three production sources:
- `github_etag_cache.rs` blob `174c7f880b5b2fc1e3be1d652582e1265eccbc55`, 469 lines and 13 direct inline Rust test declarations.
- `github_rate_gate.rs` blob `ef8cc058bb81d38af222dc54e035b7f5168a9c7d`, 249 lines and 7 direct inline test declarations.
- `github_oauth_wire.rs` blob `5bc4b2a1b6da7fb0b10ab25060e9b31aacc1b6fa`, 311 lines and 8 direct inline test declarations.

All **20 previously '?' callable lexical entries** are now classified: 11 direct E_PARTIAL, 7 indirect I_PARTIAL through real parser/cache callers, 2 native P_NATIVE requiring an actual AppHandle/system clock. Existing type/impl declarations remain previously classified. Unit test bodies reviewed but **no new suite executed**.

## Exact method-level receipts

| Source:line | Named function/adapter | Evidence | Source-true assertion or gap |
| --- | --- | --- | --- |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:34` | `fn valid_etag(etag: &str) -> bool {` | I_PARTIAL | ETag W/quoted formatting, printable ASCII and max 128 validated through cache.save |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:43` | `fn cacheable(path: &str) -> bool {` | I_PARTIAL | Billing path excluded in snapshot/save tests even with valid tag |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:49` | `pub fn snapshot(&self, path: &str) -> CacheLookup {` | E_PARTIAL | snapshot entry and generation, same exact path vs other path |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:66` | `pub fn unchanged(&self, generation: u64) -> bool {` | E_PARTIAL | unchanged detects same/invalidated auth generation |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:74` | `pub fn not_modified(&self, path: &str, lookup: &CacheLookup) -> Option<Value> {` | E_PARTIAL | not_modified only same path+etag+generation |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:88` | `pub fn invalidate(&self) {` | E_PARTIAL | invalidate wipes cache, stale responses cannot re-authorize |
| `apps/desktop/src-tauri/src/github_etag_cache.rs:96` | `pub fn save(` | E_PARTIAL | save ignores stale 200 or malformed/oversize tag and enforces 64×64KiB |
| `apps/desktop/src-tauri/src/github_rate_gate.rs:18` | `pub fn remaining_seconds(&self) -> u64 {` | E_PARTIAL | remaining_seconds used directly; monotone 0/current with ceiling |
| `apps/desktop/src-tauri/src/github_rate_gate.rs:29` | `pub fn defer(&self, duration: Duration) {` | E_PARTIAL | defer long/short under concurrent calls, no shortened gate |
| `apps/desktop/src-tauri/src/github_rate_gate.rs:38` | `fn bounded_seconds(input: Option<&str>) -> Option<u64> {` | I_PARTIAL | bounded_seconds header 0/1/86401/invalid through backoff_duration |
| `apps/desktop/src-tauri/src/github_rate_gate.rs:47` | `pub fn backoff_duration(` | E_PARTIAL | backoff_duration direct status table 401/403/404/429/503, retry/reset |
| `apps/desktop/src-tauri/src/github_rate_gate.rs:68` | `pub fn now_unix() -> u64 {` | P_NATIVE | now_unix reads system wall clock; no injected clock test |
| `apps/desktop/src-tauri/src/github_rate_gate.rs:77` | `pub fn github_api_cooldown_seconds(app: AppHandle) -> u64 {` | P_NATIVE | github_api_cooldown_seconds actual AppHandle state/IPC not direct |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:26` | `pub fn device_code(&self) -> &str {` | E_PARTIAL | DeviceChallenge::device_code private code read in native parser test |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:32` | `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {` | I_PARTIAL | DeviceChallenge Debug formatting hides synthetic device_code |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:49` | `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {` | I_PARTIAL | TokenLease Debug formatting hides access/refresh tokens |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:65` | `fn object(input: &str) -> Result<Value, WireError> {` | I_PARTIAL | object rejects malformed/object type/8192 overlimit via real parsers |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:76` | `fn valid_ascii_token(value: &str, max_len: usize) -> bool {` | I_PARTIAL | valid_ascii_token checks printable bounded tokens via real parser tests |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:80` | `pub fn parse_device_challenge(input: &str, started_at: u64) -> Result<DeviceChallenge, WireError> {` | E_PARTIAL | parse_device_challenge exact fixed verification URI and expires/interval |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs:108` | `pub fn parse_token_reply(input: &str) -> Result<PollReply, WireError> {` | E_PARTIAL | parse_token_reply maps finite states, rejects incomplete/unsafe grants |

## Existing strong assertions that must not be duplicated in Stage 9

- **ETag and scope authority:** `only_matching_conditional_entry_can_supply_304` asserts path+tag match, and `generation_change_blocks_in_flight_and_old_cached_private_data` proves invalidate rejects delayed old GET. `late_http_200_does_not_replace_newer_cache_value` ensures newer cache survives stale 200; `concurrent_auth_invalidation_rejects_delayed_old_generation_reply` uses a controlled concurrency race. Distinct billing path never uses ETag even with valid header.
- **ETag boundaries:** `cap_and_etag_validation_prevent_unbounded_or_malformed_cache` and `projected_json_at_exact_maximum_is_allowed_but_one_byte_over_is_not` assert bounded cached JSON, ETag grammar and 64KiB edge. A 304 without matched current projection is not a valid response by itself.
- **Rate backoff:** `rate_gate_respects_retry_after_then_reset_and_bounded_fallback` tests 429/403, Retry-After precedence, 0→1sec and huge→86400; `permission_errors_never_enter_rate_gate` ensures ordinary 403/401/404/503 don't invent rate gate; `concurrent_defer_calls_never_shorten_an_existing_cooldown` covers actual in-memory monotone deadline under concurrency. HTTP status is numeric, not provider body.
- **OAuth JSON:** `valid_device_response_keeps_private_code_out_of_debug` verifies native device_code retained internally and Debug redacted; `known_device_errors_are_mapped_without_leaking_server_text` rejects untrusted error_description; `bearer_grants_require_lease_expiration_and_refresh_rotation` and `oauth_token_reply_rejects_incomplete_or_untrusted_grants` ensure both tokens, exact bearer type and finite expiries, disallow missing refresh. Other tests reject malformed/oversized JSON and spoofed device verification URL.

## Gaps, negative matrix and no-authority limits

1. **ETag scope change:** underlying cache generation is a numeric sequence; the native `GitHubETagCache` method behavior has good tests, but an actual Logout→Login→scope change while a provider request is pending still requires an integrated native session/HTTP adapter. No token crosses CacheLookup but stored projections can contain provider data, so old generation must never leak.
2. **Rate clock split:** `remaining_seconds` is based on `Instant` (monotonic) and `backoff_duration` receives supplied Unix seconds. `now_unix` itself reads SystemTime. Existing tests cover positive/negative Retry-After and reset header arithmetic; system-clock rollback integrated with Monitor timers remains a separate source hypothesis, not a failing test.
3. **Wire parser privacy:** native OAuth wire parses up to 8192 bytes, rejects non-object JSON, validates code/lease fields and maps known error enums. It does not send HTTP; `github_native::submit` handles actual body/chunk limit and redirects. Never credit parser tests as actual network/Keyring tests.
4. **Boundaries to plan:** 0/1/64/65 cache entries, 127/128/129 ETag bytes, JSON 65535/65536/65537 bytes, rate headers 0/1/86400/86401 and missing reset, OAuth 8191/8192/8193 bytes, code 0/1/512/513, expiry 0/1/MAX. Credit existing exact tests where already asserted, add only genuinely missing independent edges.
5. **Native external adapter:** `github_api_cooldown_seconds` must read shared gate via actual Tauri AppHandle and return bounded integer; `now_unix` / OAuth polling time needs fake clock seam rather than mutating host time. Any changing data schema/permission/security contract remains STOP FACTOR for production behavior changes.

N1 malformed, N2 limits, N3 provider errors, N4 revalidation/retry, N5 async stale responses, N6 missing cache, N7 auth generation, N8 time, N10 secret redaction, N12 only external credential/keyring handling by other modules; N9 UI/OS and N11 monetization are NA to these pure module methods. No mutation suite executed. Mode B remains PARTIAL.
