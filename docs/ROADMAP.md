# Roadmap and evidence

This is a planning backlog, not a progress claim. Dates indicate when decisions were recorded, not promised delivery.

## P0: Baseline shell and invariants

- [x] Initialize public RepoTicker repository and MIT license.
- [x] Document product, security and two delivery modes.
- [x] Add a pure Git fast-forward eligibility classifier with unit tests.
- [x] Add Tauri tray/card prototype showing **empty** real state, no mock API activity.
- [x] Add CI configuration adapted from rQuickShare.
- [ ] Confirm exact SHA GitHub Preflight success; fix any red checks.
- [ ] Implement a native Linux tray interaction adapter (standard Tauri 2 Linux click callback is unsupported) and anchor the card to the tray.
- [ ] Physically verify tray/menu/card on KDE Wayland.
- [ ] Validate Windows and macOS desktop-shell builds and interactions.

## P1: Local Git provider

- [x] Explicit root enrollment and removal from local app config.
- [ ] Configurable path ignores beyond the built-in exclusions.
- [x] Shallow direct-child discovery of valid checkouts; skip symlinks, hidden snapshots, and linked-worktree administrative trees.
- [ ] Worktree/submodule explicit enrollment acceptance on all target platforms; richer discovery rules.
- [x] Manual fetch-all using existing Git configuration, with per-repository error isolation.
- [ ] Network timeouts, cancellation, concurrent external Git-process race acceptance.
- [x] Manual native ff-only pull for eligible clean upstream-tracking active branches, no stash/rebase/force.
- [x] End-of-operation results and per-repository errors inside the card.
- [ ] Live progress/cancellation and OS-native notifications.
- [x] Reproducible local integration tests with temporary bare remotes.
- [ ] Verify passing CI for the latest Git Provider commit and physical KDE Wayland behavior.

## P2: GitHub REST polling

- [ ] Least-privilege GitHub authentication using OS-native secret storage.
- [ ] Runs/jobs status and direct browser links.
- [ ] Self-hosted runner online/busy when permitted, unknown otherwise.
- [ ] Rate-limit-aware adaptive polling, cache stale markers, startup/reconnect reconciliation.
- [ ] Optional usage/quota popover, explicit unknown/estimated billing data.
- [ ] OS notifications only on meaningful state transitions.

## P3: Hybrid mode

- [ ] Versioned relay envelope, signing, tenant isolation, resume protocol.
- [ ] Cloudflare Worker + Durable Object self-deployment instructions and tests.
- [ ] Generic Docker/VPS implementation and interoperability tests.
- [ ] WebSocket auth/reconnect and authoritative polling fallback.
- [ ] Abuse/rate-limit and failure injection acceptance.

## P4: Distribution

- [ ] Native packages/installers with verified tray/autostart/uninstall semantics.
- [ ] Cross-platform release matrix and reproducible signed artifacts.
- [ ] GitHub releases, supply-chain review and public documentation.

No progress checkbox should be checked solely because a file or workflow exists; P0 code/CI checkboxes mean scaffolding was committed, not that runtime acceptance passed.
