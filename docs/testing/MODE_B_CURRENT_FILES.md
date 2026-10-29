# RepoTicker Mode B — current source file register

**Tree baseline:** `dev` @ `fd5cb98c3ea6e2002d4c3d69ab0a92cb110ebaa1`, 2026-10-28. GitHub recursive tree returned `truncated: false`.
**Historical file-level snapshot:** 72 executable/CI source files and
64 test files on the original date. **Owner update 2026-10-29:**
Mode B is activated BEFORE final independent L10N and OS
acceptance; physical acceptance remains mandatory before v1 release.
The current GitHub tree has 54 Node tests, 8 Python release
test files and 2 Rust integration test files (64 total), plus
embedded Rust tests; four workflows were found in the new tree.
Current source entrypoint maps live under
[Mode B activation](MODE_B_ACTIVATION_2026_10_29.md).
This register alone is not complete Stage 3–8 branch/coverage evidence.

## Inventory interpretation

This is the complete current **file-level** register for the listed source families, replacing the obsolete file counts in the [2026-10-21 preliminary inventory](MODE_B_INVENTORY.md). Files are not equated with independent functions, branches or tests. Before writing Mode B tests, reconcile every function, native command, shell entrypoint, event callback and platform compilation path against this register and complete Stages 3–8 in the owner SSOT.

The repository no longer contains a local `infra/download-worker` source path. Do not claim its code was scanned or that a separate deployed worker was tested. Build/release integrations and external infrastructure require separately grounded evidence.

Risk triage is file-level only: Critical = data integrity, authentication, billing truth, credential privacy or signed distribution; High = native app lifecycle/OS delivery/state races; Medium = presentation and helpers. Assign more precise risk and Unit/Integration/physical levels per function in Stage 3.

## Rust core (6)

| Source path | File-level risk | Function and branch audit |
| --- | --- | --- |
| `crates/repoticker-core/src/bounded.rs` | Critical | Not yet enumerated |
| `crates/repoticker-core/src/config_store.rs` | Critical | Not yet enumerated |
| `crates/repoticker-core/src/git.rs` | Critical | Not yet enumerated |
| `crates/repoticker-core/src/github_auth.rs` | Critical | Not yet enumerated |
| `crates/repoticker-core/src/lib.rs` | Critical | Not yet enumerated |
| `crates/repoticker-core/src/shutdown.rs` | Critical | Not yet enumerated |

## Desktop Rust (16)

| Source path | File-level risk | Function and branch audit |
| --- | --- | --- |
| `apps/desktop/src-tauri/src/app_icon.rs` | Medium | Not yet enumerated |
| `apps/desktop/src-tauri/src/autostart.rs` | High | Not yet enumerated |
| `apps/desktop/src-tauri/src/ci_notifications.rs` | Critical | Not yet enumerated |
| `apps/desktop/src-tauri/src/github_api.rs` | Critical | Not yet enumerated |
| `apps/desktop/src-tauri/src/github_etag_cache.rs` | Medium | Not yet enumerated |
| `apps/desktop/src-tauri/src/github_native.rs` | Critical | Not yet enumerated |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs` | Critical | Not yet enumerated |
| `apps/desktop/src-tauri/src/github_rate_gate.rs` | Critical | Not yet enumerated |
| `apps/desktop/src-tauri/src/github_session.rs` | Critical | Not yet enumerated |
| `apps/desktop/src-tauri/src/linux_surface.rs` | High | Not yet enumerated |
| `apps/desktop/src-tauri/src/linux_tray.rs` | High | Not yet enumerated |
| `apps/desktop/src-tauri/src/main.rs` | High | Not yet enumerated |
| `apps/desktop/src-tauri/src/monitor_cache.rs` | Medium | Not yet enumerated |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs` | Medium | Not yet enumerated |
| `apps/desktop/src-tauri/src/tray_i18n.rs` | Medium | Not yet enumerated |
| `apps/desktop/src-tauri/src/windows_geometry.rs` | High | Not yet enumerated |

## Native build and FFI (2)

| Source path | File-level risk | Function and branch audit |
| --- | --- | --- |
| `apps/desktop/src-tauri/build.rs` | High | Not yet enumerated |
| `apps/desktop/src-tauri/native/wayland_relative_drag.c` | Medium | Not yet enumerated |

## Desktop JavaScript (33)

| Source path | File-level risk | Function and branch audit |
| --- | --- | --- |
| `apps/desktop/ui/about.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/app.mjs` | High | Not yet enumerated |
| `apps/desktop/ui/browser-context-menu.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/card-i18n.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/ci-failure-events.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/github-billing.mjs` | Critical | Not yet enumerated |
| `apps/desktop/ui/github-errors.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/github-installations.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/github-monitor.mjs` | Critical | Not yet enumerated |
| `apps/desktop/ui/locale-auth.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/locale-card.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/locale-catalog.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/locale-counts.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/locale-errors.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/locale-extended.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/locale-plurals.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/locale-surface.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/locale-workflow.mjs` | High | Not yet enumerated |
| `apps/desktop/ui/model.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/monitor-presentation.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/native-drag.mjs` | High | Not yet enumerated |
| `apps/desktop/ui/quota-details.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/quota-size.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/quota.mjs` | High | Not yet enumerated |
| `apps/desktop/ui/repo-menu.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/runner-collector.mjs` | Critical | Not yet enumerated |
| `apps/desktop/ui/runner-state.mjs` | Critical | Not yet enumerated |
| `apps/desktop/ui/scan-refresh.mjs` | High | Not yet enumerated |
| `apps/desktop/ui/settings-i18n.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/settings.mjs` | High | Not yet enumerated |
| `apps/desktop/ui/status-metrics.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/surface-i18n.mjs` | Medium | Not yet enumerated |
| `apps/desktop/ui/view.mjs` | Medium | Not yet enumerated |

## Optional relay (1)

| Source path | File-level risk | Function and branch audit |
| --- | --- | --- |
| `apps/relay-cloudflare/src/index.ts` | Medium | Not yet enumerated |

## Release and acceptance scripts (10)

| Source path | File-level risk | Function and branch audit |
| --- | --- | --- |
| `scripts/accept_autostart_linux.sh` | High | Not yet enumerated |
| `scripts/apt_repository.py` | Critical | Not yet enumerated |
| `scripts/cleanup-published-artifacts.mjs` | Critical | Not yet enumerated |
| `scripts/install_qa_linux.sh` | Medium | Not yet enumerated |
| `scripts/provision_apt_key.sh` | Medium | Not yet enumerated |
| `scripts/r2_release.py` | Critical | Not yet enumerated |
| `scripts/release_assets.py` | Critical | Not yet enumerated |
| `scripts/release_version.py` | Critical | Not yet enumerated |
| `scripts/verify_signing_key.py` | Critical | Not yet enumerated |
| `scripts/verify_signing_passphrase.sh` | Critical | Not yet enumerated |

## CI workflow source (4)

| Source path | File-level risk | Function and branch audit |
| --- | --- | --- |
| `.github/workflows/desktop-acceptance-candidates.yml` | High | Not yet enumerated |
| `.github/workflows/desktop-release-candidates.yml` | High | Not yet enumerated |
| `.github/workflows/preflight.yml` | High | Not yet enumerated |
| `.github/workflows/strict.yml` | High | Not yet enumerated |

## Existing test source (64)

- `crates/repoticker-core/tests/git_integration.rs`
- `crates/repoticker-core/tests/github_remote.rs`
- `tests/about-locale.test.mjs`
- `tests/artifact-retention.test.mjs`
- `tests/autostart-integration.test.mjs`
- `tests/browser-context-menu.test.mjs`
- `tests/card-i18n.test.mjs`
- `tests/ci-failure-events.test.mjs`
- `tests/ci-native-integration.test.mjs`
- `tests/config-persistence.test.mjs`
- `tests/git-concurrency-routing.test.mjs`
- `tests/git-edge-config.test.mjs`
- `tests/git-fetch-cancel.test.mjs`
- `tests/git-process-timeout.test.mjs`
- `tests/git-scan-performance.test.mjs`
- `tests/github-billing.test.mjs`
- `tests/github-errors.test.mjs`
- `tests/github-monitor.test.mjs`
- `tests/github-rest-transport.test.mjs`
- `tests/graceful-quit.test.mjs`
- `tests/hover-fallback.test.mjs`
- `tests/ignored-children.test.mjs`
- `tests/linux-qa-installer.test.mjs`
- `tests/locale-counts-and-notifications.test.mjs`
- `tests/locale-errors.test.mjs`
- `tests/localization-20.test.mjs`
- `tests/metric-refresh-layout.test.mjs`
- `tests/monitor-presentation.test.mjs`
- `tests/native-drag.test.mjs`
- `tests/package-identity.test.mjs`
- `tests/quota-details.test.mjs`
- `tests/quota-surface.test.mjs`
- `tests/repo-local-actions.test.mjs`
- `tests/repo-menu.test.mjs`
- `tests/repo-open-github.test.mjs`
- `tests/runner-collector.test.mjs`
- `tests/runner-state.test.mjs`
- `tests/safe-sync-manual-refresh.test.mjs`
- `tests/scan-refresh.test.mjs`
- `tests/settings-controls.test.mjs`
- `tests/settings-github-confirm.test.mjs`
- `tests/settings-i18n.test.mjs`
- `tests/settings-visual-controls.test.mjs`
- `tests/split-status-hover.test.mjs`
- `tests/surface-i18n.test.mjs`
- `tests/test_release_apt_integration.py`
- `tests/test_release_assets.py`
- `tests/test_release_lockfile_contract.py`
- `tests/test_release_provisioning.py`
- `tests/test_release_r2_contract.py`
- `tests/test_release_retention_contract.py`
- `tests/test_release_signing.py`
- `tests/test_release_version.py`
- `tests/tray-safe-sync.test.mjs`
- `tests/ui-layout.test.mjs`
- `tests/ui.test.mjs`
- `tests/usage-events.test.mjs`
- `tests/windows-card-regressions.test.mjs`
- `tests/windows-git-process.test.mjs`
- `tests/windows-hover-trace.test.mjs`
- `tests/windows-nsis-credential-cleanup.test.mjs`
- `tests/windows-qa-seven-findings.test.mjs`
- `tests/windows-settings-qa.test.mjs`
- `tests/windows-tray-physical-regressions.test.mjs`

## Gaps and next stage

- **Preparatory path scan (not formal Mode B Stage 1):** complete for the above source families; repeat or verify at the post-L10N frozen RC SHA. Include HTML/CSS/JSON/Tauri capabilities as *configuration/UI contracts* in the next artifact-level scan; artwork/DTOs are lower priority, not excluded from packaging integrity.
- **Stage 2 (critical invariants):** local Git FF-only behavior; no unauthorized remote mutation; credential store isolation; truthfulness of unknown remote counters; auth session expiry/revocation; API pagination/rate-limits; native UI focus and popup lifecycle; signed immutable release readback.
- **Stage 3:** incomplete until *every* source method/branch-bearing callback and shell pipeline is mapped to concrete risk, level, expected case count and Positive/N-family applicability.
- **Stage 4–8:** do not infer branch coverage from filenames; build 13-cell Positive/N1–N12 matrix with explicit N/A reasoning and interaction/coverage maps before new Mode B tests.
- **Stage 9–12:** not started in this campaign; no source tests or CI were executed by this documentation-only scan. Existing historical test execution does not prove frozen v1 RC coverage.
- L10N-20 independent contextual signoff and physical KDE/Windows failure-path acceptance remain separate release blockers; see `V1_RELEASE_CAMPAIGN.md`.
