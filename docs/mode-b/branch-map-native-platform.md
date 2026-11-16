# Mode B: native surfaces, OS Keyring and relay transport branch review

Source baseline: a3ba7fa30fc4c81890d3075f94142942d001cbf3. Review staged at prepared documentation HEAD 665a69220a1528f14623fd89fcb714366e989b47.

This is a Stage 3–8 **partial** semantic map. Evidence labels: E = actual subject's public/pure function tested; C = test name and source behavior candidate, assertions not fully audited; S = source-text/static contract only; OS = requires real platform/IO acceptance. Do not upgrade C or S to E based on CI suite success.

## Native lifecycle, surfaces and OS integration

| Source rules | Distinct outcomes/boundaries | Existing candidates | Coverage status / planned cases |
| --- | --- | --- | --- |
| autostart.rs: autostart_is_enabled / autostart_set_enabled | previous==enabled (no-op); enable/disable succeeds; OS status read/error; confirm changed state; rollback if verify mismatches; rollback may itself fail | autostart-integration.test.mjs static/HTML; Settings IPC mock for mismatch in settings-github-confirm | C/S; no direct native OS failure-injection. Plan OS-A1: failed registration/read/verify, no false persisted state |
| linux_surface.rs: install/show/hide/resize/start_drag/stop_drag/cancel_drag | Wayland vs other backend, missing GTK surface/window; 0/max/clamped height; missing usage, drag pointer release, resize failures; main card stays fixed | quota-surface.test.mjs static source contracts; native-drag.test.mjs real JS helper + external IPC fake | C/S/OS; OS-L1: KDE Wayland compositor real visibility/drag/resize/focus, recover from missing GTK surface |
| linux_tray.rs: install/menu/activate | left click vs menu, fixed safe actions, locale, Quit uses same shutdown path, operation returns error when tray service unavailable | graceful-quit.test.mjs static route assertion; tray i18n Rust unit tests | C/S/OS; OS-L2: KDE tray activation and Quit exactly once |
| windows_geometry.rs: placement/restore/save/raise_usage_popup/clip_usage_popup | right/bottom/negative monitors and DPI; missing monitor; overflow x/y; config write/read failure; Windows topmost no activation; Win32 API failure and region ownership | inline Rust placement tests; windows-tray-physical-regressions.test.mjs static contracts | E for pure placement; OS-W1: actual WebView2 placement, scaling, z-order, focus, clipping + Win32 failures |
| app_icon.rs: tray_rgba/tray_argb | valid embedded icon dimensions/bytes, alpha/ARGB conversion on both platforms | package-identity.test.mjs and tray visual tests (review assertions) | C; plan N1/N6: decode valid bytes and invalid/empty icon failure |
| startup_diagnostics.rs: initialize/trace_startup_stage/allowed_stage | fixed milestone allowlist, unknown/untrusted stage discarded, secrets never logged, duplicate/delayed stages, opt-in disabled | Rust only_fixed_nonsecret_startup_milestones_are_accepted | C; verify disabled path, ordering, clock unavailable, output redaction |
| tray_i18n.rs: label/window_title/is_supported_locale | 20 supported locale names/actions/titles; unknown action safely ignored; fallback to English | Rust native_registry_contains_exactly_twenty_locales, every_native_action_and_title_has_a_bundled_string, unknown_tray_action_is_not_a_command | C; 20 locale coverage candidate, physical tray labels still OS |
| ci_notifications.rs: approved_scope/ci_run_notify | off/failed/success/both, opted-in selected account, valid run URL only, no token/user PII in toast, native permission denial | Rust notification_delivery_is_opt_in_and_restricted_to_selected_scope; ci-native-integration.test.mjs fixture | C/OS; cross auth revoke+incomplete jobs+OS notification denied |
| monitor_cache.rs: read/github_monitor_snapshot/github_monitor_publish | default unknown until auth; connected/disconnected clears stale runner state; valid counts/coverage; oversized >262144, status >180 or newline; no token/extra fields | Rust default_status_is_unknown_until_wallet_verification; monitor_projection_uses_only_expected_fields; ci-native-integration.test.mjs source/IPC | **Review needed:** arbitrary additional keys in runner_state Value appear accepted if counts and coverage exist; security claim says no token accepted. Do NOT call this proven leak without a real path; plan whitelist/redaction negative contract and source-trust classification |

## Relay transport and OS vault

| Source rules | Distinct outcomes/boundaries | Existing candidates | Coverage status / planned cases |
| --- | --- | --- | --- |
| relay_endpoint.rs: normalize_base_url/websocket_url | valid HTTPS exact origin; reject localhost/IP/credentials/query/fragment/path; WSS endpoint only cursor, 0/max cursor | Rust only_canonical_public_https_origins_are_stored; websocket_url_contains_only_cursor_and_validated_origin | C; URL parser canonical and punycode edge variants |
| relay_secret.rs: valid_secret/read_secret/store_secret/remove_secret | 31/32/256/257 base64url; no entry vs wallet denial, malformed stored; only Settings window authorized; overwrite/discard zeroizes | Rust strict_base64url_secret_policy_does_not_accept_untrusted_bytes; replacing_draft_wipes_candidate_without_keyring_write; wipes_owned_secret_buffer | C/OS; OS-K1 keyring write/read/remove permission failure & exact after-Cancel custody |
| relay_secret.rs: relay_prompt_secret/relay_stage_secret/relay_clear_secret/relay_commit_secret_draft | prompt concurrent denied, window hidden, volatile draft overwritten, failed store restores draft, successful commit wipes and restarts once, no secret in logs; native dialog timeout/cancel | settings-github-confirm.test.mjs actual Settings controller under mocked IPC; Rust inline secret tests | C/OS; OS-K2 actual Keyring transaction under interrupted Settings, late dialog, write failure; direct native command guards are not covered by JS mock |
| relay_transport.rs: http_failure_code/handshake_failure_code/phase_label/reason_label/backoff | HTTP 401/403/400/404/405/426/5xx, TLS/IO/other; 2^attempt up to 60s; finite public reason set | relay-native-diagnostics.test.mjs source assertions; Rust reconnect_is_bounded_without_unlimited_retry_frequency, public_availability_is_only_fixed_nonsecret_phase_data | C; N2 table all numeric status boundaries, backoff attempt 0/1/6/7/u32MAX |
| relay_transport.rs: restart/run/send_reconcile | polling/Hybrid; pending draft; missing URL/scope/auth/secret; handshake success/failure/timeout; reconnect; WebSocket text/ping/close/binary; invalid frames; stale task cancelled | relay-native-diagnostics.test.mjs source/Settings controller tests; core relay frame tests; prior KDE online log | S/OS; actual async task cancellation, duplicate scope and plaintext-free instrumentation not proven; OS-R1 reconcile REST after reconnect and bounded failures |
| RelayTransportState::phase + Settings Phase UI | online only after native WSS handshake; fallback reason is allowlisted; REST remains authority; missed event caught by snapshot, no false webhook health | settings-github-confirm.test.mjs native IPC simulation and one KDE observed online run | E controller behavior on fixture; live listener/transport failure still OS-R2 |
| Native shutdown (main.rs request_quit and Linux/Windows tray) | normal quit idle and during Fetch; owned children cleaned, lock race no double mutation; WebKitWebProcess exits without SIGABRT | graceful-quit.test.mjs source assertions; one observed KDE exit=0 with no new coredump | OS-Q1 repeated modes and Windows; issue #23 retains one prior WebKit SIGABRT |

## Cross-platform/transaction interaction matrix

| Combined independent states | Invariant |
| --- | --- |
| Hybrid draft status × native Settings visibility × Keyring locked × Cancel/OK | no committed credential without explicit OK, no late write after close |
| Hybrid→Polling × save_settings failure × wallet store success/failure | no false completed cleanup and no credential/UI leakage |
| Relay task restart × previous TLS handshake stalled × new account scope | old task aborted, no WSS with previous bearer or scope |
| Native OS autostart disabled/enabled × read/write denied × stale saved UI | OS registration authoritative; no phantom success |
| KDE Wayland multi-monitor × drag/resize × tooltip non-focusable | position stable and no WebKit crash; screenshot-only tests insufficient |
| Windows negative origin/DPI change × tooltip show/hide/resize | deterministic placement, no focus theft or missed cleanup |
| CI status opt-in × missing scope × stale auth × failed OS notification | no private text or fabricated success event |
| Quit × active Fetch × WSS restart × WebKit exit | single shutdown, only owned processes, no lingering child/core dump |

## Proposed safety-sensitive gaps (not implemented)

- OS-A1 autostart OS result mismatch, rollback and rollback failure.
- OS-L1/OS-L2 Linux Wayland Layer Shell and tray physical behavior.
- OS-W1 Windows native geometry/Win32 failure plus popup clipping ownership.
- OS-K1/OS-K2 actual Keyring state read/write/removal and late native credential dialog.
- OS-R1/OS-R2 real WSS task lifecycle and UI state projection after upstream failure.
- OS-Q1 controlled Quit under both polling and Hybrid with coredump comparison.
- Native-M1 monitor_cache accepts typed counts/coverage but no explicit nested field allowlist; independently establish whether an untrusted WebView can supply additional private keys before changing a public/security contract.

## Mutation obligations

- Removing Settings-only restriction must fail a command-contract test.
- Reordering native store before config OK must fail a transaction/custody test.
- Treating 503 as Online or exposing raw network response must fail phase/readback tests.
- Removing task abort on restart must fail reconnect/scope-isolation tests.
- Removing Windows focus suppression must fail native focus acceptance.
- Removing OS autostart verification and rollback must fail refusal scenario.

Physical platform checks are separate acceptance evidence; they are not by themselves proof of exhaustive branch coverage. No new test or deployment is performed by this documentation.
