# RepoTicker binary naming correction — 2026-10-27

**Mode A: Refactor.** Owner directive: remove the accidental `desktop`
suffix from the application's executable/package identity and stop
propagating it to user-facing command examples.

## Diagnosis

- `apps/desktop/src-tauri/Cargo.toml` defines
  `[package] name = "repoticker-desktop"`; Cargo derives the
  compiled executable basename from this. This is why QA found
  `repoticker-desktop` rather than an executable called `repoticker`.
- Product and application identity already read `RepoTicker`,
  `com.morozhenko.repoticker`, and the Debian **package**
  `repo-ticker`. The package and app ID are public stable contracts
  and are not being renamed.
- The internal source folder `apps/desktop/` describes the Tauri
  target inside a multi-component repository. It is **not** the
  product, an installed command, or a launcher label; moving this
  tree would needlessly change every file path, Rust build and CI
  reference. Keep it internal, never surface it as the app name.
- Historical committed release versions and previous acceptance
  reports describe older binaries; do not silently falsify them.

## Contract and migration policy

1. New Cargo package and executable basename: **`repoticker`**.
   User-visible terminal command: **`repoticker`**.
   User-visible brand: **RepoTicker**.
   `repo-ticker` remains the **DEB package name**; both `0.2.0`
   source version markers and the existing NSIS/AppImage artifact
   canonical names are preserved in unpublished QA candidates.
2. Lockfile, compile commands, current installer/QA scripts and
   active tests must follow the new package name. Do not introduce
   another spelling in release assets, service configuration,
   icons or product-page names.
3. OS autostart is an explicit compatibility risk: a previously
   enabled login entry may point at `repoticker-desktop`. The
   migration must not silently disable autostart, create duplicates,
   or run Git in the background. Do not claim the new filename has
   passed OS login acceptance on source/CI alone.
4. Prevent backsliding with focused regression tests for Cargo
   manifest/lockfile, launcher command, installed package identity,
   native autostart registration and Linux/Windows script semantics.
5. Run stable source tests and compile at the **final** validation
   gate, then build unpublished Linux/Windows candidates for runtime
   acceptance. No tag, version bump, `main` promotion, APT or public
   release.

## Risks and rollback

A Cargo package rename invalidates `cargo -p repoticker-desktop`
commands; all current CI checks/scripts must use `-p repoticker`.
A previous Linux process can remain active after reinstall because
RepoTicker enforces single instance: QA installer must check both
legacy and new process names before replacing the binary. Previous
OS autostart path needs a scoped migration or explicit OS acceptance,
not a duplicate fixed launch entry. A failing login migration blocks
Gate 2 regardless of green source tests.

Rollback is the exact inverse rename of manifest/lockfile, any
preflight helpers and QA script/test only; existing persisted
user settings are not changed.

**Status:** analysis recorded; implementation and physical acceptance
pending.
