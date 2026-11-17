# Mode B Stage 3: Rust cfg, test-only and platform source inventory

**Read-only source inspection, 2026-11-15.** Baseline exactly `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `032031f84f7b138002ce0adfee08ea653a6c4d85`. All **27 Rust source files** in the baseline production core, desktop and build script were individually reopened by immutable blob through the connected GitHub source provider. The scan counted `#[test]` and `#[cfg(...)]` tokens and identified direct `#[cfg(test)] mod ...` sites. **This is a text/source-level cfg inventory, not a Rust AST expansion or a cargo test run.**

## Coverage of the source census

- **27** Rust production source files inspected. **164** `#[test]` annotations observed (source counts only; not 164 tests run, not necessarily 164 on one platform).
- **22** Rust source files have one or more `#[test]` annotations; **five** have none: `build.rs`, `app_icon.rs`, `autostart.rs`, `linux_surface.rs`, `linux_tray.rs`. This does not exclude tests in external `tests/` integration crates.
- The `#[test]` annotation and nearby test-fixture helper functions do **not** make the associated declarations production methods. Rust production method enumeration must exclude cfg(test) scopes and source-only fixture helpers while retaining actual platform-dependent production methods.
- The previously reconciled native IPC register has **55** command annotations and exactly **55** generator registrations, including **33** in `main.rs` and **22** elsewhere. Their runtime authorization cannot be derived from these counts.
- `main.rs` has four separately named test modules (`footer_tooltip_geometry_tests`, `relay_resource_links_tests`, `git_target_admission_tests`, `monitor_selection_tests`) and several Linux/Windows/macOS conditional branches. `git.rs` contains both unconditional `#[cfg(test)]` and `#[cfg(all(test, unix/windows))]` regions. A single host cannot claim every OS-specific test was executed.

## Per-source test-only and platform cfg receipts

| Rust source | `#[test]` annotations | Observed cfg types (abbreviated) | Remaining ownership |
| --- | ---: | --- | --- |
| `apps/desktop/src-tauri/build.rs` | 0 | none | Build tooling: platform-specific external CC/pkg-config runtime, not cfg-annotated inline tests |
| `apps/desktop/src-tauri/src/app_icon.rs` | 0 | linux | Linux-specific ARGB conversion; no inline tests |
| `apps/desktop/src-tauri/src/autostart.rs` | 0 | none | Native plugin and OS autostart, source-only |
| `apps/desktop/src-tauri/src/ci_notifications.rs` | 2 | test | One cfg(test) module; OS notification actual delivery pending |
| `apps/desktop/src-tauri/src/github_api.rs` | 13 | test | HTTP route projection/helper tests; native REST runtime pending |
| `apps/desktop/src-tauri/src/github_etag_cache.rs` | 13 | test | ETag generation and concurrent memoization, real host pending |
| `apps/desktop/src-tauri/src/github_native.rs` | 4 | test | Pure credential form/record tests; OS Keyring pending |
| `apps/desktop/src-tauri/src/github_oauth_wire.rs` | 8 | test | Pure grant and response parsing tests; HTTP transport pending |
| `apps/desktop/src-tauri/src/github_rate_gate.rs` | 7 | test | Rate and concurrent cooldown gate, real native time pending |
| `apps/desktop/src-tauri/src/github_session.rs` | 7 | test, linux, macos, windows | Native browser launcher OS branches; auth commands and vault gate pending |
| `apps/desktop/src-tauri/src/linux_surface.rs` | 0 | none | GTK Layer Shell, Wayland relative-pointer lifetime; physical KDE pending |
| `apps/desktop/src-tauri/src/linux_tray.rs` | 0 | none | KDE KSNI/DBus native tray, physical acceptance pending |
| `apps/desktop/src-tauri/src/main.rs` | 11 | test, linux, macos, windows, not-linux, not-windows | Four cfg(test) helper modules; OS/native IPC A2 and shutdown still pending |
| `apps/desktop/src-tauri/src/monitor_cache.rs` | 2 | test | Top-level schema/serialization, nested runner_state NM1 STOP |
| `apps/desktop/src-tauri/src/relay_endpoint.rs` | 2 | test | Pure URL-origin normalization, real TLS pending |
| `apps/desktop/src-tauri/src/relay_secret.rs` | 4 | test, linux, windows, other | OS prompt/credential platform branches, draft commit RS1/RS2 pending |
| `apps/desktop/src-tauri/src/relay_transport.rs` | 2 | test | Pure backoff/errors, WSS run/restart pending |
| `apps/desktop/src-tauri/src/startup_diagnostics.rs` | 1 | test | Allowed-stage predicate, real file/OS stdout redaction pending |
| `apps/desktop/src-tauri/src/tray_i18n.rs` | 3 | test | Native locale text, live tray dispatch/refresh pending |
| `apps/desktop/src-tauri/src/windows_geometry.rs` | 4 | test | Pure placement, Win32 DPI/window physical acceptance pending |
| `crates/repoticker-core/src/bounded.rs` | 5 | test | Worker bounded concurrency pure Rust, native task admission A2 pending |
| `crates/repoticker-core/src/config_store.rs` | 15 | test, unix, not-unix | JSON recovery/atomic update; Unix permissions and Windows ACL divergent |
| `crates/repoticker-core/src/git.rs` | 31 | test, unix, windows, linux, cfg(all(test,unix)), cfg(all(test,windows)) | Real Git and subprocess tests, OS-specific owned children, native IPC remains separate |
| `crates/repoticker-core/src/github_auth.rs` | 14 | test | Pure OAuth state machine/clock tests, real native auth adapter pending |
| `crates/repoticker-core/src/lib.rs` | 8 | test | Pure sync decision, actual checkout concurrency belongs Git/native |
| `crates/repoticker-core/src/relay.rs` | 5 | test | Pure frame/parser/cursor, native websocket independent |
| `crates/repoticker-core/src/shutdown.rs` | 3 | test | Atomic shutdown state, native Quit operation lock separately |

## What the source evidence proves and what it does not

These annotations distinguish **test-only source code** from public/testable production logic at a coarse level. They do not prove a Rust implementation is exercised by its tests, that a `#[cfg(test)]` helper's body has no production-equivalent path, or that all functions/macro expansions are accounted for. On Unix/Windows/macOS, conditional code can differ even when the same module contains shared tests. All test counts require `cargo test --list`/configuration-aware discovery and separately recorded execution at the final Mode B Stage 11 gate, **not now**.

A parser-backed follow-up needs to output for each `path@blob:line:column`:
(1) syntax node type (`fn`, method, impl, trait, `extern` or macro-generated boundary);
(2) `cfg(test)` or OS-target applicability;
(3) production/test-only classification;
(4) branch/negative-matrix ownership;
(5) evidence type E/I/S/P/OS.
Do not add 164 test annotations to the provisional 728 source artifact register. The existing 728 rows remain an **incomplete lexical registry**, and Stage 3 AST exhaustiveness remains unverified.

## Priority Stage 4/5/6 consequences

- Native Git: `main.rs` and `git.rs` Unix/Windows test portability and real A2 IPC/Git cancellation are separate evidence branches. A synthetic Windows command or Linux process-group test cannot substitute for actual OS acceptance.
- Native credential/relay: `relay_secret.rs`, `github_session.rs` and `github_native.rs` actual OS Keyring, prompt and delayed close races remain P/OS; RS1/RS2/NM1 are architectural STOP hypotheses, not confirmed defects.
- Platform UI: `linux_surface.rs`, `linux_tray.rs`, `app_icon.rs`, Windows native popup and autostart have OS/hardware callbacks requiring physical validation distinct from pure tests.
- No Stage 5 `✔` may be promoted from a `#[test]` source count. Stage 6 requires cross-component Quit × active Git, auth rotation × ETag, native OS popup × view lifecycle; Stage 7 count estimates remain deduplicated planning only.

**No Rust parser installed here, no Cargo toolchain or RepoTicker checkout; no application test, build, CI, OS acceptance or production mutation performed. Status: Stage 3 PARTIAL.**
