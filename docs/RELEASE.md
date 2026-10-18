# Release and licensing

RepoTicker is licensed under Apache License 2.0 with a NOTICE file identifying
Stanislav Moseyko (morozhenko) as the original author. Redistributors must
comply with Section 4 including preservation of applicable LICENSE/NOTICE and
notices in modified files. No logo-placement or UI-credit requirement exists.
Forks are welcome; third-party pull requests are not accepted upstream.
Bug reports use the issue template.

## Versions and source

Rust core, Rust desktop, and Tauri config must have one SemVer. Use:
    python3 scripts/release_version.py
    python3 scripts/release_version.py --bump patch
    python3 scripts/release_version.py --check-tag v0.1.0

Release tags are immutable and must point exactly to HEAD of main.
Manual workflow desktop-release-candidates builds three OS candidates
from the tag and uploads short-lived GitHub Actions artifacts only:
Linux amd64 DEB/AppImage, Windows x64 NSIS and macOS ARM64 DMG.
macOS candidates are unsigned. This is NOT a public release and is not
a claim of installed platform compatibility.

Before a reproducible public release, generate and check in Cargo.lock;
the present prototype ignores it. Validate package identity, shared-library
runtime dependencies, installer uninstall, Git/tray operations, Apple signing
and notarization and optional Windows Authenticode.

## R2 and APT deployment boundary

The existing app-dist R2 bucket / download.morozhenko.com should receive
only the prefix dist/RepoTicker/. Do not edit sibling Picturix and
rQuickShare objects, DNS or Worker bindings.

Candidate builders do not hold R2 secrets and do not publish anything.
A future protected publisher must verify checksums and signatures, upload
versioned objects without overwriting, read back the bytes, then promote
a separate public manifest. Do not reuse another project's signing keys.

APT requires a dedicated, signed Debian repository with externally managed
GPG authority, a public scoped keyring, signed InRelease, fixed suite and
architecture, tested apt update/candidate/download, and periodic freshness
maintenance. This must be reviewed before allowing user enrollment;
publishing unsigned Packages or generic R2 bucket listings is not acceptable.
