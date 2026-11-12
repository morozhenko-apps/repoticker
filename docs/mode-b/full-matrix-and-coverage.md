# Mode B full-source Positive/N1–N12 matrix and coverage ledger

**Baseline SHA:** `5b07a3273a27516af8ceb793f0d427a1bada964b`.
**Mode:** B Testing. This is a truthful **initial** matrix, not a claimed
completion certificate. All executable source paths (80) from
the Git tree reconcile to the source inventories, no missing production file.

Legend: **✔** Covered only after an inspected executed assertion kills the
relevant outcome; **?** Planned/verification needed (may already have an
applicable baseline test, but assertion-to-branch mapping is pending);
**✖** Not applicable at the file level, with rationales below. Every
cell is explicitly filled. At this stage no unknown branch is silently
converted to ✔. The positive column is intentionally ? throughout until
method-level mapping is complete. The 747 JS + 104 Python and Rust
pass evidence is a *suite* result, not 100% branch coverage.

Function/branch counts are lexical discovery anchors taken from the
inventory appendices, not AST branch coverage percentages. `main.rs`
includes the corrected post-inline-test continuation. Some declarations
and source-only test helpers require manual classification; no additional
test counts are guaranteed by these anchors.

## Stage 5: file-artifact matrix (pending assertion reconciliation)

| Production artifact | Risk | Family | Signatures | Branch anchors | Positive | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 |
| --- | --- | --- | ---: | ---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `apps/desktop/src-tauri/build.rs` | High | native | 3 | 6 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/app_icon.rs` | High | native | 2 | 1 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ✖ | ? | ✖ | ✖ |
| `apps/desktop/src-tauri/src/autostart.rs` | High | native | 2 | 6 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/ci_notifications.rs` | High | native | 5 | 16 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/github_api.rs` | Critical | native | 10 | 81 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/github_etag_cache.rs` | High | native | 10 | 16 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/github_native.rs` | High | native | 21 | 14 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs` | High | native | 14 | 9 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/github_rate_gate.rs` | High | native | 8 | 5 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/github_session.rs` | Critical | native | 30 | 49 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/linux_surface.rs` | High | native | 26 | 41 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/linux_tray.rs` | High | native | 10 | 3 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/main.rs` | Critical | native | 70 | 171 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/monitor_cache.rs` | High | native | 10 | 9 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/relay_endpoint.rs` | Critical | native | 4 | 7 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/relay_secret.rs` | Critical | native | 34 | 34 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/relay_transport.rs` | Critical | native | 16 | 38 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs` | High | native | 11 | 8 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/src-tauri/src/tray_i18n.rs` | High | native | 8 | 7 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ✖ | ? | ✖ | ✖ |
| `apps/desktop/src-tauri/src/windows_geometry.rs` | High | native | 14 | 12 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/about.mjs` | Medium | ui | 4 | 8 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/ui/app.mjs` | Medium | ui | 43 | 111 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/ui/browser-context-menu.mjs` | Medium | ui | 1 | 0 | ? | ? | ? | ✖ | ✖ | ✖ | ? | ✖ | ✖ | ? | ? | ✖ | ✖ |
| `apps/desktop/ui/card-i18n.mjs` | Medium | ui | 4 | 18 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ✖ | ? | ✖ | ✖ |
| `apps/desktop/ui/ci-failure-events.mjs` | Medium | ui | 5 | 33 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/ui/ci-status.mjs` | Medium | ui | 3 | 9 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/ui/github-billing.mjs` | Medium | ui | 11 | 43 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/github-errors.mjs` | Medium | ui | 3 | 7 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ✖ | ? | ✖ | ✖ |
| `apps/desktop/ui/github-installations.mjs` | Medium | ui | 2 | 8 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/ui/github-monitor.mjs` | Medium | ui | 14 | 87 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/locale-auth.mjs` | Medium | locale | 0 | 0 | ? | ✖ | ✖ | ✖ | ✖ | ✖ | ? | ✖ | ? | ✖ | ✖ | ✖ | ✖ |
| `apps/desktop/ui/locale-card.mjs` | Medium | locale | 0 | 0 | ? | ✖ | ✖ | ✖ | ✖ | ✖ | ? | ✖ | ? | ✖ | ✖ | ✖ | ✖ |
| `apps/desktop/ui/locale-catalog.mjs` | Medium | locale | 4 | 5 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/locale-counts.mjs` | Medium | locale | 3 | 4 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/locale-errors.mjs` | Medium | locale | 1 | 2 | ? | ✖ | ✖ | ✖ | ✖ | ✖ | ? | ✖ | ? | ✖ | ✖ | ✖ | ✖ |
| `apps/desktop/ui/locale-extended.mjs` | Medium | locale | 0 | 0 | ? | ✖ | ✖ | ✖ | ✖ | ✖ | ? | ✖ | ? | ✖ | ✖ | ✖ | ✖ |
| `apps/desktop/ui/locale-plurals.mjs` | Medium | locale | 1 | 4 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/locale-surface.mjs` | Medium | locale | 0 | 0 | ? | ✖ | ✖ | ✖ | ✖ | ✖ | ? | ✖ | ? | ✖ | ✖ | ✖ | ✖ |
| `apps/desktop/ui/locale-workflow.mjs` | Medium | locale | 0 | 0 | ? | ✖ | ✖ | ✖ | ✖ | ✖ | ? | ✖ | ? | ✖ | ✖ | ✖ | ✖ |
| `apps/desktop/ui/model.mjs` | Medium | ui | 5 | 15 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ✖ | ? | ✖ | ✖ |
| `apps/desktop/ui/monitor-presentation.mjs` | Medium | ui | 2 | 5 | ? | ? | ? | ✖ | ✖ | ✖ | ? | ✖ | ? | ? | ? | ✖ | ✖ |
| `apps/desktop/ui/native-drag.mjs` | Medium | ui | 2 | 6 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/ui/quota-details.mjs` | Medium | ui | 13 | 24 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/quota-size.mjs` | Medium | ui | 1 | 3 | ? | ? | ? | ✖ | ✖ | ✖ | ? | ✖ | ? | ? | ? | ✖ | ✖ |
| `apps/desktop/ui/quota.mjs` | Medium | ui | 17 | 45 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/repo-menu.mjs` | Medium | ui | 1 | 1 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ✖ | ? | ✖ | ✖ |
| `apps/desktop/ui/repo-row-indicator.mjs` | Medium | ui | 2 | 7 | ? | ? | ? | ✖ | ✖ | ✖ | ? | ✖ | ✖ | ? | ? | ✖ | ✖ |
| `apps/desktop/ui/runner-collector.mjs` | Medium | ui | 6 | 32 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/runner-state.mjs` | Medium | ui | 9 | 28 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/scan-refresh.mjs` | Medium | ui | 3 | 10 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `apps/desktop/ui/settings-i18n.mjs` | Medium | ui | 1 | 3 | ? | ? | ? | ✖ | ✖ | ✖ | ? | ✖ | ✖ | ? | ? | ✖ | ✖ |
| `apps/desktop/ui/settings.mjs` | Critical | ui | 43 | 203 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `apps/desktop/ui/status-metrics.mjs` | Medium | ui | 3 | 1 | ? | ? | ? | ✖ | ✖ | ✖ | ? | ✖ | ✖ | ? | ? | ✖ | ✖ |
| `apps/desktop/ui/surface-i18n.mjs` | Medium | ui | 5 | 16 | ? | ? | ? | ✖ | ✖ | ✖ | ? | ✖ | ✖ | ? | ? | ✖ | ✖ |
| `apps/desktop/ui/view.mjs` | Medium | ui | 4 | 14 | ? | ? | ? | ✖ | ✖ | ✖ | ? | ✖ | ✖ | ? | ? | ✖ | ✖ |
| `apps/relay-cloudflare/src/hub.mjs` | Critical | relay | 7 | 21 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ? |
| `apps/relay-cloudflare/src/index.ts` | Medium | relay | 6 | 0 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ? |
| `apps/relay-cloudflare/src/relay-protocol.mjs` | Medium | relay | 9 | 27 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ✖ |
| `apps/relay-cloudflare/src/webhook-verify.mjs` | Medium | relay | 1 | 4 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ✖ |
| `apps/relay-cloudflare/src/worker.mjs` | Critical | relay | 1 | 18 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ? |
| `crates/repoticker-core/src/bounded.rs` | High | core | 1 | 5 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `crates/repoticker-core/src/config_store.rs` | Critical | core | 15 | 15 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `crates/repoticker-core/src/git.rs` | Critical | core | 68 | 83 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `crates/repoticker-core/src/github_auth.rs` | Critical | core | 14 | 10 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `crates/repoticker-core/src/lib.rs` | High | core | 3 | 6 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `crates/repoticker-core/src/relay.rs` | High | core | 10 | 15 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `crates/repoticker-core/src/shutdown.rs` | High | core | 4 | 0 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `scripts/accept_autostart_linux.sh` | High | tool | 0 | 7 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `scripts/accept_autostart_windows.ps1` | High | tool | 0 | 2 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `scripts/apt_repository.py` | High | tool | 6 | 16 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `scripts/ci-pr-scope.sh` | High | tool | 0 | 5 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `scripts/cleanup-published-artifacts.mjs` | High | tool | 5 | 25 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `scripts/install_qa_linux.sh` | High | tool | 0 | 9 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `scripts/provision_apt_key.sh` | High | tool | 1 | 6 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `scripts/r2_release.py` | Critical | tool | 19 | 94 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `scripts/release_assets.py` | Critical | tool | 6 | 36 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `scripts/release_version.py` | High | tool | 3 | 12 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? |
| `scripts/verify_signing_key.py` | High | tool | 2 | 11 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `scripts/verify_signing_passphrase.sh` | High | tool | 1 | 5 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
| `tools/import_icon.py` | High | tool | 1 | 4 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |

## Applicability rationale for ✖

- N11: **all files**. RepoTicker has no purchase, restore, paid tier,
  subscription unlock or entitlement state. GitHub Actions quota is
  telemetry and is not monetization.
- Pure immutable locale dictionaries: N1/N2/N3/N4/N5/N7/N9/N10/N12
  may be absent in the dictionary because malformed input, network, storage,
  permissions and UI interruption occur in their **consumer** module,
  which remains in this matrix. N6/N8 cover missing or conflicting locale
  keys, fallback and translated time/plural forms.
- Pure formatting/UI-presentation functions: N3/N12 only when they actually
  depend on network/persistence; otherwise errors belong to the calling
  async/persistence controller. N7 security checks belong to native IPC
  and resource allowlists, not every CSS or formatter.
- Pure protocol validators without native view/storage side effects:
  N9/N12 are represented by their Worker/DO ingress and host adapter.
  Rust/JS tests must still prove redacted failure boundaries.
- N8 only when the module participates in clocks, billing/usage periods,
  rate windows, localized output, geometry/DPI, or release metadata; a
  non-time-related parser should not acquire an artificial DST test.
- This classification is **provisional** per code-level predicate; an
  uncovered dependency/side effect must move a cell from ✖ to ? before
  Stage 5 can be signed off. ✖ is never shorthand for 'we did not test it.'

## Stage 8: per-file source Coverage Map (not yet completed)

| Production artifact | Functions/types | Source branch candidates | Covered | Remaining | Inventory |
| --- | ---: | ---: | --- | --- | --- |
| `apps/desktop/src-tauri/build.rs` | 3 | 6 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/app_icon.rs` | 2 | 1 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/autostart.rs` | 2 | 6 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/ci_notifications.rs` | 5 | 16 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_api.rs` | 10 | 81 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_etag_cache.rs` | 10 | 16 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_native.rs` | 21 | 14 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs` | 14 | 9 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_rate_gate.rs` | 8 | 5 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_session.rs` | 30 | 49 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/linux_surface.rs` | 26 | 41 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/linux_tray.rs` | 10 | 3 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/main.rs` | 70 | 171 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/monitor_cache.rs` | 10 | 9 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/relay_endpoint.rs` | 4 | 7 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/relay_secret.rs` | 34 | 34 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/relay_transport.rs` | 16 | 38 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs` | 11 | 8 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/tray_i18n.rs` | 8 | 7 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/windows_geometry.rs` | 14 | 12 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/ui/about.mjs` | 4 | 8 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/app.mjs` | 43 | 111 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/browser-context-menu.mjs` | 1 | 0 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/card-i18n.mjs` | 4 | 18 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/ci-failure-events.mjs` | 5 | 33 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/ci-status.mjs` | 3 | 9 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/github-billing.mjs` | 11 | 43 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/github-errors.mjs` | 3 | 7 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/github-installations.mjs` | 2 | 8 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/github-monitor.mjs` | 14 | 87 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/locale-auth.mjs` | 0 | 0 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-card.mjs` | 0 | 0 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-catalog.mjs` | 4 | 5 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-counts.mjs` | 3 | 4 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-errors.mjs` | 1 | 2 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-extended.mjs` | 0 | 0 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-plurals.mjs` | 1 | 4 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-surface.mjs` | 0 | 0 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-workflow.mjs` | 0 | 0 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/model.mjs` | 5 | 15 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/monitor-presentation.mjs` | 2 | 5 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/native-drag.mjs` | 2 | 6 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/quota-details.mjs` | 13 | 24 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/quota-size.mjs` | 1 | 3 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/quota.mjs` | 17 | 45 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/repo-menu.mjs` | 1 | 1 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/repo-row-indicator.mjs` | 2 | 7 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/runner-collector.mjs` | 6 | 32 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/runner-state.mjs` | 9 | 28 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/scan-refresh.mjs` | 3 | 10 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/settings-i18n.mjs` | 1 | 3 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-final.md](inventory-ui-final.md) |
| `apps/desktop/ui/settings.mjs` | 43 | 203 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/status-metrics.mjs` | 3 | 1 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-final.md](inventory-ui-final.md) |
| `apps/desktop/ui/surface-i18n.mjs` | 5 | 16 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-final.md](inventory-ui-final.md) |
| `apps/desktop/ui/view.mjs` | 4 | 14 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-ui-final.md](inventory-ui-final.md) |
| `apps/relay-cloudflare/src/hub.mjs` | 7 | 21 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `apps/relay-cloudflare/src/index.ts` | 6 | 0 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `apps/relay-cloudflare/src/relay-protocol.mjs` | 9 | 27 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `apps/relay-cloudflare/src/webhook-verify.mjs` | 1 | 4 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `apps/relay-cloudflare/src/worker.mjs` | 1 | 18 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/bounded.rs` | 1 | 5 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/config_store.rs` | 15 | 15 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/git.rs` | 68 | 83 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/github_auth.rs` | 14 | 10 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/lib.rs` | 3 | 6 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/relay.rs` | 10 | 15 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/shutdown.rs` | 4 | 0 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-core-relay.md](inventory-core-relay.md) |
| `scripts/accept_autostart_linux.sh` | 0 | 7 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/accept_autostart_windows.ps1` | 0 | 2 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/apt_repository.py` | 6 | 16 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/ci-pr-scope.sh` | 0 | 5 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/cleanup-published-artifacts.mjs` | 5 | 25 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/install_qa_linux.sh` | 0 | 9 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/provision_apt_key.sh` | 1 | 6 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/r2_release.py` | 19 | 94 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/release_assets.py` | 6 | 36 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/release_version.py` | 3 | 12 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/verify_signing_key.py` | 2 | 11 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/verify_signing_passphrase.sh` | 1 | 5 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `tools/import_icon.py` | 1 | 4 lexical | Not measured per branch; candidate source suites indexed | Exact assertions and platform outcomes unverified | [inventory-release-tooling.md](inventory-release-tooling.md) |

## Stage 7 initial estimate and remaining work

The lexical source inventory has 707 named
function/type candidates and 1721 branch/return
anchors across 80 source artifacts (including inline native
test declarations that require classification). This is **not** a count
of required new tests. For each executable branch, estimate at least
one test for each distinct observable outcome, then fold compatible
boundaries with table-driven cases only when assertions stay mutation
sensitive. Existing tests must be credited first by **exact assertion**,
not by name similarity.

Planned/verification-needed matrix cells by category:
- Positive: 80 ? and 0 ✖ across 80 files.
- N1: 74 ? and 6 ✖ across 80 files.
- N2: 74 ? and 6 ✖ across 80 files.
- N3: 66 ? and 14 ✖ across 80 files.
- N4: 66 ? and 14 ✖ across 80 files.
- N5: 66 ? and 14 ✖ across 80 files.
- N6: 80 ? and 0 ✖ across 80 files.
- N7: 66 ? and 14 ✖ across 80 files.
- N8: 43 ? and 37 ✖ across 80 files.
- N9: 63 ? and 17 ✖ across 80 files.
- N10: 74 ? and 6 ✖ across 80 files.
- N11: 0 ? and 80 ✖ across 80 files.
- N12: 58 ? and 22 ✖ across 80 files.

**Priority:** complete source/branch-to-test reconciliation and all
meaningful cross-module interaction combinations, then determine precise
missing test count. Stage 9 cannot begin from this matrix alone.

The relay subsystem already has a **manually inspected** method map in
[branch-map-relay.md](branch-map-relay.md), including nine grouped planned
cases. Other systems have source-derived branch anchors in the linked
inventories but lack an assertion-linked map.

## Completion assessment

All seven Stage 12 questions remain **NO/UNVERIFIED** globally until
per-method branches have at least one tested observable outcome, required
N-cells are ✔ or justified ✖, and cross-component scenarios have
deterministic tests plus physical host acceptance where meaningful.
