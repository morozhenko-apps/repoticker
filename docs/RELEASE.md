# RepoTicker releases

Release source and packages are immutable. The release workflow accepts a version tag on the exact approved `main` commit, verifies that Cargo and Tauri versions match and builds the Linux and Windows packages.

Linux users can install the DEB or AppImage. The Linux APT repository uses signed metadata. The Windows installer is distributed as an unsigned NSIS package; users should verify its checksum and follow their operating system's safety prompts.

[GitHub Releases](https://github.com/morozhenko-apps/repoticker/releases) contains public release notes. The [download manifest](https://download.morozhenko.com/dist/RepoTicker/latest.json) identifies published distribution artifacts and SHA-256 checksums.

The protected publisher must verify publicly readable files against their expected sizes and hashes before a version is considered published. An upload acknowledgment or a successful build alone is not publication proof. Never replace previously published versioned objects or tags.
