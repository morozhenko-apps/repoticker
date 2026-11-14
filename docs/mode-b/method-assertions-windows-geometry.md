# Mode B: Windows geometry, z-order and GDI rounded region method assertions

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; production `apps/desktop/src-tauri/src/windows_geometry.rs` blob `3919aba2b8377d0fae5f0aa97312493456e4232b` (228 lines). Audit parent `f09ede87ce5a93d92f41f4319206daf9ae65353c`.

**All 14 original lexical rows** now classified: 1 E_PARTIAL pure `placement` helper with four direct real inline tests, 3 P_NATIVE AppHandle/monitor/config functions, 2 OS_P Win32 calls, 4 TEST_ONLY Rust inline test definitions and 4 FFI_DECL native foreign declarations. No Windows tests ran during this source audit. [Prior native platform matrix](branch-map-native-platform.md) retains N-category/OS acceptance details.

## Per-line classification

| Line | Subject | Evidence status | Real assertion / missing native behavior |
| ---: | --- | --- | --- |
| 10 | `fn placement(` | E_PARTIAL | 4 inline unit tests call placement with negative monitors, DPI and oversize |
| 25 | `fn monitor_area(window: &WebviewWindow) -> Result<Option<((i64, i64), (i64, i64))>, String> {` | P_NATIVE | Current/primary monitor read and OS errors, untested |
| 44 | `pub(crate) fn restore(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {` | P_NATIVE | Config margins and physical reposition, missing window/monitor |
| 73 | `pub(crate) fn save(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {` | P_NATIVE | Persist margin fields, config write failure and unchanged |
| 97 | `fn restores_position_for_bottom_right_work_area() {` | TEST_ONLY | #[cfg(test)] exact bottom-right placement check |
| 105 | `fn keeps_bottom_edge_when_view_grows() {` | TEST_ONLY | #[cfg(test)] growing-window bottom edge check |
| 113 | `fn supports_negative_monitor_coordinates_and_high_dpi_sizes() {` | TEST_ONLY | #[cfg(test)] negative monitor high-DPI check |
| 121 | `fn clamps_stale_margins_and_oversized_windows() {` | TEST_ONLY | #[cfg(test)] huge/negative margins clamp check |
| 136 | `fn SetWindowPos(` | FFI_DECL | Win32 SetWindowPos foreign declaration only |
| 150 | `pub(crate) fn raise_usage_popup(popup: &WebviewWindow) -> Result<(), String> {` | OS_P | SetWindowPos HWND_TOPMOST|NOSIZE|NOMOVE|NOACTIVATE, no OS run |
| 183 | `fn CreateRoundRectRgn(` | FFI_DECL | GDI CreateRoundRectRgn foreign declaration only |
| 191 | `fn DeleteObject(handle: *mut std::ffi::c_void) -> i32;` | FFI_DECL | GDI DeleteObject foreign declaration only |
| 196 | `fn SetWindowRgn(hwnd: *mut std::ffi::c_void, region: *mut std::ffi::c_void, redraw: i32)` | FFI_DECL | Win32 SetWindowRgn foreign declaration only |
| 202 | `pub(crate) fn clip_usage_popup(popup: &WebviewWindow) -> Result<(), String> {` | OS_P | Win32 rounded region attach ownership/failure, no OS run |

## Four direct `placement` test assertions

- `restores_position_for_bottom_right_work_area`: `placement((0,0),(1920,1040),(390,122),12,12)=(1518,906)`.
- `keeps_bottom_edge_when_view_grows`: height 210 shifts y to 818 without changing x.
- `supports_negative_monitor_coordinates_and_high_dpi_sizes`: origin (-2560,-100), available (2560,1440), window (585,315), margins (18,18) -> (-603,1007).
- `clamps_stale_margins_and_oversized_windows`: huge margins clamp to (0,0), oversized window to work-area origin (10,20), negative margins treated as zero. These tests call real placement, not WebView2 OS functions.

## Distinct native acceptance and failure edges

1. `monitor_area`: current monitor vs primary fallback vs both absent; denied/error Win32/Tauri monitor query; negative-monitor geometry and per-monitor physical DPI.
2. `restore`: no monitor returns successful no-op; successful config read/margins; missing config defaults 12; i64->i32 overflow rejects; `set_position` failure surfaces. Actual config access and window moves not directly tested.
3. `save`: no monitor no-op; position/size error; right/bottom clamped 0..i32::MAX; `update_config` writes only when values differ; refused disk write preserves old config; RTL/locale irrelevant.
4. `raise_usage_popup`: Win32 `SetWindowPos` requests HWND_TOPMOST without activating, moving or resizing. The debug path reads visibility/position/size but should not contain credentials. Failure=0 returns OS diagnostic; actual z-order requires Windows physical smoke.
5. `clip_usage_popup`: invalid width/height rejected, DPI diameter clamp 2..min(width,height), GDI region creation failure, `SetWindowRgn` failure frees region exactly once. On success **Windows owns HRGN** and code must not call `DeleteObject`. Simulate Win32 API return failure with a thin FFI adapter only if planned minimal DI can preserve Windows behavior; genuine WebView2 compositor/rounded-corner acceptance remains physical OS-only.
6. The four FFI declarations are not testable domain functions themselves. Their contracts are tested via `raise_usage_popup` / `clip_usage_popup` ownership and side effects; they must not be counted as separate public function test obligations.

Negatives: N1 invalid window/size, N2 0/1/MAX clamps and i32 overflow, N3 NA (no external network), N4 repeated Save/Restore and rounding, N5 show→resize→hide/focus races, N6 stale config, N7 OS HWND authority, N8 physical pixels/DPI, N9 focus and popup hide, N10 no raw user secrets in debug, N12 config storage failure; N11 NA.

**Stage 3 classification only:** no refactoring, test implementation, CI dispatch or real Windows/Win32 API execution. Stage 3–8 PARTIAL.
