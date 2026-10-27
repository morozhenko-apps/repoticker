# RepoTicker package identity — 2026-10-27

**Mode A refactor, dev only.** The owner explicitly authorized manual removal
of the old Debian package on their Ubuntu machine. No active release or
public signing has been performed.

## Why the original names differed

1. The initial Cargo package was `repoticker-desktop`, so the binary
   installed under that name regardless of the Tauri `productName`.
2. Tauri kebab-cases `RepoTicker` on Linux, yielding the old Debian
   package `repo-ticker` and its old desktop-entry name.
3. Release scripts, signed APT metadata, the allowlisted download Worker
   and QA helper were written against that old package name.

## Canonical identity after this refactor

| Contract | Value | Implementation |
| --- | --- | --- |
| Visible product / Windows installer title | `RepoTicker` | Main Tauri config `productName` |
| Installed executable on Linux | `/usr/bin/repoticker` | Cargo package `repoticker` and `mainBinaryName` |
| Executable on Windows | `repoticker.exe` | Same Cargo/main binary |
| Debian package | `repoticker` | Tauri's `tauri.linux.conf.json` |
| Debian QA/release filename | `repoticker_VERSION_amd64.deb` | Release asset collector |
| Desktop launcher displayed name | `RepoTicker` | Linux `desktopTemplate` |
| APT pool path (future release) | `pool/main/r/repoticker/` | APT publisher/download allowlist |
| Application identifier and settings namespace | `com.morozhenko.repoticker` | Unchanged base Tauri config |
| AppImage and NSIS canonical filenames | `RepoTicker-…` | Unchanged release collector |

Using Tauri's **built-in, automatically merged Linux-specific**
configuration is intentional: it changes the Linux packaging identity
without changing Windows installer branding or rewriting packaged DEB
control files after build. The desktop-entry template independently
sets `Name=RepoTicker`. The internal directory `apps/desktop`
remains a source-tree path, not the product's displayed name.

## Installation on Ubuntu KDE

- Fully quit an old instance of RepoTicker using the tray action.
- `sudo apt remove repo-ticker` removes **only the package**; do not
  `purge` and do not delete `~/.config` or `~/.local/share`.
- Install the new, checksum-verified unpublished `repoticker` package.
  The installer checks that the old package is absent to prevent two
  separate packages and desktop launchers with the same application ID.
- Launch `repoticker`. Inspect `dpkg-query -W repoticker`,
  `dpkg -L repoticker` and the generated
  `/usr/share/applications/repoticker.desktop`; it must contain
  `Name=RepoTicker`, `Exec=repoticker`, not a legacy executable.
- Previously enabled OS autostart could point at the **old** executable.
  Verify login registration in Settings and perform a login/logoff
  acceptance test. Do not delete or rewrite credentials or repository
  config as part of package renaming.

The already published 0.1.0 APT package and historical documentation
correctly retain the **old** name. The new `repoticker` APT pool must
not be published without a separate release approval and version/tag.
Any old repository listing remains historical and distinct.

## Required validation

1. Test exact product/Cargo/main binary consistency and Linux platform
   merge contract, native desktop-entry template and launch target.
2. Run source Preflight: JS, Python release contract, Rustfmt,
   core/Clippy, Linux desktop compile. Do not consider source checks
   equivalent to an installed package.
3. Build separate unpublished Linux DEB/AppImage and Windows NSIS.
   Verify actual Debian control `Package: repoticker`,
   `/usr/bin/repoticker`, `Name=RepoTicker`, dependencies and
   SHA256, and Windows installer branding.
4. Physical verification on KDE and Windows includes autostart and
   single-instance behavior after the rename.

**Release remains blocked** until independent physical acceptance;
`main` and tags must remain unchanged.