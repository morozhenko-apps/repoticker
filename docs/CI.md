# Verification

RepoTicker uses targeted checks during implementation and one complete
applicable stable gate before a release. A passing unit test, CI build or
packaging job does not establish native installed-app acceptance.

## Test and build gates

- JavaScript/Node tests: `node --test tests/*.test.mjs`. The maintained
  project toolchain targets Node.js 26.13.0.
- Rust: `cargo fmt --all --check`, locked core and desktop tests, and
  Clippy as required by the applicable workflow.
- Python: `python3 -m unittest discover -s tests -v` for release, CI,
  version, packaging, signature and publication source contracts.
- `Preflight` validates applicable source and Linux desktop compilation.
  The separately dispatched `Strict quality gate` runs the stable Rust,
  JS and release-contract suites.
- `Desktop acceptance candidates` builds unpublished Linux DEB/AppImage
  and Windows NSIS packages with source-provenance and checksum receipts.
  Platform-native installation, tray, settings, Git safety, credential
  handling, cancellation and clean shutdown require operator acceptance.

Focused tests are appropriate during implementation. Do not rerun the full
stable suite after every commit. An identified flaky group must be reported
and tested separately, never silently excluded from required stable checks.

## Release and security boundaries

The version tag must match Cargo, Tauri and locked workspace versions and
target the exact approved `main` HEAD. Only the protected release workflow
may package and publish versioned files. Publication is complete only after
the public files, immutable checksums, signed APT metadata and release
receipt are verified. The Windows NSIS installer is currently unsigned.

Application, CI and bug-report logs must not contain credentials, private
repository names, personal paths, provider payloads or other private data.
Use bounded, redacted diagnostic reasons and sanitized screenshots.

A historical test run is not proof that a different source revision passed.
See [security](SECURITY.md), [architecture](ARCHITECTURE.md) and
[release](RELEASE.md) for the current durable contracts.
