# Mode B: KSNI Linux tray dispatch and versioned native locale registry

Prepared parent `5fa06c8c0e47a7ad27dc7b67edd479ea70232cd0`; exact deployed-source baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Sources: `apps/desktop/src-tauri/src/linux_tray.rs` blob `710ffec858854c56eab31dd6327f38753a929e3c` (120 lines); `apps/desktop/src-tauri/src/tray_i18n.rs` blob `fb73f95295274862679ad51d229ae66926c029fd` (89 lines); `apps/desktop/ui/locales/native.json` blob `c28968a247ffc1d6486a110a5dae95408fd5b14f`.

**Stage 3–8 assertion review only.** Evidence: **E** = real method executed and asserted; **S** = executable test inspects source text or bundled JSON only; **OS** = native KDE D-Bus/GTK acceptance; **?** = no directly matched assertion. This map never treats source regex as KSNI runtime behavior.

## Existing tests inspected

- Three inline Rust `tray_i18n.rs` tests:
  - `native_registry_contains_exactly_twenty_locales` calls real `catalog` and `is_supported_locale`: exact set of 20 canonical identifiers present; unknown `pt-BR`, `zh`, `tl`, empty, uppercase `EN` rejected.
  - `every_native_action_and_title_has_a_bundled_string`: all 20 locales have nonempty strings for six menu actions and two window title kinds. Exact checks `pt/settings -> Definições`, `ru/quit -> Выход`, `de/settings window title -> RepoTicker-Einstellungen`, and unknown locale fallback `quit -> Quit`.
  - `unknown_tray_action_is_not_a_command`: real `label("ru","arbitrary")` returns static `RepoTicker`, not a translated command.
- Three `tests/tray-safe-sync.test.mjs` tests parse actual `native.json` as JSON and match Rust source strings for Linux/Windows six stable actions, ordering, Safe Sync dispatch and in-place KSNI locale updates. **They do not instantiate `LinuxTray`, DBus or native menus.** Source hash `c8f429fe9c7320c6f300be5023c97539877ae657`.
- `tests/windows-tray-physical-regressions.test.mjs` uses static Rust/HTML/CSS/CI contract assertions and pure UI values. It is not a physical native test despite its filename.
- No inline Rust tests exist in `linux_tray.rs`. The native `main.rs` operation/quit command mapping has separate maps in `branch-map-main-git-admission.md` and `branch-map-native-platform.md`.

## Function and branch-to-assertion ledger

| Exact method or entry | Executable outcomes / invariant | Existing evidence and outstanding case |
| --- | --- | --- |
| `LinuxTray::on_ui` | Clone handles then `run_on_main_thread` once; match `open`, `toggle`, `settings`, `about`, `fetch`, `sync`, `quit`; unsupported string -> no action; queue error ignored | S source assertions for `safe_sync` and quit; ? real callback dispatch per action, main-thread scheduling failure, unknown action produces zero side effects |
| `Tray::id` | Fixed `repoticker` identifier | S source; ? real StatusNotifier identity and no duplicate registration |
| `Tray::title` | Fixed `RepoTicker` title | S source; ? KSNI property readback |
| `Tray::icon_pixmap` | Native ARGB32 pixel vector from `app_icon::tray_argb`, dimensions u32→i32 | S code, actual PNG bytes/format not checked directly; ? real KDE pixel rendering and unusual icon alpha |
| `Tray::activate` | Primary KDE click invokes `on_ui("toggle")`, not `open`; ignores supplied click x/y | S comments/source, OS real DBus Activate, repeated click and hidden→shown→hidden |
| `Tray::menu` | Six stable actions exactly in order open, fetch, sync, settings, about, quit; translated labels resolved at read; callback always calls stable internal action ID | S order/labels and underlying `tray_i18n` E; ? actual menu callback route, disabled/unavailable account/state, no queued duplicate operation |
| `linux_tray::install` | `read_config` success selects saved locale; on error fallback English; `LinuxTray.spawn()` may fail; `app.manage(handle)` retains one handle | S `.spawn()?` and `app.manage(handle)`; ? invalid persisted locale, DBus disconnected/failed spawn, error redaction |
| `linux_tray::set_language` | Optional managed KSNI handle exists vs missing; existing handle updated in place; update error ignored and no respawn | S `handle.update` and no polling; ? concurrent menu activation+locale update, missing handle, failed DBus update followed by repaint |
| `tray_i18n::catalog` | One-time `OnceLock` parse of embedded native.json; invalid bundled JSON panics at startup via `expect` | E valid committed JSON through Rust test; ? malformed bundled catalog build guard, concurrent first-use initialization |
| `is_supported_locale` | Exact BTreeMap key lookup, case-sensitive, no implicit regional aliases | E 20 valid + five invalid |
| `text` | Preferred locale entry or English; missing translated key falls back literal source English string | E supported translations + unknown locale English; ? missing per-locale key fallback requires synthetic catalog seam or controlled asset fixture, production catalog currently is embedded |
| `label` | Stable six action keys -> English catalog key, any unknown action -> static title | E real all-six nonempty for 20 locales, unknown action, selected exact translations; ? translation direction/truncation in real KDE |
| `window_title` | Settings/About localized; unknown window kind fixed title | E two known kinds across locales; ? unknown kind direct assertion, actual Tauri native window update |
| `build_desktop_tray_menu` (main.rs) | Non-Linux native six menu items same stable IDs; menu creation can fail; order open/fetch/sync/settings/about/quit | S JS test, Windows OS acceptance pending |
| `refresh_tray_language` (main.rs) | Linux updates existing KSNI handle; Windows builds replacement menu and ignores repaint failure without rolling back saved language | S + actual Settings fake IPC; OS physical errors and accepted update |

## Cross-module invariants and interactions

- **KDE Activate versus menu Open:** KDE primary click toggles card; explicit Open action opens it. Neither must launch Git. Validate on real KSNI event after hiding card and while a Git subprocess is active.
- **Safe Sync versus Fetch:** Tray action string `"sync"` routes to `dispatch_menu_action(...,"safe_sync")`, not legacy `safe_pull`. Enrolled repo and operation lock remain enforced in native main.rs, separate from KSNI labels.
- **Locale write versus unavailable tray service:** Language preference must remain saved even if KSNI menu repaint fails. The native code currently ignores update failure. UI must not advertise that live tray labels were repainted without a real readback.
- **Right-click menu construction × 20 languages:** Source verifies labels exist, but cannot guarantee KDE menu width, focus/RTL, shortcut behavior or action order when the shell restarts.
- **Icon bridging:** Each KSNI pixmap has width/height from the actual PNG decode, converted to ARGB; the exact channel conversion is mapped separately. Native Windows system tray uses RGBA through its own UI pipeline.
- **No secret leakage:** Stable action IDs are not user-controlled, source log and UI notice must not incorporate arbitrary provider values; do not use repository identities in menu labels.

## Positive / N1–N12

| Category | State | Missing independent evidence |
| --- | --- | --- |
| Positive | E native i18n / S KSNI | Real D-Bus Activate and six menu callbacks, successful update |
| N1 | E i18n / ? KSNI | Invalid locale/title kind, missing tray handle, bad pixmap |
| N2 | E catalog | Exactly 20 languages, 6 action keys and 2 title kinds; very long translation labels in KDE |
| N3 | ? OS | D-Bus spawn/update/scheduling failure and shell restart |
| N4 | S / OS | Repeated menu click, duplicate native safe sync admission, repeated set_language |
| N5 | S / OS | Callback queued during Quit/locale change/Git operation |
| N6 | E i18n / OS | Invalid config read fallback, unavailable D-Bus and malformed bundled data |
| N7 | E label / S menu | Unknown action cannot dispatch; OS event must stay allowlisted |
| N8 | E catalog / OS | Real RTL Arabic label/menu direction and localized About title |
| N9 | OS | KDE Wayland, tray click, focus, hidden window and system shutdown |
| N10 | S | No sensitive dynamic menu values; native failure logs/OS introspection |
| N11 | NA | No paid entitlement |
| N12 | OS | Tray handle lifecycle, menu object disposal, DBus recovery |

## Stage 9 testable obligations after full global Stages 3–8

- NT1: real `LinuxTray` with injected external KSNI main-thread dispatcher and callback collector. Assert each menu item fires one exact stable command; unknown action has no side effect. Do not mock the action dispatch logic.
- NT2: recover from read_config failure/unsupported locale, spawn error, missing handle, update error and repeated update without respawn. Preserve saved JSON on tray failure.
- NI1: comprehensive exact locale lookup and per-key fallback tests, unknown title kind, all 20 languages and supported standalone IDs. Check real bundled JSON validity without swapping stable strings.
- NT3: Linux KDE physical acceptance of click-to-toggle, right-click menu, icon, language switch and Quit while Fetch owns a child process. Windows counterpart for native menu rebuild.
- NT4: byte-exact native icon conversion (separate map), no accidental alpha channel shift.

Mutation sensitivities: map `sync` to `safe_pull`, let `toggle` call Git, remove allowlist, call main-thread dispatcher twice, respawn KSNI on language changes, break English fallback, drop one canonical locale, show wrong About/title. Only an actual behavioral failure counts as a mutation kill.

Mode B global Stage 3–8 remains PARTIAL. No tests or production source were modified/executed.
