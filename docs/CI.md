# CI and release evidence

## Evidence windows and current development

Historical v0.1 pipeline and unfinished-feature descriptions below retain their
source/window. [v0.2 release evidence](RELEASE_0_2_0.md) and the
[current handoff](ROADMAP.md#current-development-handoff-2026-10-24) distinguish
newer source from published/runtime acceptance. GitHub monitoring and native
opt-in failure-alert code now exist in dev; old "after implementation" assurance
work remains relevant by boundary, not a claim those components are absent.
Required stable source/release checks and manual strict policy are unchanged.
Never substitute an earlier green run for a changed executable source or treat
a skipped/native-unobserved gate as passing.


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

**Approved 1.0 requirement (documentation only, not yet implemented):** [Mode B roadmap](VERSION_ROADMAP_TO_1_0.md) requires separate STABLE and known-FLAKY test identification, complete documented Positive/N1–N12 coverage and mutation review before stable v1.0. The current manual strict workflow repeats all Rust+JS tests ten times; it does **not** implement the new STABLE/known-FLAKY separation and cannot by itself close Mode B. Align its configuration and record actual evidence at the v0.9 RC gate. The current agent SSOT uses a single end-of-task stable run and a separate known-flaky run; targeted repetition is for confirmed race/instability investigation, not routine entire-suite ×10.

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

macOS is intentionally skipped. **Release evidence:** [workflow #39319748009](https://github.com/morozhenko-apps/repoticker/actions/runs/39319748009) completed on attempt 3 with successful validate, Linux, Windows, publish and github-release jobs. The first attempt failed at GPG passphrase validation; the second signed successfully but the public readback was blocked by Cloudflare Browser Integrity Check. After a narrowly scoped BIC skip for the download hostname/path, attempt 3 passed and [v0.1.0](https://github.com/morozhenko-apps/repoticker/releases/tag/v0.1.0) became public. Runtime installation and future APT maintenance remain separate acceptance gates.

## Branch/release isolation

`dev` is the work branch; `main` is the release source. Never advance `main` while a release candidate still needs to verify that its tag matches current `main` HEAD. Use a separate **docs-only** commit on `dev` during an in-flight tagged release, promote it to `main` after the release gate finishes and the current release SHA has been validated. Application code and documentation changes belong to separate commits.

Recommended repository rulesets remain subject to account settings verification; do not confuse CI job definitions with branch protection being enabled. An independently protected `apt-release` environment is used for deployment authorization.

## Remaining assurance work

- Independently verify signed APT enrollment, package installation/upgrade/removal, and physical Windows installer/runtime acceptance. Tagged build/sign/readback checks have passed on v0.1.0.
- Test KDE multi-monitor, drag stability and supported desktop lifecycle.
- Expand Git subprocess concurrency, hostile config/hooks and cancellation coverage.
- Implement and contract-test GitHub API clients, token/rate-limit behavior and relay signing once those features exist.
- Document a sustainable APT index refresh, metadata expiry and rollback procedure before broad public distribution.
