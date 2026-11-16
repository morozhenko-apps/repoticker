# Mode B: atomic desktop JSON persistence, recovery and concurrent transactions

Production baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Source: `crates/repoticker-core/src/config_store.rs`, blob `b2fa869893499306d26e0fc5c555076aaf909b63`. Prepared parent: `fb2335552fa3b5fe4c4f2ddc6c8528599f302a92`.

**Stage 3–8 source/test reconciliation only.** This module stores *nonsecret preferences*, not OAuth/Relay credentials. Tests below are existing executable Rust source assertions, **not newly executed tests**.

## Existing Rust inline tests: 15 directly inspected

| Existing test | Concrete assertions actually present |
| --- | --- |
| `missing_config_and_backup_return_none_for_caller_defaults` | Absent primary + absent backup returns `None` without materializing defaults. |
| `atomic_save_preserves_previous_valid_snapshot` | First save writes primary with no backup; second save writes new primary and exact previous valid preferences to `.bak`. |
| `invalid_primary_recovers_prior_config_and_quarantines_original_bytes` | Two saves, corrupt primary, recover previous backup; repeated read returns same value; exactly one `config.json.corrupt.*` with byte-identical damaged content. |
| `missing_primary_recovers_from_valid_backup` | Remove primary after two saves; `read_json` restores old valid backup and recreates primary. |
| `two_invalid_copies_fail_closed_without_overwriting_files`; `invalid_primary_without_backup_never_resets_preferences` | Invalid primary+backup errors without changing either; invalid primary with absent backup blocks save and retains original bytes. |
| `backup_write_error_leaves_original_primary_unchanged` | A directory occupying `.bak` makes next save fail while prior primary remains valid. |
| `stale_temporary_file_does_not_override_valid_config` | An unrelated old `.tmp.0000` sibling does not supersede current primary on save/read. |
| `old_schema_with_omitted_default_field_is_still_supported` | Omitted `language` in legacy JSON defaults to `en`, roots preserved. |
| `concurrent_changes_are_serialized_as_complete_transactions` | Sixteen real threads update the same `JsonStore` counter, final persisted value exactly 16; no lost write in this single-process store. |
| `unchanged_transaction_skips_disk_write_and_backup_rotation` | `update` returns closure value with `changed=false` without creating primary or backup. |
| `mode_b_valid_primary_ignores_corrupt_backup_without_rewriting_it` | Valid primary takes precedence; corrupt backup bytes unchanged. |
| `mode_b_validation_rejection_keeps_primary_and_backup_bytes` | Closure mutates in memory then returns validation error; primary unchanged, no backup created. |
| `mode_b_third_successful_save_backs_up_the_latest_valid_primary` | EN→RU→ES rotates backup to RU, not first EN. |
| `mode_b_atomic_config_and_backup_are_not_accessible_to_other_users` | Unix file modes for both files have no group/other permission bits; test is Unix-only, does not cover Windows ACL. |

## Method/branch-to-assertion map

| Production method | Independent outcomes | Evidence and open obligations |
| --- | --- | --- |
| `backup_path` | Sibling filename, including unusual filename/non-UTF8 fallback | E normal `config.json.bak`; ? exotic filename and absent filename root path |
| `sibling_name` | PID + atomic increment; unique staging/quarantine names across threads | E stale named file and recovery implicitly; ? collision/read-only, many concurrent processes, integer wrap practical unreachability |
| `create_private` | `create_new` succeeds or AlreadyExists / denied, Unix mode 0600, Windows separate ACL | E Unix permissions and normal save; ? create_new collision, EACCES, Windows privacy |
| `StagingFile::drop` | cleanup flag true removes interrupted temporary, false keeps corrupt quarantine | E quarantine retained, stale tmp ignored; ? failure while writing/syncing, test of *only owned* staging file deletion |
| `sync_directory` | Unix parent open+sync success/error; non-Unix no-op | E indirectly normal save; ? durable fsync failure, Windows crash durability semantics |
| `atomic_replace` | no parent, create_dir failure, unique temporary collision, write/sync/rename failure, parent sync failure, success | E two saves and backup blocked as directory; ? fault injected at each individual stage with atomic old-primary integrity and no leaked temp; rename may succeed before parent fsync error, so failed return does **not** necessarily mean old bytes remain |
| `load` | read succeeds with bytes, missing returns None, other filesystem error propagates path-bearing diagnostic | E missing and existing; ? permission denied / unreadable regular file |
| `quarantine_corrupt` | create_new collision loops, write/sync success vs failure, retained file on success, temporary cleanup on failed write | E exact damaged bytes after recovery; ? blocked quarantine permissions, disk-full and duplicate nonce; failure must preserve source |
| `read_json`: primary | Valid primary returns immediately, even if corrupt backup; invalid or absent primary probes backup | E valid primary, corrupt primary, absent primary; ? valid primary with inaccessible backup (should not access it) |
| `read_json`: backup | Both missing -> None; invalid primary + absent backup -> error; invalid backup -> error without changes; valid backup restores invalid/missing primary | E all these outcomes with actual files; ? backup read error, failed quarantine, failed restore rename and permissions |
| `read_json`: quarantine and restore | If invalid primary, quarantine before replacement; if primary missing skip quarantine; restored backup bytes persist as primary; no backup rotation | E both recovery paths and exact quarantine; ? pre/post fsync crash, bytes after failed restore |
| `save_json` | Serialize fail, prior `read_json` recovery/error, valid existing primary -> backup rotation, missing -> direct save, failed backup/main replace | E normal saves, corruption refusal, third rotation and backup write error; ? serialization error on custom `Serialize`, second-stage main write denied after backup success, fault on restore |
| `JsonStore::read` | Lock acquired/read succeeds vs poisoned mutex error; delegates `read_json` | E normal, concurrent reads via store; ? poison deterministic recovery/error contract |
| `JsonStore::update` | Lock success/poison; defaults when both files absent; `change` returns success+unchanged (no disk) or changed (save); validation error returns without save | E 16 threads, unchanged and validation error; ? saved `changed=true` result, error while writing and changed closure rollback consistency; caller must not observe old vs new inconsistent in-process reads |

## Important contract distinctions

- The serialized transaction guarantee is **per `JsonStore` instance / process**. This mutex is not a cross-process file lock; two separate app processes writing simultaneously are outside proof. The Tauri single-instance plugin is a separate boundary.
- Successful `fs::rename` makes a new primary visible before the subsequent Unix parent directory `sync_all`. A sync error after rename can produce `Err` although new bytes are visible; do not assume unconditional rollback without fault-injection evidence.
- Recovery chooses the previous valid backup rather than salvaging a corrupt primary. Quarantine preserves the broken bytes for manual analysis. Do not propose silent defaults on corruption.
- The storage module deliberately delegates domain schema to the caller. Test both valid legacy shapes and validation errors at the desktop `save_settings`/GitHub monitor selection boundary.
- File permission assertions on Linux do not prove encryption or Windows keychain custody; OAuth/Relay secrets use separate native OS stores.

## Positive / N1–N12 classification

| Category | Status | Remaining independent evidence |
| --- | --- | --- |
| Positive | E partial | Real save/read/recovery/update and 16-thread serialization |
| N1 | E partial | Malformed JSON, schema defaults; exotic names, denied I/O, custom serialization failure |
| N2 | E partial | Multiple saves and sixteen writers; size/collision and large JSON byte boundary |
| N3 | NA | No HTTP, remote service or transient network |
| N4 | E partial | Idempotent read/unchanged update and backup rotation; interrupted save/retry |
| N5 | E partial / ? | Real 16-thread updates, cross-process/external editor conflicts not guaranteed by per-process mutex |
| N6 | E partial | Corrupt primary/backup/missing, quarantine and legacy schema; I/O-denied recovery |
| N7 | E partial | Unix private mode and no silent reset; Windows ACL and local path error privacy |
| N8 | NA | No wall-clock, locale-specific comparison; name uniqueness is atomic counter |
| N9 | OS | Quit/power failure during write, actual Linux and Windows persistence |
| N10 | E partial | Non-secret preference bytes only; path leak in diagnostics and quarantine lifecycle need explicit threat assessment |
| N11 | NA | No paid entitlements; unrelated to GitHub billing charges |
| N12 | E partial / ? | Filesystem backup/recovery and permission behavior; fine-grained denied fsync/rename and Windows durability |

## Stage 9 obligations after global Stage 3–8 signoff

- **CS1:** deterministic external filesystem adapter that fails each stage `create_private`, write, `sync_all`, rename and directory sync independently; assert exact primary/backup/temp/quarantine bytes before and after, including post-rename sync-error ambiguity. Do not fake `read_json` business logic.
- **CS2:** corrupted/legacy/missing/read-denied primary and backup combinations. Never default after corrupt existing preferences.
- **CS3:** concurrency with 16+ in-process updates and separately a cross-process second writer characterization if required by deployment contract. No nondeterministic sleep.
- **CS4:** poisoned mutex, user validation error after in-memory mutation, `changed=false` idempotence, and unchanged primary byte-for-byte after failure where atomic semantics guarantee it.
- **CS5:** Linux 0600/Windows ACL physical checks, app Quit and emergency power-fail recovery classification. A cross-platform test result is not inferred from one OS.

Mutation kills: remove backup rotation, ignore corrupt primary, skip quarantine, alter `changed` gate, remove mutex, reset corrupt preferences silently, set world-readable mode, delete staging file after successful preservation. These require exact executable assertions.

No code, tests, CI, Worker, secrets or published branches were modified by this map. Mode B Stage 3–8 remains PARTIAL globally.
