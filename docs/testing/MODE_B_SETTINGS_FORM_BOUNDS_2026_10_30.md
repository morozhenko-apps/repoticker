# Mode B — Settings draft forms and canonical paths

Baseline: `c87cd2b6043d8e98ae52ca8be95634aaa6596763`. Date: 2026-10-30. Primary mode B: test-only.

## Observed verification

[Preflight #41035864775](https://github.com/morozhenko-apps/repoticker/actions/runs/41035864775)
passed all **523 Node tests**, Rust format, core/native Linux tests and
Clippy. Selected UI-source V8 totals: **60.74% lines, 55.10% branches,
48.46% functions**. `settings.mjs`: **46.01% lines, 51.76%
branches, 38.33% functions**. These are SHA-specific, not whole
repository coverage.

The previous test-only quota recovery batch passed Preflight.
No physical OS acceptance is inferred for this test-only increment.

## Risks and execution contracts

`settings.mjs` edits roots, excluded child names, autostart, and
monitoring as draft state before Apply. Empty and duplicate form
actions must not create synthetic dirty state. Reverting an edit
must disable Apply again. Invalid or overlong child-folder names
must not enter the draft. Canonical Windows verbatim paths must
stay canonical in persisted configuration even when their visible
label is normalized for readability. A native autostart registration
returning a different boolean from requested must **not** close the
dialog or claim success.

## Planned live-controller tests

1. Whitespace-only and duplicate repository roots do not enable Apply
   or call `save_settings`.
2. Add then remove a root restores the original draft with Apply
   disabled and no write.
3. Whitespace, dot-relative, path separators, control characters and
   256-character exclusions are rejected without a write.
4. A duplicate ignored-child name after whitespace trimming is
   idempotent; 255 Unicode-independent ASCII characters remain a
   valid boundary.
5. Existing Windows `\\\\?\\` canonical drive and UNC paths display
   human-readable labels but remain byte-for-byte unchanged in the
   payload of an unrelated root edit.
6. Autostart OS registration may return an authoritative mismatch
   rather than throwing. Reject it, keep the dialog open and report
   the unverified state.

## Implementation and execution discipline

- Record this decision and test plan before modifying test files.
- Extend the existing deterministic Tauri/WebView fixture only as
  needed to inject an initial root list and a mismatched autostart
  response. No production modules, persisted formats, commands or
  permissions need modification.
- Add independent tests to
  `tests/settings-github-confirm.test.mjs` and record an evidence
  checkpoint in a separate docs-only commit.
- Push one non-forced fast-forward to `dev` only when the branch
  head is unchanged; stop while the resulting Preflight runs.
  No status polling, undocumented passing claims, releases or
  temporary branches.
- Stage 12 remains open after this risk-bounded increment.

## Progress

- [x] Preflight baseline and relevant production control handlers inspected.
- [x] Test plan and failure boundaries recorded before implementation.
- [ ] Deterministic form-boundary tests added.
- [ ] Diff reviewed and new exact-SHA CI completed.
