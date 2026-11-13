# Mode B: Git enrollment, shallow discovery, status inspection and GitHub origin safety

Production baseline a3ba7fa30fc4c81890d3075f94142942d001cbf3. Source crates/repoticker-core/src/git.rs (blob 5b92830d50e9a3d9a97487e3b78454bf3e64de55), methods around lines 562-931, plus crates/repoticker-core/tests/git_integration.rs (blob 0a9011b99f2340c356144d64346402b633f9d7d0) and tests/github_remote.rs (blob 1611c2ce00eaed1e6547ead0c9c4bce3dbeb5d77). Prepared parent 9ae382ad367b16b7b35ecaea643ffe6ca9660b03.
Stage 3–8 documentation and assertion audit only; real Git fixture tests were **inspected** but **not executed** here.

## Security and behavioral invariants

Discovery stays inside explicitly enrolled canonical roots and their immediate child directories; no implicit recursive traversal, symlink following, or linked-worktree enrollment. User-configured ignored child folders restrict implicit discovery only, not independently explicitly enrolled roots. Selected checkout must be in the current discovered allowlist, not just a valid arbitrary Git checkout. Local inspect never fetches network state and displays untrusted/missing Git facts as explicit error or conservative decision. Only strictly normalized github.com remotes become browser targets.

## Real existing native integration assertions

| Existing test | Direct executable evidence |
| --- | --- |
| discovery_is_shallow_ignores_snapshots_and_invalid_worktrees | Temporary root with hidden nested snapshot and broken dotgit file yields only the expected immediate healthy repositories. |
| explicitly_enrolled_root_can_be_the_repository_itself; missing_root_and_relative_path_rejected | A checkout root can itself be explicitly enrolled, nonexistent root and relative path rejected. |
| enrolled_checkout_resolution_accepts_only_canonical_discovered_repositories; linked_worktree_requires_explicit_root_enrollment | Known direct child accepted; unrelated checkout, relative and nonexistent target rejected. Linked worktree dotgit file cannot enter through implicit discovery, but is accepted when explicitly enrolled as root. |
| bounded_inspect_preserves_input_order_and_per_repository_errors | Three requested paths preserve input ordering despite one unavailable checkout; one clean and one dirty result remain independently correct; zero input returns empty result. |
| operation_markers_still_block_safe_pull_after_single_admin_dir_resolution | rebase-merge marker changes inspect decision to GitOperationInProgress and blocks Safe Pull; deleting marker recovers FastForward. |
| all_git_operation_markers_resolve_under_absolute_git_dir_in_linked_worktree | For standard and linked checkouts, each of six marker paths agrees with Git --git-path; a real linked-worktree admin directory is consulted. **Does not assert each marker individually blocks a mutation.** |
| custom_ignored_child_folders_affect_only_implicit_shallow_discovery | One excluded implicit child disappears, same checkout survives independent explicit enrollment; resolver cannot bypass the ignore through parent root; legacy APIs remain unfiltered. |
| ignore_names_are_exact_validated_bounded_and_unicode_capable | Trim, sort/dedup, Unicode, empty/dot/traversal/controls/byte limit/101-name rejection, and empty list. |
| built_in_exclusions_remain_enforced_without_custom_configuration | Built-in target child skipped even when valid Git clone; explicitly enrolling target as root is still allowed. |
| fetch_only_changes_remote_refs_and_safe_pull_fast_forwards; untracked_and_dirty_files_skip_without_stashing; divergent_commits_skip_without_merge; branch_with_no_upstream_skips | Actual local Git status/decision from remote-tracking refs; fetch leaves HEAD, dirt and divergence block mutation, missing upstream produces Skip. |
| github_remote.rs canonicalizes_supported_https_scp_and_ssh_github_remotes; rejects_untrusted_hosts_credentials_extra_paths_and_url_tricks; resolves_real_local_git_origin_without_network_or_worktree_changes | Real source function invoked with valid/invalid GitHub URL variants and actual local configured origin. Specific per-input assertions still require precise test-body cross-check before marking each predicate E. |

These tests validate real Rust core functions and temporary Git commands. Source-contract JS regex tests remain separate evidence and are not substituted for actual behavior.

## Exact methods and branch/outcome inventory

| Function | Independent control-flow cases | E/remaining obligations |
| --- | --- | --- |
| required / optional (Git command layer) | process error; nonzero command becomes GitError or None respectively; success trims UTF-8-lossy stdout; malformed output | E through real Git integration indirectly; ? non-UTF8 stdout, >500 stderr, command output and timeout failure injection |
| looks_like_checkout | dotgit directory accepted; dotgit file only if allow_worktree true; absent false | E standard and explicitly enrolled linked; ? corrupted dotgit directory and unrelated plain file branch |
| verified_checkout | rev-parse toplevel missing/empty false, canonicalization errors, canonical top equals requested path vs subdirectory mismatch | E missing and real checkouts; ? git command fails, unresolved symlink/TOCTOU and nested subdirectory |
| ignored_child | hidden first character, .worktrees suffix, built-in names, ordinary child, non-UTF8 filename fallback | E target and snapshot/hidden; ? every built-in name, suffix, Unicode names, non-UTF8 |
| validate_ignored_child_names | >100 input entries rejects BEFORE dedup; trim strings, reject empty/dot/double dot/>255 UTF-8 bytes/slash/backslash/control, then dedup/sort | E many real boundaries incl Unicode 256 bytes and 101 entries; ? 99/100 unique, 255/256 exact, duplicates that exceed 100 raw count, embedded tab/control, composed Unicode normalization expectations |
| discover_with_ignored | root canonicalize error/non-dir; explicit checkout with dotgit file/directory => verified yes/no; else shallow read_dir, file_type errors, directory/symlink/built-in/custom exclusions, only dotgit directory, verify success or broken child skip, Windows Git loader error propagated | E multiple real roots/linked/filtering; ? symlink to enrolled root, read_dir permission and error, startup failure, broken dotgit directory and nonUTF8 names |
| discover | delegates discover_with_ignored without configured exclusions | E explicit, children and built-in behavior |
| discover_all_with_ignored | 0/1/multi roots; combine BTreeSet canonical paths; report per-root errors while keeping good paths; dedup duplicate roots | E mixed root/all_with_ignore fixture; ? duplicate and corrupt roots interleaved and exact deterministic error ordering |
| discover_all | delegates ignored-empty compatibility entrypoint | E via tests for legacy behavior |
| resolve_enrolled_checkout_with_ignored | normalize invalid/valid selection, discover roots then binary_search canonical path yes/no; ignores per-root discovery errors rather than authorizing an unknown target | E allowed/denied linked and ignored; ? symlink alias, path equality vs TOCTOU when replaced after selection |
| resolve_enrolled_checkout | ignored-empty wrapper | E direct fixture |
| normalize_root | trim, empty reject; ~, ~/ and backslash-home expansion; HOME fallback USERPROFILE; absolute check; canonicalize or non-directory reject | E relative/missing; ? tilde variants, absent HOME, symlink aliases, file-as-root, Unicode/control path cases |
| inspect_all | bounded_map with max concurrency 4, index sorting for original order, per-repo result isolation, empty input | E 3-state and empty; ? 4/5+ in-flight and one hung command with independent progress, no cross-error |
| inspect | verified_checkout and read optional branch, porcelain dirty including submodules/untracked, upstream optional; rev-list two u64 counts and exactly two tokens, parse errors, no-upstream -> zero counts | E clean/dirty/diverged/behind/ahead/no-upstream, linked and missing; ? detached HEAD, unexpected rev-list output, saturated/overflow count, malformed UTF-8 and ignored submodule changes |
| inspect | classify_sync prioritizes no-upstream/in-progress/local changes/diverged/ahead/behind/current; origin optional and invalid origin only affects github_repo, not Git state; fallback repo name | E decision suite in core/lib.rs plus Git integration, E partial GitHub remote; ? combined state precedence on native Git, optional origin command failure, path with invalid name |
| git_operation_in_progress | rev-parse absolute admin dir success/failure, absolute-path requirement; any of six markers present vs none | E rebase-merge blocks, all six paths correct linked; ? each other marker blocking, malformed/relative admin dir and filesystem read errors |
| github_remote_to_browser_url | valid exact HTTPS, scp and ssh github.com prefixes only; trim input; owner/repo exactly two segments; optional .git suffix; reject empty/dot/double dot/non-ASCII or unsafe characters | Real github_remote.rs tests candidate; ? independent length/traversal/suffix/multi-segment/username/port/query/fragment cases in test body |
| github_origin_url | checkout still verified, required configured origin read succeeds/fails, parser accepted/rejected; no network or worktree mutation | Real local origin integration E partial; ? removed checkout, missing remote and malicious changed remote between enrollment and action |

## Positive + N1–N12 matrix

| Category | Evidence | Open |
| --- | --- | --- |
| Positive | E partial | Explicit roots, direct children, linked and Git decisions; rejected optional malformed paths |
| N1 | E partial | Bad ignore names and remote URL; 100/101 and Unicode exact input variants |
| N2 | E partial | >100 ignore names and length, bounded inspect; 4/5 concurrency, 255/256 byte threshold |
| N3 | E partial / ? | Local git subprocess failure, optional remote fail; discovery via denied filesystem and command timeout |
| N4 | E partial / ? | Duplicate root idempotency and repeated discovery under changed paths |
| N5 | E partial / ? | Parallel inspect stable order, symlink/race replacement after discovery, external checkout switch |
| N6 | E partial / ? | Broken .git, missing root and unexpected ahead/behind format; old config/ignored names |
| N7 | E partial | Enrollment allowlist, symlink exclusion and strict browser origin; independent URL predicate evidence pending |
| N8 | NA | Local Git inspection logic has no time/date or locale-dependent decision (Unicode filename is N1) |
| N9 | ? / OS | Removed checkout while window refresh, reselect and Quit; native command admission separate |
| N10 | E partial / ? | Only canonical GitHub origin projected; local paths and Git error strings appear only in authorized UI but logging/external handoff need review |
| N11 | NA | No entitlement |
| N12 | E partial / ? | Missing/corrupt root, no disk writes by inspect; read-only and permission-denied directory, Git lock markers |

## Stage 9 planned cases, after global inventory completion

- GD1: table-driven validate_ignored_child_names exact UTF-8 0/1/255/256, raw 100/101 (including duplicates), all path/controls and Unicode, sorting/trim preservation. Every guard mutation must be killed.
- GD2: real temporary directory fixture for implicit/explicit linked worktrees, symlinks, corrupted dotgit directories, ignored names, duplicate roots and missing/denied roots. Assert exact canonical identities, sorted outputs and error isolation.
- GD3: inspect with detached HEAD, untracked/modified/submodule dirty, absent/upstream moved, six operation markers and malformed output, preserving truthful unknown on read errors. Do not mock classify_sync or core inspect.
- GD4: inspect_all concurrency 0/1/4/5 repos with a controlled external Git command adapter, no order race, no unrelated mutation.
- GD5: browser origin across exact HTTPS/scp/ssh, query/fragment, credentials, username, port, path traversal and optional .git, using actual Git source functions and native opener integration.
- GD6: enrollment recheck after source checkout has been removed, replaced by symlink or re-pointed externally; no arbitrary repository action beyond currently enrolled roots.

Mutations: recurse beyond immediate children, accept symlink child, treat linked .git file as implicit child, skip verified_checkout canonical identity, expand ignored children to explicitly selected root, ignore Git operation markers, incorrectly classify unknown upstream as current, accept arbitrary origin or expose file URL. Each requires an actual failing assertion, not a source string check.

This is the third detailed map for the core git.rs source; together with Git safe-operation and owned-process maps it covers its main callable behavior but **does not imply every branch is executable/tested**. Overall Mode B Stage 3–8 remains PARTIAL, no Stage 9 code or CI execution.
