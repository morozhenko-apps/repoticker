# Mode B: CredentialRecord, OS Keyring adapter and pinned GitHub OAuth HTTP methods

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. `apps/desktop/src-tauri/src/github_native.rs` blob `30e0f93a14f603b29720c0be0c5b128fae836196`, 301 lines; audit parent `7b67aa5a228e72b4d56eb0e43b6f29cc16d7e1d1`. All 21 lexical candidates classified after this commit: **8 existing type/impl declarations** and **13 actual methods** below. Four E_PARTIAL direct Rust inline tests, nine P_NATIVE external side effect/IO methods. Historical tests inspected, **not executed here**.

## Exact 13 production method declarations

| Source line | Actual method | Evidence | Executable assertion or still-missing external contract |
| ---: | --- | --- | --- |
| 21 | `fn device_challenge_fields() -> [(&'static str, &'static str); 1] {` | E_PARTIAL | device_challenge_fields directly asserts a single public client_id |
| 49 | `fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {` | E_PARTIAL | token_bundle_serializes... Debug must hide synthetic access+refresh strings |
| 61 | `pub fn from_lease(lease: TokenLease, issued_at: u64) -> Result<Self, NativeAuthError> {` | E_PARTIAL | expiry_arithmetic_rejects_overflow_and_inconsistent_refresh: checked_add and expiry ordering |
| 80 | `fn decode(body: &str) -> Result<Self, NativeAuthError> {` | E_PARTIAL | token_bundle round trip + malformed_and_stale_keychain_values_fail_closed: reject 6 corrupt fixtures |
| 100 | `fn entry() -> Result<keyring::Entry, NativeAuthError> {` | P_NATIVE | OS Keyring::Entry creation and redacted failure |
| 105 | `pub fn load(&self) -> Result<Option<CredentialRecord>, NativeAuthError> {` | P_NATIVE | Keyring load: valid JSON/no entry/locked/corrupt; no WebView token |
| 114 | `pub fn replace(&self, record: &CredentialRecord) -> Result<(), NativeAuthError> {` | P_NATIVE | Keyring replace one JSON record, write denial and readback |
| 123 | `pub fn clear(&self) -> Result<(), NativeAuthError> {` | P_NATIVE | Keyring delete idempotent NoEntry, denied/locked failure |
| 139 | `pub fn new() -> Result<Self, NativeAuthError> {` | P_NATIVE | Reqwest client disables redirects, 20s timeout and fixed user agent |
| 149 | `async fn submit(` | P_NATIVE | Only DEVICE_CODE_URL/TOKEN_URL; POST body cap 8192 bytes and untrusted redirect/network/TLS |
| 188 | `pub async fn begin(&self, now: u64) -> Result<DeviceChallenge, NativeAuthError> {` | P_NATIVE | OAuth device challenge actual client HTTP vs parser, bad status and stale clock |
| 195 | `pub async fn poll(&self, device_code: &str) -> Result<PollReply, NativeAuthError> {` | P_NATIVE | Device poll form and exact private device_code never logged |
| 209 | `pub async fn refresh(&self, refresh_token: &str) -> Result<TokenLease, NativeAuthError> {` | P_NATIVE | Refresh token form and rejected non-Granted state, no bearer echo |

## Existing *direct* Rust inline assertions

- `github_app_device_challenge_requests_only_its_public_client_id` checks exact `[(client_id,CLIENT_ID)]`; no private device_code is sent to start authorization.
- `token_bundle_serializes_as_one_keychain_entry_and_never_debug_logs_secrets` serializes a synthetic CredentialRecord to JSON, decodes it, checks both access/refresh values equal originals; `Debug` contains neither fake secret. It does **not** call Keyring write.
- `malformed_and_stale_keychain_values_fail_closed` asserts `CredentialRecord::decode` returns `CorruptCredential` for empty object, array, malformed JSON, unsupported version, empty refresh and inverted expiry; exact missing/type errors not all individually asserted.
- `expiry_arithmetic_rejects_overflow_and_inconsistent_refresh` calls `CredentialRecord::from_lease` with `u64::MAX` timestamp and refresh duration shorter than access; both reject with `BadResponse`. Positive exact seconds, equality and second overflow branch remain planned.

## Native trust-boundary obligations

1. **Credential custody:** `NativeCredentialStore` uses a single versioned JSON record for access/refresh tokens in the OS Keyring, with distinct service/account ID from Relay. The real OS provider can fail during entry creation, read, serialization/write or delete. Existing inline tests do not exercise `entry/load/replace/clear`; synthetic storage-port injection is required (O3 NEEDS_ADAPTER). Do not mutate real user credentials during audit.
2. **CredentialRecord domain vs stored compatibility:** `decode` validates JSON version, nonempty tokens and expiry ordering, but intentionally does not reapply every OAuth wire-token character check. Additional strict admission would alter persistent credential compatibility/security boundary and is a STOP FACTOR for a **fix**, not for characterization tests.
3. **HTTPS transport:** Reqwest client sets 20s timeout and `redirect(Policy::none())`; `submit` accepts only two compile-time GitHub OAuth endpoints, rejects other URL before send, requires a finite successful response, incrementally limits response body to **8192 bytes**, checks UTF-8 and never includes raw provider bodies in public error results. Test 8191/8192/8193 actual chunks, invalid UTF-8, early timeout/DNS/offline, malicious 301/302/307, 401/403/429/500/503, mid-body stream failure and absent Content-Length with a fake external HTTP transport. The OAuth domain `GithubOAuthHttp` itself must remain real.
4. **Device/refresh contracts:** `begin` submits public client_id only; `poll` submits private native device_code and exact grant; `refresh` submits private refresh_token with grant. Parsed replies are tested separately by `github_oauth_wire.rs`, but not through real HTTP submission adapter.
5. **Diagnostics/permissions:** A raw network status is reduced to `NativeAuthError`, which native session maps to a bounded public vocabulary. The Rust Debug test checks synthetic token masking; it does not prove OS keyring logs or WebView events have never leaked. Pin endpoint and do not substitute arbitrary user URLs to ease tests.

## Stage 9 after global method/branch matrix closure

`GN-N1` positive CredentialRecord exact epoch/expiry, malformed version/missing fields/overflow/equal refresh with strict round-trip; `GN-N2` injected OS Keyring NoEntry/locked/corrupt/partial failure readback, single-record consistency; `GN-N3` fake HTTP exact pinned endpoints, form and body-read cap 8191/8192/8193/invalid-UTF8/chunk errors; `GN-N4` polling/refresh status table under 401/403/429/5xx/redirect with no token-bearing output; `GN-OS` actual KDE/Windows Keyring and certificate/clipboard acceptance with synthetic isolated test account. Do not exercise live GitHub credentials/Keyring in the documentation pass.

Relevant N1 malformed, N2 hard limits, N3 network errors, N4 retry/NoEntry, N5 concurrent read/rotation (session owner), N6 old stored record, N7 exact endpoint/credential scope, N8 absolute expiry, N9 cancellation, N10 privacy, N12 Keyring failure; N11 NA. No suites/mutations ran. **Mode B remains PARTIAL**.
