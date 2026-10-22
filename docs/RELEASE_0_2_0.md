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

**Release state: PREPARATION ONLY.** Neither `main`, package versions,
immutable tags, APT metadata nor published downloads are modified here.
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
- [ ] Cargo-generated `0.2.0` package bump and lockfile synchronized.
- [ ] Release candidate STABLE CI green.
- [ ] Linux APT upgrade and KDE smoke accepted.
- [ ] Windows runtime verified or limitation disclosed.
- [ ] Main promotion and protected tagged publish approved and executed.
