# Mode B: native Git Safe Pull / Safe Push / Safe Sync exhaustive decision inventory

Source baseline a3ba7fa30fc4c81890d3075f94142942d001cbf3; crates/repoticker-core/src/git.rs (blob 5b92830d50e9a3d9a97487e3b78454bf3e64de55), functions around 934-1245. Related integration source crates/repoticker-core/tests/git_integration.rs (blob 0a9011b99f2340c356144d64346402b633f9d7d0). This document records source-inspected assertions only: not a fresh test run, mutation result or production edit.

## Invariants and scope

A user-selected enrolled checkout must never be silently reset, rebased, stashed, force-pushed, replaced, or switched; a failed/uncertain operation must preserve user data. Safe Pull uses only locally fetched upstream tips and pinned commit IDs, with branch and upstream rechecks before Git merge. Safe Push requires a strictly local-ahead and clean checkout, selected same-named branch and one matching fetch/push URL, a matching remote ref observed with ls-remote and a non-force explicit commit-to-ref push; it must honor hooks and never transmit arbitrary refs/tags. Safe Sync dispatches exactly one direction. This is not a promise that remote refs cannot advance in an external concurrent writer between the last check and push; Git ordinary non-force semantics remain decisive.

## Exact existing test evidence (Rust production behavior, not regex)

| Executable test family | Observable tested outcomes | Level |
| --- | --- | --- |
| moving_upstream_to_equally_distant_commit_aborts_without_changes; repointing_upstream_to_equally_distant_ref_aborts_without_changes | First pinned-ref validation refuses changed tracking commit or upstream selection even when numerical ahead/behind distances match; test checks failure and unchanged fixture | Native Rust inline |
| moving_upstream_after_second_check_aborts_before_merge; switching_active_branch_after_second_check_cannot_advance_wrong_branch; external_commit_after_second_check_is_not_overwritten_or_merged; remapping_selected_upstream_after_second_check_aborts | Final controllable checkpoint refuses moved upstream, changed active branch, new external local commit, changed upstream selection; branch/ref and file integrity asserted for several scenarios | Native Rust inline |
| switching_branch_while_remote_tip_is_checked_blocks_safe_push; repointing_upstream_while_remote_tip_is_checked_blocks_safe_push; changing_push_remote_during_remote_probe_blocks_safe_push | Post-remote-probe branch switch, tracking-ref change and remote URL change fail closed; remote head unchanged, alternate remote not written | Native Rust inline |
| safe_sync_pushes_strictly_ahead_clean_branch_without_force_or_worktree_changes; safe_sync_keeps_offline_fast_forward_for_clean_behind_branch | Real temporary Git repositories: local-ahead reaches configured bare remote, local HEAD preserved; behind uses fetched refs to fast-forward without implicit fetch; second sync reports AlreadyCurrent | Real Rust git_integration |
| safe_sync_fails_closed_when_remote_advanced_beyond_stale_tracking_ref; safe_push_refuses_remotely_advanced_tip_before_a_network_write | Live remote head advanced or diverged after local fetch; safe push refuses and both local and remote heads remain unchanged | Real Rust git_integration |
| safe_sync_skips_dirty_and_diverged_and_no_upstream | Dirty/untracked, no upstream and diverged return exact Skipped categories, not an implicit mutation | Real Rust git_integration |
| safe_push_rejects_split_push_url_or_nonmatching_upstream_branch; safe_push_refuses_to_recreate_deleted_upstream_branch | Split fetch/push URLs and nonmatching merge ref are rejected; deleted live upstream is not recreated by push | Real Rust git_integration |
| safe_push_respects_failing_pre_push_hook_without_bypassing_hooks; custom_hookspath_pre_push_failure_blocks_safe_sync_without_mutation | Default and alternate hooksPath pre-push hooks can block outbound mutation; marker confirms custom hook actually executes | Real Rust git_integration |
| safe_sync_uses_configured_origin_when_second_remote_is_present; safe_push_uses_explicit_upstream_despite_custom_default_push_settings | Configured origin chosen even with second remote, pushDefault, pushRemote, matching/followTags, and default remote refspecs; explicit upstream alone advanced, mirror and stray tag/ref untouched | Real Rust git_integration |
| mirror_mode_cannot_turn_safe_sync_into_an_all_refs_push | remote.origin.mirror=true refuses mutation rather than pushing multiple refs | Real Rust git_integration |

These tests have meaningful actual before/after Git state assertions. No new native suite executed during this mapping.

## Method-by-method branch map and remaining proof

| Production function | Executable independent outcomes/guards | Evidence and remaining |
| --- | --- | --- |
| fetch | verified_checkout false -> error, true -> git fetch --all --prune --quiet, subprocess error, success -> Fetched; fetch never touches active worktree | E partial via real integration fetch; invalid/replaced checkout and command failure need isolated assertions |
| fetch_with_cancel | pre-check cancellation, verified checkout, post-check cancellation, owned spawned command success/error/timeout/cancel, Git exit/startup failure | Existing Git cancellation tests and JS fake-source tests in separate register; detailed owned-process mapping follows in its own document |
| commit_oid | git rev-parse failure, 40/64 ASCII hex accepted, other lengths/non-hex rejected | Pinning used in real safe operations; exact 39/41/63/65 and malformed rev-parse output may need a fixture/adapter |
| pull_source_unchanged | current branch/upstream/decision, not dirty, local HEAD OID and upstream OID each independently unchanged | E several branch/commit/upstream mutations; ? mutation-killing independent dirty flag and same-count alternate HEAD + both OIDs changing |
| safe_pull_with_checkpoints | inspect returns FastForward, UpToDate or other Skipped; pinned HEAD/upstream; first and second recheck each false -> error, true -> ff-only merge of immutable commit; failed merge -> error, successful Updated(commits) | E positive, skip and first/final checkpoint races; ? ff-only Git merge command failure, shallow/unborn checkout, large commits count, checkout disappears after final checkpoint |
| safe_push_source_unchanged | decision still LocalAhead, same branch and upstream names, HEAD OID, upstream OID, branch remote/merge config, exact fetch/push URL all agree | E branch/ODI/remote URL after probe tests; ? independently mutate remote name, merge ref, push URL, HEAD with same ahead count, tracking tip, and each config command failure |
| parse_single_remote_branch | no lines, >1 line, no tab, wrong ref, OID length not 40/64 or non-hex, exact ref+OID valid | E exact 40/64, missing, duplicate, wrong ref, nonhex, short and malformed separators per verified-assertions-git-cancel-picker.md; ? 41/63/65-byte, empty raw trailing whitespace / CR / embedded tab boundaries |
| safe_push | delegates safe_push_with_checkpoint, no external callback | E through git integration and inline tests |
| safe_push_with_checkpoint: decision/branch | LocalAhead vs UpToDate vs other, branch required, reject unsafe Git ref chars and flag-like names | E ahead/current/skipped; ? each compound invalid branch check separately, no branch with LocalAhead (likely unreachable), nested safe slash ref |
| safe_push_with_checkpoint: routing | valid branch remote name; merge_ref exactly refs/heads/branch; configured upstream equals remote/branch; exactly one equal fetch and push URL, no newline | E split URLs and nonmatching ref, explicit origin settings; ? empty/invalid remote, multiple fetch URL lines, separate upstream mismatch, failing config invocation |
| safe_push_with_checkpoint: pinned local and live remote | local source unchanged before probe, ls-remote --exit-code returns one exact live ref; tip must equal tracking OID; local source unchanged after external probe | E missing remote/advanced remote, and post-probe branch/upstream/URL races; ? local change before first local snapshot vs after, distinct remote read failure and malformed ls-remote output |
| safe_push_with_checkpoint: final mutation | explicit immutable head:refs/heads/branch; push --porcelain --no-follow-tags without force; remote rejected/nonzero propagates error; Pushed(ahead) only on success | E real bare repo, hooks denial and no stray refs/tags; ? prepush hook after remote probe changes local branch, remote advanced between ls-remote and push, semantic count if tracking update under custom config |
| safe_sync | one inspect decision: FastForward delegates safe_pull, LocalAhead delegates safe_push, UpToDate returns current, other returns Skipped | E all meaningful decisions via native integration; ? if external checkout changes between first inspect and delegated inspect, method must preserve fail-closed behavior |
| safe_pull | delegates safe_pull_with_checkpoints with two no-op hooks | E through native integration and inline fixture |

Additional note: the source calls real Git via required(...); boundary tests must assert local and remote HEAD/OIDs, refs and worktree before/after, not just error string. Fixture Git hooks must remain active; no --no-verify bypass is permitted.

## N1-N12 and interaction requirements

| Category | Status | Open cases |
| --- | --- | --- |
| Positive | E partial | real ahead/behind/current, local worktree integrity; exact merge failure branch |
| N1 | E partial | malformed ref/branch and remote identity; separate every compound guard and Unicode malformed |
| N2 | E partial | 40/64 OIDs, long numeric counts; neighboring OID and branch length boundaries |
| N3 | E partial / ? | remote ls-remote missing/advanced, actual offline/DNS/permission and push failure |
| N4 | E partial / ? | repeat Safe Sync current; repeated push/pull/duplicate admission at Tauri layer is A2 |
| N5 | E partial / ? | checkpoints change branch, ref, remote; remaining pre/post-hook and inter-process races |
| N6 | E partial / ? | upstream/remotes reconfigured; malformed Git output and detached state |
| N7 | E partial | branch name/routing, no implicit force/tags/mirror; individual guard proof needed |
| N8 | NA | no time or locale semantics in native Git sync, Git timestamp irrelevant to branch guards |
| N9 | E partial / OS | native cancellation and Quit with active Git subprocess; main.rs admission separate |
| N10 | E partial / ? | error formatting should never reveal auth secret or private path; external Git stderr redaction requires inspection |
| N11 | NA | no subscription/entitlement |
| N12 | E partial / ? | filesystem dirty/untracked/locked and hooks denial, read-only filesystem and fetch partial refs await injected integration |

## Stage 9 planned cases after complete 80-file Stage 3–8 signoff

- GS1 / G1: mutate each independent safe_push_source_unchanged condition under a real temporary Git fixture; verify no mutation to either checkout or remote on every failure.
- GS2 / G1: nested branch valid, invalid branch variants, exact remote/merge/fetch/push routing combinations, ls-remote 0/1/multiple branches and 40/64 OID boundaries. Use real command output except required external IO fakes.
- GS3 / G2: first/final Safe Pull guard failure with same ahead/behind counts and modified branch/upstream/local HEAD, plus blocked ff-only merge and post-merge local content.
- GS4 / G1/G2: hook-managed source movement, remote changed between latest probe and ordinary push, network/transport failure; non-force unchanged remote and tracking refs must be asserted.
- GS5 / A2: Tauri main Git command dispatch with queued duplicate Safe Sync and Fetch vs cancellation/Quit, real domain and controlled external subprocess; never silently execute two conflicting writes.

Mutations to kill: drop first/final recheck; replace pinned OID with moving @{upstream}; remove clean/LocalAhead guard; remove remote URL equality; allow split pushURL; push default branch without explicit refspec; add --force/tags; skip remote tip comparison; swallow child errors. A candidate mutation which cannot occur under Git's own parser is marked defensive rather than falsely proven.

## Rollback and Stage status

No functional Git behavior, tests, CI or branch refs are modified here. This source-level map is **partial** until every independent predicate is linked to a precise executable assertion or a non-duplicate Stage 9 test. The overall Mode B Stage 3–8 gate is not complete.
