# Mode B: Relay Keyring secret custody, draft state and native Settings commands

Baseline: `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Production `apps/desktop/src-tauri/src/relay_secret.rs`, blob `82b79b24a64879af92c1e52fc67520b1842ca314`, 486 lines; `main.rs` close_settings invokes discard_draft and cancel_pending before hiding. Prepared parent `25d2d51f37fce7fdb822434d9248aeb03c4ce914`. No native vault access or runtime test was performed for this map.

## Four existing Rust inline tests (actual assertions)

| Test | What executes | What it does NOT prove |
| --- | --- | --- |
| `relay_credential_isolated_from_github_auth_record` | SERVICE and ACCOUNT constants differ from GitHub authorization constants | No OS Keyring identity isolation under simultaneous native reads |
| `strict_base64url_secret_policy_does_not_accept_untrusted_bytes` | Empty, short, space, URL/slash/equal/Unicode invalid; lengths 31 and 257 invalid, 32 and 256 valid | OS Keyring failures, exact wrong persisted value |
| `replacing_draft_wipes_candidate_without_keyring_write` | Real `RelaySecretDraftState` transitions Set→Remove→None | Does not byte-inspect freed previous allocation or invoke native `relay_commit_secret_draft` |
| `wipes_owned_secret_buffer` | Volatile byte overwrite yields exact zero bytes of original length | Does not measure after allocator reuse, Windows OS password buffers, process memory snapshots |

`tests/settings-github-confirm.test.mjs` executes the real Settings JS controller under a synthetic `window.__TAURI__.core.invoke` and fake Keyring responses, including failed commit, Cancel, repeated OK and removal verification. `tests/settings-relay-draft.test.mjs` and `tests/relay-native-diagnostics.test.mjs` also inspect native source or actual JS methods. These are not real Rust native Keyring/command integration tests.

## Method-by-method independent outcomes

| Native method | Distinct decisions and invariants | Existing proof / open branch |
| --- | --- | --- |
| `lock_draft` | Normal Mutex vs poisoned, `into_inner()` recovery; only one draft at a time | E normal state; ? poison and concurrent discard/commit ordering |
| `discard_draft` / `has_pending_draft` | None or Set/Remove; discard destroys pending candidate, lookup says whether any draft (including Remove) exists | E real state transitions, S close_settings call; ? actual Tauri app/window event and late Keyring failure interaction |
| `PromptLease::drop` / `enter_prompt` | Atomic compare_exchange false→true or fixed already-open error; lease releases on every completion/error | S source; ? simultaneous prompt/stage/clear/commit, cancellation with native OS prompt, false-positive gate after failure |
| `valid_secret` | ASCII base64url [A-Za-z0-9_-], UTF-8 byte length 32..256 inclusive | E four exact length values and invalid classes; ? all ASCII allowed chars independently, newline, embedded null |
| `entry` | Keyring entry creation succeeds/fails with fixed redacted error; only relay service/account | E static constant inequality, ? real OS connection denial |
| `read_secret` | Password present + valid -> SensitiveSecret; malformed stored -> error; NoEntry -> None; other Keyring error -> fixed unavailable | S; **O3 NEEDS_ADAPTER**, real fault injection and status handling |
| `wipe`, `SensitiveSecret::drop`, `as_str` | Volatile zeroing ASCII bytes, fence, object drop always wipes candidate including rejected input path | E direct wipe, E draft replacement semantics; ? panic/unwind and all ownership transfers |
| `store_secret` | Invalid candidate blocked before Keyring, valid set_password success/error redacted | E validation predicate, S OS write; ? Keyring-denied write, credentials still old, exact retry |
| `remove_secret` | Delete success or NoEntry idempotent success, other Keyring failure redacted | S; ? real OS remove and failed remove |
| `settings_only` | Window label exact "settings" permits, other labels reject | S native handler; ? direct invocation from main/usage/about windows under actual Tauri |
| `relay_secret_status` | Settings-only; existing draft Set => true, Remove => false without wallet read; no draft => blocking vault read and existence boolean; join failure -> fixed unavailable | E native draft state only; ? native command status with Keyring missing/malformed/denied and concurrent draft change |
| `relay_prompt_secret` | Settings-only, single dialog lease, native prompt cancel -> false, valid secret, window still visible, store volatile draft, error/cancel no persisted Keyring | E JS confirmation controller with IPC fake, native platform dialog source only; ? late native UI prompt/visibility race |
| `relay_stage_secret` | Settings-only, gate, accepts plaintext candidate in restricted Settings IPC once, wraps SensitiveSecret before validation; window must be visible; replace draft | E real UI controller with fake invoke and static leak checks, E Rust validation, **not** real native IPC response |
| `relay_clear_secret` | Settings-only, gate, replace existing draft with Remove without immediate Keyring operation | E Rust draft Set→Remove and JS fake IPC; ? native confirmation failure/close race |
| `relay_commit_secret_draft` | Require Settings, gate, visible; take draft; None returns success; blocking set/delete, join error fixed; ordinary Keyring error restores candidate for retry; success drops/wipes candidate, optional fixed log, transport restart | E JS fake responses, S native code, **O3** real Keyring error/admission and restart ordering unproven |
| `prompt_native` Linux | GTK main-thread transient modal; accept password / Cancel, entry text cleared, channel returns; window unavailable or oneshot closed -> redacted error | OS-L physical; no native GTK test |
| `prompt_native` Windows | Win32 credential UI with nonpersistent flags; success decode or invalid UTF-16, Cancel 1223 returns None, other failures redacted; username and password wchar buffers overwritten before return | OS-W physical; no native Win32 test |
| Unsupported target | Fixed unsupported-dialog error | cfg-only, no macOS promise |

## Trust-contract nuance and independently testable race hypotheses

The module-level description states "Secret values never cross WebView IPC", while `relay_stage_secret(app,window,secret:String)` explicitly accepts the plaintext once from the Settings WebView; the method's own comment explains the deliberate tradeoff. Therefore **do not repeat the module-header security claim as literally true across both entrypaths**. What can be asserted: secret bytes are not emitted in *responses, persisted JSON, logs or events*; the Settings-only inbound IPC candidate is temporary. Any requirement to remove that input channel would change the approved UX/security contract and is an **ARCH_STOP_IF_FIX** concern, not a silent test patch.

**RS1 source-derived hypothesis (NOT a reproduced bug):** `relay_commit_secret_draft` takes the draft before awaiting a blocking Keyring operation, while `close_settings` calls `discard_draft` without taking `RelayPromptGate`. If the app closes Settings after the take and before a failing Keyring call resolves, the failure branch may reinsert its candidate into `RelaySecretDraftState` **after Cancel**. The current code does not recheck Settings visibility before restore. Its externally visible significance must be established by a deterministic seam/barrier test and an explicit UX/security policy: canceled drafts must not later be shown as pending/committed. Do not claim successful Keyring persistence or deletion; a successful in-flight commit may also finish after window close and must be characterized separately.

**RS2 source-derived hypothesis (NOT confirmed):** On a `spawn_blocking` join error, the taken `change` is moved into the task and no explicit draft restoration follows. If the worker panics or runtime drops the task, the original draft may be lost. Identify intended error/retry contract before test design.

## Positive and N1..N12

| Class | State | Open |
| --- | --- | --- |
| Positive | E partial | Secret validation, draft state and UI fake IPC; real vault write/read/commit not |
| N1 | E partial | Invalid length/characters, wrong window and invalid native secret after prompt |
| N2 | E partial | 31/32/256/257, repeated Set and Remove, unusual Unicode UTF-16 from Win32 |
| N3 | E JS fake / ? native | OS Keyring denied/not found/corrupt, prompt error and blocking join |
| N4 | E UI fake / ? native | Repeated OK/Cancel and idempotent removal; late commit after close RS1 |
| N5 | ? | PromptGate concurrent admission, close/discard/failed commit interleaving RS1 |
| N6 | E partial | Corrupt stored credential and stale pending draft; no real native error adapter |
| N7 | E pure / ? native | Settings label gate, separate vault service, zeroization, one inbound plaintext IPC exception |
| N8 | NA | No date/locale decision; native dialog strings need OS localization separately |
| N9 | OS | GTK/Win32 dialogs, app Quit/Settings hide, in-flight write cancellation |
| N10 | E partial | Fixed redacted Keyring errors/logs; inbound Settings IPC secret exception must be isolated |
| N11 | NA | No paid entitlement |
| N12 | ? | OS vault denied/corrupt/unavailable, disk/profile failure and restore after fault |

## Stage 9 contractual scenarios (do not implement until Stage 3–8 signoff)

- RS-K1: actual `relay_secret_status` with injected vault outcomes present, NoEntry, corrupt value, write denied, remove denied, join failure; never project raw secret.
- RS-K2: native Settings-only admission tests from main/about/usage labels; concurrent prompt/stage/clear/commit through an injected OS adapter. Restore prompt lease reliably.
- RS-K3: barrier between draft take and vault completion, then `close_settings` / Cancel / reopen, on both store-success and store-failure; assert whether canceled draft is never resurrected under approved contract. If confirmation or design change is necessary, record STOP FACTOR first.
- RS-K4: actual native draft retry semantics on Keyring write/delete failure and no duplicate Relay restart; verify successful write/Remove with OS credential readback.
- RS-K5: OS Linux KDE and Windows physical password dialogs with denial/cancel/window-hidden races, scrubbing and no secret in diagnostics.

Mutations to kill: remove settings_only, skip gate, allow short value, commit before Settings JSON validation, return raw wallet errors, persist draft on Cancel, forget zeroization, restart before vault succeeds, restore canceled candidate from a late failed write. No mutation tests or actual Keyring operations were performed.

No code, tests, Cloudflare or published refs changed. Stage 3–8 global state remains PARTIAL.
