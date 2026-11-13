# Mode B: GitHub REST rate gate method-level branch and mutation map

Exact production baseline: `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Source: `apps/desktop/src-tauri/src/github_rate_gate.rs`; inspect the real inline Rust tests in that same module.
**Stage 3–8 documentation only:** no tests newly run, no GitHub/Cloudflare calls, no production contract change.

## Existing executable evidence

All seven named inline tests execute real Rust rate-gate or backoff functions, with no mocked domain under test:
- `rate_gate_respects_retry_after_then_reset_and_bounded_fallback`: retry header outranks reset, 403 remaining zero with reset, 429 huge valid numeric clamp, malformed/date/zero retry.
- `permission_errors_never_enter_rate_gate`: 403 nonzero remaining and unrelated 401/404/503 never rate-limit.
- `remaining_time_is_monotonic_and_does_not_shorten_existing_gate`: initially zero; four-second defer stays roughly four after short/zero defers.
- `retry_header_boundaries_preserve_permission_and_rate_semantics`: 403 remaining "1" vs retry header, exact reset, malformed and overflow retry numbers.
- `quota_headers_have_explicit_reset_and_retry_boundaries`: reset at/past now, +1/+2, `u64::MAX`, fallback and override.
- `unrelated_status_and_permission_denials_cannot_start_a_rate_gate`: table of non-403/429 statuses, missing 429 headers, 403 retry positive.
- `concurrent_defer_calls_never_shorten_an_existing_cooldown`: 12 concurrent short defers cannot override an earlier one-day deadline.

These assertions credit individual branches. The 3..=4 second timer assertion is tolerance-based, not deterministic boundary proof. No compiled tests were executed in this review.

## Every production method and distinct decision

| Method | Exact decision/branch | Reviewed executable evidence | Unverified boundary or interaction |
| --- | --- | --- | --- |
| `GitHubRateGate::remaining_seconds` | mutex normal vs poison recovery; deadline None/Some; elapsed instant saturates to zero; ceiling millisecond conversion; cap 86400 | E initially zero, approximate 4-second positive | Poison recovery; exactly expired time, 1ms->1s vs 1001ms->2s, and upper cap with deterministic clock |
| `GitHubRateGate::defer` | duration min(86400); current None, shorter/equal/longer; mutex poison; deadline uses monotonic `Instant` | E none→4, short and zero do not shorten; E 12-thread contention cannot reduce 86400 | Equal and longer new deadline; poison; exact maximum+1 saturation; zero inserted into empty gate |
| `bounded_seconds` | input None, unsigned parse success/error, numeric zero→1, max/max+1 clamp | E indirectly via public backoff tests on None, invalid, zero, 86401, huge valid and overflowing string | Explicit exact "1", "86400", "86401", ASCII plus, whitespace, negative, empty across precedence pairings |
| `backoff_duration` | only 429 OR 403 with literal remaining=="0" or **any present** retry header | E many 403/429 and denied statuses | 403 with valid future reset alone must remain None; 403 with malformed-but-present retry activates *current* fallback behavior; no silent status change |
| `backoff_duration` | reset parse unsigned, deadline strictly later than now, saturating delta and 1..86400 clamp | E at now, +1/+2, future u64 MAX, and malformed retry + valid reset | Invalid/reset-with-leading-space/overlong reset; future max+1 delta, clock rollback combinations |
| `backoff_duration` | retry takes precedence over reset; malformed retry falls back to valid reset, then constant 120 | E retry=12 over reset=3000; invalid retry + reset=5; missing both→120 | Cross-product with retry=0, 86400, overflow, 403 remaining values, resets past/future |
| `now_unix` | valid SystemTime since epoch vs pre-epoch fallback zero | ? real clock only | Requires injected clock or deterministic helper for pre-epoch/rollback; not a candidate for an unstable real-time test |
| `github_api_cooldown_seconds` | native read of registered gate and numeric-only u64 projection | S: command registration/JS IPC usage, no direct native event assertion identified | Tauri managed-state readback, no raw header/body/token in IPC, handling during shutdown |

Important invariant: GitHub HTTP `403` **permission denied** is not by itself a rate-limit signal. A `403` with a *present* retry-after header enters the gate even if malformed; this is the current explicit source contract, not independently validated GitHub provider behavior. Invalid header dates must not cause an unbounded sleep. Do not modify this behavior during coverage inventory.

## Positive and negative category disposition

| Category | State | Evidence/gap |
| --- | --- | --- |
| Positive | E partial | 403/429 paths and live defer exercised; native IPC actual readback unproven |
| N1 | E partial | malformed retry/negative/space tested; empty, leading plus, invalid reset parser matrix unfinished |
| N2 | E partial | zero, 86401, u64 MAX and reset > now tested; deterministic exact expiry/ceil boundaries lacking |
| N3 | E partial | 429 without headers = 120 fallback; real provider/network is outside pure function |
| N4 | E partial | repeated short defer cannot shorten; equality and repeated longer updates unreviewed |
| N5 | E partial | concurrent defers existing; poison and deterministic read/write interleavings untested |
| N6 | E partial | invalid retry and deadline strings; combined malformed retry + reset matrix missing |
| N7 | E partial | 401/403 permission separation; malformed header cannot leak raw provider metadata through numeric IPC |
| N8 | E partial / ? | explicit now_unix input permits reset boundary, but backward-clock cross-product and SystemTime before epoch not tested |
| N9 | OS | native command during shutdown/lock contention; standalone pure logic does not depend on UI |
| N10 | S / OS | API projection is u64 only; physical log/output secrecy and native command not behavior-tested |
| N11 | NA | no paid entitlements here |
| N12 | ? | poisoned mutex recovery, no disk state to corrupt |

## Planned case register, precise mutations and testability

- **RG1:** Table-driven `backoff_duration` cross-product for status 401, 403 (remaining missing, "0", "1"; retry absent, malformed, valid) and 429; reset future/now/past, retry malformed/overflow/0/86400/86401. Kill an altered 403 eligibility guard and retry/reset priority reversal.
- **RG2:** Separate `bounded_seconds` parser table via the real `backoff_duration` API (or a Rust module-local test) for None, empty, sign, whitespace, 0/1/max/max+1/overflow; kill parse-reject-to-accept and clamp-bound mutations. Do not simply duplicate existing asserted values.
- **RG3:** Deterministic controlled-monotonic-time scenario: no gate; defer exact 1ms/1000ms/1001ms, short/equal/longer deadline, expiry, max+1 clamp. Kill ceiling→floor, `<`→`>`, or min-cap removal. Real `Instant::now()` is embedded; a small behavior-preserving clock seam is required for reliable exact-boundary assertions rather than arbitrary sleeps.
- **RG4:** Poison native mutex, recover both `defer` and `remaining_seconds`; synchronized concurrent reads/writes and no indefinite lock. Kill `unwrap_or_else` poison recovery. Use barriers/channels, no timers.
- **RG5:** Native Tauri command reads the same managed gate as GitHub API client and emits only numeric cooldown; reject code-path inference from static JS source. OS shutdown acceptance remains separate.

The existing clock call `now_unix()` also requires a deterministic source seam to test pre-epoch fallback and clock rollback without modifying host time. Under Mode B, only plan a small dependency-injection refactor once full global Stage 3–8 mapping is signed off; no public IPC/credential change is approved.

**Mutation review not executed.** No production code, tests, branches, releases, secrets, Cloudflare bindings or CI jobs changed. This closes one additional method-level source/assertion review, not the global Stage 3–8 gate.
