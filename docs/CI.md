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
