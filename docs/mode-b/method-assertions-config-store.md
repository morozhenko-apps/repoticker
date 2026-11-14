# Mode B: JsonStore persistence method-to-assertion receipts

Production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `crates/repoticker-core/src/config_store.rs` blob `b2fa869893499306d26e0fc5c555076aaf909b63` (490 source lines). Audit parent `29fa2285cf48858da0c44a6a7c6029be01400972`.

**All 15 lexical entries** now have source classification: 3 preexisting `TYPE_DECL/IMPL_BLOCK` and 12 method entries. 4 `E_PARTIAL` real direct public/helper test calls, 1 `I_PARTIAL` indirect real read_json through JsonStore, 7 `P_CORE` internal filesystem/rollback methods whose exact negative paths are not separately asserted. This code is the JSON **non-secret preferences** store: do not mistake it for OS Keyring credential storage. Historical Rust inline test bodies reviewed, **not newly executed**.

## Complete 12 entry ledger

| Source line | Actual function | Evidence | Direct/indirect proof or missing branch |
| ---: | --- | --- | --- |
| 14 | `fn backup_path(path: &Path) -> PathBuf {` | E_PARTIAL | backup_path used directly in inline tests to assert backup rotation and source byte preservation |
| 21 | `fn sibling_name(path: &Path, suffix: &str) -> PathBuf {` | P_CORE | Unique sibling temp/quarantine filename per PID+atomic counter, no direct named assertion |
| 30 | `fn create_private(path: &Path) -> io::Result<File> {` | P_CORE | Private file create_new + Unix mode 0600, permissions test indirect only |
| 47 | `fn drop(&mut self) {` | P_CORE | StagingFile Drop rollback, no standalone destructor assertion |
| 54 | `fn sync_directory(parent: &Path) -> io::Result<()> {` | P_CORE | Unix directory fsync vs non-Unix no-op, failure not injected at owner |
| 66 | `fn atomic_replace(path: &Path, bytes: &[u8]) -> io::Result<()> {` | P_CORE | atomic_replace: temp + sync + rename, OS full-disk and permission barriers no direct injection |
| 94 | `fn load(path: &Path) -> Result<Option<Vec<u8>>, String> {` | P_CORE | load optional file vs denied read/NotFound, observed only through JsonStore |
| 102 | `fn quarantine_corrupt(path: &Path, raw: &[u8]) -> Result<(), String> {` | P_CORE | quarantine_corrupt preserves invalid primary bytes, tested through recovery only |
| 127 | `pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {` | I_PARTIAL | read_json branch observed through real JsonStore::read/update and backup recovery inline tests |
| 163 | `pub fn save_json<T: Serialize + DeserializeOwned>(path: &Path, value: &T) -> Result<(), String> {` | E_PARTIAL | save_json called directly; three generations of primary+backup, old file preserved |
| 181 | `pub fn read<T: DeserializeOwned>(&self, path: &Path) -> Result<Option<T>, String> {` | E_PARTIAL | JsonStore::read directly called with missing/primary/backup/corrupt cases |
| 186 | `pub fn update<T, R>(` | E_PARTIAL | JsonStore::update closure and lock with 16 concurrent successful updates, rejected/noop update |

## Real inline filesystem tests and assertions

`config_store.rs` includes **15 inline Rust tests** (source reviewed). Specific exact outcomes:

- `missing_config_and_backup_return_none_for_caller_defaults` treats both missing files as None, not an invented empty config written to disk.
- `atomic_save_preserves_previous_valid_snapshot` and `mode_b_third_successful_save_backs_up_the_latest_valid_primary` verify saved primary/previous known-good backup after repeated writes.
- `invalid_primary_recovers_prior_config_and_quarantines_original_bytes`, `missing_primary_recovers_from_valid_backup` assert the previous valid backup is restored; corrupt original bytes preserved for diagnosis.
- `two_invalid_copies_fail_closed_without_overwriting_files`, `invalid_primary_without_backup_never_resets_preferences` protect user settings from default overwrite on corrupt primary/backup.
- `backup_write_error_leaves_original_primary_unchanged`, `mode_b_validation_rejection_keeps_primary_and_backup_bytes` protect atomicity and error refusal; `stale_temporary_file_does_not_override_valid_config` prevents leaked tmp file from becoming authority.
- `concurrent_changes_are_serialized_as_complete_transactions` creates **16 concurrent updates** through the real `JsonStore` mutex, preserving whole read-modify-write transactions.
- `unchanged_transaction_skips_disk_write_and_backup_rotation` verifies no backup churn without actual change.
- `mode_b_valid_primary_ignores_corrupt_backup_without_rewriting_it`, `mode_b_atomic_config_and_backup_are_not_accessible_to_other_users` validate authoritative valid primary and Unix mode/privacy expectations.

These are real temporary filesystem operations within test source, not mocked JSON business logic. They do **not** exercise the Tauri `save_settings` command, app restart, OS Keyring or a two-resource transaction.

## Independent uncovered and negative cases

| Family | Planned deterministic acceptance after Stage 3–8 |
| --- | --- |
| CF-N1 | Missing/deleted file, full disk, read-only parent, permission denied, invalid UTF-8 and malformed persisted JSON with exact unchanged preexisting files |
| CF-N2 | Unsupported old/new schema, corrupt primary+backup (both files), recovery/quarantine collision and no valid copy |
| CF-N3 | Fail after creating staging temp but before rename or directory sync; ensure no replacement of last good known values or orphaned data leak |
| CF-N4 | Concurrent 0/1/16/32 updates under distinct threads; one rejected closure and one noop, exact committed count and no lost field |
| CF-N5 | Exact Unix mode 0600 and Windows private-file equivalent under controlled sandbox; no production HOME use |
| CF-N6 | Native Settings save + Keyring transaction as separate integration (O3/MS1), with a verified failed Keyring commit after successful JSON save; product rollback policy is architectural STOP FACTOR if altered |

**Precision:** `save_json` may rotate backup **before** replacing primary; a failed later primary write could leave prior backup updated while primary remains old. This is a source-derived multi-step failure branch to characterize with an injected FS port, **not an observed corruption bug**. Do not assume atomicity spans multiple independent files or OS Keyring.

N1/N2/N4/N5/N6/N7/N10/N12 apply at relevant branches; no HTTP N3, clock N8 limited to file naming, N9 interruption relevant to process exit, N11 NA. No suite/mutation execution, no production or CI edits. Stage 3–8 remains PARTIAL.
