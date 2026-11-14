# Mode B: relay URL, tray icons, autostart and native CI notifications

Source baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `0fa9fc0d79bd0f7924a87113c9dacb9190b8f078`. Exact production blob SHAs: `relay_endpoint.rs=6cb009d5b687f8663041749bc847cf322dca74c2`; `app_icon.rs=98eb9e1cfcb925ad49daabd192c0eba6df2a1f13`; `autostart.rs=14722626a49a948b91b95f398c00d30f83935b43`; `ci_notifications.rs=08fb76fcad75bf91be341275fa8b463ef65a5948`.

Source-level review of existing inline Rust tests only. E_PARTIAL does **not** mean a recent test pass or all branches covered.

## Method-level Stage 3–4 receipts

| Source:line | Status | Direct test evidence / missing executable outcomes |
| --- | --- | --- |
| `relay_endpoint.rs:6 normalize_base_url` | E_PARTIAL | Direct assertions: normalizes mixed case hostname and :443; rejects empty, non-HTTPS, credential, path, query, fragment, local/IP, nondefault port, backslash/newline. Missing 511/512/513-byte length, whitespace, suffix .test/.internal/.invalid/.localhost, unicode/punycode, malformed percent encoding and explicit finite rejection text |
| `relay_endpoint.rs:43 websocket_url` | E_PARTIAL | Direct exact WSS projection with cursor 12 and rejects MAX u64. Missing cursor 0, 2^53−1, 2^53; invalid origin propagation and exact output with :443 |
| `relay_endpoint.rs:61 only_canonical_public_https_origins_are_stored` | TEST_ONLY | Inline Rust unit-test function, not production API |
| `relay_endpoint.rs:91 websocket_url_contains_only_cursor_and_validated_origin` | TEST_ONLY | Inline Rust unit-test function, not production API |
| `app_icon.rs:5 tray_rgba` | P_NATIVE | PNG decoding, exact 32×32 dimensions, 4096 RGBA bytes, alpha and source asset; no direct native test |
| `app_icon.rs:15 tray_argb` | P_NATIVE | Linux-only byte-order RGBA→ARGB, exact four-channel permutation and pixel count; no direct native test |
| `autostart.rs:6 autostart_is_enabled` | P_NATIVE | OS autolaunch is sole authority: true/false/error mapped to finite message, no duplicated config boolean |
| `autostart.rs:13 autostart_set_enabled` | P_NATIVE | initial state read error, same-state no-op, enable/disable, successful readback, mismatched/error readback triggers compensating rollback; rollback may fail but error remains bounded |
| `ci_notifications.rs:23 notification_catalog` | E_PARTIAL | Real inline test asserts 20 locales, matching supported tray locales, nonempty titles, error translations and placeholders; malformed committed JSON/runtime concurrency not exercised |
| `ci_notifications.rs:31 notification_error` | P_NATIVE | Three finite permission/state/delivery errors + unknown default; locale fallback, missing English catalog invariant not directly asserted |
| `ci_notifications.rs:45 notification_text` | E_PARTIAL | Real inline test covers all locales, success/failure templates, repository/run ID/attempt substitution, English fallback; empty, unusual account names and locale fallback exact error are outstanding |
| `ci_notifications.rs:74 approved_scope` | E_PARTIAL | Real inline test checks opt-in modes, owner and selection, malformed names, run ID 0/MAX+1, attempt 0/max+1, empty selected set, no owner; boundary values 1/MAX, attempt 1/MAX and conclusion variations remain |
| `ci_notifications.rs:113 ci_run_notify` | P_NATIVE | Unsupported OS, config failure, scope deny, permission denied, poisoned state, duplicate dedup key, show success/failure, delivered queue cap 512/513 and show failure must not mark delivered. No direct native AppHandle notification-sink proof |

## Stage 5 categories and Stage 6 interactions

- **N1/N2:** origin URL byte boundaries, HTTP credentials, host suffixes, maximum cursor, exact CI IDs/attempts; icon 32×32 and RGBA/ARGB bytes.
- **N3/N12:** external OS autostart manager failure, readback mismatch, permission/notification service failure, missing service; native integration only, no live mutation of the owner's OS autostart.
- **N4/N5:** autostart repeated same-state requests and race with OS state changes; notification dedup concurrent identical keys, bounded FIFO eviction and retry after failed notification delivery. Mutex serializes queue but unverified native side effects must not be counted as covered.
- **N6/N7/N10:** malformed committed locale JSON is a build/fixture contract; reject unsafe relay origins, avoid credential-bearing URLs and notification payloads with uncontrolled provider text. CI repository names are validated and scoped; a real notification builder still needs bounded contract tests.
- **N8/N9:** all 20 locale messages and fallback; real KDE/Windows service failure, restart, permission and OS Quit are separate physical acceptance.
- **N11:** NA (no paywall/entitlements). **N3 for pure URL/icon functions:** NA (no network request); **N12 for pure URL validation:** NA (no I/O).

### Planned deterministic test groups (Stage 9, only after Stage 3–8 closure)

- **RU1/RU2:** URL character/host/port/size/cursor matrices, same actual `normalize_base_url` and `websocket_url`, no security policy changes.
- **IC1/IC2:** actual icon decode and exact RGBA→ARGB byte assertions behind cfg(linux); physical tray rendering separate.
- **AS1/AS2:** system-autostart adapter fake of external OS manager, real command policy: get/no-op/enable/disable/readback/rollback and failing rollback; no live autostart writes.
- **CN1/CN2:** direct pure error/scope/template tables including 0/1/MAX, all locale/fallback and unknown status; no arbitrary diagnostic text.
- **CN3/CN4:** native notification permission and delivery port, real dedup queue, 512/513 FIFO, retry after failed delivery, simultaneous identical notifications, exact event count, bounded error vocabulary; separate native platform smoke.

### Mutation review targets

Remove host restriction; change >512 to >=512; accept a cursor above MAX; swap ARGB pixel order; skip readback; omit rollback; mark undelivered alert as delivered; allow unselected repository; change duplicate check or queue capacity. Each must be killed by a concrete planned assertion, not just a source regex.

Potential changes to relay origin admission or CI notification authorization/scope are security/API contract changes and remain STOP FACTOR if an implementation change becomes necessary. This pass does not alter either.

No tests, CI, native OS registration, notifications, distribution, production modules or branches outside the audit branch were executed/modified. Stage 3–8 remains PARTIAL.
