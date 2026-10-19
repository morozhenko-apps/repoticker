# CI and release evidence

RepoTicker CI takes the isolation and review principles of the rQuickShare baseline, but uses its own Tauri/Rust/Node tests, packaging artifacts and release credentials.

## Preflight — `.github/workflows/preflight.yml`

Runs for pushes to `dev` and `main`, pull requests against either branch, and manual dispatch. Pushes modifying only designated documentation paths (including `README.md` and `docs/**`) are ignored; a docs-only commit does not imply that **all** PR or required-check runs will be skipped.

Jobs on Ubuntu 24.04:
1. Rust formatting, core unit/integration tests and Clippy with warnings denied.
2. JS syntax checks, Node built-in JS tests and Python release-contract tests. The runner installs APT/GPG tools, so the signed-APT integration test is not intentionally skipped.
3. Desktop Rust/Tauri Linux compile smoke (`cargo check -p repoticker-desktop`) with native dependencies.
4. A required aggregate `Preflight result` that succeeds only when all three checks succeed.

**Verified v0.1.0 evidence:** [dev Preflight #39302540338](https://github.com/morozhenko-apps/repoticker/actions/runs/39302540338) and [main Preflight #39309058200](https://github.com/morozhenko-apps/repoticker/actions/runs/39309058200) both completed successfully for `21f3b61d9774b931b57a4e3c83f61b2bcf2bb0ee`. These validate source checks, not full installers or end-user runtime on every OS.

## Manual strict gate — `.github/workflows/strict.yml`

Manual-only workflow that executes ten consecutive Rust core + JS passes on one SHA. It is a repeatability diagnostic, **not** evidence of a completed release, physical acceptance, or a configured flaky-test quarantine. Its existence does not mean it ran for the tagged candidate. No release keys or deployment permissions are provided.

Stable vs. known-flaky tests should be tracked explicitly as future test infrastructure evolves. Newly failing stable tests must not be reclassified or silenced to make CI green. Do not run the manual strict gate unnecessarily during routine edits.

## Tagged release — `.github/workflows/desktop-release-candidates.yml`

Only a pushed `vMAJOR.MINOR.PATCH` tag at the current `main` commit may pass admission. Admission also requires matching Rust/Tauri versions and committed `Cargo.lock`.

Pipeline:
1. Build and checksum Linux amd64 DEB/AppImage on Ubuntu 24.04.
2. Build and checksum unsigned Windows x64 NSIS on Windows 2025.
3. After both pass, request protected `apt-release` environment approval. Import a scoped signing **subkey** and create a verified APT snapshot.
4. Upload immutable release objects and APT by-hash indexes to scoped R2; independently read back the public download Worker URLs. Update mutable indexes and publish signed `InRelease` last.
5. Publish GitHub Release only after the signed R2/APT operation and public-key artifact succeeded.

macOS is intentionally skipped. A passing build is not equivalent to signed package distribution. [Release workflow](https://github.com/morozhenko-apps/repoticker/actions/workflows/desktop-release-candidates.yml) is the source of current run status.

## Branch/release isolation

`dev` is the work branch; `main` is the release source. Never advance `main` while a release candidate still needs to verify that its tag matches current `main` HEAD. Use a separate **docs-only** commit on `dev` during an in-flight tagged release, promote it to `main` after the release gate finishes and the current release SHA has been validated. Application code and documentation changes belong to separate commits.

Recommended repository rulesets remain subject to account settings verification; do not confuse CI job definitions with branch protection being enabled. An independently protected `apt-release` environment is used for deployment authorization.

## Remaining assurance work

- Verify tagged artifact jobs and signing/public readback by exact run, then perform installed APT and Windows runtime acceptance.
- Test KDE multi-monitor, drag stability and supported desktop lifecycle.
- Expand Git subprocess concurrency, hostile config/hooks and cancellation coverage.
- Implement and contract-test GitHub API clients, token/rate-limit behavior and relay signing once those features exist.
- Document a sustainable APT index refresh, metadata expiry and rollback procedure before broad public distribution.
