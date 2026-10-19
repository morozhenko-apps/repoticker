# RepoTicker release, license and signing

## v0.1.0 delivery evidence (recorded 2026-10-19)

Source tag: `v0.1.0` -> `21f3b61d9774b931b57a4e3c83f61b2bcf2bb0ee`.
[Dev Preflight #39302540338](https://github.com/morozhenko-apps/repoticker/actions/runs/39302540338) and
[main Preflight #39309058200](https://github.com/morozhenko-apps/repoticker/actions/runs/39309058200) passed for this exact SHA.

The [tagged release run #39319748009](https://github.com/morozhenko-apps/repoticker/actions/runs/39319748009)
was started; its build/sign/publication outcome must be read from GitHub Actions and
[GitHub Releases](https://github.com/morozhenko-apps/repoticker/releases).
Do not infer a published package or a functioning APT repository merely from a tag.

Local Ubuntu KDE smoke exercised DEB install/remove, AppImage startup and persistent
configuration. The Windows build is distinct from real Windows installation/testing.
The GTK Layer Shell card still jitters while dragging on Wayland
([Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2)).

At this snapshot the `apt-release` environment, required reviewers, tag policy,
four GitHub secret names and two variable names were confirmed. The dedicated
GPG certification/signing key hierarchy was present; an encrypted full-key backup
was read from the Google Drive remote with a matching SHA-256 and decrypted for a
readability check. The public download Worker rejected POST with HTTP 405.
These checks do not establish that the R2 API credentials can publish or that
end-to-end APT enrollment succeeds; the release job must prove those gates.

**Release isolation:** the tag admission compares the tag commit to the current
`main` HEAD. Do not promote unrelated `dev` commits to `main` during this run.
Documentation cleanup commits may land on `dev` independently and be promoted
after the release has finished.


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
release admission job rejects a missing or inconsistent lockfile. The v0.1.0
candidate already meets this requirement. For a **future** version bump, on dev:
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

## Cloudflare security exception for public package downloads

Public release artifacts are intentionally served to non-browser clients,
including APT, curl, and CI release verification. Browser Integrity Check (BIC)
can reject legitimate Python urllib requests before they reach the read-only
download Worker. This is a Cloudflare zone configuration issue, not an R2
object-permission or GPG-signing failure.

On 2026-10-19, release workflow #39319748009 attempt 2 imported the
signing subkey, built the signed APT snapshot and uploaded immutable files,
but Cloudflare returned HTTP 403 to a Python-urllib/3.12 GET for the
repo-ticker_0.1.0_amd64.deb pool object. Cloudflare Security Analytics recorded
"Block by Browser integrity check" for that hostname/path, matching the
GitHub-hosted runner. HEAD checks with Python-urllib/3.12 returned 403,
while curl/8.0 and APT-HTTP/1.3 returned 200.

Configure an explicit Cloudflare zone-level security rule:
- Expression: `http.host eq "download.morozhenko.com" and starts_with(http.request.uri.path, "/dist/RepoTicker/") and http.request.method in {"GET" "HEAD"}`
- Action: **Skip**; skip product **Browser Integrity Check only**. Keep
  all other WAF/security features active and logging enabled.
- Alternative where the Skip product is not available: a scoped
  **Configuration Rule** disabling Browser Integrity Check for the same
  hostname, path prefix and methods.
- Do not disable BIC globally, use a temporary GitHub runner IP allowlist,
  pretend to be a browser by changing User-Agent, or weaken the download
  Worker's method/path allowlist.

After deployment, verify a real GET made by Python's default urllib client
against the public pool DEB returns HTTP 200 and actual bytes. Also verify
unrecognized paths are still 404 and POST remains 405 with a normal curl
client. Only then rerun failed GitHub Actions jobs. This Cloudflare rule must
stay active for future CI/public clients; document it as part of operating
the production download route.

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
    dist/RepoTicker/apt/pool/main/r/repo-ticker/
    dist/RepoTicker/apt/repoticker-archive-keyring.gpg

The Debian package identity is repo-ticker (apt install repo-ticker).
Bundled input from Tauri is named RepoTicker_VERSION_amd64.deb; the
release collector verifies its dpkg identity and publishes the canonical
repo-ticker_VERSION_amd64.deb name. This is independent of the GUI title.

The Worker permits GET/HEAD for specified RepoTicker files only; it does
not expose listing, mutation or sibling project storage.

Do not advertise APT enrollment until the first signed publication is
live and independent apt update / apt download / package install have
been tested on Ubuntu amd64. The signature does not sign Windows .exe,
which remains unsigned and may trigger SmartScreen warnings.

## Release acceptance checklist

- [x] Track a consistent Cargo.lock; match version markers and tag-to-main commit.
- [x] Pass source Preflight on dev/main for the candidate SHA.
- [x] Run local DEB/AppImage smoke on Ubuntu KDE (not a substitute for full OS acceptance).
- [x] Configure a protected apt-release environment and the required signer/R2
  secret **names** and variables; verify remote encrypted signing-key backup is readable.
- [x] Confirm the read-only download Worker denies HTTP POST.
- [ ] Verify the exact tagged Linux DEB/AppImage and Windows NSIS build jobs succeed
  and that their binaries/checksums are the expected artifacts.
- [ ] Approve the protected deployment, verify isolated signing subkey import,
  R2 credentials, signed metadata, public HTTP readback and GitHub Release creation.
- [ ] Independently test APT repository enrollment, signed apt update, package
  download, clean install, upgrade and removal on a supported Ubuntu amd64 host.
- [ ] Define and test APT metadata refresh/expiry and rollback policy. The present
  Release metadata deliberately omits Valid-Until until a refresh job exists.
- [ ] Complete Windows real-device installer/tray/runtime acceptance and Linux
  multimonitor/drag stability (tracked separately in Issue #2).
- [ ] Keep macOS disabled until Apple Developer signing/notarization and OS
  acceptance are available.

Release status is evidence-driven: do not mark pending tasks complete simply
because a workflow is configured or credentials exist.
