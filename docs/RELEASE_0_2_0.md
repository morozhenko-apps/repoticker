# RepoTicker v0.2.0 — release readiness (draft, 2026-10-21)

> **Approved series:** This is the next candidate in the [v0.1.0–v1.0.0 roadmap](VERSION_ROADMAP_TO_1_0.md). **Full Mode B audit belongs to v0.9.0**, not the v0.2.0 development checkpoint. Ordinary feature/regression tests and stable CI remain required for each release; preliminary Mode B matrices are not a prerequisite to implement or publish v0.2.0 after its actual release gates. It is accumulated by version and formally closed on the v0.9 RC. Publishing this roadmap does not trigger the v0.2 software release.

## Status and decision

**Mode A — release preparation, no deployment or tag.** RepoTicker `v0.1.0`
is an immutable public release. The current `dev` branch includes **new**
GitHub App Device Flow, OS-native credential storage, Actions run/job
monitoring, organization self-hosted runner occupancy, three read-only hover
views, optional read-only billing summaries and transactional Settings
confirmation. This is backward-compatible new functionality, so the proposed
next version is **`0.2.0` (minor)**, not a v0.1.0 rebuild or patch.

User KDE physical acceptance on 2026-10-21 covers the card, distinct
tooltips, subsequent content/layout correction and functional GitHub
connection. This does **not** prove Windows runtime, token expiry/recovery,
installer upgrade or billing free-allowance depletion semantics.

**Release state: PREPARATION ONLY.** Version markers and Cargo.lock are now
set to `0.2.0` on `dev` (commit `9fda2d7`). `main`, immutable tags,
APT metadata and published downloads are not modified here.
`dev` and `main` are the only Git branches. No additional feature branch
is needed.

## Active Mode A implementation slice — REST failure transparency (2026-10-22)

The 0.2.0 milestone resumes with focused **Mode A** reliability correction,
not the Mode B matrix (reserved for the 0.9.0 RC). It uses existing
read-only `github_api_get`, `runner-collector` and `github-monitor`
contracts; no GitHub App scope, persistent state or external service changes.

**Observed source cause:** `github_api_get` treats 403 permission denial
and GitHub secondary/primary rate limiting alike; it does not specially
classify HTTP 429. The JS runner collector catches all failures as
`unavailable`, and the monitor replaces the result with a generic status.
The user cannot distinguish revoked credentials, org runner permission
denial, service outage or temporary throttling. Partial runner inventory
must remain independent of readable Actions jobs.

Ordered work and rollback:
1. [x] Introduce a small, pure sanitized native HTTP failure classifier:
   401 unauthorized; 403 with GitHub primary-rate remaining=0 or
   `Retry-After` header → rate-limited; ordinary 403 → permission
   denied; 404 → not found; 429 → rate-limited; other failures → unavailable.
   Never send GitHub raw error JSON, HTTP bodies, tokens or private resource
   paths into the WebView. Keep the existing internal Tauri error string
   contract (no new public API or auth permission).
2. [x] Add a pure JS mapping from these **exact static** native messages
   to finite user-facing reason categories. Catch blocks in the collector
   retain only the category, without exposing thrown provider text.
   Rate-limited/unavailable runner API must not invalidate independently
   complete repo job totals.
3. [x] Show a short actionable reason in the already-existing monitoring
   status, preserving `null` for unknown counts, no false zeros, no
   modal dialog or credential deletion on 401.
4. [x] Add targeted deterministic Rust/Node regression tests, including
   401/403/429, a 403 with rate-limit headers, 404, secondary failure,
   network exception, partial owner coverage and no secret leak. Run
   existing STABLE suite once **after** final implementation through CI.
5. [x] Record final code CI evidence: source SHA
   `43c327435bccedd2fc82511ebf25ea25e43eeda8`,
   [Preflight #39738777419](https://github.com/morozhenko-apps/repoticker/actions/runs/39738777419)
   completed **SUCCESS** on 2026-10-22: Rust format/core/Clippy,
   JS tests and Linux desktop compile all successful.
6. [ ] Physically verify expired/revoked credentials, locked KWallet,
   denied runner API and offline/rate-limited reconnection on Alcotester.
   A compiled Linux binary is not an authorized runtime smoke test.

**Source review checkpoint:** native `github_api.rs::api_http_failure`
maps 403 with rate-limit headers separately from genuine permission
denial; 429/401/404 have independent fixed messages. New pure
`github-errors.mjs` reduces exceptions to a finite sanitized vocabulary.
`runner-collector.mjs` preserves the reason of each failed source while
keeping independent coverage, and `github-monitor.mjs` shows the most
actionable status. Tests in `github-errors.test.mjs`,
`runner-collector.test.mjs` and `github-monitor.test.mjs` cover error
categories, malformed provider text, partial collection and denial.
**Final Preflight on code SHA 43c3274 passed; physical failure-injection acceptance remains open.** The
existing cadence is unchanged and rate-limit-aware rescheduling
is still a v0.3 target.

No network retry per hover, no force loops. The adaptive existing
2–7 minute monitoring cadence is unchanged for this slice. Fine-grained
`Retry-After`/reset-time backoff, ETag cache and 429 retry scheduling
are the explicitly planned v0.3.0 hardening; 0.2.0 must not claim
them implemented. On a failure this slice can be rolled back in isolated
code/test commits, leaving the previously working authorized monitor and
KWallet untouched.

## v0.2.0 version synchronization checkpoint — 2026-10-22

- [x] On Alcotester, owner ran `python3 scripts/release_version.py --bump minor`, `cargo check -p repoticker-desktop`, and `cargo metadata --locked --no-deps --format-version 1`; each succeeded.
- [x] Cargo-generated workspace lockfile updated **only** the `repoticker-core` and `repoticker-desktop` versions from `0.1.0` to `0.2.0`; core Cargo.toml, desktop Cargo.toml and tauri.conf.json also updated. No unrelated dependency change.
- [x] Owner committed all four files, commit `9fda2d725d8178fd0d24dc0465fe0201d6feb422` (`chore(release): prepare version 0.2.0`) and pushed `dev`; working tree was clean.
- [x] Exact versioned commit passed [Preflight #39775627536](https://github.com/morozhenko-apps/repoticker/actions/runs/39775627536): Rust format/core/Clippy, JS and release tests, Linux desktop compile, and aggregate gate, all successful.
- [ ] Locally build **0.2.0** Linux DEB/AppImage with the existing Tauri CLI; validate package identity, filenames and version, and perform actual KDE tray/Settings/Auth/About smoke.
- [ ] Inspect pre-existing installed `repo-ticker` version and signed APT candidate; never assume an installed 0.1.0 is still present or that a private local DEB tests *signed APT upgrade*.
- [ ] Live denied/revoked token and KWallet recovery evidence, independent Windows physical evidence or disclosure, and protected tag/main promotion remain open.

This is a verified **development candidate**, not a published release or
signed APT upgrade. Keep `main` and all public 0.1.0 artifacts unchanged
until physical acceptance and explicit release admission.

## Local Linux release bundles — owner evidence (2026-10-22)

- [x] The owner updated `dev` to docs commit `aff5fb8` (package
  sources are the previously CI-verified version commit `9fda2d7`)
  and ran `cargo tauri build --bundles deb,appimage` on Ubuntu KDE.
  The release build completed and yielded both local artifacts:
  `target/release/bundle/deb/RepoTicker_0.2.0_amd64.deb`
  (7.95 MiB) and
  `target/release/bundle/appimage/RepoTicker_0.2.0_amd64.AppImage`
  (87.83 MiB).
- [x] `dpkg-deb -f` confirmed `Package: repo-ticker`,
  `Version: 0.2.0`, `Architecture: amd64`.
- [x] Local owner-reported SHA256, *not independently verified published
  release signatures*: DEB
  `2f8e89ddd83ca606db4e4dd792fe4724cd91af6e7d433248a0990b82706f6a45`;
  AppImage
  `64559bd05b4b77b170367420652c700b2760788e88f53fc6cb9d1382f1f2d7ef`.
- [x] Pre-upgrade installed package `repo-ticker` is `0.1.0`
  (`dpkg-query: install ok installed 0.1.0`), and signed production
  APT candidate is still `0.1.0` at
  `https://download.morozhenko.com/dist/RepoTicker/apt`.
- [x] Local DEB upgrade `0.1.0 → 0.2.0` **successfully
  executed** on Alcotester via `sudo apt install
  target/release/bundle/deb/RepoTicker_0.2.0_amd64.deb`.
  APT reported `Unpacking repo-ticker (0.2.0) over (0.1.0)` and
  `Setting up repo-ticker (0.2.0)`. `dpkg-query` confirmed
  `repo-ticker 0.2.0 amd64`. Installed binary and desktop shortcut
  remain under `/usr/bin/repoticker-desktop` and
  `/usr/share/applications/RepoTicker.desktop`.
  A settings backup was created. The owner informally confirms normal
  behavior post-upgrade; **individual About/KWallet persistence and
  restart/hover acceptance steps were not explicitly itemized** and
  remain for confirmation.
- [ ] The public **signed APT repository upgrade** still requires
  authorized `0.2.0` publication. Immediately after the local
  upgrade, `apt-cache policy` showed installed/candidate `0.2.0`
  from dpkg status (priority 100), while the remote APT index still
  offered `0.1.0` (priority 500). Do not conflate local DEB
  installation with signed APT upgrade testing.
- [ ] Slower perceived data initialization was reported on 0.2.0.
  No measured cause or timings; deferred as
  [performance issue #12](https://github.com/morozhenko-apps/repoticker/issues/12),
  targeted after the release unless the behavior becomes blocking.
- [ ] Exercise AppImage separately after closing the DEB instance.
  Check runtime and version; never run two RepoTicker instances
  concurrently during keyring/settings acceptance.

No tag, `main` promotion, R2 upload, signed APT publication, Windows
runtime validation or authenticated failure-path acceptance is implied
by the local packaging result.

## KDE AppImage 0.2.0 RC observation and correction (2026-10-22)

- The local v0.2.0 AppImage starts and reports native `gtk-layer-shell`,
  `session=wayland`, `wayland_display=true` and `gdk_backend=wayland`.
  User reports usable app behavior but repeated
  `Gtk-CRITICAL gtk_scrolled_window_set_min_content_height` warnings
  when resizing hover surfaces. The log does **not** establish a
  process-fatal crash.
- Also observed: wrong `help` cursor on Fetch/Safe pull/Repos/Hide,
  misleading `Connect GitHub` prompt during initial authorized
  loading, a possible 2–3px compact-card growth, and Worker URL shown
  even though the only available connection mode is Simple polling.
- Targeted Mode A fixes and source-based root causes are recorded in
  [RC KDE fixes](RC_0_2_0_KDE_UI_FIXES.md). All affected implementation
  and focused test changes are on `dev`. **Old AppImage still contains
  the original defects; it must be rebuilt for verification.**
- Full Mode B remains deferred to v0.9.0. Keep this v0.2.0 candidate
  from `main` and tagged release until the rebuilt Linux package is
  physically accepted, no GTK warnings remain, and unresolved Windows/
  credential-runtime gates have been explicitly disposed.

## KDE RC correction CI — 2026-10-22

- [x] All focused native/JS/CSS/Settings corrections in
  [the KDE RC fix plan](RC_0_2_0_KDE_UI_FIXES.md) are committed to `dev`.
- [x] [Preflight #39826251376](https://github.com/morozhenko-apps/repoticker/actions/runs/39826251376)
  **4/4 SUCCESS** on code/test SHA
  `18f400fa8191cb98e553efc8cc44c81386a6281a`.
- [ ] Rebuild local `0.2.0` AppImage/DEB from current `dev`
  after this source change; rerun physical KDE hover/Settings/
  About and GTK diagnostics. Existing binaries were built **before**
  the code changes and cannot establish correctness.
- [ ] User-verified stable compact size, no Gtk-CRITICAL, and
  connection status transitions. Windows and secure published
  APT upgrade remain separate release gates.
- [x] Owner rebuilt the local 0.2.0 DEB/AppImage from current `dev`;
  build succeeded on Ubuntu KDE. AppImage starts and eventually
  displays local repos plus Actions/runner statistics; **startup has a
  measurable-looking staged delay and prematurely shows ‘Not connected’**
  despite existing credentials. Full diagnosis/optimization is
  deliberately deferred to **v0.3.0 [issue #12](https://github.com/morozhenko-apps/repoticker/issues/12)**;
  no timing values are claimed verified. No grep-filtered GTK geometry
  log was supplied after the build; absence of Gtk-CRITICAL warnings
  cannot be asserted from build output alone.

## Release blocker matrix

| Area | Evidence | Release gate |
| --- | --- | --- |
| GitHub Actions/runner UI | Current KDE manual acceptance; Preflight #195 on 2026-10-21 green | Verify fresh `dev` build after version changes |
| Native authentication | Live Device Flow and KWallet exercised; native unit/source tests | Recheck restart persistence, Cancel/OK, Disconnect, expired/revoked token and denied login |
| Runner/job semantics | Complete/partial, runner availability, monitored account and hover tests | Confirm 401/403/429 and offline/stale handling on a live or controlled fixture |
| Billing | Personal/organization billing summaries and verified plan names in `dev` | Gross SKU minutes **must not** be presented as free-minute consumption or remaining quota |
| Linux packaging | DEB/AppImage release successful in v0.1.0 | Install v0.2.0 over installed v0.1.0 via signed APT, preserve settings/KWallet, tray, launch; then AppImage smoke |
| Windows | NSIS successfully built in v0.1.0 | Physical Windows installation/tray/auth/runtime acceptance still outstanding; report if shipped unverified |
| Signing/distribution | Existing gated signing subkey, R2 readback, APT metadata and protected review | Main HEAD/tag identity, GPG InRelease/key fingerprint, current + candidate package indexes, live public readback; no silent overwrite |
| Platform scope | macOS is disabled | Keep disabled; no implication of macOS support |

### Installation and APT upgrade acceptance

On an already enrolled Ubuntu 26.04 host, record the installed version,
config persistence, downloaded package signature/candidate and token login
state **before** changing packages. With a newly published *authorized*
v0.2.0 APT snapshot, require:
1. Signed `InRelease` verification and `apt policy repo-ticker` showing
   the new candidate with canonical repository origin.
2. Controlled `apt install --only-upgrade repo-ticker` / `apt upgrade`
   to 0.2.0, with no root-owned changes to the user's settings.
3. Reopen tray/card; GitHub connection remains usable from OS keyring and
   monitored organization, count semantics and KDE drag/hover stay correct.
4. `apt remove repo-ticker` preserves user preferences and OS wallet state
   by standard package-manager design; document `apt purge` semantics
   distinctly and never blindly delete user-owned personal data.
5. Public DEB/AppImage/Windows artifacts have matching sidecar SHA256 and
   published APT URL/metadata. Record runtime evidence, not only CI green.

These acceptance steps are **not executed** by this documentation commit.

## Next implementation and exact promotion order

1. Review any remaining GitHub P2 defects against #4; keep it open until
   denied/expired/refresh/reconnect and real 401/403/429 lifecycle evidence
   meets its acceptance contract. Do not close an issue because a user
   approved only the happy path.
2. Use the existing release helper from a Cargo-capable working checkout
   on `dev`: `python3 scripts/release_version.py --bump minor`. Then
   regenerate and check in the workspace Cargo.lock **with Cargo**,
   preserving pinned dependency resolutions. Do not edit Cargo.lock by hand
   or push mismatched version markers.
3. Verify all three markers (core Cargo.toml, desktop Cargo.toml,
   tauri.conf.json) and Cargo.lock agree at 0.2.0.
4. Run one final STABLE gate: `cargo fmt --all --check`,
   `cargo test -p repoticker-core`,
   `cargo clippy -p repoticker-core --all-targets -- -D warnings`,
   `node --test tests/*.test.mjs`,
   `python3 -m unittest discover -s tests -p 'test_release_*.py' -v`,
   `cargo check -p repoticker-desktop`, and native KDE smoke.
   Separate known-flaky checks from stable checks; never interpret a
   cancelled/not-run check as passed.
5. Only after physical acceptance, **fast-forward `dev` into `main`**,
   confirm main Preflight green on the exact commit, then create the
   immutable `v0.2.0` tag exactly at main HEAD. No new branch.
6. Tagged build and publish still require protected `apt-release`
   reviewer authorization. Observe Linux/Windows builder output and GPG/
   APT/R2 readback before GH Release is considered published. Do not move
   main while release tag admission is in progress.
7. Perform independent APT upgrade smoke and publish release notes only
   with explicit evidence. Incomplete physical Windows testing must be
   disclosed, not silently marked green.

## Risks, rollback and scope control

- **No re-tagging:** `v0.1.0` remains immutable; do not reuse existing
  signed APT paths for a different binary.
- **OS credential safety:** never expose tokens to JS/config/logs, never
  remove keyring entries as a packaging side effect.
- **Git safety:** only manual Fetch and clean `ff-only` Safe pull mutate
  tracked refs/branches. Release preparation must not turn on automation.
- **Billing semantics:** do not claim hosted runner pool slots or remaining
  free minutes from billing SKU gross quantity. Unknown means unknown.
- **Rollback before release:** keep the current validated `dev` SHA as
  an immutable Git commit; revert atomic preparation commits instead of
  force-pushing `dev`.
- **Rollback after release:** signed APT metadata/rollback policy is an
  open operational decision (docs/RELEASE.md); do not overwrite signed
  mutable indexes or automatically downgrade until the policy and tests
  are agreed.

## Completion evidence

- [x] Review release machinery and current version markers.
- [x] Draft scope, version rationale, gates and exact promotion sequence.
- [ ] Close/authenticate remaining P2 reliability acceptance tasks.
- [x] Cargo-generated `0.2.0` package bump and lockfile synchronized in `dev` (`9fda2d7`).
- [ ] Release candidate STABLE CI green.
- [ ] Linux APT upgrade and KDE smoke accepted.
- [ ] Windows runtime verified or limitation disclosed.
- [ ] Main promotion and protected tagged publish approved and executed.
