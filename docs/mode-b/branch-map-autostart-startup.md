# Mode B: OS autostart registration and privacy-bounded startup diagnostics

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; native sources:
- `apps/desktop/src-tauri/src/autostart.rs` blob `14722626a49a948b91b95f398c00d30f83935b43`, 40 lines, two Tauri commands, no inline Rust tests;
- `apps/desktop/src-tauri/src/startup_diagnostics.rs` blob `0c51d81114b9d9d78daa2ab745adaac65121665a`, 102 lines, `initialize`, `enabled`, `write`, `Span::new`/`Drop`, `allowed_stage`, `trace_startup_stage`, one direct Rust inline test.
Prepared parent `319a9ff7b80ab674a08fb9e5865c3e76aab547eb`. Documentation only, no OS registration or tracing was performed.

## Real evidence, distinct from source-only checks

- `startup_diagnostics.rs` `only_fixed_nonsecret_startup_milestones_are_accepted` invokes the real `allowed_stage` and asserts known exact `card.start` and `settings.config_auth_ready`, while five token/path/newline/semicolon variants return None. The production match contains **11** explicit allowed milestone strings. The test does **not** enumerate all 11, and does not execute actual stderr output, opt-in, span timings or `OnceLock`.
- `tests/settings-github-confirm.test.mjs` runs the **actual Settings JavaScript controller** under fake native `autostart_is_enabled`/`autostart_set_enabled` IPC, including successful enable, disable, unavailable read, failed OS registration and mismatched verification. It proves UI does not falsely report success given those IPC outcomes, **not** that Rust `autostart_set_enabled` implements or survives real OS failures.
- `tests/autostart-integration.test.mjs` (source contract) checks native command presence and Settings registration wiring; do not promote textual matches to native OS execution.
- No native OS autostart integration/rollback test or Windows/KDE physical acceptance result is newly established by this audit.

## Every method and independently observable path

| Production method | Branch/guarantee | E/S/OS status and remaining |
| --- | --- | --- |
| `autostart_is_enabled` | Plugin `is_enabled` returns bool or error mapped to fixed "System autostart state unavailable.", no `config.json` mirror | E JS fake UI outcomes, S native; ? actual Linux XDG or Windows registration read failure |
| `autostart_set_enabled`: initial read | `is_enabled` success/error; error before any enable/disable | E UI fake, S native; ? exact OS permission denial without registration call |
| `autostart_set_enabled`: idempotent | If previous==enabled, return same bool and do not call enable/disable or second is_enabled | S native; ? method-level OS/mock plugin invocation count |
| `autostart_set_enabled`: mutate | enabled true→enable, false→disable; failed plugin call redacted "System autostart registration failed." | E UI fake failure, S native; ? actual plugin state unchanged after denied toggle |
| `autostart_set_enabled`: verify | Read OS status after plugin operation; success only if exact requested bool; mismatch/error triggers rollback to previous mode and fixed failure | E UI fake mismatch display, S native; ? verify error and contradictory status as distinct branches |
| `autostart_set_enabled`: rollback | If previous true call enable, else disable; rollback return value discarded; still return failure even if rollback fails | S native; ? observable OS state after failed rollback, cannot assert successful restoration unconditionally |
| `initialize` | `START.get_or_init(Instant::now)`, first call sets monotonic time, repeated calls preserve origin | S; ? actual multi-thread/late initialization |
| `enabled` | OnceLock captures exact `REPOTICKER_STARTUP_DEBUG=1` on first use, all other/missing values false; after capture environment changes do not toggle | S; ? per-process fresh fixture for initial 0,1,unexpected, and late env changes |
| `write` | disabled -> immediate no stderr; enabled -> fixed stage and two numeric elapsed counters from monotonic Instant | S; ? capture stderr, no raw input/token, duration and exact format |
| `Span::new` | enabled -> Some(started Instant), disabled -> None; stage is static compile-time label only | S; ? enabled/disabled branch and span overlap |
| `Span::drop` | Some started -> call write with elapsed, None -> no output | S; ? double drop impossible, unwinding and skipped work |
| `allowed_stage` | Exact 11 fixed labels accepted, other string including paths/provider values rejected | E 2 positive, 5 negative, S remaining 9; need table all 11 and near-match for each |
| `trace_startup_stage` | enabled false => ignore all; enabled true + allowlisted -> emit; unexpected -> no log | E validator only, S actual IPC; ? concurrent emission, private path input and output capture |

## Interaction matrix and important constraints

- A Settings draft's login launch toggle must remain separate from JSON preferences; Cancel must not call native registration. Settings JS fake IPC verifies this path, but actual OS registration under failed Settings JSON write is not jointly tested.
- A mismatched OS verification must not be reported as success. Rollback is **best effort**, not guaranteed; a failed rollback should remain an error and the next `autostart_is_enabled` read must drive the UI.
- Startup timing uses `Instant`, not wall-clock, and the public IPC stage list is a fixed string allowlist; no repository path, OAuth token, workflow name or arbitrary stage string may enter stderr. Tests should assert observable stderr, not merely source regex.
- There are 11 explicit stage labels in production; the existing inline test checks only two positives. New table-driven tests must kill a mutant changing any remaining label without claiming a secret leak by default.

## Positive + N1–N12

| Class | State | Open exact native evidence |
| --- | --- | --- |
| Positive | E JS fake / S native | OS enabled/disabled and real opt-in timing |
| N1 | E partial | Invalid stage and malformed OS return, alternative env values |
| N2 | S | 11 labels exact, long malicious text and repeated toggle |
| N3 | E JS fake | Native plugin registration/read/verify errors, failed rollback |
| N4 | E JS fake | Same enabled state no-op and repeated Save/Cancel |
| N5 | E UI / ? native | Concurrent Settings OK, OS plugin toggling and OnceLock initialization |
| N6 | E JS fake | Unavailable state remains unknown; no stale config copy |
| N7 | E validator | Only fixed log labels; actual stderr redaction and no credential leakage |
| N8 | NA | Monotonic relative duration, no locale or wall-clock semantics |
| N9 | OS | KDE startup, Windows Startup folder/registry via plugin, Quit during registration |
| N10 | E validator / ? logs | Input stage privacy and no raw native errors in public UI |
| N11 | NA | No paid entitlement |
| N12 | OS | OS-profile permissions, startup registration partially written, recovery on restart |

## Stage 9 after global Stage 3–8 completion

- AS1: contract-seamed native autostart manager with recording fake **external plugin** but real command logic. Table initial read fail, idempotent, enable fail, disable fail, verify false/error, rollback success/fail. Assert exact calls and error strings.
- AS2: real Settings JS + native adapter combined read/save/rollback with canceled draft, failed write, late plugin reply and repeat OK; ensure no UI assertion exceeds OS state.
- SD1: fresh process-per-env capture of enabled/disabled startup diagnostics with real stderr, all 11 labels and malicious near matches, no raw user values or accidental logging.
- SD2: parallel `Span` and `initialize` use monotonic origin and nonnegative millisecond values without wall clock/timer sleeps.
- AS3: physical Windows and KDE autostart registration/permission denial, reboot-login behavior and recovery; no installed registration modified during test-only audit.

Mutations to kill: skip OS verify, return success on failed registration, remove rollback, report rollback as success, persist autostart to config instead of OS, accept raw stage into stderr, invert enabled opt-in, replace `Instant` with wall clock. Nothing was changed/tested at runtime.

Overall Mode B Stage 3–8 PARTIAL; no source, test, CI or published branch changes.
