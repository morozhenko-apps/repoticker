# Mode B full-source Positive/N1–N12 matrix and coverage ledger

**Baseline SHA:** `5b07a3273a27516af8ceb793f0d427a1bada964b`.
**Branch-map ownership reconciliation:** see [source-map-reconciliation-register.md](source-map-reconciliation-register.md). All 80 production files now route to a focused source map (one map may focus on multiple closely related files); no group-only or inventory-only rows remain. This is documentation ownership **only**: original question marks remain unresolved pending full method-level E/P/OS/NA and applicable N1–N12 outcomes. The [Stage 3–8 assertion closure queue](stage-3-8-assertion-closure-queue.md) lists concrete independent remaining proof.

**Source equivalence:** the later `dev` SHA
`a3ba7fa30fc4c81890d3075f94142942d001cbf3` contains 21 later
commits touching Markdown files only (GitHub compare: ahead 21, behind 0,
no non-Markdown changes). The 80-file source inventory is therefore still
source-correct; all subsequently inspected branch-map blobs are anchored
to this unchanged production source. The initial `?` matrix cells express
**uncompleted exhaustive branch evidence**, not an assertion that the
baseline tests fail or that no behavior is covered.

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

### Read-only cross-register consistency checkpoint (2026-11-14)

The [global evidence reconciliation](stage-3-8-global-evidence-consistency.md) verified the 80-path source, Stage 5 and Stage 8 sets plus 80 method-file headings against the exact immutable `dev` Git tree. The **80 × 13** Stage 5 cells contain **810 `?`**, **230 `✖`**, and **zero `✔`**; this is an *evidence migration deficit*, not zero existing test coverage. Do not promote a file-level cell until every applicable executable branch has inspected independent real assertions. The legacy source branch-anchor total (~1,721) is lexical only.

### Stage 3 source-line reconciliation correction (2026-11-15)

[Confirmed 11 omitted callable declarations](stage-3-lexical-reconciliation-2026-11-15.md) increase the provisional numbered inventory from 708 to 719 plus nine placeholders (728 total). Four `Functions/types` counters were updated (Worker 1→5, Hub 7→10, CI tracker 5→7, drag 2→4), but **their branch totals remain old lexical estimates** pending a per-method AST/count reconciliation. Stage 5 statuses remain 810 `?`, 230 provisional `✖`, 0 `✔`. No AST signoff.

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
| `apps/desktop/ui/ci-failure-events.mjs` | Medium | ui | 7 | 33 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
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
| `apps/desktop/ui/native-drag.mjs` | Medium | ui | 4 | 6 | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ? | ✖ | ? |
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
| `apps/relay-cloudflare/src/hub.mjs` | Critical | relay | 10 | 21 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ? |
| `apps/relay-cloudflare/src/index.ts` | Medium | relay | 6 | 0 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ? |
| `apps/relay-cloudflare/src/relay-protocol.mjs` | Medium | relay | 9 | 27 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ✖ |
| `apps/relay-cloudflare/src/webhook-verify.mjs` | Medium | relay | 1 | 4 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ✖ |
| `apps/relay-cloudflare/src/worker.mjs` | Critical | relay | 5 | 18 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ✖ | ? | ✖ | ? |
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

### Stage 4–8 first per-branch evidence transfer (2026-11-14)

The [exact source-guard-to-test crosswalk](method-evidence-crosswalk-ui-worker.md) transfers *partial* direct assertions for four files into their Stage 8 `Covered`/`Remaining` cells. Existing tests: 41 reviewed, 37 invoke actual production methods, 4 only inspect source text. Since relevant N1–N12 outcomes remain P or physical OS/HOST, **Stage 5 remains 810 `?`, 230 `✖`, 0 `✔`**; do not equate a changed Stage 8 row with a fully covered file.

### Stage 4–8 second source-assertion migration (2026-11-14)

[Actual monitor-projection test-to-guard crosswalk](method-evidence-crosswalk-monitor-projections.md) adds partial E/I source assertions to Stage 8 Covered/Remaining for `status-metrics.mjs`, `github-installations.mjs`, `ci-status.mjs` and `github-errors.mjs`. The first crosswalk migrated scan/gesture/Worker; **eight of 80 Stage 8 rows now have directly inspected case receipts, not completed branch signoff**. Stage 5 remains **810 `?`, 230 `✖`, 0 `✔`**.

### Stage 4–8 third evidence transfer: real Rust Git and JSON persistence (2026-11-14)

[Crosswalk for real disposable Git remotes and 15 Rust config-store tests](method-evidence-crosswalk-core-git-config.md) now fills Stage 8 E/P evidence in `crates/repoticker-core/src/git.rs` and `config_store.rs`. This is **10 of 80 Stage 8 file rows** with exact sourced assertions/remaining gaps. A2 native Git dispatcher and OS file/storage acceptance remain unverified. **No Stage 5 cell is promoted:** 810 `?`, 230 `✖`, 0 `✔`.

### Stage 4–8 fourth evidence transfer: actual Settings WebView controller (2026-11-14)

[Actual Settings module imported with deterministic DOM/Tauri harness](method-evidence-crosswalk-settings-controller.md), with selected exact assertions for Save/Cancel, OAuth generation, Relay draft and postcommit Keyring readback, now populates Stage 8 `settings.mjs` E/P. The suite contains 132 test bodies; **only the cited representative assertions are manually remapped here**. **Eleven of 80 Stage 8 rows** carry direct crosswalk receipts. Native `relay_secret.rs` is not deemed proven by JS fake IPC. Stage 5 remains 810 `?`, 230 `✖`, no `✔`.

### Stage 4–8 fifth exact evidence transfer: Quota and native GitHub OAuth (2026-11-14)

[Real source-to-test receipts](method-evidence-crosswalk-quota-native-oauth.md) now map `quota.mjs`, `github_native.rs`, and `github_session.rs`. The Quota harness imports the real controller and fakes only Tauri APIs; native Rust tests prove pure `CredentialRecord`/manager guards, not OS Keyring or GitHub HTTP. Across five crosswalks, **14 of 80 Stage 8 file rows** have exact E/P/OS links, with **zero fully signed file coverage gates**. Stage 5 remains 810 `?` / 230 provisional `✖` / zero `✔`.

### Stage 4–8 large-batch crosswalk: 17 risk-heavy files (2026-11-14)

[Relay/Keyring](bulk-crosswalk-relay.md), [GitHub REST/cache/monitor](bulk-crosswalk-github.md) and [native lifecycle](bulk-crosswalk-native.md) reconcile **17 additional source files** with real branch/test evidence and separately named P/OS/HOST gaps. Across previous 14 source receipts plus these 17, **31 of 80 Stage 8 rows have inspected crosswalk links**; **30 files have partial executable E/I receipts, one (`autostart.rs`) is deliberately S-only**. This is source accounting, not runtime branch coverage. Stage 5 remains 810 `?`, 230 provisional `✖`, 0 `✔`; no negative cell is promoted solely by a test title or count.

### Stage 4–8 second large batch: 25 additional UI and platform files (2026-11-14)

[Card/Git/runner/CI assertions](bulk-crosswalk-ui-domain.md), [About/i18n/RTL assertions](bulk-crosswalk-ui-locale.md), and [Linux/Windows native evidence distinctions](bulk-crosswalk-platform.md) add **25 source-specific Stage 8 receipts** (19 UI + 6 native). **22 new rows contain partial executable E/I; three (`linux_surface.rs`, `linux_tray.rs`, `app_icon.rs`) are S/OS only.** Combined with the prior 31 receipts, **56/80** Stage 8 rows now have detailed crosswalk links: **52 E/I partial, 4 S/P only**, **zero file-wide completed signoffs**. Stage 5 remains **810 `?`, 230 provisional `✖`, 0 `✔`**; a linked row is not evidence of full coverage.

### Stage 4–8 final remaining-file crosswalk: all 24 source paths, not a signoff (2026-11-14)

Three [core entrypoint](bulk-crosswalk-core-entrypoints.md), [locale dictionary](bulk-crosswalk-locale-dictionaries.md), and [release tooling](bulk-crosswalk-release-tooling.md) source-to-existing-test ledgers classify the final **24** previously-unlinked paths as **11 E (real subject partial)**, **8 S (source/syntax only)** and **5 D (dictionary value assertions, no owned functions)**. All **80/80** Stage 8 file rows now have explicit E/P/OS/S/D evidence links and remaining obligations; total breakdown **63 E, 12 S, 5 D**. **This is 100% file *index routing*, not code, branch, scenario or MODE B completion.** No Stage 5 cell was promoted: **810 `?`, 230 provisional `✖`, 0 `✔`**. Stage 3 AST completeness and actual method-by-method branch coverage still pending.

### Stage 3–4 event-flow reconciliation: five critical controllers (2026-11-15)

[Source-exact event registration ownership](stage-3-ui-event-handler-ownership.md) identifies **27 grouped callback/event flows**, *not additive* to the provisional 728 numbered+placeholder source records. The 9 Card groups are still **P_CONTROLLER/A1** (no actual app.mjs imported-controller harness), while Settings, Quota, GitHub Monitor and About have selected real E_PARTIAL imported-module assertions with injected **external** Tauri APIs. Full anonymous function AST count and negative category closure remain unknown; no Stage 5 status or Stage 8 file count is promoted.

## Stage 8: per-file source Coverage Map (not yet completed)

| Production artifact | Functions/types | Source branch candidates | Covered | Remaining | Inventory |
| --- | ---: | ---: | --- | --- | --- |
| `apps/desktop/src-tauri/build.rs` | 3 | 6 lexical | [S only structural evidence](bulk-crosswalk-core-entrypoints.md): build.rs:3 execute verifies tool exit/UTF-8; :17 conditional Linux wayland-scanner/pkg-config/CC bridge; CI candidate-path contracts assert workflows, no d | Linux pkg-config absent/invalid XML, failed scanner/CC/ar, path containing spaces, non-Linux target skip, actual native candidate compile and linker acceptance | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/app_icon.rs` | 2 | 1 lexical | [S ONLY PNG/icon source declaration](bulk-crosswalk-platform.md); no direct byte test | P actual 32x32 RGBA/ARGB pixel order, OS KDE/Win tray rendering | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/autostart.rs` | 2 | 6 lexical | [S ONLY: source contracts, no native invocation](bulk-crosswalk-native.md) | P actual plugin enable/disable/readback/rollback and KDE/Win acceptance | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/ci_notifications.rs` | 5 | 16 lexical | [E: 2 Rust text/scope tests](bulk-crosswalk-native.md) | P actual ci_run_notify OS plugin, permission and late scope cancellation | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_api.rs` | 10 | 81 lexical | [E: 13 Rust route/projection/error tests](bulk-crosswalk-github.md) | P live native get/HTTP+vault binding, bounded network and real 304 | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_etag_cache.rs` | 10 | 16 lexical | [E: 13 Rust ETag generations/race tests](bulk-crosswalk-github.md) | P vault-gated native token+ETag, real 304/auth rotation | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_native.rs` | 21 | 14 lexical | [4 real native Rust pure-record assertions](method-evidence-crosswalk-quota-native-oauth.md): form, JSON, Debug, expiry | ON1–ON3 denied/no-entry Keyring, full HTTP 8192 cap/statuses, Linux/Windows vault OS | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs` | 14 | 9 lexical | [E: 8 Rust OAuth parsing tests](bulk-crosswalk-github.md) | P real OAuth HTTP reader 8191/8192/8193, redirects, Keyring | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_rate_gate.rs` | 8 | 5 lexical | [E: 7 Rust rate/backoff tests](bulk-crosswalk-github.md) | P native HTTP cooldown/clock and retry integration | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/github_session.rs` | 30 | 49 lexical | [6 Rust direct helper/manager assertion tests](method-evidence-crosswalk-quota-native-oauth.md); one hardcoded-label test excluded | AS1–AS6 native AppHandle commands, epoch/publish races, vault+ETag, OS clipboard and security gate | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/linux_surface.rs` | 26 | 41 lexical | [S ONLY GTK/Wayland source checks](bulk-crosswalk-platform.md); no real Rust subject tests | OS KDE drag, resize, callback lifecycle and monitor placement | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/linux_tray.rs` | 10 | 3 lexical | [S ONLY native KSNI source checks](bulk-crosswalk-platform.md); no subject tests | OS KDE DBus registration/menu/icon/actions | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/main.rs` | 70 | 171 lexical | [E real-subject evidence](bulk-crosswalk-core-entrypoints.md): 11 real Rust inline test bodies: main.rs:791,800 footer anchor with DPI; :1462,1486,1513 action-admission Safe Sync/Fetch/unknown; :1525,1540,1561,1575,159 | A2 real execute/perform_git_action Tauri command operation lock, cancel_git_fetch and request_quit; actual UI window IPC, OS tray, Settings Save/close and Keyring, all re | [inventory-desktop-rust-core.md](inventory-desktop-rust-core.md) |
| `apps/desktop/src-tauri/src/monitor_cache.rs` | 10 | 9 lexical | [E: 2 Rust default/serialization tests](bulk-crosswalk-native.md) | P actual github_monitor_publish, 262144/262145, NM1 trust STOP | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/relay_endpoint.rs` | 4 | 7 lexical | [E: 2 Rust URL and WSS origin tests](bulk-crosswalk-relay.md) | P URL 511/512/513 and public-host/IDNA edge, real TLS endpoint | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/relay_secret.rs` | 34 | 34 lexical | [E: 4 Rust secret/draft tests](bulk-crosswalk-relay.md); JS Keyring is stubbed | P native Keyring read/write/delete, Settings authorization, RS1/RS2 STOP and OS | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/relay_transport.rs` | 16 | 38 lexical | [E: 2 Rust pure state/backoff tests](bulk-crosswalk-relay.md); WSS runtime not executed | P native WSS run/restart, fallback/reconcile, auth+secret races and OS/HOST | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs` | 11 | 8 lexical | [E real allowed_stage Rust test](bulk-crosswalk-platform.md) | P actual startup file logging, permission/redaction and env opt-in | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/tray_i18n.rs` | 8 | 7 lexical | [E 3 real Rust native locale tests](bulk-crosswalk-platform.md) | OS tray menu action/translation dispatch after changes | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/src-tauri/src/windows_geometry.rs` | 14 | 12 lexical | [E 4 real Rust placement tests](bulk-crosswalk-platform.md) | OS Win32 save/restore/SetWindowPos/clip and multi-DPI | [inventory-native-surfaces.md](inventory-native-surfaces.md) |
| `apps/desktop/ui/about.mjs` | 4 | 8 lexical | [E real About module import/locale handlers](bulk-crosswalk-ui-locale.md) | P WebView native Close/drag/reopen and stale IPC | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/app.mjs` | 43 | 111 lexical | [S only structural evidence](bulk-crosswalk-core-entrypoints.md): Current inspected UI suites use imported helper modules (view, scan-refresh, github-monitor) and app.mjs source regex such as tests/ui-layout.test.mjs:40-4 | A1 essential: actual app.mjs import in faithful DOM with fake external Tauri IPC/event only; duplicate callbacks, scan-vs-monitor-vs-locale revisions, Fetch/Sync progress | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/browser-context-menu.mjs` | 1 | 0 lexical | [E real contextmenu prevention](bulk-crosswalk-ui-locale.md); other-window regex S | P GTK/Win native context menu and touch long-press | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/card-i18n.mjs` | 4 | 18 lexical | [E real card translation/accessibility tests](bulk-crosswalk-ui-locale.md) | P real screen-reader and all dynamic notices/RTL | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/ci-failure-events.mjs` | 7 | 33 lexical | [E 19 direct tracker/CI collector tests](bulk-crosswalk-ui-domain.md) | P native notification after logout and actual OS delivery | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/ci-status.mjs` | 3 | 9 lexical | [4 actual CI identity tests](method-evidence-crosswalk-monitor-projections.md) success/failure/unknown and scope | CI1–CI3 100/101 observations, malformed scopes and caller race | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/github-billing.mjs` | 11 | 43 lexical | [E: 14 direct billing tests](bulk-crosswalk-github.md) plus same-source race suite | P actual authenticated billing 403/429, cross-controller Quota/Settings | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/github-errors.mjs` | 3 | 7 lexical | [4 real finite-error tests](method-evidence-crosswalk-monitor-projections.md), 20-locale consumer | GE1–GE2 aliases, priority ties, hostile provider text DOM sink | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/github-installations.mjs` | 2 | 8 lexical | [7 actual installation/collector tests](method-evidence-crosswalk-monitor-projections.md): empty, corrupt, dedup, 100/101 | INS1–INS3 10 full pages, page-2 GET error, stale account/scope | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/github-monitor.mjs` | 14 | 87 lexical | [E: real monitor controller assertions](bulk-crosswalk-github.md), 30 main tests plus race suites | P 3-account async publish race, native auth/REST/ETag, Card A1 | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/locale-auth.mjs` | 0 | 0 lexical | [D dictionary value evidence](bulk-crosswalk-locale-dictionaries.md): AUTH_TERMS immutable locale dictionary (no own functions); tests/localization-20.test.mjs:56 merges bundles and asserts all translated source keys, exact p | Full correct security semantics for each locale, fallback and native error redaction are consumer obligations; dictionary itself cannot prove secure events | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-card.mjs` | 0 | 0 lexical | [D dictionary value evidence](bulk-crosswalk-locale-dictionaries.md): CARD_TERMS immutable data; tests/localization-20.test.mjs:147 validates each extra locale key, placeholder count, fast-forward/no-force/cancel wording and  | Full 20-locale accessibility, all locale plural values and actual app.mjs screen-reader/RTL UI A1, OS text rendering | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-catalog.mjs` | 4 | 5 lexical | [E canonical 20-locale catalog/helpers](bulk-crosswalk-ui-locale.md) | P localeName exhaustive and real OS font/RTL rendering | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-counts.mjs` | 3 | 4 lexical | [E real repositorySelectionMessage](bulk-crosswalk-ui-locale.md) | P unsafe max counts, inconsistent selection, locale fallback | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-errors.mjs` | 1 | 2 lexical | [E fixed error/20-locale mapping](bulk-crosswalk-ui-locale.md), unknown remains raw | P caller sink sanitization, unknown token/OS path redaction | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-extended.mjs` | 0 | 0 lexical | [D dictionary value evidence](bulk-crosswalk-locale-dictionaries.md): EXTENDED_TERMS dictionary, no callable source methods; tests/localization-20.test.mjs:56 checks all UI source keys and placeholders; :77 explicitly forbids | Dynamic Settings errors/reopen/OAuth/persistence across locales and true UI host language updates; source fixture parity not translated accuracy review | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-plurals.mjs` | 1 | 4 lexical | [E real 20-locale localizedGitCount](bulk-crosswalk-ui-locale.md) | P full grammatical number boundaries and large count | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-surface.mjs` | 0 | 0 lexical | [D dictionary value evidence](bulk-crosswalk-locale-dictionaries.md): SURFACE_TERMS dictionary, no own functions; tests/localization-20.test.mjs:56 completeness and :101 meaning constraints; tests/surface-i18n.test.mjs:41,72, | Actual detached Quota/About DOM and native screen readers, path/secret sink, bidi wrapping and max text size | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/locale-workflow.mjs` | 0 | 0 lexical | [D dictionary value evidence](bulk-crosswalk-locale-dictionaries.md): WORKFLOW_TERMS immutable dictionary; tests/localization-20.test.mjs:56 coverage of source key set and placeholders; :101 technical semantics through coreTe | Untrusted repository names, auth device code and Git ref stay untouched during actual view transitions; native settings/tray locale behavior | [inventory-locales.md](inventory-locales.md) |
| `apps/desktop/ui/model.mjs` | 5 | 15 lexical | [E real summarize/safeRunUrl](bulk-crosswalk-ui-domain.md) from ui.test | P URL trust mismatch with safeActionsJobUrl, opener policy STOP | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/monitor-presentation.mjs` | 2 | 5 lexical | [E real monitor merge/reconcile](bulk-crosswalk-ui-domain.md) | P native publish/AppHandle and nested runner_state NM1 STOP | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/native-drag.mjs` | 4 | 6 lexical | [gesture: 4 real method tests](method-evidence-crosswalk-ui-worker.md) (1 static wiring check separated) | DG1–DG2 rejected stop/old session; real pointer capture and KDE seat OS | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/quota-details.mjs` | 13 | 24 lexical | [E real hover projections/grapheme tests](bulk-crosswalk-ui-domain.md) | P invalid dates, hostile provider text DOM and physical tooltip | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/quota-size.mjs` | 1 | 3 lexical | [E real usageHeight test](bulk-crosswalk-ui-domain.md), GTK structural tests excluded | P extreme invalid heights and real GTK resize | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/quota.mjs` | 17 | 45 lexical | [real Quota import & 10 controller assertions](method-evidence-crosswalk-quota-native-oauth.md): stale replies, redacted error, billing scope, locale | Q1–Q3 listener failure, same-scope request coalescing, hostile names/RTL, actual Tauri popup HOST | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/repo-menu.mjs` | 1 | 1 lexical | [E real menu placement](bulk-crosswalk-ui-domain.md), source-only app wiring separately | P zero/NaN geometry, physical keyboard+scroll dismissal | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/repo-row-indicator.mjs` | 2 | 7 lexical | [E real Git priority/CI fallback](bulk-crosswalk-ui-domain.md) | P stale repo identity and real Card indicator renderer A1 | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/runner-collector.mjs` | 6 | 32 lexical | [E 22 direct collector tests](bulk-crosswalk-ui-domain.md), bounded nested GETs, no false zero | P three-account/pagination race, native REST failures | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/runner-state.mjs` | 9 | 28 lexical | [E 15 real runner summary tests](bulk-crosswalk-ui-domain.md), malformed and lanes | P huge counts, duplicates across scope and time provenance | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/scan-refresh.mjs` | 3 | 10 lexical | [scan/queue: 5 real method tests](method-evidence-crosswalk-ui-worker.md) (2 source-only tests separated) | SC1–SC2 callback exceptions, reentrant invalidation; A1 DOM/Tauri event/scan race and OS gate | [inventory-ui-utilities.md](inventory-ui-utilities.md) |
| `apps/desktop/ui/settings-i18n.mjs` | 1 | 3 lexical | [E real Settings locale/label tests](bulk-crosswalk-ui-locale.md) | P all dynamic Save/error translations in live Settings | [inventory-ui-final.md](inventory-ui-final.md) |
| `apps/desktop/ui/settings.mjs` | 43 | 203 lexical | [real imported Settings controller assertions](method-evidence-crosswalk-settings-controller.md) for OAuth, Save/Cancel and Relay draft | ST1–ST6 native Keyring, multi-write interruption, reopen/auth race, OS UI and boundary inputs | [inventory-ui-controllers.md](inventory-ui-controllers.md) |
| `apps/desktop/ui/status-metrics.mjs` | 3 | 1 lexical | [compactStatus direct source assertions](method-evidence-crosswalk-monitor-projections.md); shown through real consumer | MP1–MP3 zero/MAX/unsafe sum, invalid independent coverage, real Card DOM | [inventory-ui-final.md](inventory-ui-final.md) |
| `apps/desktop/ui/surface-i18n.mjs` | 5 | 16 lexical | [E real translated hover projection](bulk-crosswalk-ui-locale.md) | P RTL provider text actual DOM, malformed nested input | [inventory-ui-final.md](inventory-ui-final.md) |
| `apps/desktop/ui/view.mjs` | 4 | 14 lexical | [E real view/height/Git readiness helpers](bulk-crosswalk-ui-domain.md) | P invalid repository counts and real app/window resize A1 | [inventory-ui-final.md](inventory-ui-final.md) |
| `apps/relay-cloudflare/src/hub.mjs` | 10 | 21 lexical | [E: 19 real controller + in-memory SQLite tests](bulk-crosswalk-relay.md), idempotence/rollback/sockets | P live DO/Cloudflare hibernation, WebSocket limit 8/9 and revocation while connected | [inventory-core-relay.md](inventory-core-relay.md) |
| `apps/relay-cloudflare/src/index.ts` | 6 | 0 lexical | [S only structural evidence](bulk-crosswalk-core-entrypoints.md): index.ts:1-26 wires default fetch to real handleRelayRequest and exports RelayHub DurableObject forwarding fetch/webSocketMessage/webSocketClose to tested  | Actual Workers runtime module import and binding construction, WebSocketPair/DO alarm and socket hibernation; wrong/missing env credentials and DO instance failure; exact | [inventory-core-relay.md](inventory-core-relay.md) |
| `apps/relay-cloudflare/src/relay-protocol.mjs` | 9 | 27 lexical | [E: 23 direct protocol tests](bulk-crosswalk-relay.md), exact name/cursor/bearer and body limits | P 48/49 query edge, crypto failures, signed Worker→Hub and hosted streams | [inventory-core-relay.md](inventory-core-relay.md) |
| `apps/relay-cloudflare/src/webhook-verify.mjs` | 1 | 4 lexical | [HMAC: 4 real method tests](method-evidence-crosswalk-ui-worker.md) (1 static entrypoint check separated) | WH1 empty bytes/crypto exceptions; Worker size boundary and hosted adapter | [inventory-core-relay.md](inventory-core-relay.md) |
| `apps/relay-cloudflare/src/worker.mjs` | 5 | 18 lexical | [Worker: 24 real method tests](method-evidence-crosswalk-ui-worker.md) with DO stub (not hosted Worker) | RW1–RW5 signed boundary, exceptions, browser-header/query, Worker→Hub and HOST gate | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/bounded.rs` | 1 | 5 lexical | [E: 5 Rust actual bounded-worker tests](bulk-crosswalk-native.md) | P 1/overlength edge, native Git identity/progress under cancellation | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/config_store.rs` | 15 | 15 lexical | [15 actual inline Rust config assertions](method-evidence-crosswalk-core-git-config.md): backup, corruption, 16-thread mutex, Unix 0600 | P atomic write/fsync failures, mutex poison, external writer/Windows ACL and physical interruption | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/git.rs` | 68 | 83 lexical | [actual Rust Git fixture & process assertions](method-evidence-crosswalk-core-git-config.md): 30 integration annotations + checked inline guards | P same-count upstream races, malformed refs, native A2 lock/Quit, Windows owned-process cancellation | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/github_auth.rs` | 14 | 10 lexical | [E real-subject evidence](bulk-crosswalk-core-entrypoints.md): 14 genuine inline Rust tests: github_auth.rs:176 rejects forged verification URI/invalid code/expiration overflow; :199 polling min=5s; :212 slow_down 5->1 | Actual github_session manager async HTTP/wait/Keyring event path; clock callback while in transit, malformed nested response combinations and concurrent cancel versus gra | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/lib.rs` | 3 | 6 lexical | [E real-subject evidence](bulk-crosswalk-core-entrypoints.md): 8 inline Rust tests lib.rs:71,79,84,90,97,104,111,134 call actual classify_sync for clean up-to-date, fast forward, ahead/diverged, dirty, in-progress, no  | Tauri observation/decision snapshot consistency during concurrent Git mutation; pure enum classification mostly exercised, but full file/interaction completion not inferr | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/relay.rs` | 10 | 15 lexical | [E: 5 actual Rust frame/cursor tests](bulk-crosswalk-relay.md), strict frames and gap/replay | P frame 2048, max cursor, reset/reconnect native WSS | [inventory-core-relay.md](inventory-core-relay.md) |
| `crates/repoticker-core/src/shutdown.rs` | 4 | 0 lexical | [E: 3 Rust actual shutdown-state tests](bulk-crosswalk-native.md) | P native Tauri Quit + Fetch/Sync IPC and host termination | [inventory-core-relay.md](inventory-core-relay.md) |
| `scripts/accept_autostart_linux.sh` | 0 | 7 lexical | [S only structural evidence](bulk-crosswalk-release-tooling.md): Read-only Linux OS acceptance helper (41 lines) checks running process count/XDG autostart entries without printing full Exec; tests/autostart-integration. | Real Linux XDG autostart state before/after toggles, wrong old executable and no sensitive path logging; no physical acceptance run | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/accept_autostart_windows.ps1` | 0 | 2 lexical | [S only structural evidence](bulk-crosswalk-release-tooling.md): Read-only Windows PowerShell Run-key/process inventory; no discovered automated direct invocation of this .ps1, neighboring Settings/native source-contract | Actual registry Run state under unprivileged Windows, missing key and legacy executable, sensitive value redaction; OS Windows acceptance | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/apt_repository.py` | 6 | 16 lexical | [E real-subject evidence](bulk-crosswalk-release-tooling.md): tests/test_release_apt_integration.py:18 imports actual apt_repository, builds disposable DEB and GPG signed flat APT repository and tests apt-get update/a | Exact out-of-space/permission/expired GPG, malformed control fields, rollback after partial signing and privileged environment; this conditional test is source evidence,  | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/ci-pr-scope.sh` | 0 | 5 lexical | [E real-subject evidence](bulk-crosswalk-release-tooling.md): tests/test_ci_policy.py:107 creates disposable real Git merge commits and actually runs bash ci-pr-scope.sh; asserts README/docs-only false, rename both di | CI GitHub untrusted merge refs, symlink path and SHA replacement, actual GitHub PR workflow event context/permissions; no live CI invocation | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/cleanup-published-artifacts.mjs` | 5 | 25 lexical | [E real-subject evidence](bulk-crosswalk-release-tooling.md): tests/artifact-retention.test.mjs:40-294 calls real validateR2Receipt/deletePublishedArtifacts with mocked external HTTP request only; :77 deletes exactly  | Real protected GitHub credentials, HTTP 403/429 Retry-After and eventual consistency; must not DELETE a real release for testing | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/install_qa_linux.sh` | 0 | 9 lexical | [S only structural evidence](bulk-crosswalk-release-tooling.md): tests/linux-qa-installer.test.mjs:10 uses bash -n (syntax execution only) and regex asserts exact SHA/DEB/version verification, payload cmp before exec, ma | Isolated package install/rollback with genuine .deb and one running process, collision, interrupted sudo, wrong architecture and path quoting. Physical Debian/Ubuntu acce | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/provision_apt_key.sh` | 1 | 6 lexical | [S only structural evidence](bulk-crosswalk-release-tooling.md): tests/test_release_provisioning.py:73 checks text ordering of verify_signing_passphrase.sh before GitHub secret set, not direct provision script execution. | Protected GitHub environment/secret write and private backup mount; must not run provision or access real signing secrets; mock restricted external boundaries if future t | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/r2_release.py` | 19 | 94 lexical | [E real-subject evidence](bulk-crosswalk-release-tooling.md): tests/test_release_r2_contract.py has many direct offline calls against real publication functions; :121 exact signed APT/source map; :383 latest.json publ | Protected R2/Cloudflare credentials and actual public CDN consistency, transient DNS/429/503 and rollback across partial publication, race with external publisher; no liv | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/release_assets.py` | 6 | 36 lexical | [E real-subject evidence](bulk-crosswalk-release-tooling.md): tests/test_release_assets.py:12-95 imports actual canonical/collect/merge; verifies canonical DEB/EXE name, rejects noncanonical requested versions, requir | Broken symlinks/special files, partial file copy or disk full, corrupt manifest after checksum, physical platform binary provenance still OS candidate only | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/release_version.py` | 3 | 12 lexical | [E real-subject evidence](bulk-crosswalk-release-tooling.md): tests/test_release_version.py:16 validates three repo version markers; :24 executes actual release_version.py --check-tag and rejects suffix; :37 patches p | Malformed multiple package versions, failed partial write, concurrent version bump and Cargo.lock consistency under real CI; do not bump current checkout | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/verify_signing_key.py` | 2 | 11 lexical | [E real-subject evidence](bulk-crosswalk-release-tooling.md): tests/test_release_signing.py:29 imports actual validate; only one primary and one signing subkey accepted when primary secret absent, rejects full primary | Malformed GPG colon fields/capabilities, expired/revoked subkey, variants with extra UID/trust/invalid fingerprint; no real custody proof | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `scripts/verify_signing_passphrase.sh` | 1 | 5 lexical | [E real-subject evidence](bulk-crosswalk-release-tooling.md): tests/test_release_provisioning.py:30 runs the real shell verifier via subprocess with temporary GNUPGHOME and fixture-only key: wrong passphrase rejected, | Interrupted GPG agent/denied temporary directory/empty stdin/expired subkey, passphrase leak in process diagnostics; external production key always out of scope | [inventory-release-tooling.md](inventory-release-tooling.md) |
| `tools/import_icon.py` | 1 | 4 lexical | [S only structural evidence](bulk-crosswalk-release-tooling.md): Source-only icon conversion: validate existence and square dimensions >=32, Pillow RGBA resize and icon asset write to repo. No direct automated test invoc | Pillow malformed PNG, transparent alpha pixel order, 31/32 and nonsquare, no output before validation, real asset diff/visual acceptance; do not overwrite checked-in icon | [inventory-release-tooling.md](inventory-release-tooling.md) |

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
