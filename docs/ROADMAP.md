# Roadmap and delivery evidence

This document separates **implemented source code**, **verified tests**, **physical acceptance** and **future development**. A checked item does not imply every operating system or public distribution channel is accepted. No delivery date is promised.

Evidence snapshot: 2026-10-19, `v0.1.0` tagged at `21f3b61d9774b931b57a4e3c83f61b2bcf2bb0ee`. The tagged release workflow, not this snapshot, is authoritative for final publication.

## P0 — Local Git desktop foundation

### Implemented

- [x] Tauri 2 desktop shell, Apache-2.0 licensing, icons, About window and Linux SNI tray integration.
- [x] Compact card, repository drawer, four actions, error-only notices, settings window, saved root enrollment and language preference.
- [x] KDE Wayland GTK Layer Shell popup, compositor bottom/right anchor, persisted position and transparent rounded corners.
- [x] Hide after 15 seconds of inactivity while compact; do not idle-hide an open repository drawer.
- [x] Explicit Git root enrollment; shallow discovery; branch/upstream/ahead/behind/dirty inspection.
- [x] Manual parallel Fetch (bounded to four distinct repositories) and sequential offline ff-only Safe pull against fetched refs.
- [x] Real completed-repository progress events, per-row in-flight overlay and nonpersistent error reporting.
- [x] Committed `Cargo.lock`, release version consistency checks, Rust/JS/Python integration tests and Linux desktop compile smoke.
- [x] Preflight passed for exact `v0.1.0` source SHA on `dev` and `main`. [Main run #39309058200](https://github.com/morozhenko-apps/repoticker/actions/runs/39309058200).
- [x] Ubuntu KDE local smoke of DEB installation/removal, AppImage startup and persistence of per-user settings.
- [x] Dedicated read-only Cloudflare R2 download Worker and tagged Linux/Windows packaging + signed APT publishing workflow defined.
- [x] Isolated GPG signing subkey and protected `apt-release` environment configured; encrypted private-key backup checked against Google Drive and decrypted locally.

### Not yet accepted or unfinished

- [ ] Close the [Wayland dragging jitter regression (#2)](https://github.com/morozhenko-apps/repoticker/issues/2) without regressing anchoring or compact sizing.
- [ ] Physically accept tray/card behavior across monitors, scaling, panel arrangements, focus, screen bounds, hide/reopen and supported desktop environments.
- [ ] Confirm the tagged Linux **and** Windows artifact build jobs and actual installers; Windows runtime testing remains separate.
- [ ] Confirm protected signing job, R2 upload/readback and resulting public GitHub Release.
- [ ] Independently test signed APT enrollment, `apt update`, download, clean install, upgrade and uninstall on supported Ubuntu amd64.
- [ ] Define APT index refresh/expiry and rollback strategy; verify Cloudflare release assets and keyring are reachable before advertising installation instructions.
- [ ] Verify autostart, lifecycle and uninstall semantics across supported platforms.

## P1 — Git provider hardening and Linux usability

- [ ] Replace drag feedback/coordinate loop on KDE Wayland with smooth stable motion; add focused regression coverage.
- [ ] Cancel/timeout long-running Git processes and SSH prompts without unsafe state changes.
- [ ] Strengthen concurrent external Git client interference, staged changes, linked worktrees, multiple remotes, submodules, hooks and adversarial configuration coverage.
- [ ] Configurable ignore paths beyond built-in exclusions; better discovery semantics without unexpected recursive scans.
- [ ] Atomic configuration writes and migration/recovery coverage.
- [ ] Full English/Russian interface translation, not only preference persistence.

## P2 — GitHub REST monitoring (not implemented)

- [ ] Least-privilege GitHub authorization stored through OS-native secret storage.
- [ ] Runs and jobs API client, status projection and safe direct links to GitHub Actions.
- [ ] Self-hosted runner online/offline and busy/idle where API permissions permit; distinguish unknown from zero.
- [ ] Adaptive conditional polling, handling 401/403/404/429 and secondary rate limits, bounded cache and stale indicators.
- [ ] Startup/resume reconciliation and user-controlled filtering/notifications on meaningful CI transitions.
- [ ] Optional trustworthy usage/quota data, never fabricate GitHub-hosted pool capacity or billing numbers.

## P3 — Optional automation and Hybrid relay (not implemented)

- [ ] Explicit opt-in background Git synchronization with existing ff-only safety boundaries and a documented schedule.
- [ ] Versioned authenticated relay protocol, signed webhook ingestion, replay/deduplication and tenant isolation.
- [ ] Self-deployed Cloudflare Worker + Durable Object transport and interoperable Docker/VPS implementation.
- [ ] Authenticated WebSocket, reconnection cursor and authoritative REST polling fallback.
- [ ] Chaos/failure-injection and security acceptance tests before enabling Hybrid mode.

The **release download Worker** (`infra/download-worker`) is an existing distribution component. It is **not** the planned GitHub webhook relay (`apps/relay-*`).

## P4 — Cross-platform polish and ongoing maintenance

- [ ] Real Windows package/install/uninstall/tray/settings acceptance; code signing when available.
- [ ] macOS support only after Apple signing/notarization and physical acceptance.
- [ ] Native notifications, autostart, accessibility and high-DPI/multi-monitor testing.
- [ ] Keep implementation, evidence, feature support and release documentation synchronized; maintain separate documentation-only commits.
