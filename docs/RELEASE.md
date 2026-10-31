# RepoTicker releases

## Current release: v1.0.0

RepoTicker v1.0.0 was published on 31 October 2026 from the approved `main` release commit. It is the stable Linux and Windows desktop release.

- [Release notes](https://github.com/morozhenko-apps/repoticker/releases/tag/v1.0.0)
- [Linux DEB and signed APT repository](https://download.morozhenko.com/dist/RepoTicker/linux/)
- [Distribution manifest and SHA-256 hashes](https://download.morozhenko.com/dist/RepoTicker/latest.json)

The distribution contains a Linux DEB package, Linux AppImage and Windows NSIS installer. The Windows installer is **not code-signed**. Downloadable binaries are hosted in the product distribution rather than attached to the GitHub Release. Verify the published SHA-256 hash before installing.

## Release contract

Release source and packages are immutable. The release workflow accepts a version tag on the exact approved `main` commit, verifies that Cargo and Tauri versions match and builds Linux and Windows packages.

The protected publisher must verify publicly readable files against their expected sizes and hashes before a version is considered published. An upload acknowledgment or a successful build alone is not publication proof. Never replace previously published versioned objects or tags.

Documentation of a published release is separate from confirmation that any website, installation redirect or application update is live. Those external paths must be checked independently.
