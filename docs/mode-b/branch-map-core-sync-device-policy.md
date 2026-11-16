# Mode B: Core Rust safe Git decision and GitHub OAuth Device Flow policy

Baseline production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit branch `audit/mode-b-testing`, parent `2d6da58db1c66c2f3d7da9f1118562eb638af50d`.
- `crates/repoticker-core/src/lib.rs` blob `f653cd6ae873fdaaa5eeaabbccdd67766e8d7847`, **8 real inline Rust tests** directly call `classify_sync`.
- `crates/repoticker-core/src/github_auth.rs` blob `ad10c5133b61e0e82706e3c274b3e78dacd066eb`, **14 real inline Rust tests** exercise `DeviceSession` and `TokenExpiration` (the file is 456 source lines).
- This map specializes the earlier multi-module `branch-map-git-oauth.md`. No real GitHub OAuth HTTP, native access token, OS Keyring, Tauri AppHandle, tests or new release executed here.

## Pure Git safety: actual assertions and branch outcomes

`classify_sync(RepositoryState)` is a **pure local decision function**. The network mutation belongs to the separate Git adapter; this helper cannot itself pull, push or fetch.

| Decision order | Source branch + real existing tests | Missing |
| --- | --- | --- |
| 1 no upstream | `missing_upstream_blocks_automatic_pull`, `simultaneous_unsafe_states_respect_fail_closed_priority` show NoUpstream wins even with dirty/operation/divergence | No new test required for this priority |
| 2 operation ongoing | `unfinished_operation_blocks_automatic_pull`, combined unsafe-state progression, beats dirty and divergent | Covered directly |
| 3 dirty worktree | `modified_or_untracked_files_block_automatic_pull`, combined unsafe state, beats divergence | Covered directly |
| 4 ahead>0 and behind>0 | `local_commits_do_not_get_rebased_or_merged`, `simultaneous...`, `very_large_commit_counts_preserve_direction_without_overflow` | E including u64::MAX |
| 5 ahead>0 only | `local_commits_do_not_get_rebased_or_merged` and u64::MAX ahead -> LocalAhead | Covered |
| 6 behind>0 only | `clean_behind_branch_allows_fast_forward` (3) and u64::MAX -> `FastForward{commits}` | Covered exact count |
| 7 both zero | `up_to_date_branch_does_not_pull`, max-count test reconfirms -> UpToDate | Covered |

**Existing executable evidence is strong for this pure classifier**, including its complete seven-way decision chain and compound fail-closed priority. Do **not** add repetitive assertion-only tests merely to increase suite size. The still-open G2/A2 safety gates are **native Git adapter and Tauri IPC**, not an undiscovered eighth `classify_sync` branch.

## `DeviceSession::new`: challenge input/clock bounds and real test evidence

| Branch | Existing direct assertion vs gap |
| --- | --- |
| verification_uri exact `https://github.com/login/device` | E 4 phishing/mirror/query/trailing-slash variants, valid fixed URL |
| user_code nonempty <=32 ASCII uppercase/digit/hyphen | E blank, spaces, underscore, slash, non-ASCII, lowercase, overlong 33; minimum `"A"`; ? exactly 32 characters, hyphen-only code accepted by grammar (requires product decision before calling a defect) |
| expires_in and interval 1..3600 | E 0/3601 rejected, 1 and 3600 accepted, interval below minimum normalized to 5 |
| checked_add on `started_at` | E u64::MAX expiration overflow rejected, near-u64::MAX valid boundary; also checked next_poll initial addition |
| initial phase/expiry/next deadline | E `AwaitingUser`, public code/URL, expiry=1001 for minimum, next poll interval never <5; ? returned public struct no private tokens is a type-level property, no Keyring test here |

## `next_poll`, `receive`, `cancel`: real state transition assertions

| Production decision | Direct test names and exact facts | Remaining |
| --- | --- | --- |
| terminal phase before all others | `denied_expired_and_cancelled_sessions_are_terminal`, `terminal_device_phases_reject_late_success_and_cancellation`: late Authorized never revives Denied, Expired, Cancelled, Failed, Authorized | E |
| expiration at exact boundary | `authorization_requires_a_nonexpired_active_challenge`, `consecutive_slow_down_replies_never_enable_early_polling`: t=1900 at expiration rejects Ready and Authorized | E |
| not ready | `cannot_poll_more_often_than_github_interval` before 1005 waits 5, after 1006 waits 4; `mode_b_rolled_back_poll_clock_never_bypasses_active_interval`: rollback to t=900 waits 110 rather than Ready | E; rollback **already tested in this core OAuth policy**, unlike the independent WebView monitor scheduler |
| ready on/after deadline | `cannot_poll_more_often...` t=1005/1010 Ready; next scheduled by saturating_add | E |
| `AuthorizationPending` | `cannot_poll_more_often...`, rolled-back poll test remains AwaitingUser and no early retry | E |
| `SlowDown` | `slowdown_extends_current_and_future_poll_intervals`, `consecutive_slow_down_replies_never_enable_early_polling`, `mode_b_slow_down_response_while_waiting_extends_not_reduces_deadline`: step 5s, no shorter remaining deadline, 10→15 | E; ? saturation u64::MAX on repeated slow_down and received while before initial poll |
| AccessDenied, ExpiredToken, Authorized | `denied_expired...`, `authorization_requires...`, `terminal_device_phases...` terminal, cannot overwrite after cancel | E |
| four hard-failure response classes | `unsupported_or_invalid_credentials_end_the_attempt`: IncorrectClientCredentials, UnsupportedGrantType, UnverifiedUserEmail, UnknownFailure -> Failed | E |
| `cancel` | `terminal_device_phases...`: double Cancel idempotent, cannot change already terminal; `denied_expired...`: post-cancel Authorized ignored | E |

## `TokenExpiration::decide`: policy and transition order

- `rotated_access_token_policy_refreshes_before_expiration`: now 9600 margin 300 -> UseAccessToken, 9700 -> Refresh, 20000 -> Reauthorize, u64::MAX -> Reauthorize.
- `refresh_policy_handles_exact_margin_and_saturated_time`: exact 398/399 with margin 1, now==access expiry, refresh exactly at 500; u64::MAX−2 with 10 margin saturates and refreshes, at MAX refresh expires.
- `mode_b_refresh_lifetime_precedes_stale_access_token_lifetime`: refresh token's expiry overrides stale access token's apparent validity, and even MAX margin cannot permit use past refresh deadline.
- Policy priority: `now>=refresh_expires_at` -> **Reauthorize** before `now.saturating_add(margin)>=access_expires_at` -> Refresh else UseAccessToken. E boundary+priority; ? impossible/contradictory legacy expiration records (zero or refresh expiry before access) have only limited direct cases.

## Trust boundary / interaction

1. The pure DeviceSession stores **user_code and static verification URL only**; real `device_code`, access and refresh tokens belong exclusively to native `github_session.rs` and OS credential store. Passing policy tests does not prove Keyring custody.
2. `DeviceSession::receive` accepts the parsed `DeviceResponse` from its caller; it does **not** verify HTTP payloads or enforce that caller only calls it after `next_poll==Ready`. Native polling generation/endpoint/retry/admission are separate responsibilities.
3. `slow_down` must preserve explicit wait even under clock rollback; E core policy rollback, but an out-of-order **native** old OAuth completion after Disconnect still requires native auth generation test (existing limited tests, incomplete Keyring fault injection).
4. A pure `classify_sync` safe decision does **not** mean native `safe_pull` or `safe_sync` is transactionally safe against a branch-changing external Git process; recheck and race proof belong to `git.rs` maps and the unresolved A2 Tauri command.
5. `user_code="-"` appears syntactically valid to the current character grammar. Treat as boundary **hypothesis**, not an OAuth exploit or confirmed product requirement violation; real GitHub device codes may have narrower canonical shape. Do not change accepted grammar without explicit requirements.

## Positive / N1–N12

| Class | Direct existing evidence and open |
| --- | --- |
| Positive | E all 7 pure Git classifications, valid OAuth Device Flow and token policy |
| N1 | E invalid user code/URI, wrong response, expired states; ? hyphen-only validity contract |
| N2 | E 0/1/3600/3601, u64::MAX, 5/10/15s; ? exactly user-code length 32 and large slow_down saturation |
| N3 | NA pure policy; HTTP in native adapter |
| N4 | E double cancel, terminal late reply, repeated slow_down |
| N5 | E state transition under clock rollback, not native concurrent generation/Keyring |
| N6 | E expired access/refresh and stale reply safely rejected, storage absent/invalid belongs native |
| N7 | E canonical GitHub verification URL, status not accepting late Authorized; native secret storage separate |
| N8 | E fixed u64 clock boundaries and saturating time; actual OS wall clock and native sleep separate |
| N9 | NA no UI/OS side effects in pure functions |
| N10 | E public struct excludes tokens, terminal code responses are enum variants, native error/log boundary separate |
| N11 | NA |
| N12 | NA no local storage; Keyring and process failures external |

## Stage 9 only independent incremental cases

- CO1: exact valid 32-byte user code and hyphen-only current grammar; document whether user-facing policy should reject degenerate codes before modifying source.
- CO2: DeviceSession clock near u64::MAX and slow_down saturation; compare checked construction vs saturated progress without shortening the next poll.
- CO3: `receive` invoked before next_poll Ready: distinguish pure policy role from caller's native admissibility, don't assert a nonexistent internal network gate.
- CO4: native auth manager/controller generation race x Keyring write/read failure x logout, and real AppHandle event. This is existing O3, not covered by pure DeviceSession.
- CO5: native Sync classification and Git state changes after fetch/lock, A2/G2; do not duplicate full pure `classify_sync` table.

Mutation sensitivities: invert class priority, accept URL mirror, disable expiry, allow late Authorized after Cancel, remove slow_down max deadline, mishandle max u64 saturating, refresh stale access token after refresh expiry. Existing inline Rust tests exercise these logically; no mutation runner/test execution this turn. Mode B Stage 3–8 global PARTIAL.
