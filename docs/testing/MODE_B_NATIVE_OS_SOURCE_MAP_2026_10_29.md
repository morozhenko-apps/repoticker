# Mode B native shell and platform event source scan

**Source baseline:** `ae6d02702b2eb15f8f00f61e9894451e3205936f`. **Stage:** partial 1–3.
The GitHub connector read 11 Rust/C files, with 154
syntactically named functions. This is an indexing artifact, **not**
proof that closures, Rust platform-gated impls, GTK events, Win32
return paths or FFI lifecycle branches have been enumerated. No
current CI or OS execution evidence is available.

## Native Gate 2/3/Mode B risks

- Windows/Linux tray activation, app single instance, window resize,
  close-vs-hide, popup anchoring, focus/click-through and drag races.
- Linux Wayland borrowed pointer/display lifetimes, GDK backend,
  GTK surface installation/uninstallation, DPI/scale and hotplug.
- OS autostart opt-in/out, login persistence, rollback after
  registration failure, no implicit Git operation, installer cleanup.
- Native CI notification enablement, dedup/run attempt, provider
  identity and error redaction, OS notification denial.
- Config settings paths/roles, OS clipboard and folder open errors,
  safe Git command dispatch and version info.

## Source function indexes

| Source file | Risk H/M | Named functions | Name:line |
| --- | --- | ---: | --- |
| `apps/desktop/src-tauri/src/app_icon.rs` | M | 2 | tray_rgba:5, tray_argb:15 |
| `apps/desktop/src-tauri/src/autostart.rs` | H | 2 | autostart_is_enabled:6, autostart_set_enabled:13 |
| `apps/desktop/src-tauri/src/ci_notifications.rs` | H | 8 | notification_catalog:21, notification_error:29, notification_text:43, approved_scope:66, ci_failure_notify:99, config:150, notification_templates_are_complete_and_preserve_run_identity:158, notification_delivery_is_opt_in_and_restricted_to_selected_scope:188 |
| `apps/desktop/src-tauri/src/linux_surface.rs` | H | 26 | repoticker_relative_init:13, repoticker_relative_begin:14, repoticker_relative_end:15, enabled:41, visible:45, install:100, install_usage_surface:200, on_usage_main:260, anchor_usage:276, show_usage:301, hide_usage:316, set_exact_viewport_height:323, resize_usage:333, apply_size:378, on_main:401, apply_card_height:419, validate_card_height:458, request_resize:467, resize:478, show:499, hide:522, persist_now:531, stop_on_gtk:542, cancel_drag:553, start_drag:563, stop_drag:585 |
| `apps/desktop/src-tauri/src/linux_tray.rs` | M | 8 | on_ui:16, id:33, title:37, icon_pixmap:41, activate:50, menu:54, install:96, set_language:112 |
| `apps/desktop/src-tauri/src/main.rs` | H | 69 | drop:57, default_language:83, notify_progress:132, config_path:154, default_config:161, read_config:174, update_config:184, roots_as_paths:193, decision_label:197, present:209, scan:223, git_action_result:258, should_schedule_git_target:305, execute:316, get_snapshot:458, get_monitor_scope:468, get_monitor_selection:483, get_settings_config:505, add_root:519, remove_root:538, cancel_git_fetch:551, perform_git_action:565, resize_unmanaged_card:576, set_card_view:600, ui_hover_debug_enabled:636, trace_ui_hover:641, get_usage_popup_kind:677, footer_anchored_usage_position:690, position_unmanaged_usage_popup:709, expanded_drawer_does_not_move_tooltip_away_from_bottom_status_strip:744, applies_dpi_scale_once_to_both_logical_insets:753, show_usage_popup:760, hide_usage_popup:839, resize_usage_popup:864, hide_card:898, show_compact_card:920, show_settings:970, show_about:982, get_about_info:1001, launch_browser:1009, open_project_website:1024, open_actions_job:1030, enrolled_repository:1060, open_repository_on_github:1073, launch_file_manager:1084, open_repository_folder:1099, copy_repository_path:1110, start_card_drag:1125, stop_card_drag:1139, open_settings:1159, select_repository_root:1164, save_settings:1188, close_settings:1262, safe_sync_accounts_for_every_discovered_repo_state:1279, fetch_remains_unfiltered_and_legacy_pull_retains_narrow_eligibility:1303, unsupported_operations_never_schedule_a_checkout:1330, legacy_config_without_repositories_defaults_to_all:1342, selected_repositories_require_same_account_and_valid_names:1355, validate_monitor_repositories:1383, github_set_monitor_org:1414, set_language:1447, toggle_card:1461, tray_image:1488, build_desktop_tray_menu:1494, refresh_tray_language:1542, request_quit:1559, dispatch_menu_action:1596, configure_gdk_for_native_wayland:1606, main:1620 |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs` | M | 8 | initialize:9, enabled:13, write:17, new:35, drop:44, allowed_stage:53, trace_startup_stage:71, only_fixed_nonsecret_startup_milestones_are_accepted:85 |
| `apps/desktop/src-tauri/src/tray_i18n.rs` | M | 8 | catalog:8, is_supported_locale:16, text:20, label:29, window_title:42, native_registry_contains_exactly_twenty_locales:55, every_native_action_and_title_has_a_bundled_string:69, unknown_tray_action_is_not_a_command:85 |
| `apps/desktop/src-tauri/src/windows_geometry.rs` | H | 14 | placement:10, monitor_area:25, restore:44, save:73, restores_position_for_bottom_right_work_area:97, keeps_bottom_edge_when_view_grows:105, supports_negative_monitor_coordinates_and_high_dpi_sizes:113, clamps_stale_margins_and_oversized_windows:121, SetWindowPos:136, raise_usage_popup:150, CreateRoundRectRgn:183, DeleteObject:191, SetWindowRgn:196, clip_usage_popup:202 |
| `apps/desktop/src-tauri/build.rs` | M | 3 | execute:3, compile_wayland_bridge:17, main:79 |
| `apps/desktop/src-tauri/native/wayland_relative_drag.c` | H | 6 | relative_motion:23, registry_global:41, registry_remove:66, repoticker_relative_init:85, repoticker_relative_begin:116, repoticker_relative_end:122 |

**Next:** platform `#[cfg]` branch and event-lifecycle analysis,
test case provenance and exact interaction pairwise matrices.
Linux/Windows OS acceptance is deferred **until after Mode B**
by the 2026-10-29 owner sequencing decision, but its exit
conditions remain mandatory before v1. No fabricated physical PASS.
