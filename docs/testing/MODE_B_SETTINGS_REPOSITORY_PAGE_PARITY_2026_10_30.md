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
- [x] Four deterministic Settings real-controller fault-injection tests prepared.
- [x] Minimal production validation fix and exact source diff reviewed.
- [x] Prior exact-SHA CI completed: Windows/KDE candidate green;
  Preflight red due to a test-only localized-string expectation.
- [x] Deterministic test assertion fixed in a separate test-only commit.
- [ ] New exact-SHA CI verified (not run).

## Prepared commit and test ledger

- Plan: `691afb882cc4ff71e16ef1c5973d9cf6da9da120`.
- Test-only commit: `4f1d52a0f845f4faa33a7d5c5256d842f6752d30`,
  four new tests in `tests/settings-github-confirm.test.mjs`:
  oversized page, invalid first-page row, malformed second page
  after a full first page, and independent Settings save preserving
  existing native repository selection while the API is corrupt.
- Production fix: `dca76166eb911f126a7a3ef309546a118da3ab9b`.
  `refreshRepoInventory` rejects arrays above 100 and non-string
  `full_name` fields rather than publishing a truncated or
  falsely complete inventory. Invalid *string* names still use
  existing owner/canonical filtering.
- Exact source diff reviewed: only `settings.mjs`, its existing
  test file and this planning/evidence document differ from baseline.
  No new GitHub requests, permissions, persisted fields, user-visible
  controls or native API commands.
- Existing `repoInventoryRevision` race checks, native monitor
  persistence and saved-selection preservation branches remain.
- **No new test execution or coverage measurement**: these Git
  objects are intentionally unreferenced by `dev`, because its
  independent Preflight and platform candidate were in progress
  at the owner-requested check. The last confirmed pass count is
  still 529/529 from the preceding SHA.
- To resume, obtain a fresh owner-requested completion checkpoint,
  verify the committed parent SHA chain against current `dev`,
  then perform one non-forced fast-forward. Stop on new CI.


## Completion checkpoint and preceding red Preflight

The owner-requested checkpoint verified the **previous** `dev`
SHA `2962b760367f93f5429c0cdb0924bde679f23f18`:

- [Windows/KDE acceptance #41062304972](https://github.com/morozhenko-apps/repoticker/actions/runs/41062304972):
  **success**, both candidate jobs completed without publication.
- [Preflight #41062305156](https://github.com/morozhenko-apps/repoticker/actions/runs/41062305156):
  **failure**, 532 of 533 JS tests passed; Rust format/core,
  native Linux and Clippy succeeded. Its single failure was
  `late first config read cannot overwrite the newer reopened Settings form`.
  The test changed the saved language to `ru` but asserted the English
  literal `Not connected`, while the actual value was the correct
  Russian localized string. This was a wrong test oracle, not
  evidence of a broken Settings refresh lifecycle.

**Test correction** `5e70c098d56188b4f85cda5114191596f1179717`:
use `settingsText(ui.language, "Not connected")` for the
localized status expectation, retaining explicit `ui.language === "ru"`
and all remaining assertions. No product code changed as part of the
test correction.

**Verification boundary:** the prepared inventory tests and this
test correction were reviewed statically but have not yet been
executed together. Their eventual `dev` HEAD must pass one
Preflight; do not infer a pass or coverage improvement ahead of CI.
This checkpoint also confirms the prior platform acceptance completed,
so one non-forced fast-forward is now permitted.
