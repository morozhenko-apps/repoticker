# RepoTicker release, license and signing

## Licensing and contributions

RepoTicker uses Apache License 2.0 with NOTICE. Copyright 2026 Stanislav
Moseyko (morozhenko), https://morozhenko.com. Forks are welcome. Bug reports
are accepted via GitHub Issues. Upstream does not accept external code PRs.

## Release trigger

Only a vMAJOR.MINOR.PATCH tag pushed with the current main HEAD launches the
release workflow. If the tag commit differs from main HEAD, admission fails.
A dev push or manual workflow dispatch cannot publish a release.

Version markers must match across Rust core, desktop and Tauri. The workspace
Cargo.lock MUST be tracked in Git and present at the tagged main commit; the
release admission job rejects a missing or inconsistent lockfile. On dev:
    python3 scripts/release_version.py --bump patch
    cargo generate-lockfile
    git add Cargo.lock
    python3 -m unittest discover -s tests -p 'test_release_*.py' -v

After review and a successful main fast-forward, tag main and push only tag:
    git tag v0.1.0
    git push origin v0.1.0

Workflow: .github/workflows/desktop-release-candidates.yml.
Linux amd64 builds DEB/AppImage; Windows x64 builds unsigned NSIS.
macOS is a skipped stub (no Apple Developer ID/notarization or runner cost).

After Linux/Windows succeed, the protected apt-release environment must
authorize the publish job. It imports a signing SUBKEY from GitHub Secrets,
creates signed APT metadata, uploads immutable release files and pool/by-hash
objects to private R2, verifies public HTTP readback, and uploads InRelease
LAST. The read-only download Worker is maintained independently by Cloudflare
Git Integration from main, not by the release workflow. GitHub Release is
created only if all steps succeed. Never distribute a failed candidate.

## GitHub protected environment: apt-release

In repository Settings -> Environments create apt-release, enable required
reviewers, and restrict which tags may deploy if the plan supports it.

Environment Secrets:
    REPOTICKER_APT_SIGNING_SUBKEY_BASE64
    REPOTICKER_APT_SIGNING_PASSPHRASE
    REPOTICKER_R2_ACCESS_KEY_ID
    REPOTICKER_R2_SECRET_ACCESS_KEY

Environment Variables:
    REPOTICKER_APT_FINGERPRINT
    REPOTICKER_R2_ACCOUNT_ID

Use a dedicated R2 S3 token scoped to app-dist. The RepoTicker download
Worker is deployed independently through Cloudflare's GitHub integration
from the main branch (root directory infra/download-worker); its deploy
token is managed by Cloudflare and is NOT a GitHub Actions release secret.
Do not reuse signing keys or tokens from rQuickShare or Picturix.

## Signing key on Alcotester and backup in Google Drive

Create a dedicated primary GPG key with certification only, then one signing
subkey (run interactively, substitute the actual primary fingerprint):

    gpg --quick-generate-key "RepoTicker APT (Stanislav Moseyko)" ed25519 cert 4y
    gpg --list-secret-keys --fingerprint
    gpg --quick-add-key YOUR_40_HEX_PRIMARY_FINGERPRINT ed25519 sign 2y

Have the mounted Drive directory already present:
    /home/morozhenko/morozhenko/secrets/RepoTicker/

Configure GitHub environment required reviewers BEFORE uploading subkey.
Authenticate locally using gh auth login, then run:

    cd ~/Documents/GitHub/repoticker
    bash scripts/provision_apt_key.sh YOUR_40_HEX_PRIMARY_FINGERPRINT

The script refuses an absent backup directory. It streams the full private
key through AES256 encryption directly into a backup file under that Drive
folder, without a plaintext file. It also exports a public keyring and
fingerprint. Only the encrypted signing SUBKEY is sent to GitHub environment
Secrets; the certification primary is never sent to GitHub. Store the
separate backup passphrase in your password manager, not the Drive folder.
Confirm the encrypted archive has actually synchronized; the script
cannot verify remote Google Drive sync.

Supply R2 secrets through GitHub environment Settings. Public fingerprint
and account ID are environment variables.
The publish job rejects primary secret key material and requires a
usable signing subkey.

## Public distribution

R2 bucket: app-dist. Scope: dist/RepoTicker ONLY.
Dedicated Worker route:
    https://download.morozhenko.com/dist/RepoTicker/*

Worker configuration: infra/download-worker/wrangler.jsonc
Cloudflare Git: main only, root infra/download-worker, empty build command,
deploy command: npx --yes wrangler@4.150.0 deploy --config wrangler.jsonc
Build watch path: infra/download-worker/*
No tag is needed to deploy Worker; no dev branch deployment is configured.
Application installers/APT remain tag-only, independent of Worker changes.

Artifact paths:
    dist/RepoTicker/releases/vVERSION/linux/
    dist/RepoTicker/releases/vVERSION/windows/
    dist/RepoTicker/apt/dists/stable/InRelease
    dist/RepoTicker/apt/pool/main/r/repoticker/
    dist/RepoTicker/apt/repoticker-archive-keyring.gpg

The Worker permits GET/HEAD for specified RepoTicker files only; it does
not expose listing, mutation or sibling project storage.

Do not advertise APT enrollment until the first signed publication is
live and independent apt update / apt download / package install have
been tested on Ubuntu amd64. The signature does not sign Windows .exe,
which remains unsigned and may trigger SmartScreen warnings.

## Remaining gates

1. Generate, test and commit Cargo.lock; the release admission now refuses
   to proceed unless it is present and consistent.
2. Validate real DEB/AppImage and hosted Windows x64 NSIS builds, install,
   uninstall and long-lived runtime behavior.
3. Configure the protected environment, isolated signing subkey and R2
   token; separately authorize the Worker in Cloudflare Git Integration.
   Verify the encrypted Google Drive backup is synced.
4. Verify public read-only download route and independent APT acquisition.
5. Define signed metadata expiry/refresh and rollback before public rollout.
6. Keep macOS off until Apple Developer identity and notarization exist.
