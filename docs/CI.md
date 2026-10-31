# RepoTicker verification

Source checks, packaging, native machine acceptance and publishing are distinct.

Normal development verifies JavaScript contracts, Rust source and Git state tests without treating one successful fixture as evidence for all real repositories. Perform focused checks during implementation and a complete stable gate when the change is ready; expensive/race-sensitive suites are run at their documented final gate rather than after every small edit.

**External CI rule:** Once a GitHub Actions run has been triggered, do not poll or repeatedly fetch its status. Provide the workflow URL and the exact work that remains unverified, then stop. Resume only when the owner supplies the result or another supported completion event occurs.

Source-only documentation edits must not deliberately start CI. Keep documentation commits separate from executable changes.

A package artifact does not establish real Linux or Windows acceptance. Installer upgrades, autostart, tray focus, credential persistence and removal behavior require separate native verification. Publishing a release requires approval and verified immutable package checksums.

## Manual strict stable gate

The manual `.github/workflows/strict.yml` runs Rust formatting, locked
core tests and Clippy, Node unit tests, and Python release contracts
once per explicit dispatch. Repeated 10x runs are not a release gate:
repeatability diagnostics require evidence of a specific instability.
Preflight separately checks Linux desktop compilation. Known-flaky
tests, if identified and registered, require independent execution
and explicit reporting, never omission from the stable result.

## Bounded ordinary verification

Keep the independent core, UI/contracts and Linux desktop lanes; execute every
applicable stable suite once. Resolve prose-only PR scope using complete Git
merge differences, including both rename sides. Packaged Markdown, executable
fixtures and unknown inputs require checks. Always report the existing
Preflight result, accepting only exact success or an explicitly justified
whole-scope skip; failed/canceled/missing evidence must fail.

Use 5-minute scope/result, 10-minute UI and 20-minute Rust/desktop budgets;
the manual stable gate is bounded to 20 minutes. Dependency caches are scoped
by configuration and writable only from trusted dev executions. Ordinary
checkouts must not persist credentials. Retain release signing/mainline gates
and separate native acceptance, without building installers for CI-only edits.
Focused CI policy regressions run in the existing contract lane. Implementation
and validation state are tracked in the private cross-repository rollout record.

## Build toolchain maintenance integration

The owner approved a scoped integration of the already validated maintenance into the current release branch through a reviewable PR. This authorization supersedes ordinary temporary-branch restrictions for this integration only. Build/CI tool versions change; application behavior, public contracts, data, credentials and immutable release identities remain unchanged. Upstream Actions keep their supported internal runtime; project Node tooling uses the exact maintained LTS pin.

Plan:

- [x] Inspect current release source, owning instructions, prior maintenance evidence and deployment triggers. Start from the current release head to preserve its unique commits.
- [x] Record this plan before executable edits, with documentation and executable changes committed separately.
- [x] Apply only the reviewed Actions, Node and required compatibility/security corrections; adapt references to existing release workflows. Exclude unrelated accumulated development work.
- [x] Review complete diff and source invariants, run applicable final stable checks once, and reuse previous suite evidence only with exact source/lock equivalence. Keep native/store and release-only acceptance separate.
- [ ] Create the scoped PR; integrate only after its exact-head required checks and existing production-admission conditions pass. Preserve concurrent release changes and never bypass branch protection.

Rollback uses an ordinary revert of the scoped maintenance commits; no tag movement, resource recreation or provider/data rollback is part of this task. Existing automatic Git deployment ownership and triggers are preserved. A source/PR pass alone does not establish effective production Node or native/store acceptance.

Validation result: PASS. Source review preserves workflow events, permission/runner/release conditions and existing release-side commits. Executable source/lock bytes match the previously validated development maintenance, excluding explicitly reviewed documentation, workflow and non-executable housekeeping differences; its complete consumer-suite evidence remains applicable. New source contracts and diff checks were executed on this release-based branch. Remote PR/release results are tracked separately and are not implied by local checks.

- `python3 -m unittest discover -s tests -v` — exit0 (STABLE_SOURCE).
- `git diff --check ab9cbb891986f712ec7dd203f0a582b8fb079ef2` — exit0 (STABLE_SOURCE).
