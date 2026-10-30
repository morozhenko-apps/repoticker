# Mode B — Settings repository-page completeness and native projection parity

Baseline SHA: `2962b760367f93f5429c0cdb0924bde679f23f18`. Date: 2026-10-30.

## Source-based finding (not new CI evidence)

Native `github_api.rs::project` rejects GitHub response pages exceeding
100 rows, and projects repository rows with optional `full_name`.
`settings.mjs::refreshRepoInventory` currently validates the
`repositories` array type but not its size; it silently ignores
missing/non-string `full_name` values. A malformed page can thus
be counted as a trusted complete inventory even though a saved
selection must remain available when GitHub responses are corrupt.

The existing behavior intentionally filters foreign-owner or
non-canonical *string* repository names. This plan does not alter
that filtering policy. It guards only structural page validity
and ensures corrupt pages fail closed, consistent with the native
bounded transport.

## Required test contracts

1. A page of 101 valid entries is rejected as an invalid inventory;
   the UI does not render a supposedly complete selection and
   the prior saved set is unchanged. Do not fetch a second page.
2. A structurally malformed `full_name` (missing/null or non-string)
   fails the *whole page*, rather than publishing the otherwise valid
   partial list. Saved selection must remain untouched on Cancel.
3. Page one has 100 valid entries, page two contains a malformed
   row: reject the entire in-progress fetch, not just page two.
   Do not present page one as a complete inventory.
4. A saved valid subset with a structurally corrupt inventory
   must not be rewritten when saving an unrelated Settings
   notification preference; the native monitor scope stays the same.

Extend the real controller's existing deterministic WebView/IPC
fixture in `tests/settings-github-confirm.test.mjs`. Keep source
change narrow to `refreshRepoInventory`, with no new commands,
credentials, persistence formats, UI elements or network requests.

## Execution boundary

[Preflight #41058934277](https://github.com/morozhenko-apps/repoticker/actions/runs/41058934277)
at preceding SHA `56d9cff464fc68c29ad76695a3ab3f5454617b7b`
passed 529/529 Node tests and the Rust/Clippy/Linux gates.
Preflight
[#41062305156](https://github.com/morozhenko-apps/repoticker/actions/runs/41062305156)
and unpublished Windows/KDE
[#41062304972](https://github.com/morozhenko-apps/repoticker/actions/runs/41062304972)
at current baseline were **still in progress** on the single status
check. The new test/code work is not to be pushed until both
are independently confirmed completed.

Create separate documentation, test and code commits as
**unreferenced Git objects**, without moving `dev`. Review the
commit chain and preserve it for the next owner checkpoint.
No extra CI polling; no claims of passing tests until exact-SHA
verification. Stage 12 remains open.

## Progress

- [x] Native projection and Settings inventory boundaries inspected.
- [x] Acceptance requirements planned before edits.
- [ ] New fault-injection tests prepared.
- [ ] Production check and source review.
- [ ] Prior active CI completed; push permitted.
- [ ] New exact-SHA CI verified.
