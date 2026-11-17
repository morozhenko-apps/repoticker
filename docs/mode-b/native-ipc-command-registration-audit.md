# Mode B: complete Tauri IPC registration and UI caller crosswalk

**Stage 3/4/N7 source-only evidence, 2026-11-15.** Verified against immutable production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audited parent `be26597eadc2f8bcd2442dd65dc0df4bc6611496`. Actual `#[tauri::command]` declarations in main.rs and nine native modules were compared with `generate_handler![...]`, then all **35** production desktop `.mjs` files were scanned for literal `invoke("...")` call names and the native actions table.

- **55 registered commands** = **33 main.rs + 22 imported native commands**. All 55 annotated declarations match the exact generate_handler list. Zero missing/extra or duplicate annotations in this source scan.
- **46 distinct literal JS invocations**; **three additional fixed repo-menu mappings** (`open_repository_on_github`, `open_repository_folder`, `copy_repository_path`); **six without an observed literal UI consumer**: `relay_prompt_secret`, `open_actions_job`, `add_root`, `remove_root`, `open_settings`, `set_language`.
- *No literal JS caller* **does not** mean dead code or lack of exposure; native tray commands, legacy integration and effective Tauri registration are independent. Source entries in the table list actual native declaration module (plus exact line for main.rs) and observed UI callers. They do **not** certify execution.
- The three current capability files are `capabilities/default.json` (main core/event-listen), `capabilities/about-drag.json` (About drag) and `capabilities/usage-events.json` (usage event-listen). Those plugin declarations do not, on their own, establish effective per-WebView authorization for custom commands. In contrast, `relay_secret.rs` explicitly enforces `window.label()=="settings"` for all five secret operations; `open_relay_resource` also checks Settings. Other commands require separate actual permission/host contract review.

## Full registered command surface

| # | `generate_handler!` name | Native declaration | UI string/dynamic reference |
| ---: | --- | --- | --- |
| 1 | `get_snapshot` | `main.rs:501` | app.mjs |
| 2 | `get_monitor_scope` | `main.rs:511` | quota.mjs, settings.mjs |
| 3 | `get_monitor_selection` | `main.rs:526` | github-monitor.mjs |
| 4 | `get_settings_config` | `main.rs:550` | about.mjs, app.mjs, quota.mjs, settings.mjs |
| 5 | `autostart::autostart_is_enabled` | `autostart.rs` | settings.mjs |
| 6 | `autostart::autostart_set_enabled` | `autostart.rs` | settings.mjs |
| 7 | `ci_notifications::ci_run_notify` | `ci_notifications.rs` | github-monitor.mjs |
| 8 | `relay_secret::relay_secret_status` | `relay_secret.rs` | settings.mjs |
| 9 | `relay_secret::relay_prompt_secret` | `relay_secret.rs` | none found in UI literals |
| 10 | `relay_secret::relay_stage_secret` | `relay_secret.rs` | settings.mjs |
| 11 | `relay_secret::relay_clear_secret` | `relay_secret.rs` | settings.mjs |
| 12 | `relay_secret::relay_commit_secret_draft` | `relay_secret.rs` | settings.mjs |
| 13 | `relay_transport::relay_connection_status` | `relay_transport.rs` | github-monitor.mjs |
| 14 | `relay_transport::relay_connection_diagnostics` | `relay_transport.rs` | settings.mjs |
| 15 | `startup_diagnostics::trace_startup_stage` | `startup_diagnostics.rs` | app.mjs, settings.mjs |
| 16 | `github_session::github_auth_status` | `github_session.rs` | github-monitor.mjs, settings.mjs |
| 17 | `github_session::github_flow_status` | `github_session.rs` | settings.mjs |
| 18 | `github_api::github_api_get` | `github_api.rs` | github-monitor.mjs, quota.mjs, settings.mjs |
| 19 | `github_rate_gate::github_api_cooldown_seconds` | `github_rate_gate.rs` | github-monitor.mjs |
| 20 | `monitor_cache::github_monitor_publish` | `monitor_cache.rs` | github-monitor.mjs |
| 21 | `monitor_cache::github_monitor_snapshot` | `monitor_cache.rs` | app.mjs, quota.mjs |
| 22 | `github_set_monitor_org` | `main.rs:1651` | settings.mjs |
| 23 | `github_session::github_begin` | `github_session.rs` | settings.mjs |
| 24 | `github_session::github_cancel` | `github_session.rs` | settings.mjs |
| 25 | `github_session::github_disconnect` | `github_session.rs` | settings.mjs |
| 26 | `github_session::github_open_device_page` | `github_session.rs` | settings.mjs |
| 27 | `github_session::github_copy_user_code` | `github_session.rs` | settings.mjs |
| 28 | `get_about_info` | `main.rs:1071` | about.mjs |
| 29 | `hide_about` | `main.rs:1056` | about.mjs |
| 30 | `open_actions_job` | `main.rs:1147` | none found in UI literals |
| 31 | `open_repository_on_github` | `main.rs:1190` | app.mjs dynamic nativeActions |
| 32 | `open_repository_folder` | `main.rs:1216` | app.mjs dynamic nativeActions |
| 33 | `copy_repository_path` | `main.rs:1227` | app.mjs dynamic nativeActions |
| 34 | `show_usage_popup` | `main.rs:807` | app.mjs |
| 35 | `get_usage_popup_kind` | `main.rs:724` | quota.mjs |
| 36 | `ui_hover_debug_enabled` | `main.rs:683` | app.mjs |
| 37 | `trace_ui_hover` | `main.rs:688` | app.mjs |
| 38 | `hide_usage_popup` | `main.rs:886` | app.mjs |
| 39 | `resize_usage_popup` | `main.rs:911` | quota.mjs |
| 40 | `open_project_website` | `main.rs:1094` | about.mjs |
| 41 | `open_relay_resource` | `main.rs:1111` | settings.mjs |
| 42 | `add_root` | `main.rs:566` | none found in UI literals |
| 43 | `remove_root` | `main.rs:585` | none found in UI literals |
| 44 | `open_settings` | `main.rs:1276` | none found in UI literals |
| 45 | `start_settings_drag` | `main.rs:1281` | settings.mjs |
| 46 | `set_language` | `main.rs:1685` | none found in UI literals |
| 47 | `save_settings` | `main.rs:1324` | settings.mjs |
| 48 | `select_repository_root` | `main.rs:1291` | settings.mjs |
| 49 | `close_settings` | `main.rs:1444` | settings.mjs |
| 50 | `start_card_drag` | `main.rs:1242` | app.mjs |
| 51 | `stop_card_drag` | `main.rs:1256` | app.mjs |
| 52 | `perform_git_action` | `main.rs:612` | app.mjs |
| 53 | `cancel_git_fetch` | `main.rs:598` | app.mjs |
| 54 | `set_card_view` | `main.rs:647` | app.mjs |
| 55 | `hide_card` | `main.rs:945` | app.mjs |

## Stage 4–7 mandatory independent outcomes

| ID | Owner | Observable behavior and boundary to demonstrate | Current evidence |
| --- | --- | --- | --- |
| IPC-1 | Config/root/monitor organization | Invalid type/root, 0/1/100/101 selected scope, Unicode and cross-window caller; failed save atomicity. Establish intended WebView authorization contract *before* tightening native handler scope. | P_NATIVE; pure config-store and Settings JS have E partial |
| IPC-2 | Git/scan/Cancel/Quit | Real native operation lock, second queued action, mid-Fetch cancellation, active-lease release, no forced local or remote mutation, Quit prevents new admission | A2 P_NATIVE; core Git E does not imply Tauri execution |
| IPC-3 | OAuth/ETag/rate/monitor/CI | Access token never enters JS; token+ETag same generation; logout invalidates old result, stale CI notification no delivery; nested `runner_state` NM1 still trust STOP | Rust and JS helper E partial; native cross-adapter P |
| IPC-4 | Relay secret and transport | Wrong WebView label rejected; stage/commit/remove/readback failures, delayed OS prompt, simultaneous close or Quit and draft ownership | Existing label guard source evidence; O3 and RS1/RS2 native OS P |
| IPC-5 | WebView popup, About, browser opener and tray | Correct permitted URL, window focus/hide, actual Wayland pointer lock, Win32 scale, command call after window close | A1 and OS/HOST P |
| IPC-6 | Six commands with no literal UI caller | Identify actual intended native/tray/legacy consumers; verify authorized commands' own input gates and effective WebView access. Do not delete or change public behavior from a regex inventory | P contract/compatibility review |

**No security defect has been proven by this inventory.** Command registration is not a permissions test. Stage 5 categories remain 810 `?`, 230 provisional `✖`, zero `✔`. A material decision about changing native command authorization or persistent schema is a separate architectural STOP, not part of this docs-only analysis. Stage 9 has not started; no tests, builds, CI, OS, release or production code modifications were performed.
