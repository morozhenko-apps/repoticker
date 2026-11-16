# Mode B: Rust Git Core and atomic configuration evidence crosswalk

**Stage 4–8 documentation only, no execution.** Baseline production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `d621617b3100945f90223d82b1dddfe88121a2fe`. This crosswalk reopens real Rust code and tests, rather than using an earlier branch-map summary as proof.

| Real production source | Source blob SHA | Inspected test source | Direct evidence scope |
| --- | --- | --- | --- |
| `crates/repoticker-core/src/git.rs` | `5b92830d50e9a3d9a97487e3b78454bf3e64de55` | `crates/repoticker-core/tests/git_integration.rs` `0a9011b99f2340c356144d64346402b633f9d7d0` (30 annotated integration tests); existing inline `git.rs` tests (31 annotated including cfg-specific) | Real disposable Git working trees, bare remotes, command execution, refs and before/after data; core owned-child tests are not Tauri |
| `crates/repoticker-core/src/config_store.rs` | `b2fa869893499306d26e0fc5c555076aaf909b63` | Same module, 15 inline `#[test]` cases at lines 255–488 | Real temporary files, backup, corruption, permissions on Unix, sixteen threads sharing one JsonStore |

The 30/31 Rust Git test annotations and 15 config test annotations are **source counts**, not new runs or guaranteed cross-platform cases. A few Git inline tests are cfg-specific and cannot be claimed passing on each OS. The exact representative assertions below were opened and inspected; uninspected test bodies are *not* silently upgraded.

## Stage 4: actual source guard / real assertion / missing outcome

| Source guard and line | E: observed existing assertion on real production code | P or physical OS remaining |
| --- | --- | --- |
| `git.rs:644 discover_with_ignored`, `:699 discover`, `:724 resolve_enrolled_checkout_with_ignored`, `:745 normalize_root` | `git_integration.rs:109` shallow discovery skips snapshots and invalid worktrees, exact discovered paths; `:188` enrolled root itself accepted; `:197` missing/relative rejected; `:223` enrolled resolution accepts exact child but rejects unrelated/relative/missing | P symlink traversal/alias races, checkout replaced after resolution, Windows junction and Git administrative path changes |
| `git.rs:934 fetch` vs `:1244 safe_pull` | `git_integration.rs:121` real remote update: Fetch returns Fetched **without changing local HEAD**; inspect behind=1; explicit Safe Pull then FastForward Updated(1). `:203` proves Safe Pull uses existing fetched remote ref, no implicit fetch | P remote timeout and partial fetch refs, invalid/replaced checkout between verification and subprocess, native dispatch/Cancel |
| `git.rs:795 inspect`, `:1244 safe_pull` skip decisions | `git_integration.rs:144` untracked file remains byte-identical and HEAD unchanged; `:162` diverged local HEAD unchanged; `:178` no-upstream Skipped | P individual detached/unborn/missing branch and partial discovery errors |
| `git.rs:1232 safe_sync` and `:1102 safe_push` | `git_integration.rs:459` local strictly ahead and clean→Pushed(1), local HEAD unchanged, remote dev exactly local OID, repeated safe_sync→AlreadyCurrent; `:495` behind→Updated(1); `:530` dirty/no upstream/diverged Skip | P unexpected checkout mutation mid-operation, remote network error and exact error result, 2 simultaneous native requests |
| `git.rs:1108 safe_push_with_checkpoint` upstream/URL routing | `git_integration.rs:556` distinct push URL and mismatched merge ref reject; `:617` deleted upstream ref is **not recreated**; `:644` advanced remote refuses, both remote and local OIDs unchanged | P individual malformed multi-URL outputs, same-count changed ref/OID post-final checkpoint, external writer between probe and non-force push |
| `git.rs:1108` explicit non-force refspec | `git_integration.rs:781` second remote remains unchanged; `:855` pushDefault, pushRemote, followTags, default push mapping do not divert explicit upstream, no unwanted tag/ref created; `:920` mirror mode refused without server mutation | P independent malformed branch names and 40/64 OID edge values; raw Git command errors and remote routing under native IPC |
| `git.rs:1108` hook enforcement | `git_integration.rs:599` real failing pre-push hook blocks remote change; `:817` custom hooksPath executed (marker file), returns error and local/remote OIDs unchanged | P checkpoint handoff while hook changes source or upstream; Windows hook process acceptance |
| `git.rs:102–166 FetchCancellation` + native child ownership | `git.rs:1687` retry failed owned PID only, `:1729` stale unregistered PID never re-signaled, `:1826` two real owned fetch child groups canceled, `:1872` pre-launch cancel denies spawn, `:1918` cancel between spawn/registration | P poisoned mutex, termination/reap combined failure, Windows taskkill, real `main.rs execute` active token/OperationLock/ShutdownSignal concurrency A2 |
| `config_store.rs:127 read_json` missing and backup recovery | `config_store.rs:255` both absent→None; `:307` missing primary + good backup restores prior; `:279` damaged primary quarantined **exact bytes**, recovers previous backup on repeated reads | P failed quarantine write/permission, backup unreadable, failure after rename, exact recovery fault injection |
| `:127 read_json` invalid and legacy | `config_store.rs:320` corrupt both copies fails without changing source bytes; `:333` bad primary/no backup blocks save; `:365` legacy missing language defaults to en; `:425` valid primary ignores damaged backup without rewrite | P other schema failures, invalid Unicode/huge input, read permission denied |
| `:163 save_json` backup and staging | `config_store.rs:261` second save rotates previous valid snapshot; `:341` blocked .bak directory causes failed save and original primary stays valid; `:353` stale temp ignored; `:462` third save backs up second snapshot | P failure at each write/sync/rename separately; do **not** assert all errors imply rollback after rename succeeded but directory fsync failed |
| `:181 JsonStore::read / :186 update` mutex and changed flag | `config_store.rs:377` 16 real threads share one JsonStore; all updates serialize, final saved count exactly 16; `:405` unchanged update writes neither file; `:440` in-memory invalidation/rejection leaves primary exact bytes and backup absent | P poisoned mutex, panic in change callback, process-external concurrent writes (not covered by single-process lock) |
| `:30 create_private` Unix 0600 | `config_store.rs:475` checks primary and backup modes mask group/other permissions with 0o077 == 0 on Unix | OS Windows ACL, actual app user/profile ownership, interrupted machine shutdown or disk write |

## Stage 5 category disposition

| Category | Git core | Config store | Rollup disposition |
| --- | --- | --- | --- |
| Positive | E Fetch, Safe Pull/Push/Sync in real git fixtures | E primary/backup read/write/update | P remains on both |
| N1 | E denied enrolled path, split push URL, bad upstream | E corrupt JSON/no backup/legacy | P invalid combinations and I/O errors |
| N2 | E 1/2 repos, real process groups (via inline) | E two/three saves and 16 threads | P 0/1/MAX native batch, large payload, name/counter edges |
| N3 | E remote advance + subprocess timeout (inline) | NA pure local file | Git native network/timeout P |
| N4 | E repeat Safe Sync AlreadyCurrent | E unchanged update/read and backup rotation | P retry after interrupted operation |
| N5 | E checkpoint races in inline Git tests; core subprocess cancellation | E 16 same-process writers | P native Tauri operation lock, cross-process config writers |
| N6 | E dirty/diverged/no upstream, split remote | E corruption, stale temp, corrupt backup | P malformed native inputs and recovery fault injection |
| N7 | E enrolled paths, explicit remote/ref and no force push | E Unix 0600 | P native authorizer + Windows ACL |
| N8 | NA calendar time not used for safety | NA calendar time | No fake DST tests in these modules |
| N9 | E core owned-child cancellation | E staging cleanup by normal file lifetime, OS not simulated | OS Windows child/close, interrupted write |
| N10 | E no stray pushed refs/tags and privacy separation | P error includes local file path; prefs not secrets | P credential/log/error leak paths under native |
| N11 | NA | NA | No paid entitlement |
| N12 | E dirty/untracked and hook failure preserve local/remote | E backup corruption and fail-closed writes | P injected fsync/rename failures and Windows storage |

All category `E` entries here are **partial**. Under the file-wide completion rule, Stage 5 cells must remain `?` until every applicable branch outcome is examined. The native Git main.rs dispatcher remains **A2**, and the OS Keyring is unrelated to this JSON prefs store.

## Stage 6–7 interaction / new case ownership (not new implementation)

- **G-C1:** Git command running × enrolled checkout removed × global Quit. Must deny new mutations after ShutdownSignal and preserve checkout bytes; native A2 owner.
- **G-C2:** Safe Sync local ahead × upstream moved between pinned read and remote probe × 2nd competing request. Real temp Git fixture, exact OID before/after, no implicit force.
- **G-C3:** Fetch canceled between spawn/register × second Fetch queued × old token drop. Core owned-process cancellation plus actual native lease admission.
- **C-C1:** interrupted atomic_replace at backup write, primary rename and directory fsync; distinguish earlier fail-closed rollback from post-rename visible-data ambiguity.
- **C-C2:** corrupt primary+valid backup × quarantine failure × app reopened; original bytes preserved, no default reset.
- **C-C3:** 16-thread JsonStore updates × second independent instance/process. Clarify supported single-instance contract before asserting cross-process atomicity.
- **C-C4:** Settings saved prefs transaction × native Relay Keyring commit failure; this requires Settings/Tauri controller seam, not a claim JsonStore alone is atomic across vault.

No new test count is imposed by this crosswalk. Existing [Git safe operations map](branch-map-git-safe-operations.md), [native Git A2 map](branch-map-main-git-admission.md), [owned process map](branch-map-git-owned-processes.md), and [config-store map](branch-map-config-store.md) retain the unproved separate branch cases and Stage 9 owners.

## Stage 8 and Stage 10 result

Both files now have direct, source-referenced E subsets in `Covered` and concrete P/OS in `Remaining`. No source-only JS regex is counted as a real Git core test; the 30 temporary-Git integration cases are stronger evidence, while native Tauri dispatcher must still be separately proven. Planned mutation kills: no upstream check, forced or multi-ref push, lost backup, corrupt reset, skipped lock, skipped quarantine, bypassing staging cleanup. These are only **proposals** until execution.

**No test, CI, mutation or OS run; no code, credentials or release changes.** Stage 3–8 globally PARTIAL.
