# RepoTicker release, license and signing

## Licensing and contributions

RepoTicker uses Apache License 2.0 with NOTICE. Copyright 2026 Stanislav
Moseyko (morozhenko), https://morozhenko.com. Forks are welcome. Bug reports
are accepted via GitHub Issues. Upstream does not accept external code PRs.

## Release trigger

Only a vMAJOR.MINOR.PATCH tag pushed with the current main HEAD launches the
release workflow. If the tag commit differs from main HEAD, admission fails.
A dev push or manual workflow dispatch cannot publish a release.

Version markers must match across Rust core, desktop and Tauri. On dev:
    python3 scripts/release_version.py --bump patch
    python3 -m unittest discover -s tests -p 'test_release_*.py' -v

After review and a successful main fast-forward, tag main and push only tag:
    git tag v0.1.0
    git push origin v0.1.0

Workflow: .github/workflows/desktop-release-candidates.yml.
Linux amd64 builds DEB/AppImage; Windows x64 builds unsigned NSIS.
macOS is a skipped stub (no Apple Developer ID/notarization or runner cost).

After Linux/Windows succeed, the protected apt-release environment must
authorize the publish job. It imports a signing SUBKEY from GitHub Secrets,
creates signed APT metadata, deploys the dedicated read-only Cloudflare Worker,
uploads immutable release files and pool/by-hash objects to private R2,
verifies public HTTP readback, and uploads InRelease LAST. GitHub Release is
created only if all steps succeed. Never distribute a failed candidate.

## GitHub protected environment: apt-release

In repository Settings -> Environments create apt-release, enable required
reviewers, and restrict which tags may deploy if the plan supports it.

Environment Secrets:
    REPOTICKER_APT_SIGNING_SUBKEY_BASE64
    REPOTICKER_APT_SIGNING_PASSPHRASE
    REPOTICKER_R2_ACCESS_KEY_ID
    REPOTICKER_R2_SECRET_ACCESS_KEY
    REPOTICKER_CLOUDFLARE_API_TOKEN

Environment Variables:
    REPOTICKER_APT_FINGERPRINT
    REPOTICKER_R2_ACCOUNT_ID

Use a dedicated R2 S3 token scoped to app-dist and a dedicated limited
Cloudflare token to deploy only the RepoTicker Worker and route. Do not
reuse signing keys or tokens from rQuickShare or Picturix.

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

Supply R2 and Cloudflare secrets separately through the environment
Settings. Public fingerprint and account ID are environment variables.
The publish job rejects primary secret key material and requires a
usable signing subkey.

## Public distribution

R2 bucket: app-dist. Scope: dist/RepoTicker ONLY.
Dedicated Worker route:
    https://download.morozhenko.com/dist/RepoTicker/*

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

1. Freeze and check in a verified Cargo.lock (prototype currently ignores it).
2. Validate real DEB/AppImage and hosted Windows x64 NSIS builds, install,
   uninstall and long-lived runtime behavior.
3. Configure the protected environment, isolated signing subkey, R2 and
   Cloudflare tokens; verify the encrypted Google Drive backup is synced.
4. Verify public read-only download route and independent APT acquisition.
5. Define signed metadata expiry/refresh and rollback before public rollout.
6. Keep macOS off until Apple Developer identity and notarization exist.
