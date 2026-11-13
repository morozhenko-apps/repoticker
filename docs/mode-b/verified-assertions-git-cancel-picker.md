# Mode B inspected Git cancellation, ref parsing, auth generations and picker

Baseline source: `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. No test suite execution in this review; all credited assertions exist in previously passed source-exact test suites.

| Case | Existing direct-execution assertions | Still planned |
| --- | --- | --- |
| G3 | Rust `FetchCancellation` tests check two registered PIDs 41/42, injected kill failure on 41, successful 42 recorded, retry signals only 41; unregister leaves no running/targeted children. `spawn_registration_cleanup_never_hides_unknown_outcomes` asserts failed reap contains 'outcome unknown'; before-launch and spawn/register cancellation assert no child leak and exact CANCELLED. | A real child process that exits between attempted termination and wait/reap with a compound error needs independent check. |
| G4 | `parse_single_remote_branch` tests assert exact 40-hex and 64-hex OID/ref accepted; reject absent, space vs tab, wrong ref, repeated line, nonhex and 39-hex. Tests call the real Rust parser. | Check 41/63/65 length and trailing whitespace/newline as independent mutation-sensitive boundaries. |
| O1 | `GitHubAuthManager` invalidates previous auth generation and concurrent thread's old `active(first)` resolves false after second generation. `github_auth.rs` terminal phase tests deny late Authorized after cancel/expire. | Still need native Keyring storage side-effects to prove outdated completion cannot persist a token; genuine OS wallet failure is separate. |
| S4 | Settings real controller test fixtures assert ArrowUp/Down/Home/End option focus, Escape hides and restores trigger, Tab leaves browser focus untouched, click outside closes with no focus theft, selecting language remains draft and Cancel produces zero `save_settings`. | Still need full RTL/20-language keyboard interactions and physical host accessibility. |

Source groups inspected: `crates/repoticker-core/src/git.rs` test modules, `apps/desktop/src-tauri/src/github_session.rs` native generation tests, and `tests/settings-github-confirm.test.mjs` keyboard controller fixture.

The source test fixtures are deterministic (mpsc events and generated temporary Git repos for native process cases), not arbitrary sleeps. These are partial case credits; no full Stage 4–8 or Stage 12 success is implied.