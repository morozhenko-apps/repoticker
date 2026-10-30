# Mode B — GitHub account and repository identity casing in Settings

Date: 2026-10-30. Baseline SHA `3db61d0d2ec362a4d8834c1710562db5275fd9ea`.

## Evidence and ownership

[Preflight #41108352563](https://github.com/morozhenko-apps/repoticker/actions/runs/41108352563) passed **544/544** JS tests, Rust, Clippy and Linux desktop. [Unpublished Windows/KDE acceptance #41108352684](https://github.com/morozhenko-apps/repoticker/actions/runs/41108352684) succeeded for the previous auth-boundary batch at `d77fdd5a6d5f0a5caf5475998456f60667e130b3`.

Another agent added two CI-only commits to `dev`; the latest `3db61d0` passed [Preflight #41136292315](https://github.com/morozhenko-apps/repoticker/actions/runs/41136292315). This batch starts on that head, preserves those CI-policy changes, and does not modify workflows.

## Source-derived root cause

The native installation collector deduplicates GitHub identities by lowercase account login, but `settings.mjs::refreshMonitorScopes` selects a saved login via exact `accounts.includes`, and `refreshRepoInventory` looks it up via exact Map key. A saved `one` and GitHub-returned `One` therefore refer to the same account yet present a blank dropdown and no repository list. The same discrepancy affects selected `one/core` versus inventory row `One/core`: exact Set membership shows an unchecked box, and an otherwise-valid selected draft can be incorrectly rejected when edited. The account change handler can also interpret a case-only identity change as switching to a different account and erase the saved repo subset.

## Contract and test scenarios

1. Saved organization `one`, GitHub installation `One`: preserve the selected account, show a valid dropdown option and fetch its repository inventory without changing stored Settings.
2. Saved subset `one/core`, GitHub row `One/core`: show it checked; no phantom missing selections, no initial Apply or writes.
3. A redundant account `change` event selecting the same account with different case must keep the saved subset and remain clean; changing to another account must retain existing reset semantics.
4. Unchecking the visibly selected case-variant removes the stored logical repository, not an unrelated empty placeholder; choosing a new repo can be saved without duplicated case variants.
5. Adding a second GitHub repo while the first saved name differs only in owner case allows a valid two-repository selection. Never invent a new repository or perform an extra provider request.

Implementation: use a single ASCII-insensitive key for comparisons only, retain provider casing for display, and preserve the original persisted casing unless the user explicitly edits the subset. Do not rewrite GitHub credentials, stored config, native allowlist, REST projection or another agent's CI work.

Test the real Settings controller with a deterministic native-IPC fixture. Separate plan, tests, fix and evidence commits; one non-forced fast-forward on unchanged `dev`. The new exact-SHA CI remains unverified until a later owner checkpoint. Mode B Stage 12 remains open.

## Prepared implementation and evidence limit

- Plan commit `154a8d1406acdb971f58ff62e6c6bb46fd052375`
  records the native/Settings casing discrepancy and a regression
  contract before changes.
- Test commit `de2aaa4337493be1a4f8bdff22a70fd4633cdf7c`
  adds five real WebView-controller tests to
  `tests/settings-github-confirm.test.mjs`, reusing existing
  native-IPC options rather than introducing a new fixture.
- Source commit `ce4679e6c412018e0ec88bdfeee730a83ecf74c4`
  adds a case-insensitive equality predicate for already-validated
  GitHub identities and applies it in Settings scope resolution,
  selected repository rendering, validity/status checks, checkbox
  removal, and redundant account-change detection.
- A saved repository's *original spelling* remains unchanged
  until the user explicitly edits it; in particular, an unrelated
  preference Apply does not rewrite the repository selection.
  Switching to an actually different account still resets its
  old subset.
- Exact diff inspection shows only `apps/desktop/ui/settings.mjs`,
  `tests/settings-github-confirm.test.mjs` and this document.
  No `.github/` workflow, credentials, native APIs or other
  agents' CI-policy work changed.

**Verification boundary:** The preceding 544/544 Node result is
for `d77fdd5a`, not this new commit. This casefold batch has
**not been executed locally or verified by CI**; no new count,
coverage or platform result is claimed. After a safe single
fast-forward to `dev`, stop until the next owner-requested
exact-SHA CI checkpoint.
