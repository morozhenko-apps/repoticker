# Mode B: desktop native Settings, persisted monitoring scope and side-effect ordering

Production baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`, `apps/desktop/src-tauri/src/main.rs`, source blob `5ab66298bcaa50668a228d0ef62b99aecb17d134`. Related real store: `crates/repoticker-core/src/config_store.rs` blob `b2fa869893499306d26e0fc5c555076aaf909b63`. Prepared parent `bcb0645b76bf524cba07331ded37d6ec112ced5c`.

Source/test body review, not new runtime execution. `tests/settings-github-confirm.test.mjs` contains a large set of **real Settings JS controller tests with injected DOM/native IPC fakes**. This validates UI draft, Cancel, multiple concurrent Save and late-event behavior, but **not** Rust `AppHandle`, OS Keyring or the real `JsonStore` invocation path.

## Existing Rust inline evidence in main.rs

| Real Rust test | Direct assertions |
| --- | --- |
| `legacy_config_without_repositories_defaults_to_all` | JSON without new fields defaults to empty selected repos and ignored children, notification Off, connection Polling, relay_url None. |
| `saved_polling_clears_legacy_relay_origin_without_changing_hybrid` | Polling consumes old relay URL, a second call unchanged, Hybrid retains URL; Polling with no URL unchanged. |
| `old_notification_boolean_is_ignored_and_new_mode_defaults_off` | Historical `ci_failure_notifications: true` is ignored; serialized output uses `ci_notification_mode: off` without old boolean. |
| `ci_notification_mode_restricts_conclusions` | Four modes permit exactly required success/failure cases; denied cancelled/unknown, deserializing unsupported mode fails. |
| `selected_repositories_require_same_account_and_valid_names` | Real `validate_monitor_repositories` allows matching owner with case-insensitive comparison and returns sorted case-preserving list, rejects other owner, nested path, case-insensitive duplicate, nonempty-without-org, 101 entries, and accepts empty-without-org. |
| `safe_sync_accounts_for_every_discovered_repo_state`, `fetch_remains_unfiltered_and_legacy_pull_retains_narrow_eligibility`, `unsupported_operations_never_schedule_a_checkout` | Native Git targeting helper, audited in `branch-map-main-git-admission.md`; not duplicated here. |

Real core JsonStore tests show atomic backup recovery, unchanged transaction, validation refusal and 16 concurrent updates, but no test above directly calls `save_settings`, `github_set_monitor_org` or `set_language` through native command adapter.

## Named method and exact branch inventory

| Function / region | Independent decisions and side effects | Evidence/remaining |
| --- | --- | --- |
| `default_language`, `default_config` | English, no roots/scope, notifications Off, Polling, no URL by default | E legacy serde + Rust helper; ? real first-run config file creation is deliberately absent until write |
| `config_path` | Tauri app_config_dir available vs unavailable, canonical `config.json` path | ? native AppHandle permission/error adapter |
| `read_config` | JsonStore.read returns Some config/None default/error; invalid primary+backup fails closed | E core JsonStore and legacy serialization; ? command-level malformed on-disk config and status UI |
| `update_config` | One serialized read-modify-write with closure; no changes does not save, callback validation failure leaves disk unchanged | E core JsonStore directly; ? native commands concurrent update/no lost preferences |
| `roots_as_paths`, `present`, `decision_label` | Stable mapping from domain Git state to UI; detached branch maps fixed placeholder, optional GitHub repository; exact status categories | Git core E, native direct mapping ? |
| `get_snapshot`/`scan` | spawn_blocking and config read; Git discovery/inspect errors remain per repo, sort by name/path, monitor_cache separate; join failure surfaces error | E Git core, UI scan consumers; native mixed Git+CI state and failure boundary ? |
| `get_monitor_scope`, `get_monitor_selection`, `get_settings_config` | Config read or error; scope independently of Git scan; selection read in one transaction (org/repos/mode), Settings exports only nonsecret fields | E JS UI with IPC fakes; native command / secret exclusion ? |
| `add_root`, `remove_root` | Normalize or reject invalid path, discover explicit directory, dedup, persist via update_config, preserve others | Git core enrollment E, UI draft tests E, native IPC path/error/race ? |
| `select_repository_root` | Native OS folder picker result: cancel None, selected local path UTF-8, nonlocal path, disconnected oneshot, OS dialog error | E JS Settings controller with fake IPC; actual Tauri dialog physical OS acceptance ? |
| `clear_relay_url_for_polling` | Polling+Some URL consumes and returns true; Polling+None false; Hybrid unchanged | E exact Rust inline test |
| `save_settings` pre-validation | relay URL absent/empty or canonical HTTPS; unsupported language rejection; Some roots len <=100, each normalize+discover, dedup sorted; ignored child list validation | E underlying validation and Settings JS fake IPC; native multi-input and no-write-on-denied ? |
| `save_settings` update | Individual optional roots/language/mode/ignored/connection updates; unchanged fields preserve existing; Polling always clears stale relay URL; Hybrid requires nonempty valid origin; returns changed flag | E helper and JsonStore; native combination/transaction error at final Hybrid predicate ? |
| `save_settings` side effects | Persist first; if language changed refresh tray; optional debug log only fixed mode/boolean; if actual preferences changed restart relay and emit config-changed | JS controller observes expected IPC order via fakes; native event ordering and no restart on unchanged ? |
| `close_settings` | Cancel pending GitHub auth and discard Relay draft, then hide native window; missing window/error fails | JS Cancel controller E with fake IPC; actual draft state/window hide failure and cleanup ? |
| `validate_monitor_repositories` | >100 or nonempty-without-org reject; split owner/repo, same owner case-insensitive, exact GitHub name syntax, no extra slash/dot/double-dot, case-insensitive duplicate, sort lowercased identity | E Rust test covers main classes; ? exact 100 accepted, Unicode, name 100/101, raw empty owner/name, multiple slash, same-owner casing |
| `github_set_monitor_org` | Invalid org rejects before config; atomic compare old vs new account ignoring case; explicit Some repositories validated; None + changed owner resets to All; None + same owner preserves selection; persist, ETag invalidate, relay restart, scope event | E Rust selection helper and many JS draft IPC fixtures; **? native command exact after-write state, ETag generation, event ordering and no side effects on rejected write** |
| `set_language` | Unsupported locale rejects; valid locale persisted by update_config; tray refreshed and config-changed event emitted after persistence | E Rust supported locale and JS preview/OK/Cancel; ? native command error, repeated same-language no-op side-effect policy |
| `refresh_tray_language` | Linux native tray vs non-Linux menu; menu creation/setting errors log but do not invalidate already saved preference | OS physical KDE/Windows acceptance; no production workaround |
| Tauri capability mapping | `default.json` only main core/event listener, `usage-events.json` only usage listen, `about-drag.json` only about drag | JSON static inspection; need effective command registration/permissions verification on real Tauri runtime; custom invoke commands are separate from plugin permissions |
| `open_actions_job` | Exact hardcoded GitHub host; reject query/fragment/@/double slash, seven path segments including `actions/runs` and `job`, owner/repo restricted ASCII, digit-only ID strings; browser launcher or error | Source-only native handler; no direct Rust tests of numeric bounds/canonicalization, permitted link vs malformed link |
| `trusted_relay_resource_url` | Allow only fixed `guide` URL, reject raw URL/source/traversal | E Rust `only_fixed_deployment_guide_is_allowed`, including six negative values |
| `open_relay_resource` | Only Settings window may call, fixed resource allowlist, browser launcher outcome | JS UI and source gate, native actual window label and process failure ? |
| `open_repository_on_github`, `open_repository_folder`, `copy_repository_path` | Recheck enrollment then canonical GitHub origin / file manager / clipboard OS call | Git core E and source-only IPC; detailed in `branch-map-github-origin-opener.md` |

## Two high-value interaction hypotheses, NOT confirmed defects

- **SC1 atomicity across config and Keyring:** `save_settings` writes only JSON preferences. Relay secret staging/commit/revoke is coordinated by the Settings JS controller and native Relay secret commands, not by a single cross-resource transaction in main.rs. The JS controller has many exact fake-IPC tests for failed config and denied Keyring; an actual failure after JSON write and before Keyring success needs native integration and recovery policy verification before proposing a change.
- **SC2 monitor scope generation:** `github_set_monitor_org` saves config, invalidates GitHub ETag cache, restarts relay and emits scope event in sequence. A delayed read/old auth result could cross steps; existing ETag native tests and Settings controller stale-response tests protect their components, but no combined native AppHandle interleaving has been executed.
- **SC3 config changed flag:** `save_settings` issues restart/event only when transaction reports a change; `github_set_monitor_org` and `set_language` always mark changed/write even for equivalent inputs. This is an observation of source design; whether no-op event suppression is required is a product contract question, not automatically a defect.

## Positive / N1–N12 matrix

| Category | State | Independent outstanding behavior |
| --- | --- | --- |
| Positive | E partial | Rust helpers + real JS Settings flow, native Tauri read/write and side effects pending |
| N1 | E partial | Unsupported locale, malformed repo, bad origin; exact roots=100/101 and names length |
| N2 | E partial | 101 selected repos denied, 100 boundary in JS fake IPC; actual native 100 accepted test ? |
| N3 | NA | Pure settings commands do no external HTTP; network auth belongs to GitHub session |
| N4 | E partial / ? | UI concurrent OK fake tests, same preference repeated native transaction ? |
| N5 | E partial / ? | JsonStore 16-thread update real, combined JS/native scope/relay races missing |
| N6 | E partial | Real backup recovery and legacy mode tests; native status under both corrupt files missing |
| N7 | E partial / ? | Allowed Git roots and selected owner/URL; effective Tauri command permissions/denied IO |
| N8 | E partial | 20 supported locales and English default; tray native fallback/RTL display physical |
| N9 | JS partial / OS | Cancel picker/settings, double OK, focus/reopen; actual KDE/Windows dialog/window |
| N10 | E partial / ? | Native settings schema excludes secrets; actual debug logs and OS clipboard must not leak |
| N11 | NA | No RepoTicker paid subscription |
| N12 | E partial / ? | JsonStore backup/write denial, native config/Keyring failure order and status unknown |

## Planned Stage 9 native integration contract checks

- **MS1:** actual `save_settings`/readback through Tauri-compatible harness with real JsonStore and injected filesystem/dialog/tray/external OS boundaries. Table combinations omitted/empty/valid/invalid Relay origin, 0/1/100/101 roots, unsupported language and exclusions. Assert exact file bytes and no write on invalid.
- **MS2:** compare current vs changed config, verify one restart/event on actual change and no restart/event for unchanged `save_settings`, including persistence preceding event.
- **MS3:** native `github_set_monitor_org` account case-equivalent/changed owner, explicit empty vs omitted repos, 100/101 boundary and malformed names; require old/new ETag generation and relay reset only following successful config commit.
- **MS4:** native `get_monitor_selection` single-config snapshot while another update is pending, prevent mixed old/new owner/repositories; inject corrupt both JSON files and OS permission errors.
- **MS5:** combine actual native storage and Relay Keyring adapter failure at every point after a staged secret change. Maintain user-visible retry and prior credentials; no inconsistent completed event.
- **MS6:** action opener validation and native capability smoke on Linux/Windows, OS picker Cancel and clipboard denied; no arbitrary external launch.

Mutation guards: bypass Hybrid URL validation, save a bad root, accept 101 repos, skip ETag invalidation, publish event before JSON commit, clear saved subset on same-case owner, copy private Keyring bytes into Settings, coalesce distinct account scopes. Every guard requires real failing assertions. Do not invent a cross-resource atomic transaction until requirements and native evidence show a defect; apply STOP FACTOR to any public trust/persistence contract change.

Global Mode B Stage 3–8 remains PARTIAL. No production code, new tests, CI, secret or published branch was changed.
