# RepoTicker Mode B — native desktop source inventory and post-test code review

Date: 2026-10-29. Working baseline: `dev` at `a69ad8bf4abf5641e019c453919b6f9c723d2354`.
Mode B, documentation-only, Stage 3–8 **in progress**. No new release, code, tests,
CI rerun, signing, tag, R2 access or `main` update is authorized here.

## Why this correction matters

The prior automatic syntax map stopped at the first `#[cfg(test)]` block.
This strategy is **not valid for all native modules**:

- `main.rs` has embedded test blocks at lines 740, 1274 and 1338;
  executable Tauri commands and production app/tray startup follow them,
  including `show_usage_popup`, `save_settings`,
  `validate_monitor_repositories`, `github_set_monitor_org`,
  `set_language`, `request_quit`, `dispatch_menu_action` and `main`.
- `monitor_cache.rs` defines `github_monitor_publish` after its tests.
- `windows_geometry.rs` defines native `raise_usage_popup` and
  `clip_usage_popup` after the geometry unit tests and also declares
  Win32 `SetWindowPos`, `CreateRoundRectRgn`, `DeleteObject`,
  and `SetWindowRgn` FFI signatures there.

These are real production entrypoints, not excluded test helpers. A source
file's first test block is **not** an EOF marker. The existing
`MODE_B_CORE_RUST_SOURCE_MAP_2026_10_29.md` is historical and
insufficient for complete Stage 3/4. Every native IPC callback and
`generate_handler!` registration remains in scope, whether Rust marks
its function `pub` or not.

## Verified native source families and risk

All 16 native `apps/desktop/src-tauri/src/*.rs` files were read.

| Source family | Files | Highest risk | Test / acceptance level |
| --- | --- | --- | --- |
| REST, auth, rate and identity | `github_api.rs`, `github_oauth_wire.rs`, `github_native.rs`, `github_session.rs`, `github_rate_gate.rs`, `github_etag_cache.rs` | Critical: token secrecy, bounded provider data, stale-generation races | Rust unit, API contract, OS keyring runtime |
| Monitor and CI | `monitor_cache.rs`, `ci_notifications.rs` | Critical: truthful unknown, selected scope, notification dedup | Unit/contract, native alert session |
| Main app and system policy | `main.rs`, `autostart.rs`, `startup_diagnostics.rs` | Critical: explicit root enrollment, settings atomicity; high: OS lifecycle | Rust/JS integration and physical KDE/Windows |
| Linux surface and tray | `linux_surface.rs`, `linux_tray.rs` | High: GTK, Wayland relative drag and pointer/focus transitions | Platform-specific integration and physical KDE |
| Windows native geometry | `windows_geometry.rs` | High: DPI, topmost, FFI error/HRGN ownership | Windows compilation, runtime and physical Win11 |
| Native labels/art | `tray_i18n.rs`, `app_icon.rs` | High: 20 locales and visual/accessible icons | Unit plus 20-locale installed visual acceptance |

## Branch decisions with source-backed candidates (not measured coverage)

| Branch ID | Current source decision | Existing test candidate / remaining proof |
| --- | --- | --- |
| ND01 | REST `valid_path` only accepts documented GET routes, bounded path/query; malformed input returns error before token/network | `only_documented_read_routes_are_allowed`, `paths_reject_encoded_traversal_duplicate_queries_and_writes`; expand full route matrix |
| ND02 | `github_api_get`: cooldown blocks access, 304 uses matching ETag, non-2xx classified, body <=2 MiB, valid JSON + projected schema only | `github_rest_failures_distinguish_permissions_and_rate_limits_without_provider_text`, `oversized_or_broken_provider_pages_are_not_treated_as_empty`; add combined auth-generation cases |
| ND03 | ETag cache rejects wrong generation/path/tag, avoids billing caching and late-200 overwrite, max 64 entries and 64 KiB projection | `only_matching_conditional_entry_can_supply_304`, `generation_change_blocks_in_flight_and_old_cached_private_data`, `late_http_200_does_not_replace_newer_cache_value` |
| ND04 | Rate-gate distinguishes permission 403 from limit 403/429; bounded Retry-After/reset and monotonic defer | `permission_errors_never_enter_rate_gate`, `retry_header_boundaries_preserve_permission_and_rate_semantics`, `concurrent_defer_calls_never_shorten_an_existing_cooldown` |
| ND05 | Device-code/OAuth replies reject unknown/invalid/malformed grants without surfacing tokens or upstream error body | `invalid_unbounded_or_unknown_oauth_replies_fail_closed`, `oauth_unrecognized_provider_descriptions_never_become_wire_errors`; OS boundary pending |
| ND06 | Keyring lease rotation and auth-session generation guard: revoke/disconnect vs token refresh and delayed HTTP completion | `newer_attempt_invalidates_prior_polling_generation`, `competing_native_auth_generations_reject_outdated_completions`; locked vault and restart pending |
| ND07 | `github_monitor_publish` validates counts and coverage objects, caps payload at 262144 bytes and message at 180 bytes, clears runner state on disconnect | Existing monitor projection tests are not complete IPC boundary coverage; plan 0/max/max+1 and disconnected-state cases |
| ND08 | `ci_failure_notify` requires explicit opt-in, selected repository, valid run ID/attempt, granted OS permission and dedup key | `notification_delivery_is_opt_in_and_restricted_to_selected_scope`; real OS alert, 512-entry eviction and restart remain |
| ND09 | `autostart_set_enabled` confirms OS state; failed verification invokes compensating action and returns an error | Source and `autostart-integration.test.mjs` candidate; installed XDG/Windows startup and remove/upgrade pending |
| ND10 | Post-test `main.rs::show_usage_popup` accepts only billing/tasks/runners and preserves focus when showing detached usage | Main tooltip geometry unit tests and Windows regression JS candidate; physical test pending |
| ND11 | Post-test `main.rs::validate_monitor_repositories` checks same account/valid exact repo, duplicate, <=100; account change resets selection as needed | `selected_repositories_require_same_account_and_valid_names`; add account-change x persisted selection cases |
| ND12 | Post-test `windows_geometry::raise_usage_popup` checks Win32 SetWindowPos success; no activation; error is surfaced | Existing geometry tests are arithmetic-only; FFI failure and installed z-order pending |
| ND13 | Post-test `windows_geometry::clip_usage_popup`: invalid sizes, null region, failed SetWindowRgn -> DeleteObject; on success OS owns region | Source review, no native OS lifecycle evidence; FFI failure/ownership test pending |
| ND14 | `linux_surface` show/hide/drag/resize + GTK callbacks must not leave pointer state stuck or move card unexpectedly | `native-drag.test.mjs` source candidate; compositor/session acceptance pending |
| ND15 | `main.rs` Quit and IPC admission must preserve user data and stop new Git work; hiding a window must not quit process | `graceful-quit.test.mjs` and `git_target_admission_tests` candidates; actual lifecycle pending |
| ND16 | Tray label/notification strings must match the 20 canonical locales and never expose private tokens | `tray_i18n.rs` catalog tests, `startup_diagnostics.rs` fixed milestone test; 20 independent installed locale reviews pending |

## Positive / N1–N12 applicability

Legend E=source-backed candidate but not measured, P=planned/insufficient, X=N/A with reason.
Each row is a flow family, not the final per-function matrix. No blank cells.

| Family | Pos | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REST / ETag / rate | E | E | E | E | P | E | E | E | E | P | E | X | X |
| OAuth wire / keyring / session | E | E | E | E | P | E | E | E | E | E | E | X | P |
| Monitor / CI notification | E | E | P | P | E | P | E | E | E | E | E | X | P |
| Native autostart / OS surface | E | E | E | X | E | P | P | P | E | E | P | X | E |
| Main settings / Git IPC / tray | E | E | E | P | E | P | E | E | E | E | P | X | E |
| Windows native geometry/FFI | E | E | E | X | X | P | E | P | E | E | P | X | P |
| Native labels / startup diagnostics | E | E | E | X | X | P | E | E | E | E | E | X | P |

X explanations: N11 is not applicable: RepoTicker has no purchases or entitlement gates.
N3 is not applicable to OS-local geometry, XDG/registry or bundled locale/diagnostic
processing; platform permission/storage failures belong to N12. N12 is not applicable
to in-memory REST/ETag/rate state, while credential vault and settings persistence
remain N12-sensitive. N4 is N/A where no repeatable/retry operation is implemented.
Each X must be re-evaluated when splitting flows into individual functions.

## Key interactions and Stage 10 mutation expectations

- Old credential + 304 + scope switch + new refresh + late HTTP 200:
  never surface prior-account projections or a false successful login.
- HTTP 403 denial + 403 quota + 429 with malformed Retry-After:
  preserve permissions/rate-limiting distinctions and bounded cooldown.
- Native notification opt-in + owner scope + repeated workflow attempt:
  one notification per approved unique key, never arbitrary texts.
- Settings Cancel + root selection + monitor scope/account change:
  rejected draft must not persist, and enrollment must not expand.
- KDE Wayland drag/resize/tooltip + high DPI + hide/reopen:
  no stuck pointer or changed location without explicit user action.
- Windows WebView2 popup + negative monitor coordinate + high DPI +
  failed FFI: no focus theft, topmost behavior and correct HRGN cleanup.

Mutations that should be killed include: permitting unapproved REST routes,
using a cached 304 from an earlier auth generation, dropping stream length
checks, treating permission 403 as rate-limit, storing secrets in JS, skipping
vault invalidation, reporting autostart success without verification,
not deleting a failed Win32 region, and bypassing monitor scope validation.

## Status / next action

This slice discovers source that a prior first-test cutoff missed.
Per-function source-to-test coverage, individual condition/exception
branches, expected case counts, measured branch coverage and mutation
evidence are still open. Continue with remaining JS/CI/release module
matrices before calling repository-wide Stage 3–8 complete.
The last verified Preflight success is #40935078253 on `82eba6f6`,
**not** on this documentation-only change. No fresh CI/build was queued
or launched; no CI submission timestamp exists for this batch.
