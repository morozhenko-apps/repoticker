# Mode B — Settings repository identity and saved-subset trust boundary

Baseline: `a48203b04ce54b820cb10881885df2c0654f5e85`, Preflight
[#40971393236](https://github.com/morozhenko-apps/repoticker/actions/runs/40971393236)
**passed**: 505/505 Node tests, native Linux, Rust core, formatting and Clippy.
At this exact SHA, V8 reports `settings.mjs` **47.16% lines,
50.00% branches, 39.66% functions**; the measured aggregate selected
UI modules report **60.95% lines, 56.34% branches, 48.22% functions**.

## Contract discrepancy

`github_api.rs::valid_name` accepts ASCII alphanumeric, `.`,
`_`, `-` within **1–100 bytes**, except the path components
`.` and `..`. Native `validate_monitor_repositories` applies
this to each selected repository name and rejects out-of-scope owners.

`settings.mjs::refreshRepoInventory` currently uses
`REPO_NAME = /^[a-zA-Z0-9_.-]+$/`: unlike native, it accepts
component names over 100 characters and `.` / `..`.
This allows impossible-to-save items to appear in the Settings
checkbox list. The UI is an additional boundary; it must never
propose paths the native validator rejects, even if a future API
projection changes.

## Risk and tests

1. **N1/N2/N7 — exact identity limits**: with one installation
   owner, inject repository list rows containing the 100-byte valid
   boundary, 101-byte invalid boundary, `.`, `..`, foreign-owner,
   nested path and invalid-character names. The controller must
   only render canonical same-owner selectable rows.
2. **N6/N12 — offline persisted configuration**: denial of the
   repository inventory must not drop an unchanged saved selection
   when the user saves an unrelated preference. The controller must
   not call `github_set_monitor_org` as a side effect.
3. **N1/N2 — selected-set cap**: 100 explicit selected repositories
   may be saved; selecting a 101st disables Apply, and deselecting
   it restores eligibility without altering persisted configuration.

## Implementation order

- Documentation plan **before** code edits.
- Add deterministic real-controller tests in
  `tests/settings-github-confirm.test.mjs` with existing IPC fixture.
- Align the Settings repository-name validator with native
  `valid_name` while leaving provider API transport, persistence,
  release packaging, notifications and public interfaces unchanged.
- Commit tests+code separately from docs; record an evidence
  checkpoint separately, then one fast-forward `dev` push.
- Run final automated Preflight after push; **stop without polling**.
  Do not label new test cases as passed or claim new coverage before
  the exact-SHA CI result.

Mode B Stage 12 remains open. Changes to `main`, release tags,
branch protections, credentials or unrelated repositories are excluded.

## Evidence checkpoint

- [x] Native and Settings identity validators compared at baseline.
- [x] Exact-SHA Preflight test and V8 evidence recorded.
- [ ] Identity and offline/cap tests implemented.
- [ ] Native parity fix implemented and source diff reviewed.
- [ ] New exact-SHA automated acceptance verified.
