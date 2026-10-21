# Mode B — testable artifact inventory (Stage 3)

> **Priority correction (2026-10-22):** The owner confirmed that the
> comprehensive Mode B inventory, exhaustive branch mapping, Positive/N1–N12
> matrix, mutation audit and final report belong to the **v0.9.0 RC** gate,
> not the current v0.2.0 development stage. This file preserves preliminary
> exploratory evidence only. **It does not block implementing features,
> fixing defects or writing their required regression tests for v0.2–v0.8.**
> Resume and rescan this audit at v0.9.0 against the then-current source;
> existing inventories must not be treated as exhaustive current coverage.

Baseline: `dev` on 2026-10-21, source tree scanned after approved version-roadmap commit `eddb3bc`.
Owner: RepoTicker Mode B campaign [#10](https://github.com/morozhenko-apps/repoticker/issues/10).
Primary mode: **MODE B — Testing**.
Status: **PRELIMINARY SOURCE INVENTORY, PARKED until v0.9.0 audit; not a test completion report.** New product code and the next release must be rescanned when changed.

## Method and evidence

Full Git tree `git/trees/dev?recursive=1` returned `truncated:false`.
Every current production Rust/C, JS/TS, Python/bash, configuration and
release workflow path was enumerated. Rust `fn`, JS exported/internal
functions, Python functions, native C callbacks, named test functions
and important Tauri/HTTP entrypoints were inspected through GitHub source
reads. This is **source inspection**, not AST-quality branch/statement
coverage: Stage 4 must enumerate exact executable branches before
implementing new tests. Simple DTO fields and nonbehavioural artwork
are covered through relevant public-function contracts rather than
counted as standalone business logic.

The current tree contains:

- 15 production Rust/C files (including build script, Wayland bridge),
  one Rust integration test file, and native unit tests embedded in Rust.
- 14 desktop JS `.mjs` modules, one distribution Worker `.mjs`,
  and one disabled/placeholder relay `.ts` module.
- Seven release Python/bash scripts, plus one icon-import utility.
- 14 `tests/*.test.mjs`, six `tests/test_release_*.py`, one
  `crates/repoticker-core/tests/git_integration.rs`; other unit tests
  are inside Rust source modules.
- Three GitHub Actions workflows, Tauri capabilities/config, Cargo
  manifest+lock, Worker deployment config, platform HTML/CSS.

**Existing test declaration inventory (not executed here):**
14 Node files contain **84 named top-level `test(...)` definitions**;
six Python files contain **10 `test_*` method definitions**; embedded
Rust files contain **32 `#[test]` declarations**; Rust Git integration
contains **8 named integration tests**. Counts are syntactic indicators,
not independent scenarios, assertions, coverage percentages or passes.
Node parameterized loops and Python subcases may execute more than one
assertion per declared test, while shell/platform physical flows are
still separate acceptance duties. These figures do not prove a passing
run on the current SHA. No current evidence establishes an actual
known-flaky quarantine.

Legend:
- Risk: `C` critical data/security/release; `H` high; `M`
  medium; `L` low.
- Level: `U` unit/domain, `I` integration/contract, `E`
  critical physical/UI E2E.
- Expected count: **prospective distinct coverage cases** for Stage
  3 estimation, not number of tests already written or a final count.
  Table-driven variants may implement many cases in one test function.
- Negative categories reference the exact Positive/N1–N12 definitions
  in [the version roadmap](../VERSION_ROADMAP_TO_1_0.md).
  For any N-category not listed on an artifact, Stage 5 must still
  provide explicit `N/A:reason`, not leave the cell blank.
  N11 entitlement/purchase scenarios are not applicable to a free
  RepoTicker; informational GitHub billing still invokes N1/N6/N7/N8/N10.

## A. Local Git domain, process execution and native IPC

| File / specific testable functions or behavior | Risk; levels | Prospective cases | Positive / negative families |
| --- | --- | ---: | --- |
| `crates/repoticker-core/src/lib.rs`: `classify_sync`; dirty/behind/ahead/diverged/upstream/unfinished states, `SyncDecision` | C; U/I | 24 | P,N1,N2,N4,N5,N6,N7,N9,N12 |
| `crates/repoticker-core/src/git.rs`: `normalize_root`, `discover`, `discover_all`, `looks_like_checkout`, `verified_checkout`, `ignored_child` | C; U/I | 38 | P,N1,N2,N5,N6,N7,N12 |
| Same: `inspect`, `git_operation_in_progress`, `GitError`, `RepoSnapshot`/parsers, `invoke`/`stderr`/required and optional command results | C; U/I | 32 | P,N1,N2,N3,N5,N6,N7,N9,N10,N12 |
| Same: `fetch`, `safe_pull`, `OperationOutcome` with external concurrent refs, branch checks and FF invariant | C; U/I/E | 46 | P,N1,N2,N3,N4,N5,N6,N7,N9,N12 |
| `crates/repoticker-core/src/bounded.rs`: `bounded_map`; 0/1/max concurrency, errors, task ordering and panic/error isolation | H; U/I | 14 | P,N1,N2,N4,N5,N9 |
| `apps/desktop/src-tauri/src/main.rs`: `config_path`, `read_config`, `write_config`, `Config`/default language, `roots_as_paths`, config migration and disk failure | C; U/I | 30 | P,N1,N2,N5,N6,N7,N8,N9,N10,N12 |
| Same: `scan`, `present`, `git_action_result`, `execute`, `perform_git_action`, `notify_progress`, `OperationLock` | C; I/E | 34 | P,N1,N2,N3,N4,N5,N6,N7,N9,N10,N12 |
| Same: `get_snapshot`, `add_root`, `remove_root`, `save_settings`, `set_language`, `close_settings`, `github_set_monitor_org` | H; I/E | 34 | P,N1,N2,N4,N5,N6,N7,N8,N9,N12 |
| Same: `resize_unmanaged_card`, `set_card_view`, `get_usage_popup_kind`, `show_usage_popup`, `hide_usage_popup`, `resize_usage_popup`, `hide_card`, `show_compact_card`, `open_settings`, `show_settings`, `show_about`, `toggle_card` | H; I/E | 26 | P,N1,N2,N4,N5,N6,N8,N9 |
| Same: `get_about_info`, `open_project_website`, `open_actions_job`, `start_card_drag`, `stop_card_drag`, `configure_gdk_for_native_wayland`, `dispatch_menu_action`, `tray_image` | H; I/E | 22 | P,N1,N2,N5,N7,N9,N10 |
| `apps/desktop/src-tauri/src/app_icon.rs`: `tray_rgba`, `tray_argb`, icon color/size conversion | L; U/I | 5 | P,N1,N2,N6 |
| `apps/desktop/src-tauri/src/linux_tray.rs`: `LinuxTray` activation, `menu`, `on_ui`, `install`, `icon_pixmap` | M; I/E | 8 | P,N4,N5,N7,N9 |
| `apps/desktop/src-tauri/src/linux_surface.rs`: `enabled`, `install`, `show`, `hide`, `resize`, `request_resize`, `validate_card_height`, `apply_card_height`, `persist_now`, output/position anchoring | H; I/E | 28 | P,N1,N2,N4,N5,N6,N8,N9,N12 |
| Same: `install_usage_surface`, `on_usage_main`, `anchor_usage`, `show_usage`, `hide_usage`, `resize_usage`, GTK pointer/focus/click-through semantics | H; I/E | 19 | P,N1,N2,N4,N5,N8,N9 |
| Same: `on_relative_motion`, `start_drag`, `stop_drag`, `cancel_drag`, `stop_on_gtk` and native FFI relative-pointer lifecycle | H; I/E | 22 | P,N1,N2,N4,N5,N6,N7,N8,N9 |
| `apps/desktop/src-tauri/native/wayland_relative_drag.c`: `relative_motion`, `registry_global`, `registry_remove`, `repoticker_relative_init/begin/end` and borrowed GDK wl_display/pointer ownership | H; I/E | 20 | P,N1,N2,N4,N5,N6,N7,N9 |
| `apps/desktop/src-tauri/build.rs`: `compile_wayland_bridge`, `execute`, `main`; platform conditional scanner/compiler behavior and fail-closed build | M; I | 9 | P,N1,N3,N6,N12 |

## B. GitHub Device Flow, credential storage, API authorization and monitor cache

| File / testable artifact | Risk; levels | Prospective cases | Positive / negative families |
| --- | --- | ---: | --- |
| `crates/repoticker-core/src/github_auth.rs`: `DeviceSession::new/next_poll/receive/cancel`, `DevicePhase`, `DeviceResponse`, `PollDecision` | C; U/I | 34 | P,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10 |
| Same: `TokenExpiration::decide`, `TokenAction`; pre-expiry, skew, overflow and revoked/invalid lease | C; U/I | 22 | P,N1,N2,N3,N4,N5,N6,N7,N8 |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs`: `parse_device_challenge`, `parse_token_reply`, `valid_ascii_token`, `DeviceChallenge`/ `TokenLease`/ `PollReply` | C; U/I | 44 | P,N1,N2,N3,N6,N7,N8,N10 |
| `apps/desktop/src-tauri/src/github_native.rs`: `CredentialRecord::from_lease/decode`, `NativeCredentialStore::entry/load/replace/clear`, versioned keyring record and native error redaction | C; I | 36 | P,N1,N2,N4,N5,N6,N7,N8,N9,N10,N12 |
| Same: `GithubOAuthHttp::new/submit/begin/poll/refresh` and exact GitHub endpoints, fixed HTTPS/timeout/body/redirect constraints | C; I | 36 | P,N1,N2,N3,N4,N5,N6,N7,N8,N10 |
| `apps/desktop/src-tauri/src/github_session.rs`: `GitHubAuthManager` state, `invalidate/active/progress/set_progress`, `cancel_pending`, `github_begin`, `poll_authorization`, `github_flow_status`, `github_auth_status`, `github_cancel`, `github_disconnect` | C; I/E | 48 | P,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 |
| Same: `read_credential/store_credential/delete_credential`, `github_access_token`, refresh-rotation versus disconnect, `publish_with_reason`/error sanitization, `valid_user_code`, `github_copy_user_code`, `github_open_device_page` | C; I/E | 42 | P,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 |
| `apps/desktop/src-tauri/src/github_api.rs`: `valid_name`, `valid_path`, `project`, `project_billing`, `github_api_get` exact allowlist, pagination and privacy projection | C; U/I | 52 | P,N1,N2,N3,N4,N5,N6,N7,N8,N10 |
| `apps/desktop/src-tauri/src/monitor_cache.rs`: `read`, `github_monitor_publish` shared in-memory state and bounded native snapshot, auth state/source distinctions | H; U/I | 16 | P,N1,N2,N4,N5,N6,N7,N9,N10 |

## C. Desktop JavaScript model, API collectors and UI

| File / named exports, internal state, critical UI behavior | Risk; levels | Prospective cases | Positive / negative families |
| --- | --- | ---: | --- |
| `apps/desktop/ui/model.mjs`: `summarize`, `safeRunUrl`, `safeActionsJobUrl` | H; U | 14 | P,N1,N2,N6,N7,N10 |
| `apps/desktop/ui/view.mjs`: `nextCardView`, `cardWindowHeight`, `pullReadyCommitCount` | H; U | 18 | P,N1,N2,N5,N6,N9 |
| `apps/desktop/ui/status-metrics.mjs`: `shown`, `compactStatus`, unknown vs. counted runners/tasks | H; U | 18 | P,N1,N2,N6,N8 |
| `apps/desktop/ui/runner-state.mjs`: `normalizeLabels`, `runnerLabelCompatible`, `isStandardGitHubHostedLabel`, `classifyJobLane`, `laneCounts`, `summarizeRunnerState` | C; U/I | 52 | P,N1,N2,N4,N5,N6,N7,N8,N10 |
| `apps/desktop/ui/runner-collector.mjs`: `getPages`, `boundedMap`, `collectRunnerState`; fanout/pagination/runner jobs/correct partial coverage | C; I | 48 | P,N1,N2,N3,N4,N5,N6,N7,N8 |
| `apps/desktop/ui/github-monitor.mjs`: `monitorRefreshDelay`, `listAvailableInstallations`, `listInstalledRepositories`, `collectForAccount`, `startGithubMonitoring`, `refresh`, `publish` | C; U/I | 50 | P,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10 |
| `apps/desktop/ui/github-billing.mjs`: `billingMonth`, `knownPersonalAllowance`, `knownOrganizationAllowance`, `reportedActionsMinutes`, `collectBillingUsage`, `createBillingCache` / `load` / `clear` | H; U/I | 44 | P,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10 |
| `apps/desktop/ui/quota-details.mjs`: `isHoverKind`, `buildHoverDetails`, `buildQuotaDetails`, runner/tasks/billing `view`/ `notReady` format, last checked timestamp | H; U | 25 | P,N1,N2,N5,N6,N8,N10 |
| `apps/desktop/ui/quota-size.mjs`: `usageHeight` and all constants, bounds and hidden/floating overlay geometry | M; U/I | 12 | P,N1,N2,N6,N8 |
| `apps/desktop/ui/quota.mjs`: `selectedOrganization`, `paint`, `paintSnapshot`, `scheduleBilling`, `invalidateBilling`, `refresh`, `applyHoverKind`, `onUsageShown`, native events | H; I/E | 30 | P,N1,N2,N3,N4,N5,N6,N8,N9,N10 |
| `apps/desktop/ui/native-drag.mjs`: `createNativeDragGesture`, `enqueue`, pointer press/release/capture-lost and native start race | H; U/I/E | 24 | P,N1,N2,N4,N5,N7,N9 |
| `apps/desktop/ui/app.mjs`: `render`, `refresh`, `runGitAction`, `consumeResults`, `makeRepoRow`, `updateActionState`, `setQuotaOpen`, `setActiveTooltip`, `openView/resetView`, `stopDragging`, `armAutoHide/cancelAutoHide` | H; I/E | 46 | P,N1,N2,N3,N4,N5,N6,N8,N9,N10 |
| `apps/desktop/ui/settings.mjs`: `refreshGithub`, `refreshMonitorScopes`, `startGithubStatusUpdates`, `stopGithubStatusUpdates`, `githubMessage/githubButtons`, Settings `refresh`, `isDirty/updateApply`, Cancel/OK and staged monitor-org scope | C; I/E | 46 | P,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N12 |
| `apps/desktop/ui/about.mjs`: native `get_about_info`, rendered version/author and allowlisted website click | L; I | 7 | P,N1,N3,N6,N7 |
| `apps/desktop/ui/{index,settings,quota,about}.html` and related `.css`: event bindings, selectors, keyboard/focus, clipping, no secret/pointer capture, 390×122 card | H; I/E | 24 | P,N1,N2,N5,N6,N7,N8,N9,N10 |
| `apps/desktop/src-tauri/capabilities/{default,usage-events}.json`, `tauri.conf.json`: WebView privilege separation, window bounds, CSP, bundled app/version metadata | C; I | 19 | P,N1,N2,N6,N7,N10 |

## D. Distribution, release tools, CI and optional relay

| File / testable artifact | Risk; levels | Prospective cases | Positive / negative families |
| --- | --- | ---: | --- |
| `infra/download-worker/src/worker.mjs`: `keyFor`, `mime`, fetch route, GET/HEAD vs POST, path and object key restrictions, mutable/immutable cache | C; U/I | 38 | P,N1,N2,N3,N4,N5,N6,N7,N10,N12 |
| `infra/download-worker/wrangler.jsonc`: route, R2 bindings, production root and credentials isolation | H; I | 9 | P,N1,N6,N7,N10 |
| `scripts/release_version.py`: `versions`, `bump`, `main`, SemVer and synchronized Rust/Tauri values | C; U/I | 24 | P,N1,N2,N4,N6,N7,N12 |
| `scripts/release_assets.py`: `digest`, `canonical`, `collect`, `merge`, `main`, platform artifact SHA256 and filename contracts | C; U/I | 27 | P,N1,N2,N4,N6,N7,N12 |
| `scripts/verify_signing_key.py`: `validate`, `main`, strict primary/subkey fingerprint and key usage | C; U/I | 19 | P,N1,N2,N6,N7,N10 |
| `scripts/verify_signing_passphrase.sh`: subkey-only import, ephemeral keyring, signed fixture, wrong passphrase and cleanup | C; I | 22 | P,N1,N2,N4,N5,N6,N7,N10,N12 |
| `scripts/provision_apt_key.sh`: fingerprint, backup path, real passphrase validation-before-secret-upload, error cleanup and no secret on argv/log | C; I | 23 | P,N1,N2,N3,N4,N5,N6,N7,N9,N10,N12 |
| `scripts/apt_repository.py`: `invoke`, `sha256`, `package_field`, `assemble`, `verify`, `main`, By-Hash and signed InRelease consistency | C; U/I | 34 | P,N1,N2,N4,N5,N6,N7,N8,N10,N12 |
| `scripts/r2_release.py`: `sha`, `media`, `source_map`, `public_verify`, `publish`, `upload`, `main`, safe path allowlist, conditional immutable uploads and readback | C; I | 40 | P,N1,N2,N3,N4,N5,N6,N7,N8,N10,N12 |
| `.github/workflows/preflight.yml`: push/PR/docs path filters, stable Rust/JS/release tests and required aggregate gate | H; I | 14 | P,N1,N4,N5,N6,N7,N9 |
| `.github/workflows/strict.yml`: manual diagnostic 10× core+JS; currently **not** a registered stable/flaky split | M; I | 10 | P,N1,N2,N4,N5,N6,N9 |
| `.github/workflows/desktop-release-candidates.yml`: immutable tag=main admission, Linux/Windows artifacts, protected GPG/R2 environment, signed APT/public readback and release creation | C; I/E | 42 | P,N1,N2,N3,N4,N5,N6,N7,N9,N10,N12 |
| `Cargo.toml`, core/desktop manifests, `Cargo.lock`, packaging assets and GitHub permission configuration | H; I | 15 | P,N1,N2,N4,N6,N7,N10 |
| `tools/import_icon.py`: `main`, external RGBA input, conversion validation and generated icon metadata | L; U/I | 7 | P,N1,N2,N6,N12 |
| `apps/relay-cloudflare/src/index.ts`: placeholder `fetch` returns explicit 501; selfhost placeholder README; **no deployed authenticated relay** | H only if enabled; U/I | 7 | P,N1,N2,N7,N10 (security assert of 501; full webhook/HMAC N-cases N/A **until** P3 implementation) |

## E. Existing suites and areas they currently appear to exercise

Source-declared tests (static inventory only):

| Suite | Named test declarations | Grounded test subjects; not a branch-coverage claim |
| --- | ---: | --- |
| Node `download-worker` | 3 | read-only URL/method/cache rules |
| Node `github-billing` | 10 | fixed owner paths, known plans, errors, cache, bounded projection |
| Node `github-monitor` | 6 | single/multiple installations, missing/capped repository scopes |
| Node `native-drag` | 5 | gesture start/stop, stale acknowledgement, overlap, failure |
| Node `quota-details` | 4 | billing projection, unavailable state, action URL |
| Node `quota-surface` | 8 | native overlay geometry/pointer pass-through, startup backend contract |
| Node `runner-collector` | 6 | queued/running isolation, partial pagination, runner permission errors |
| Node `runner-state` | 11 | runner labels and lanes, unknown/conflicting jobs and capacity |
| Node `settings-controls` | 2 | real element bindings and native command wiring |
| Node `settings-github-confirm` | 4 | new connection OK/Cancel, existing token preservation, pending cancellation |
| Node `split-status-hover` | 6 | independent tooltip kinds, compact values, truncation |
| Node `ui-layout` | 15 | card layout and source/behavior contracts, Git action gating |
| Node `ui` | 3 | status formatting and safe URL |
| Node `usage-events` | 1 | missed/out-of-order hover and selected organization |
| Python `test_release_apt_integration` | 1 | signed fixture metadata and by-hash |
| Python `test_release_assets` | 2 | package naming and verified assembly |
| Python `test_release_provisioning` | 2 | isolated signing passphrase, secret publication order |
| Python `test_release_r2_contract` | 1 | release allowlist with pre-write rejection |
| Python `test_release_signing` | 1 | scoped subkey authority |
| Python `test_release_version` | 3 | version agreement, tags, isolated version bump |
| Embedded Rust `github_api` | 3 | fixed REST read allowlist and response privacy |
| Embedded Rust `github_native` | 4 | HTTPS/auth state, single credential record and expiry failures |
| Embedded Rust `github_oauth_wire` | 5 | OAuth parser/errors/bounds and hardcoded trusted endpoints |
| Embedded Rust `github_session` | 5 | redaction, code clipboard validation and attempt cancellation |
| Embedded Rust `github_auth` | 7 | Device Flow state, slow_down/interval and refresh policy |
| Embedded Rust `bounded` | 2 | concurrency and empty/zero cases |
| Embedded Rust `lib` | 6 | FF-only sync decision classifier |
| Rust `git_integration` | 8 | temporary Git repo/remote integration and safe-pull refusal |

Several Node files rely on source-regex contract tests, not complete native
integration. Every source-contract test must be separated from executable
branch coverage and physical runtime evidence in later matrices.

**Known candidate gaps for Stage 4 verification**, not claims that a
branch is uncovered until the test bodies are mapped: disk full / atomic
configuration writes, stale OAuth generation after pending session,
native Rust IPC and Wayland seat loss, comprehensive GitHub 429/retry-after,
Windows runtime, Git CLI cancellation, R2 partial publish recovery and
installation upgrade. The absence of an obvious named test is an
investigation lead, not proof that hidden inline cases do not exist.

## Stage 3 completion criteria and next boundary

- [x] All production paths and public/important internal functions mapped.
- [x] Risk, intended test level, prospective case counts and relevant
      negative category families captured per artifact.
- [x] Existing test declarations/suites indexed and source-only evidence
      distinguished from real test execution.
- [x] Disabled relay placeholder and free-product N11 applicability recorded.
- [ ] **Stage 4:** the [initial branch-to-test map](MODE_B_BRANCH_MAP.md) covers Git decision policy, Device Flow, runner-state and billing; inspect each remaining conditional/early return,
      map to a concrete existing/planned test and mark reasoned exclusions.
- [ ] **Stage 5:** expand every row to 13 mandatory Positive/N1–N12
      cells, including explicit non-applicability justifications.
- [ ] **Stages 6–8:** interaction matrix, refined estimates, measured
      coverage map. No executable tests before these complete.
- [ ] **Stages 9–12:** testing implementation, mutation review, final
      stable/flaky/physical gates and final Mode B report.

**Measurement integrity:** the prospective total can be recalculated
after Stage 4–7; it is intentionally not called a coverage percentage,
completed case count, or minimum number of unit test functions. Some
risks require platform IO evidence unavailable to this GitHub-only
connection. Their status remains OPEN rather than being marked covered.

Rollback: this is a docs-only Stage 3 inventory, with no binary, token,
workflow, public tag, `main` or GitHub App settings change.
