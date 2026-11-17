# Mode B: Windows physical popup placement, monitor selection, topmost and region ownership

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `apps/desktop/src-tauri/src/windows_geometry.rs` blob `3919aba2b8377d0fae5f0aa97312493456e4232b`, 228 lines. Prepared parent `504b7b0e662344279b16c5375734c365581f83bf`.

This is a Windows-target native submodule. The four inline Rust tests execute **pure `placement` calculations**, while the separate `tests/windows-card-regressions.test.mjs`, `tests/windows-tray-physical-regressions.test.mjs` and `tests/quota-surface.test.mjs` check many Windows implementations as source strings plus imported pure JS sizing helper. **None establishes actual `WebviewWindow`, Win32 SetWindowPos/SetWindowRgn or OS monitor state at runtime.** No Windows execution was performed during this documentation audit.

## Four real inline Rust placement tests

| Test | Exact precondition and expected output |
| --- | --- |
| `restores_position_for_bottom_right_work_area` | origin (0,0), work area (1920,1040), window (390,122), margins 12/12 => position (1518,906) |
| `keeps_bottom_edge_when_view_grows` | identical area, height grows to 210 => (1518,818); bottom edge remains anchored |
| `supports_negative_monitor_coordinates_and_high_dpi_sizes` | origin (-2560,-100), area (2560,1440), window (585,315), margins 18/18 => (-603,1007) |
| `clamps_stale_margins_and_oversized_windows` | margins 900/900 clamp to origin; work area smaller than 390x122 window clamps to origin; margins -20/-30 normalize to 0 giving (410,478) |

The tests do not run `restore` or `save`, nor physically change/inspect any popup.

## Every relevant branch

| Method | Independent outcomes | E versus ? |
| --- | --- | --- |
| `placement` | Clamp negative right/bottom to zero; compute workarea minus window with max(0); clamp resulting X/Y to each monitor origin..max; preserve signed origin; valid/oversize | E four inline calculation tests; ? zero dimension and extremely large i64 overflow (not normal OS monitor bound) |
| `monitor_area` | `current_monitor` returns Some, None falls back to `primary_monitor`; either API can error; no monitor returns None; `work_area` position and size | S source, OS-W actual multiple monitors, unplug and no-monitor error |
| `restore` | No area => Ok/no mutation; outer_size/read_config errors; margins Some/default 12; position computation, i64→i32 conversion errors; `set_position` may fail | E underlying placement, S handler; ? native physical placement/failure and persisted config, default policy |
| `save` | No area => Ok/no write; read outer position/size errors; compute right/bottom margins, clamp to 0..i32MAX; `update_config` if values differ vs equal (no disk rotation) | E core JsonStore transaction, S native; ? correct margins saved from negative monitor, no write on unchanged state and error handling |
| `raise_usage_popup` | Obtain Win32 HWND or error; SetWindowPos(topmost, no size/no move/no activate), failure -> last_os_error string, success -> optional debug metadata; no focus/position mutation | S source, OS-W Win32 actual z-order/focus, rejection (invalid HWND); logging may include position but no OAuth/provider data |
| `clip_usage_popup` size/scale | Missing outer_size/scale_factor; checked u32→i32 width/height; nonpositive denied; radius logical 11px×2×DPI round and clamp 2..min(width,height); valid region | S source, OS-W physical DPI, 0 dimension, negative/large factor, geometry change |
| `clip_usage_popup` handles | HWND error, CreateRoundRectRgn returns null -> error, SetWindowRgn returns 0 -> DeleteObject(owned region) then error, success transfers ownership to OS and must not delete | S native ownership contract; ? Win32-injected failures and actual HRGN ownership |
| `SetWindowPos`, `CreateRoundRectRgn`, `DeleteObject`, `SetWindowRgn` FFI | Explicit OS calls only, platform-specific type and ownership; failures mapped or handled | No direct native FFI execution test; physical Windows acceptance and external adapter required |

## Interaction matrix

- **Monitor selection × DPI × snapped panel × card height:** One logical resize must not double-scale, teleport or move to a different monitor. Existing pure geometry tests prove selected sample arithmetic, not monitor choice.
- **Show vs Resize vs Hidden popup:** Raising a tooltip should retain exact position and keyboard focus. Main.rs's call ordering and actual Windows process must be exercised; regex cannot prove nonactivation.
- **Bottom-right saved margin × primary-monitor fallback × unplugged secondary:** Position must remain visible inside available work area; if none, native returns success/no action, not invented screen coordinates.
- **Resize clipping × Win32 HRGN ownership:** Failing SetWindowRgn leaves ownership with the application and requires exactly one DeleteObject. Successful transfer forbids DeleteObject by app; inspect with resource adapter/Windows leak sampling.
- **Config concurrent update × margin save:** Real JsonStore.serialized update protects one process from lost writes; update/config validation errors should not be misreported as a correctly saved Windows anchor.
- **Windows click drag vs native z-order:** Popup should never steal focus when made topmost. This is physical acceptance, not a simulated CSS geometry invariant.

## Positive + N1–N12

| Class | Status | Open exact evidence |
| --- | --- | --- |
| Positive | E pure / OS | Placement arithmetic; real restore/save/raise/clip missing |
| N1 | E partial | Negative/stale margins; native invalid HWND, bad scale factor, missing monitor |
| N2 | E partial | Oversized window, zero, extrema and DPI; exact region corner bounds |
| N3 | OS | Win32 API failure, monitor unplugged, denied window positioning |
| N4 | S / OS | Repeat same margins and repeat show/resize without region leak |
| N5 | OS | Concurrent popup show, pending resize and monitor changes |
| N6 | E pure / OS | Old persisted margins, malformed config, missing primary monitor |
| N7 | S | Native popup uses only own HWND; no foreign Win32 window may be mutated |
| N8 | NA | No wall clock or locale decisions |
| N9 | OS | Alt-Tab/keyboard focus, compositor z-order, window hide/close |
| N10 | S | Debug metadata excludes secrets, still may contain window coordinates |
| N11 | NA | No entitlement |
| N12 | OS | Win32 region resource allocation, config write failure/rollback |

## Stage 9 test and OS gate plan

- WG1: parameterized real `placement` with negative-origin monitors, zero/oversized window, margins 0/12/negative/huge, large coordinates and edge clamp; kill every `max`/`clamp` boundary mutation.
- WG2: external WebviewWindow/monitor adapter with real `restore`/`save` functions: current monitor/primary fallback/none/error, outer geometry error, position set fail, JsonStore write fail and idempotence.
- WG3: Win32 FFI seam for SetWindowPos and region ownership across null/create/attach success/failure; assert exact flags and no DeleteObject on successful ownership transfer. Do not fake native algorithm under test.
- WG4: physical Windows acceptance for secondary/negative-origin monitor, DPI 100% and 150%+, topmost without focus, clipped transparent corners during expand/shrink, Alt-Tab, autohide and tray hide/show.

Mutants to kill: omit monitor origin, double-apply DPI, allow negative margins, drop checked width conversion, drop SWP_NOACTIVATE, fail to release HRGN on attach failure, delete HRGN on success, write config after read failure. No mutation or OS test executed.

Overall Mode B Stage 3–8 PARTIAL. This docs-only commit modifies no native code, tests or published branch.
