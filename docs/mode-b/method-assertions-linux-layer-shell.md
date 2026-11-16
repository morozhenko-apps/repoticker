# Mode B: Linux GTK Layer Shell and Wayland relative-pointer method assertions

Production source `apps/desktop/src-tauri/src/linux_surface.rs` blob `30dc5253bae329655ab1455bb6dfcc1cba765bf9` (597 lines), baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `9a29d6948b7dee429d4630337dd84d366abb072f`.

**Inventory correction:** the initial 707-row lexical discovery **missed the actual `extern "C" fn on_relative_motion(dx,dy)` at source line 51**. That is a substantive private callback: it checks DRAG_ACTIVE/VISIBLE/finite dx/dy, accumulates fractional motion, clamps each packet to ±5000 and updates GTK bottom/right margins. It is inserted into `method-level-discovery.md` with status OS_P and independent tests; the global provisional inventory is therefore **708 rows** until a full AST/FFI callback pass finds any more omissions.

All original **26 lexical entries** classified here plus one new callback: **3 FFI_DECL native Wayland foreign declarations, 23 OS_P GTK/Wayland callable entries including newly found callback, and 1 P_NATIVE pure height validator**. No `#[cfg(test)]` unit tests exist in this source. JS `native-drag.test.mjs`, `quota-surface.test.mjs` and source-text UI tests do **not** execute these Rust functions or a physical compositor. No OS tests performed during review.

## All 27 source entries, incl newly added callback

| Line | Entry | Evidence | Source-contract / missing execution |
| ---: | --- | --- | --- |
| 13 | `fn repoticker_relative_init(callback: extern "C" fn(f64, f64)) -> i32;` | FFI_DECL | Foreign Wayland relative-pointer implementation, no Rust method body |
| 14 | `fn repoticker_relative_begin() -> i32;` | FFI_DECL | Foreign Wayland relative-pointer implementation, no Rust method body |
| 15 | `fn repoticker_relative_end();` | FFI_DECL | Foreign Wayland relative-pointer implementation, no Rust method body |
| 41 | `pub fn enabled() -> bool {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 45 | `pub fn visible() -> bool {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 51 | `extern "C" fn on_relative_motion(dx: f64, dy: f64) {` | OS_P | NEW: missed by lexical scan; primary relative-pointer native callback |
| 100 | `pub fn install(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 200 | `fn install_usage_surface(` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 260 | `fn on_usage_main(` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 276 | `fn anchor_usage(window: &gtk::ApplicationWindow) {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 301 | `pub fn show_usage(app: &AppHandle) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 316 | `pub fn hide_usage(app: &AppHandle) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 323 | `fn set_exact_viewport_height(viewport: &gtk::ScrolledWindow, previous: i32, height: i32) {` | OS_P | GTK min/max setter order on resize; physical run required |
| 333 | `pub async fn resize_usage(app: AppHandle, height: i32) -> Result<(), String> {` | OS_P | 118..320 usage height; actual GTK main-thread dispatch unverified |
| 378 | `fn apply_size(window: &gtk::ApplicationWindow, width: i32, height: i32) {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 401 | `fn on_main(` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 419 | `fn apply_card_height(window: &gtk::ApplicationWindow, height: i32) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 458 | `fn validate_card_height(height: i32) -> Result<(), String> {` | P_NATIVE | Pure 120..900 inclusive validation, no direct Rust assertion |
| 467 | `pub fn request_resize(app: &AppHandle, height: i32) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 478 | `pub async fn resize(app: AppHandle, height: i32) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 499 | `pub fn show(app: &AppHandle) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 522 | `pub fn hide(app: &AppHandle) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 531 | `fn persist_now(app: &AppHandle) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 542 | `fn stop_on_gtk(app: &AppHandle) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 553 | `pub fn cancel_drag(app: &AppHandle) -> Result<(), String> {` | OS_P | Native GTK main-thread/Layer Shell lifecycle requires OS tests |
| 563 | `pub async fn start_drag(app: &AppHandle) -> Result<(), String> {` | OS_P | Relative pointer begin returns capability success or denial |
| 585 | `pub async fn stop_drag(app: &AppHandle) -> Result<(), String> {` | OS_P | Relative pointer end/persist margin exactly once |

## Native flow and exact Stage 9 acceptance requirements

- **Installation:** no `WAYLAND_DISPLAY` or unsupported gtk_layer_shell returns without reparenting. Supported compositor must reparent the existing main WebView into a top `gtk::ApplicationWindow`, preserve no reserved exclusive zone, constrain card to 390×122 and leave it initially hidden. Missing WebView/GTK application/usage surface must error without partial visible UI. Physical KDE Wayland test required.
- **Detached Usage popup:** separate overlay GTK surface above card with 340-width viewport, keyboard mode None and pass-through true; cannot steal pointer or keyboard focus. `show_usage` rejects hidden card, positions above current card monitor and margins; `hide_usage` must complete without showing card. No JS-only model assertion substitutes for compositor allocation.
- **Geometry:** `validate_card_height` accepts 120..900, rejects 119/901; `resize_usage` accepts 118..320, rejects 117/321; `set_exact_viewport_height` changes min/max in safe order based on shrink/grow. `request_resize` queues on GTK and `resize` only resolves after main-thread application, so an async display must never claim geometry before GTK applied it. Test invalid input without GTK, then integration with mocked dispatch and physical allocation.
- **Relative pointer:** actual callback `on_relative_motion` must ignore non-finite/hidden/inactive and no integer delta, preserve subpixel remainder between packets, bound each per-packet movement, clamp margins 0..5000 and never modify another monitor's card. These branches were **absent from the original inventory** and require explicit OS/N1/N2/N5/permission tests.
- **Drag cancellation:** `start_drag` first hides hover, then admits only a visible card and successful relative protocol begin; `stop_drag`/`cancel_drag` deactivates immediately and ends the native protocol; `stop_on_gtk` persists moved margins only when DRAG_MOVED and clears fractional remainder. Race with hide and Quit must neither leak a pointer grab nor save wrong margins.
- **State inconsistency hypothesis, not a proven bug:** `show` sets VISIBLE before queued `on_main`, and `hide` clears before GTK cleanup. A failed main-thread enqueue could leave atomic presentation state divergent. Characterize deterministic failed dispatcher and observed visible state before proposing a production fix; native Tauri/GTK error policy may be architectural.
- **Platform:** Windows must not attempt this GTK module. FFI declarations at lines 13–15 are external functions, not separately unit-testable domain methods. Record whether relative-pointer-v1 is missing and application retains its non-drag fallback without claiming successful drag.

Applicable Positive/N1 malformed pointer/GTK, N2 geometry/limits, N4 repeated show/hide, N5 motion/races, N6 persisted margins, N7 compositor/permissions, N8 fractional scaling, N9 Escape/close/focus, N10 no personal data in logs and N12 persistence failure; N3 external WebSocket/network and N11 monetization NA. These obligations still need real code-level and physical platform evidence.

No Rust/JS tests newly executed, no GTK/Wayland process or OS files modified, no source/test/CI edits. Stage 3–8 global **PARTIAL**.
