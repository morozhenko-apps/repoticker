# Mode B: exact 80-source to branch-map reconciliation register

Source-equivalent inventory baseline `5b07a3273a27516af8ceb793f0d427a1bada964b` and published `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; GitHub compare verified 21 later documentation-only commits and zero production source changes. Prepared audit parent `e4b57d83c671cd24a0e0f3583cb6573abad321e7`, named `audit/mode-b-testing`.

This register is a **source-file navigation and outstanding-evidence checklist**, not a code coverage report, passing test list, or Stage 3–8 completion certificate. It does not modify the original 80×(Positive,N1–N12) matrix in [full-matrix-and-coverage.md](full-matrix-and-coverage.md). The initial question marks in that matrix remain honest until every meaningful branch and interaction has an examined executable assertion, with justified N/A. The lexical function/anchor counts are discovery hints, not AST-confirmed executable branch counts.

## Reconciliation rules and exact inventory check

- **D** means a dedicated/focused `branch-map-*.md` document is identified for the source. It may still contain untested methods, hypotheses, and OS or security STOP FACTOR requirements.
- **G** means an existing broader multi-file document is the primary **group-level** source map; it does **not** prove per-method coverage. Some modules have additional documents as secondary references.
- **I** means only a lexical inventory exists; none of the current 80 rows had to be assigned I after this manual mapping, but that **does not mean** all source branches are tested.
- **Stage 3–8 closed?** remains **? in every row** because independent required outcomes, N-matrix statuses and cross-component executions are still partial. Do not promote D/G to a test pass or infer executable coverage from a documentation link.
- Validation of this register used the exact GitHub source matrix and full audit Git tree. There are exactly **80 distinct production paths**, each assigned once, and every primary linked `branch-map` path exists in that tree at the parent SHA.
- Progress by map granularity: **59 focused / 21 grouped / 0 inventory-only**, **not** a percentage of test coverage or completed stages.

## Native Rust/build

| Production file | Risk | Lexical functions/anchors | Map | Primary source map | Stage 3–8 closed? |
| --- | --- | ---: | :---: | --- | :---: |
| `apps/desktop/src-tauri/build.rs` | High | 3/6 | D | [native-build-script](branch-map-native-build-script.md) | ? |
| `apps/desktop/src-tauri/src/app_icon.rs` | High | 2/1 | D | [native-tray-icon](branch-map-native-tray-icon.md) | ? |
| `apps/desktop/src-tauri/src/autostart.rs` | High | 2/6 | D | [autostart-startup](branch-map-autostart-startup.md) | ? |
| `apps/desktop/src-tauri/src/ci_notifications.rs` | High | 5/16 | D | [ci-notifications](branch-map-ci-notifications.md) | ? |
| `apps/desktop/src-tauri/src/github_api.rs` | Critical | 10/81 | D | [rest-client](branch-map-rest-client.md) | ? |
| `apps/desktop/src-tauri/src/github_etag_cache.rs` | High | 10/16 | D | [etag-cache](branch-map-etag-cache.md) | ? |
| `apps/desktop/src-tauri/src/github_native.rs` | High | 21/14 | D | [native-oauth-adapters](branch-map-native-oauth-adapters.md) | ? |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs` | High | 14/9 | D | [oauth-wire](branch-map-oauth-wire.md) | ? |
| `apps/desktop/src-tauri/src/github_rate_gate.rs` | High | 8/5 | D | [rate-gate](branch-map-rate-gate.md) | ? |
| `apps/desktop/src-tauri/src/github_session.rs` | Critical | 30/49 | D | [auth-session](branch-map-auth-session.md) | ? |
| `apps/desktop/src-tauri/src/linux_surface.rs` | High | 26/41 | D | [linux-layer-shell](branch-map-linux-layer-shell.md) | ? |
| `apps/desktop/src-tauri/src/linux_tray.rs` | High | 10/3 | D | [native-tray-i18n](branch-map-native-tray-i18n.md) | ? |
| `apps/desktop/src-tauri/src/main.rs` | Critical | 70/171 | D | [main-git-admission](branch-map-main-git-admission.md) | ? |
| `apps/desktop/src-tauri/src/monitor_cache.rs` | High | 10/9 | D | [monitor-cache](branch-map-monitor-cache.md) | ? |
| `apps/desktop/src-tauri/src/relay_endpoint.rs` | Critical | 4/7 | D | [relay-endpoint](branch-map-relay-endpoint.md) | ? |
| `apps/desktop/src-tauri/src/relay_secret.rs` | Critical | 34/34 | D | [relay-secret-keyring](branch-map-relay-secret-keyring.md) | ? |
| `apps/desktop/src-tauri/src/relay_transport.rs` | Critical | 16/38 | D | [relay-transport](branch-map-relay-transport.md) | ? |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs` | High | 11/8 | D | [autostart-startup](branch-map-autostart-startup.md) | ? |
| `apps/desktop/src-tauri/src/tray_i18n.rs` | High | 8/7 | D | [native-tray-i18n](branch-map-native-tray-i18n.md) | ? |
| `apps/desktop/src-tauri/src/windows_geometry.rs` | High | 14/12 | D | [windows-geometry](branch-map-windows-geometry.md) | ? |

## Desktop UI and locale data

| Production file | Risk | Lexical functions/anchors | Map | Primary source map | Stage 3–8 closed? |
| --- | --- | ---: | :---: | --- | :---: |
| `apps/desktop/ui/about.mjs` | Medium | 4/8 | D | [about-window-controller](branch-map-about-window-controller.md) | ? |
| `apps/desktop/ui/app.mjs` | Medium | 43/111 | D | [main-card-controller](branch-map-main-card-controller.md) | ? |
| `apps/desktop/ui/browser-context-menu.mjs` | Medium | 1/0 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/card-i18n.mjs` | Medium | 4/18 | D | [localized-counts-and-card](branch-map-localized-counts-and-card.md) | ? |
| `apps/desktop/ui/ci-failure-events.mjs` | Medium | 5/33 | D | [ci-events-and-status](branch-map-ci-events-and-status.md) | ? |
| `apps/desktop/ui/ci-status.mjs` | Medium | 3/9 | D | [ci-events-and-status](branch-map-ci-events-and-status.md) | ? |
| `apps/desktop/ui/github-billing.mjs` | Medium | 11/43 | D | [github-billing](branch-map-github-billing.md) | ? |
| `apps/desktop/ui/github-errors.mjs` | Medium | 3/7 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/github-installations.mjs` | Medium | 2/8 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/github-monitor.mjs` | Medium | 14/87 | D | [github-monitor-controller](branch-map-github-monitor-controller.md) | ? |
| `apps/desktop/ui/locale-auth.mjs` | Medium | 0/0 | G | [entrypoints](branch-map-entrypoints.md) | ? |
| `apps/desktop/ui/locale-card.mjs` | Medium | 0/0 | G | [entrypoints](branch-map-entrypoints.md) | ? |
| `apps/desktop/ui/locale-catalog.mjs` | Medium | 4/5 | D | [localized-counts-and-card](branch-map-localized-counts-and-card.md) | ? |
| `apps/desktop/ui/locale-counts.mjs` | Medium | 3/4 | D | [localized-counts-and-card](branch-map-localized-counts-and-card.md) | ? |
| `apps/desktop/ui/locale-errors.mjs` | Medium | 1/2 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/locale-extended.mjs` | Medium | 0/0 | G | [entrypoints](branch-map-entrypoints.md) | ? |
| `apps/desktop/ui/locale-plurals.mjs` | Medium | 1/4 | D | [localized-counts-and-card](branch-map-localized-counts-and-card.md) | ? |
| `apps/desktop/ui/locale-surface.mjs` | Medium | 0/0 | G | [entrypoints](branch-map-entrypoints.md) | ? |
| `apps/desktop/ui/locale-workflow.mjs` | Medium | 0/0 | G | [entrypoints](branch-map-entrypoints.md) | ? |
| `apps/desktop/ui/model.mjs` | Medium | 5/15 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/monitor-presentation.mjs` | Medium | 2/5 | D | [metric-presentation](branch-map-metric-presentation.md) | ? |
| `apps/desktop/ui/native-drag.mjs` | Medium | 2/6 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/quota-details.mjs` | Medium | 13/24 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/quota-size.mjs` | Medium | 1/3 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/quota.mjs` | Medium | 17/45 | D | [quota-async-controller](branch-map-quota-async-controller.md) | ? |
| `apps/desktop/ui/repo-menu.mjs` | Medium | 1/1 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/repo-row-indicator.mjs` | Medium | 2/7 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/runner-collector.mjs` | Medium | 6/32 | D | [runner-collector-exact](branch-map-runner-collector-exact.md) | ? |
| `apps/desktop/ui/runner-state.mjs` | Medium | 9/28 | D | [runner-state-classification](branch-map-runner-state-classification.md) | ? |
| `apps/desktop/ui/scan-refresh.mjs` | Medium | 3/10 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/settings-i18n.mjs` | Medium | 1/3 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/settings.mjs` | Critical | 43/203 | D | [settings-quota-card](branch-map-settings-quota-card.md) | ? |
| `apps/desktop/ui/status-metrics.mjs` | Medium | 3/1 | D | [metric-presentation](branch-map-metric-presentation.md) | ? |
| `apps/desktop/ui/surface-i18n.mjs` | Medium | 5/16 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |
| `apps/desktop/ui/view.mjs` | Medium | 4/14 | G | [helpers-locales](branch-map-helpers-locales.md) | ? |

## Cloudflare relay

| Production file | Risk | Lexical functions/anchors | Map | Primary source map | Stage 3–8 closed? |
| --- | --- | ---: | :---: | --- | :---: |
| `apps/relay-cloudflare/src/hub.mjs` | Critical | 7/21 | D | [relay-hub-sqlite](branch-map-relay-hub-sqlite.md) | ? |
| `apps/relay-cloudflare/src/index.ts` | Medium | 6/0 | D | [relay-cloudflare-entry](branch-map-relay-cloudflare-entry.md) | ? |
| `apps/relay-cloudflare/src/relay-protocol.mjs` | Medium | 9/27 | D | [relay-protocol-crypto](branch-map-relay-protocol-crypto.md) | ? |
| `apps/relay-cloudflare/src/webhook-verify.mjs` | Medium | 1/4 | D | [relay-protocol-crypto](branch-map-relay-protocol-crypto.md) | ? |
| `apps/relay-cloudflare/src/worker.mjs` | Critical | 1/18 | D | [relay-worker-router](branch-map-relay-worker-router.md) | ? |

## Core Rust

| Production file | Risk | Lexical functions/anchors | Map | Primary source map | Stage 3–8 closed? |
| --- | --- | ---: | :---: | --- | :---: |
| `crates/repoticker-core/src/bounded.rs` | High | 1/5 | D | [core-bounded-shutdown](branch-map-core-bounded-shutdown.md) | ? |
| `crates/repoticker-core/src/config_store.rs` | Critical | 15/15 | D | [config-store](branch-map-config-store.md) | ? |
| `crates/repoticker-core/src/git.rs` | Critical | 68/83 | D | [git-safe-operations](branch-map-git-safe-operations.md) | ? |
| `crates/repoticker-core/src/github_auth.rs` | Critical | 14/10 | D | [core-sync-device-policy](branch-map-core-sync-device-policy.md) | ? |
| `crates/repoticker-core/src/lib.rs` | High | 3/6 | D | [core-sync-device-policy](branch-map-core-sync-device-policy.md) | ? |
| `crates/repoticker-core/src/relay.rs` | High | 10/15 | D | [relay](branch-map-relay.md) | ? |
| `crates/repoticker-core/src/shutdown.rs` | High | 4/0 | D | [core-bounded-shutdown](branch-map-core-bounded-shutdown.md) | ? |

## Release, CI and developer scripts

| Production file | Risk | Lexical functions/anchors | Map | Primary source map | Stage 3–8 closed? |
| --- | --- | ---: | :---: | --- | :---: |
| `scripts/accept_autostart_linux.sh` | High | 0/7 | D | [autostart-acceptance-cli](branch-map-autostart-acceptance-cli.md) | ? |
| `scripts/accept_autostart_windows.ps1` | High | 0/2 | D | [autostart-acceptance-cli](branch-map-autostart-acceptance-cli.md) | ? |
| `scripts/apt_repository.py` | High | 6/16 | D | [apt-signed-snapshot](branch-map-apt-signed-snapshot.md) | ? |
| `scripts/ci-pr-scope.sh` | High | 0/5 | D | [ci-preflight-admission](branch-map-ci-preflight-admission.md) | ? |
| `scripts/cleanup-published-artifacts.mjs` | High | 5/25 | D | [release-retention](branch-map-release-retention.md) | ? |
| `scripts/install_qa_linux.sh` | High | 0/9 | D | [linux-qa-installer](branch-map-linux-qa-installer.md) | ? |
| `scripts/provision_apt_key.sh` | High | 1/6 | G | [apt-signing-authority](branch-map-apt-signing-authority.md) | ? |
| `scripts/r2_release.py` | Critical | 19/94 | D | [r2-upload-publish](branch-map-r2-upload-publish.md) | ? |
| `scripts/release_assets.py` | Critical | 6/36 | D | [release-assets](branch-map-release-assets.md) | ? |
| `scripts/release_version.py` | High | 3/12 | D | [release-version](branch-map-release-version.md) | ? |
| `scripts/verify_signing_key.py` | High | 2/11 | D | [apt-signing-authority](branch-map-apt-signing-authority.md) | ? |
| `scripts/verify_signing_passphrase.sh` | High | 1/5 | G | [apt-signing-authority](branch-map-apt-signing-authority.md) | ? |
| `tools/import_icon.py` | High | 1/4 | D | [icon-import-tool](branch-map-icon-import-tool.md) | ? |

## Mandatory gaps not closed by this index

| ID | Owner and status | Required proof / decision before changing production |
| --- | --- | --- |
| A1 | `apps/desktop/ui/app.mjs` controller top-level, **NEW_HARNESS** | Execute actual WebView DOM/Tauri listeners and closure branches under faithful deterministic DOM/native adapters; Node baseline does not instrument it |
| A2 | `main.rs` native Git operations + UI Fetch-as-Cancel, **NEW_GAP_CONFIRMED** | Keep UI second-click cancellation distinct from two direct native serialized Git command calls; real OperationLock/quit cancellation fixture |
| NM1 | Native monitor cache nested JSON unknown keys, **architectural STOP FACTOR** | Establish security contract and effective Tauri WebView authority before any changed accept/reject/projection behavior; no proven secret exposure |
| O3 | Relay secret OS Keyring adapter | Real injected platform Keyring failure/retry/cancel path; the previously mapped RS1 race is still source-only |
| Q3 | `quota.mjs` popup kind/async status switch x locale x scope | Real imported controller with deferred native callback, last-user-selection precedence |
| LI | `install_qa_linux.sh` | Real pre-sudo failure-path shell tests with isolated command shims; never run privilege-requiring success path on owner host |
| OS | Windows/KDE native acceptance | Real native install, uninstall, tray focus, autostart, WebKit/WebView, OS vault, signing and GUI under exact source SHA |
| Stage 10–12 | Full testing program | Add minimal mutation-sensitive cases **after** global branch/case reconciliation, then one final Strict stable suite and separate flaky/OS checks |

## Why this distinction matters

- `settings.mjs` has an actual fake-native-IPC Settings controller harness but outstanding paths (post-commit Keyring, deferred auth).
- `quota.mjs` has directly imported behavior tests, but the combined Q3 async popup race remains unverified.
- `runner-collector.mjs`, `runner-state.mjs`, `github-monitor.mjs` and `ci-failure-events.mjs` have rich direct real-subject tests with injected external adapters; absence of real native GitHub transport still matters.
- `app.mjs`, `build.rs`, `install_qa_linux.sh`, autostart acceptance scripts and icon importer mostly have structural or source-derived evidence; their dedicated documents explicitly request executable harnesses.
- Cloudflare Worker source tests and signed R2/apt unit tests exercise **real source functions** through fake external services, but not hosted deployment or owner live credentials.
- Because this register is a mapping of **documentation ownership**, the number of maps can increase while completion remains zero. Stage 9 must be selected by missing executable behaviors, not by the map count.

No source/test/CI/secret/host state changed in this register; no test, mutation, release or live provider operation ran. Overall Stages 3–8 still PARTIAL.
