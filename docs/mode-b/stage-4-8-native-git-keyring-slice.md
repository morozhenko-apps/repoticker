# Mode B Stage 4–8: native Git admission, Quit, and Relay Keyring transactions

**MODE B source-derived planning, not execution.** Audit branch parent `5809e145f285b7976488bf942769976494e78266`; immutable production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Exact source blobs: `apps/desktop/src-tauri/src/main.rs=5ab66298bcaa50668a228d0ef62b99aecb17d134`, `apps/desktop/src-tauri/src/relay_secret.rs=82b79b24a64879af92c1e52fc67520b1842ca314`. Other relevant unchanged code: `crates/repoticker-core/src/git.rs`, `bounded.rs`, `shutdown.rs`, WebView `app.mjs`, Settings UI. Cross-reference existing [A2 native Git branch map](branch-map-main-git-admission.md), [owned Git process map](branch-map-git-owned-processes.md), [bounded/shutdown map](branch-map-core-bounded-shutdown.md), [Relay Keyring map](branch-map-relay-secret-keyring.md), and [native OAuth adapter map](branch-map-native-oauth-adapters.md).

**Evidence distinction:** E = an assertion on the *real subject* in inspected existing Rust/JS test bodies; S = a source text/regex contract, not native execution; P = missing independent test outcome; OS = physical platform-specific acceptance. No STABLE/FLAKY suite, native OS test, or mutation runner executed in this pass.

## Stage 4 native branch and result ledger

| Real method/decision | Existing executable evidence vs source-only evidence | P/OS exact unverified outcome |
| --- | --- | --- |
| `main.rs:348 should_schedule_git_target` | E main.rs inline tests of Fetch/Safe Sync all targets, legacy Safe Pull fast-forward only, unsupported operation; actual Git core checks protected by separate integration tests | Native dispatcher filtering and progress identity for mixed discovered checkouts |
| `main.rs:359 execute` operation gate/lock | S code: unknown action denied before OperationLock; poisoned lock errors; check shutdown while lock held, then a second shutdown check after Fetch token registration | A2 actual native command when two Git requests compete; denied operation must issue zero Git work, no unauthorized filesystem changes |
| `execute` active Fetch and RAII | S lease owns active token while command lives; checkout discovery and requested-path enrollment check | Cancel just before/after token publication, second Fetch queued, mutex poison, config/discovery error and token cleanup |
| `execute` worker choice, completion | E actual `bounded_map` limit=4 and Git core cancel/sync; S native progress emits begin/start/complete/finish | Native 0/1/4/5 enrolled repos and completed *identity*, not assuming bounded_map result order equals input order; partial error/cancel must not become success |
| `main.rs:598 cancel_git_fetch` | S code says read ActiveFetch without OperationLock; real core FetchCancellation has owned-PID assertions, not command invocation | None⇒false, same active token cancel, repeated cancel, lease-drop race and poisoned registry; unrelated processes untouched |
| `main.rs:612 perform_git_action` | S spawn_blocking=>execute, join error mapped to error string | Actual command/admission and native async join failure; no duplicate success event |
| `main.rs:1797 request_quit` | E `ShutdownSignal` one owner and queued-operation admission in pure Rust; JS `graceful-quit.test.mjs` 4 tests are source contracts | Actual Tauri one exit worker, owned Fetch cancel, lock drain, post-Quit request rejection, poison refuses premature exit, Safe Sync not killed |
| `main.rs:1834 dispatch_menu_action` | S result event emission after execute; native tray/menu interactions not observed by source inspection | Tray + card double request, action-finished before/after command promise, no stale UI success |
| `main.rs:1444 close_settings` | S cancels GitHub pending session, discards relay draft then attempts window hide | Late Keyring commit and settings close concurrency; draft ownership must not be incorrectly restored |
| `relay_secret.rs:59 valid_secret` | E inline Rust: ASCII base64url, length 31/32/256/257, Unicode/invalid | Native window admission and stored secret failure responses, exact allowed ASCII table |
| `relay_secret.rs:71 read_secret` | E validation only; S Keyring get_password success/NoEntry/error mapping | Real native command with fake external vault: present valid, absent, invalid stored, denied read, fixed nonsecret diagnostics |
| `relay_secret.rs:115 store_secret / 124 remove_secret` | E pure secret predicate and draft state, S OS Keyring call | Rejected candidate before write; set success/failure; delete success/NoEntry/idempotent/failure and retry preservation |
| `relay_secret.rs:139 relay_secret_status` | E direct draft Set→Remove→None via Rust unit test; JS Settings fake IPC tests | Settings-label admission and status from actual native draft or vault, join error, concurrent draft change |
| `relay_secret.rs:189/210 stage/clear` | E JS controller external native fake + Rust draft transition; S native prompt gate and visibility checks | Hidden/wrong window; concurrent stage/clear, prompt gate refusal, no persistent secret until explicit OK |
| `relay_secret.rs:224 commit` | E JS simulated Save/Cancel and Rust draft transition; S native read/take→blocking keyring op→failed restore→restart on success | **RS1 hypothesis:** close/discard after take, Keyring fails, candidate reinserted after Cancel. **RS2 hypothesis:** blocking worker join failure loses taken draft. Both need controlled barrier and expected contract decision before production fix |
| `relay_secret.rs:51 enter_prompt / PromptLease::drop` | S atomic lease and drop | Concurrent dialog opens, error/cancel restores gate, OS GTK/Win32 prompt behavior; static ordering is not behavioral proof |
| `relay_secret.rs:88 wipe` | E volatile zero byte test and drop semantics | External OS/backend memory and crash/early-unwind hygiene OS acceptance, do not claim complete erasure |

### Architectural trust constraints

The documented relay-secret module header says no secret crosses WebView IPC, but the actual `relay_stage_secret(..., secret:String)` explicitly allows a **single Settings-only plaintext inbound IPC**. Do **not** infer outbound secret leakage or claim the header literally describes both paths. Observe exact payload/log boundaries with redacted fixtures. Removing that inbound channel or changing post-Cancel transaction semantics is a material security/UX contract choice and requires STOP FACTOR options before implementation. This audit neither chooses policy nor modifies it.

Likewise source `OperationLock` serializes competing Git requests: it does **not** promise double-Fetch requests coalesce. Tests must characterize queueing, not impose hypothetical coalescing.

## Stage 5 category matrix (three execution domains)

| Category | Native Git/Quit | Relay secret/Keyring | Remaining proof |
| --- | --- | --- | --- |
| Positive | E core selection/owned subprocess; S dispatcher | E draft and validation; S vault | Real dispatcher and native credential transaction |
| N1 input | E target selector; S unknown operation/path | E invalid secret | Native unknown operation, wrong-window, invalid candidate before vault |
| N2 bounds | E 0-limit pool, concurrency 4 in core | E 31/32/256/257 | Dispatcher 0/1/4/5, 39/40 etc only separate GPG owner |
| N3 network/service | E Git core timeout; S dispatcher | P OS credential backend denied | Native native Git timeout attribution and faulting vault |
| N4 retry | E FetchCancellation retry; S Quit single owner | E JS repeated OK; S native | Native replay after partial Git success, Keyring failed retry |
| N5 races | E pure shutdown, core owned process | P concurrent prompt/close/commit | Lock/token/quit and draft cancel-versus-commit barriers |
| N6 malformed state | E core Git invalid worktree | E draft; P invalid stored secret | Corrupt config, invalid stored key, stale registry |
| N7 authorization | E core enrolled roots | S Settings window gate | Direct native synthetic caller and selected-path refusal |
| N8 locale/time | NA action admission / vault | NA clock here | Timeouts are owned Git process obligations; display locale separate |
| N9 interruption | E core cancellation | E JS Cancel; P native | Native tray Quit, window hide, OS prompt closing |
| N10 privacy | E core process ownership | E zeroization predicate | No token, secret or private path in telemetry/errors/events; structural source contracts insufficient |
| N11 paid tier | NA | NA | RepoTicker has no paywall |
| N12 storage | E Git core IO failures | P vault write/delete | Native malformed config and fail-closed Keyring, partial write/rollback |

## Stage 6 independent interaction matrix

1. **NG-X1:** two Fetch IPC calls × one active token × cancellation before/after publication. Assert one OperationLock owner at a time, token identity, correct two results, never cross-cancel another operation.
2. **NG-X2:** Fetch pending × Safe Sync queued × Quit. Assert only owned Fetch canceled, queued Sync refused post-ShutdownSignal, single exit after owned cleanup.
3. **NG-X3:** two Safe Sync requests × upstream changes between calls. Re-inspect actual checkout on second call; no force push, reset or duplicate remote mutation.
4. **NG-X4:** tray Git request × card Git request × action finished event before card promise. Exact begin/finish and user-facing error/identity; no double-counted completion.
5. **NK-X1:** Settings stage Set × Cancel/close × Keyring write already taken, failing. Assert explicit *current behavior* then use STOP decision for desired rollback invariant; never assume canceled draft is absent.
6. **NK-X2:** same interleaving but Keyring succeeds after Settings closes. Determine native persistence and how next Settings open reflects it; no policy invented.
7. **NK-X3:** concurrent Settings stage/clear/commit × prompt gate × Keyring-denied read/write. Ensure only one gate owner and fixed messages, no leaked candidate.
8. **NK-X4:** Keyring worker join failure × draft take/ownership × reopen. Characterize whether candidate is retained/lost and no false success/transport restart.
9. **NK-X5:** app Quit × active native credential operation × Git operation. Exit and secret custody across interrupted OS work require physical and adapter evidence, not pretend synchronized locks are shared.

## Stage 7 incremental *independent* test bodies (estimate, not implemented)

| Planned case ID | New distinct assertion goal | Bodies minimum |
| --- | --- | ---: |
| NG1 | Real dispatcher unknown op/enrollment/metadata refusal | 1 |
| NG2 | Real dispatcher Fetch 0/1/4/5 and progress identity under completion reordering | 1 |
| NG3 | Fetch/Fetch and Fetch/Sync competing with Cancel token publication barrier | 1 |
| NG4 | Sync/Sync reinspection on real temp Git fixture | 1 |
| NG5 | Native Quit during Fetch + queued Sync with single shutdown owner | 1 |
| NG6 | Tray vs card dispatcher, event sequence/errors and async join failure | 1 |
| NK1 | Settings-only native command admission and visibility | 1 |
| NK2 | Vault present/absent/corrupt/read denied, redacted status | 1 |
| NK3 | Store/remove success, missing and denied write/delete with retry behavior | 1 |
| NK4 | Concurrent prompt gate stage/clear/commit and release on error | 1 |
| NK5 | Failed Keyring after close/discard, does candidate return? | 1 |
| NK6 | Successful in-flight Keyring after close/discard and re-open readback | 1 |
| NK7 | Worker join error after draft take, ownership/future retry | 1 |
| NK8 | Secret value redaction in every native outbound event/error and settings roundtrip | 1 |
| **Total** | **14 planned independent bodies minimum** (NG 6 + NK 8); parameterized subcases and physical acceptance not counted | **14** |

Real Rust production methods/decisions must execute. Fake **only** AppHandle/event provider, temp Git remote, OS Keyring/GitHub external backend and disposable native window/clock. A production-preserving native adapter seam may be needed; document rationale, compatibility and STOP FACTOR before any architectural/trust change. Do not execute real SSH/Git against enrolled owner repositories, personal OS credential store or process groups.

## Stage 8 file-evidence and remaining gate

| File | Existing direct E vs S | Open P/OS | Status |
| --- | --- | --- | --- |
| `apps/desktop/src-tauri/src/main.rs` | E inline target decisions, E core Git/ShutdownSignal, S main.rs command/lock/quit assertions in JS | NG1–NG6, actual Tauri command, Linux/Windows Quit and process cleanup | PARTIAL / A2 |
| `apps/desktop/src-tauri/src/relay_secret.rs` | E pure draft/secret Rust tests + JS Settings fake IPC; S native Keyring control flow | NK1–NK8; real native vault via injected adapter + KDE/Win credential window | PARTIAL / RS1, RS2 STOP if product behavior must change |
| `crates/repoticker-core/src/git.rs` | E real Unix process/cancel/Git fixture integration; not source-regex only | Native command interaction NG2–NG5, Windows process OS | PARTIAL cross-file |
| `crates/repoticker-core/src/shutdown.rs` | E eight concurrent begin callers, queued op refused | AppHandle Quit NG5 | PARTIAL cross-file |

## Stage 10 predicted kill mutants, not executed

Remove `OperationLock`, move the second shutdown check before Fetch token publication, clear active token prematurely, permit unenrolled path, process Sync in parallel, treat Git timeout as FETCH_CANCELLED, call `app.exit(0)` before lock drain. Skip `settings_only`, make clear_secret immediate delete, restore a failed draft even after authoritative Cancel, skip Keyring errors, restart transport on failed commit, expose raw secret outbound. Each requires a real assertion; a regex check is inadequate.

**No architecture decision was taken, no new tests written, no host OS operations or full suites executed.** Stage 3–8 remain PARTIAL. The above 14 is a local estimate, not the global test count.
