# Verification

RepoTicker uses targeted tests during development and a complete stable gate for changes ready to ship. Mode B is a finite, risk-driven test-expansion phase after substantial functionality changes or before a release. It is not an automatically repeated pipeline stage.

## Automated checks

- JavaScript tests cover UI state, GitHub monitoring, Settings transactions, localization and failure handling.
- Rust unit/integration tests cover local Git safety, native process behavior, OAuth/credential boundaries and provider response handling.
- Python release contracts cover versions, installer inputs, signatures, package indexes, immutable publication and readback safety.
- Preflight verifies formatting, unit/contract tests, Clippy and Linux native compilation. A separate unpublished platform workflow packages Linux and Windows candidates.

A passing CI build does not prove an installed application's native UI or lifecycle. That requires platform acceptance of the behaviors relevant to the release.

## Release evidence

Use the exact checked source revision, real test outcomes and verified package checksums. Never represent skipped, missing, canceled or failed checks as passed. Keep diagnostics free of credentials and private repository information. One stable test pass is the normal gate; repeat tests only to investigate an evidenced failure or instability.
