# Mode B — exact Git safety branch-to-test evidence (Stage 4 slice)

**Source SHA:** `ed8a1c95429a107b5ffcbd48fc0cd90fe52c5db1` (2026-10-29); inspected
`crates/repoticker-core/src/lib.rs` and
`crates/repoticker-core/src/git.rs`, relevant embedded
unit tests and `crates/repoticker-core/tests/git_integration.rs`.
**Status:** Git critical-flow Stage 4 mapping **PARTIAL**;
actual tests have NOT been executed in this turn. E means
a **named source-backed test candidate**, not observed PASS;
P means a concrete missing/uncorroborated assertion. Exact
branch predicates are from the inspected source; method line
numbers apply to this SHA.

| Branch ID | Function / location | Condition / effect | Existing named test candidate | Mapping | Missing negative boundary |
| --- | --- | --- | --- | --- | --- |
| GS01 | classify_sync, lib.rs:32 | !has_upstream -> NoUpstream | lib.rs::missing_upstream_blocks_automatic_pull; git_integration.rs::safe_sync_skips_dirty_and_diverged_and_no_upstream | **E** | No upstream must block even if dirty, ahead and operation in progress; priority order N2/N5 |
| GS02 | classify_sync, lib.rs:35 | git_operation_in_progress -> refusal | lib.rs::unfinished_operation_blocks_automatic_pull; git_integration.rs::operation_markers_still_block_safe_pull_after_single_admin_dir_resolution | **E** | Combined dirty/untracked, ahead and diverged priorities, worktree marker N5 |
| GS03 | classify_sync, lib.rs:38 | !worktree_clean -> refusal | lib.rs::modified_or_untracked_files_block_automatic_pull; git_integration.rs::untracked_and_dirty_files_skip_without_stashing | **E** | Submodule + diff.ignoreSubmodules=all and clean/ahead/behind cross product N6 |
| GS04 | classify_sync, lib.rs:41 | ahead>0 && behind>0 -> diverged | lib.rs::local_commits_do_not_get_rebased_or_merged; git_integration.rs::divergent_commits_skip_without_merge | **E** | u64 MAX and precedence with unfinished/dirty N2 |
| GS05 | classify_sync, lib.rs:44 | ahead>0, behind=0 -> LocalAhead | lib.rs::local_commits_do_not_get_rebased_or_merged; git_integration.rs::safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes | **E** | refspec and push remote validation negative matrix N1/N7 |
| GS06 | classify_sync, lib.rs:47 | behind>0, ahead=0 -> fast forward with count | lib.rs::clean_behind_branch_allows_fast_forward; git_integration.rs::fetch_only_changes_remote_refs_and_safe_pull_fast_forwards | **E** | Exact u64 extremes, no implicit network N2/N3 |
| GS07 | classify_sync, lib.rs:52 | zero/zero -> AlreadyCurrent | lib.rs::up_to_date_branch_does_not_pull; git_integration.rs::safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes | **E** | Unchanged branch and no hidden writes at zero state N9 |
| GP01 | safe_pull_with_checkpoints, git.rs:999 | not FastForward -> AlreadyCurrent or Skipped | git_integration.rs::safe_sync_skips_dirty_and_diverged_and_no_upstream | **E** | All non-ff decision variants N1/N5 |
| GP02 | git.rs:1002–1006 | HEAD/upstream object ID command returns invalid/missing SHA | No focused case identified for invalid 40/64 OID in this seam | **P** | Malformed/empty/nonhex OID and failure propagation N1/N6 |
| GP03 | git.rs:1011–1017 | first pull_source_unchanged false -> error | git.rs::moving_upstream_to_equally_distant_commit_aborts_without_changes; repointing_upstream_to_equally_distant_ref_aborts_without_changes | **E** | Pinned ref changed without ahead/behind change N5 |
| GP04 | git.rs:1021–1027 | second check false -> error | git.rs::moving_upstream_after_second_check_aborts_before_merge; switching_active_branch_after_second_check_cannot_advance_wrong_branch; external_commit_after_second_check_is_not_overwritten_or_merged | **E** | TOCTOU after last app check and Git merge atomicity N5 |
| GP05 | git.rs:1029–1034 | merge --ff-only pinned upstream OID; Updated(commits) | git_integration.rs::fetch_only_changes_remote_refs_and_safe_pull_fast_forwards; safe_sync_keeps_offline_fast_forward_for_clean_behind_branch | **E** | Git error, hook, permissions and detached runtime state N3/N12 |
| GSP01 | safe_push_with_checkpoint, git.rs:1102–1108 | not ahead -> AlreadyCurrent or Skipped | git_integration.rs::safe_sync_skips_dirty_and_diverged_and_no_upstream; safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes | **E** | Dirty, divergent, no upstream matrix N5 |
| GSP02 | git.rs:1110–1128 | branch unavailable or unsafe punctuation -> reject | No named integration match confirmed in inspected suite | **P** | Each prohibited character, dash start, .lock, empty and slash hierarchy N1/N7 |
| GSP03 | git.rs:1130–1141 | remote config absent, '.', invalid charset -> reject | No named assertion confirmed | **P** | Whitespace, newline, weird config, valid ascii and remote name N1/N7 |
| GSP04 | git.rs:1142–1151 | upstream merge ref / displayed ref not same-named -> reject | git_integration.rs::safe_push_rejects_split_push_url_or_nonmatching_upstream_branch | **E** | Matching but renamed remote and injected upstream switching N5 |
| GSP05 | git.rs:1154–1164 | fetch/push URL empty/multi/different -> reject | git_integration.rs::safe_push_rejects_split_push_url_or_nonmatching_upstream_branch | **E** | Multiple URLs, push url injection, 0 URLs N1/N7 |
| GSP06 | git.rs:1173–1175 | first local source/routing check changed -> error | No named focused test confirmed for first-check-only race | **P** | HEAD, upstream, dirty and config changes N5 |
| GSP07 | git.rs:1179–1194 | ls-remote missing/malformed/ambiguous/OID changed -> reject | git_integration.rs::safe_push_refuses_to_recreate_deleted_upstream_branch; safe_push_refuses_remotely_advanced_tip_before_a_network_write | **E+P** | Raw parser malformed/multiple/wrong ref/invalid OID not demonstrated N1/N3/N6 |
| GSP08 | git.rs:1197–1203 | after remote probe local source changed -> reject | git.rs::switching_branch_while_remote_tip_is_checked_blocks_safe_push; repointing_upstream_while_remote_tip_is_checked_blocks_safe_push; changing_push_remote_during_remote_probe_blocks_safe_push | **E** | Concurrent permissions/hook effect and config mutation N5 |
| GSP09 | git.rs:1206–1219 | explicit immutable OID refspec, no-follow-tags, no force -> Pushed | git_integration.rs::safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes; safe_push_respects_failing_pre_push_hook_without_bypassing_hooks | **E** | Push timeout means remote outcome UNKNOWN; don't auto-retry N3/N4 |
| GSP10 | git.rs:1222–1229 | safe_sync delegates by decision only, not pull+push | git_integration.rs::safe_sync_keeps_offline_fast_forward_for_clean_behind_branch; safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes | **E** | Reinspect decision races, no hidden fetch N5 |

## Stage 5 applicability (the flow, not yet every function)

| Scope | Positive | N1 input | N2 boundary | N3 I/O | N4 retry | N5 race | N6 corrupt | N7 auth/trust | N8 locale/time | N9 cancel | N10 privacy | N11 purchase | N12 storage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pure classify_sync | E | P | P | N/A: pure | N/A: no retries | P | P | N/A: no auth | N/A: no time | N/A: pure | N/A: pure | N/A: free | N/A: pure |
| safe_pull (Git adapter) | E | P | P | P | N/A: no automatic retry | P | P | P | N/A: no locale | P | P | N/A: free | P |
| safe_push / safe_sync | E | P | P | P | P | P | P | P | N/A: no locale | P | P | N/A: free | P |

**Evidence integrity:** E is only an inspected named test and
a plausible matching assertion. Its coverage of *every* branch
and boundary remains unmeasured. For every P: Stage 9 must
produce a deterministic assertion or document a justified
N/A, after all Stage 3–8 inventories are complete. For N8,
Git-native decisions do not use locale/time; any UI projection
of their results is an independent surface contract.

## Mutation proof targets (Stage 10 seed)

- Remove `git_operation_in_progress` and dirty checks:
  target tests must catch accidental mutation.
- Swap `ahead>0 && behind>0` to OR: divergent/one-way
  decision assertions must fail.
- Remove either pre-merge check, pin only ahead/behind counts
  or replace pinned OID with `@{upstream}`: change-during-sync
  tests must fail.
- Delete `ls-remote` / compare only local tracking ref:
  remote move/deleted ref tests must fail.
- Allow `remote.pushurl != remote.url`, weaken explicit
  refspec, or introduce force: route/config and hook refusal
  tests must fail.

**Source risks to investigate, not confirmed production failures:**
the final OS/Git mutation still has a TOCTOU interval after the
last application check; no pure Rust test establishes absolute
cross-process exclusion. A Git push timeout has unknown remote
outcome, not guaranteed failure/no-op. Keep these explicit in
Mode B integration and physical failure-path review.

**Next:** same evidence mapping for authentication, state cache
and complete release/desktop flows. Do not run tests early or
claim total coverage based on the 22 rows here.
