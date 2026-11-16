# Mode B: native GitHub OAuth HTTP and OS credential adapter branches

Production baseline: a3ba7fa30fc4c81890d3075f94142942d001cbf3. Target: apps/desktop/src-tauri/src/github_native.rs; exact source blob: 30e0f93a14f603b29720c0be0c5b128fae836196.
Prepared parent: b9509ac14f0f5c10007f295a9c1785788e8b5554.
Status: Stage 3–8 source/test assertion review only. No live GitHub authentication, Keyring operation, app secret, tests or production changes.

## Four existing real inline Rust tests

| Test | Actual executable assertions |
| --- | --- |
| github_app_device_challenge_requests_only_its_public_client_id | Native device begin form builder returns just client_id (public App ID), no OAuth private token or WebView call. |
| token_bundle_serializes_as_one_keychain_entry_and_never_debug_logs_secrets | CredentialRecord JSON serializes to one body, decodes with exact access/refresh strings, Debug hides both fake marker tokens. No actual OS Keyring write is performed. |
| malformed_and_stale_keychain_values_fail_closed | Missing/array/broken JSON, version 2, empty refresh and inverted expiration are rejected by CredentialRecord::decode with CorruptCredential. |
| expiry_arithmetic_rejects_overflow_and_inconsistent_refresh | CredentialRecord::from_lease rejects issued_at u64::MAX overflow and refresh duration shorter than access duration. |

This is **real Rust domain serialization/decode evidence**, but all system keychain and HTTPS adapter paths have no direct executable test in this suite.

## Every production function and decision

| Function/adapter | Source branch and invariant | Evidence vs remaining |
| --- | --- | --- |
| device_challenge_fields | Exactly one client_id parameter | E exact single-item array; no other branches |
| CredentialRecord Debug | Version and expiration visible; access/refresh replaced by constant REDACTED | E secret substrings absent; exact formatting and unusually encoded synthetic secret not separately asserted |
| CredentialRecord::from_lease | checked_add of access and refresh duration, refresh_expires_at strictly later than access; construct version=1 with full pair | E two failure classes; ? positive exact absolute seconds, access overflow only vs refresh overflow only, refresh equal access, 1s longer |
| CredentialRecord::decode | Valid JSON object/required types; version=1; nonempty token fields; access expiry nonzero; refresh strictly greater than access | E serial round-trip and six corrupt fixtures; ? each missing/wrong type separately, access_expires_at=0, equal expiries, wrong integer ranges, extra keys ignored by serde, duplicate keys behavior |
| NativeCredentialStore::entry | OS keyring handle created or KeychainUnavailable | ? no OS adapter test |
| NativeCredentialStore::load | Existing JSON decoded; NoEntry -> Ok(None); any other OS failure -> KeychainUnavailable; malformed JSON -> CorruptCredential | ? must inject external keyring implementation; real OS physical locked/denied state separate |
| NativeCredentialStore::replace | One serialized record written as single OS entry; entry, encode, write can each fail | E only serde round-trip; ? successful actual provider write and write denial, no partial token-pair update; serde serialization failure for valid Record may be defensive/unreachable |
| NativeCredentialStore::clear | Successful delete and absent entry both Ok; other OS errors reject | ? idempotent double clear, locked/delete-denied, state readback; never assume deletion on failure |
| GithubOAuthHttp::new | Builds fixed 20s timeout, no redirects, no cookies/default bearer; client failure -> Network | Source only; ? HTTP client wiring, no redirect follow, fixed timeout contract and TLS failure |
| GithubOAuthHttp::submit | URL exactly DEVICE_CODE_URL or TOKEN_URL, else BadResponse before send | Source only; ? invalid endpoint branch (private method), fixed host/form, no URL/token in diagnostics |
| GithubOAuthHttp::submit | Sends POST application/x-www-form-urlencoded with JSON accept; network error or non-success status mapped to finite error | Source only; ? TLS/DNS/offline, HTTP 301/302/307, 400/401/403/429/500/503; ensure body not logged |
| GithubOAuthHttp::submit | Stream response chunks; 8192 max bytes based on actual byte chunks, not trusted Content-Length; chunk error => Network; UTF-8 error => BadResponse | Source only; ? 8191/8192/8193, chunked underreport/overreport, empty, invalid UTF-8, mid-stream disconnect |
| GithubOAuthHttp::begin | Only public client_id to DEVICE_CODE_URL, then real parse_device_challenge; error maps to BadResponse | E form helper; parser E in github_oauth_wire.rs; ? actual transport and timestamp/challenge integration |
| GithubOAuthHttp::poll | TOKEN_URL, client_id, private device_code, exact device-code grant type; maps parsed PollReply | S source; parser E separately; ? native request form and nonsecret output, pending/denied/malformed HTTP integration |
| GithubOAuthHttp::refresh | TOKEN_URL, client_id, private refresh_token, refresh_token grant type; Granted -> new lease, State(_) -> Rejected | S; parser E separately; ? refresh rejects any non-grant, missing token, malformed body and 5xx HTTP |
| Public NativeAuthError | Eight finite error variants, HttpStatus(u16) is numeric only | E conditional decode/from_lease error; github_session.rs tests finite public mapping; ? external adapter failure source classification |

## Risk and trust boundary observations

- OS Keyring stores a single JSON record containing an access and refresh pair. This is intended private native persistent storage, NOT a claim that encrypted bytes are handled by RepoTicker itself.
- CredentialRecord::decode checks version, emptiness and expiry order but does **not** reapply all wire-level ASCII token validation. Characterization of corrupted local data is required; changing persisted credential acceptance or migration is an architectural security/storage contract choice, not a test-only change.
- Native submit uses compile-time GitHub URLs and disables redirects. Do not weaken endpoint validation for test convenience: introduce a private HTTP transport adapter or callable external request executor whose base endpoint remains pinned in production.
- Likewise, Keyring fault injection must replace only the external entry/store adapter, not CredentialRecord or GitHubAuthManager domain behavior. Genuine KWallet/Windows vault lock/deny/Quit checks remain OS acceptance.
- No actual credential disclosure or cross-account persistence defect has been reproduced by this review.

## Positive and N1–N12 classification

| Category | Evidence | Required branch evidence |
| --- | --- | --- |
| Positive | E partial | Credential round-trip, form helper; HTTP begin/poll/refresh and Keyring read/write/delete not directly tested |
| N1 | E partial | Corrupt JSON, version, empty refresh; remaining field/type, UTF-8 and token boundaries |
| N2 | E partial / ? | Expiry overflow tested; stream 8192/8193 bytes untested |
| N3 | ? | DNS, TLS, timeout, interrupted stream and 401/403/429/5xx not injected |
| N4 | ? | Repeated refresh, Keyring replace/clear idempotency and partial failure |
| N5 | ? | Simultaneous store/clear and auth change; vault sequencing belongs to session integration |
| N6 | E partial | Six corrupt Keyring value fixtures; expanded schema/unknown/missing-key cases pending |
| N7 | E partial / ? | Exact device form helper; unauthorized redirect/endpoint, token-in-form not URL integration |
| N8 | E partial | Checked expiry overflow, exact lifetime and clock rollback integration pending |
| N9 | OS | Closing native dialog, cancel/Quit while Keyring or HTTPS is pending |
| N10 | E partial / ? | Debug token masking; actual network/OS error and output logs not observed |
| N11 | NA | No paid entitlement flow |
| N12 | ? / OS | Keyring unavailable/read-only/locked, delete denial and transactional preservation |

## Stage 9 external-contract tests after all Stage 3–8 sign-off

- ON1: CredentialRecord exhaustive table around version/field type/expiry order, token boundaries and JSON corruption; exact from_lease success and independent overflow/equality mutations.
- ON2: bounded HTTPS POST request with an injected server adapter, fixed URLs, no redirects, headers and form fields, stream byte limits and 301/307/401/403/429/503, TLS/transport failure, invalid UTF-8. Assert no token in URL/log and finite NativeAuthError.
- ON3: Keyring fake with present/missing/locked/corrupt/failed-write/failed-delete; actual load/replace/clear adapter logic, one atomic pair, double delete idempotency and unchanged stored data after refusal.
- ON4: integrate real GitHubAuthManager generation/vault gate and the external adapters for refresh/disconnect under deterministic channels. No sleeping and no replacement of core domain logic.
- ON5: physical KDE KWallet and Windows Credential Manager read/write/remove/revoke, app shutdown and no secret publication; separate platform acceptance.

Mutations: alter grant fields, allow arbitrary URL/redirect, skip stream cap, accept invalid UTF-8, split token writes, skip failed Keyring read, pretend deletion succeeded, change refresh strict expiry comparison, forward raw body. Each requires an executable assertion and actual external adapter contract, not a static string match.

This file does not close the global Mode B inventory. No source tests/CI/deployment/credentials changed.
