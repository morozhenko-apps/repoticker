# Mode B: embedded tray PNG, RGBA resizing and Linux KSNI ARGB conversion

Prepared parent `1b2c9d11ab2daedba16c7650173439b6bd3aee5a`; production baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Sources: `apps/desktop/src-tauri/src/app_icon.rs` blob `98eb9e1cfcb925ad49daabd192c0eba6df2a1f13` (24 lines) and `apps/desktop/src-tauri/icons/icon.png` blob `49782b4c3fbbcd61a09198bc5538862fe1535412`.

The committed PNG was read as base64 from the exact `dev` blob; its first 8 decoded bytes match the PNG signature, IHDR declares **256 × 256**, color type **6 (RGBA)**. This is a **binary header inspection**, not successful decoding, Lanczos image processing, window rendering or CI execution. Production decodes via `image::load_from_memory` and resizes to **32 × 32**.

## Existing evidence and scope

- There are **no inline Rust tests** in `app_icon.rs`.
- `tests/tray-safe-sync.test.mjs` inspects `linux_tray.rs` and `main.rs` source strings for stable action IDs/labels; it does not call either `tray_rgba` or `tray_argb`.
- `tests/ui-layout.test.mjs` checks the About page's `icon.png` HTML reference, not the Rust embedded icon's decoded pixel bytes.
- `tests/package-identity.test.mjs` checks packaging and desktop launcher icon identity, not channel encoding/alpha.
- `tests/quota-surface.test.mjs` and `tests/windows-tray-physical-regressions.test.mjs` have static OS surface contracts, not native tray icon rendering.
- `linux_tray::icon_pixmap` is the immediate Linux consumer. Non-Linux `main.rs::tray_image` calls `tray_rgba()` and constructs Tauri's native RGBA Image; the two native icon formats intentionally differ.

## Exact method/branch map

| Entry | Real behavior and independent outcomes | Evidence state / missing assertion |
| --- | --- | --- |
| `ICON_PNG` | `include_bytes!("../icons/icon.png")` uses a compile-time asset, not a file path supplied by WebView or runtime environment | S static embed, binary header verified; missing asset should fail compilation rather than silently show an arbitrary fallback |
| `tray_rgba()` | Decode committed PNG, panic on malformed data via `expect`; resize exact 32x32 with Lanczos3; convert decoded image to RGBA8; return contiguous 4×32×32=4096 bytes plus (32,32) | Binary header inspection only; ? real Rust decoding, color channels, alpha values, 32×32/4096 size and deterministic repeat |
| `tray_rgba()` input errors | Invalid embedded image is a developer packaging failure, not a WebView untrusted input branch. Missing file fails at compile time, invalid bytes panic on invocation | No fault-injection test; production `include_bytes!` prevents runtime content substitution; test with fixture-only image decoder adapter |
| `tray_argb()` [Linux cfg] | Call real `tray_rgba`, allocate output, iterate `chunks_exact(4)`; each `[R,G,B,A]` becomes `[A,R,G,B]`; preserve width/height | S source; ? deterministic hand-constructed pixels, proof of length and channel permutation; PNG alpha 0/partial/255 cases |
| `tray_argb()` chunk residual | `chunks_exact` intentionally ignores 1–3 trailing bytes, but the real `to_rgba8().into_raw()` always yields a 4-byte multiple | Invariant from image API, not a reachable arbitrary byte input; do not fabricate a public API failure on raw input without changing contract |
| Linux `icon_pixmap` | Convert returned dimensions to i32 and supply data to KSNI `Icon`; actual D-Bus pixmap uses ARGB32 network byte order | S; real KDE StatusNotifier pixmap rendering and alpha compositing OS-L |
| Non-Linux `tray_image` | Calls `tray_rgba()` and Tauri `Image::new_owned(rgba,width,height)` | S, physical Windows/macOS conditional build and icon display unknown |

## Meaningful interactions

- **Source asset × platform build target:** one binary PNG is embedded; Linux ARGB conversion must not accidentally be used for Windows RGBA. A compile-time PNG content change should be caught by a direct decoder+pixel test rather than screenshot-only checking.
- **Transparent alpha × KDE tray theme × scaling:** preserve exactly the decoded alpha channel under ARGB reorder. A fully opaque sample cannot detect alpha lost/swapped; include 0, 127 and 255 alpha test vectors.
- **Installed release image × source identity:** the 256×256 source header does not prove that DEB/AppImage/Windows installers include the same icon at all scales; packaging and OS acceptance are independent.
- **Invalid committed PNG × build:** Rust compile may succeed with embedded invalid bytes but runtime `expect` panics; direct test of decoding the shipped asset is necessary for release gate.
- **Change without substantive pixels:** avoid flaky exact resized pixel values across image crate versions unless dependency is pinned. Assert shape, semantic alpha and explicit synthetic channel samples.

## Positive/N1–N12

| Category | Status | Required proof |
| --- | --- | --- |
| Positive | S + PNG header | Decode actual source, exact output shape, Linux byte permutation |
| N1 | ? | Invalid PNG bytes via fixture/decode seam, transparent or malformed sample |
| N2 | S | Source 256×256, returned 32×32, 4096 bytes and pixel edge cases |
| N3 | NA | Pure memory decoder, no external service |
| N4 | ? | Repeat decode deterministic, stable output |
| N5 | NA | No asynchronous mutable state |
| N6 | ? | Broken/empty embedded asset fails reliably, not unsafe fallback |
| N7 | E source design | No arbitrary WebView-supplied icon path or network URL |
| N8 | NA | No locale or time |
| N9 | OS | KDE tray render and Windows icon DPI/theme acceptance |
| N10 | NA | Binary asset is not private account/provider content |
| N11 | NA | No entitlement |
| N12 | NA | No persistence or external storage at runtime |

## Stage 9 implementation after full Stage 3–8 sign-off

- IC1: call actual native `tray_rgba` with shipped source icon, assert (32,32), 4096 bytes, decoded png dimensions invariant, alpha channel and stable pixel representation.
- IC2: isolate **only** the external PNG decoder/byte buffer to permit deterministic `[R,G,B,A]` synthetic pixels and assert `[A,R,G,B]`, including 0/127/255 alpha. The real permutation loop must execute. Do not duplicate the algorithm in test instead of invoking production code.
- IC3: checked error outcome for a corrupted image fixture and packaging identity, without changing shipped public behavior or production fallback.
- IC4: physical KDE/Windows native tray render at 100%/150% DPI, light/dark shell, hidden/visible and taskbar restart; distinguish physical acceptance from checksum/CI gates.

Mutations to kill: swap R/B, fail to move alpha to first byte, resize to wrong dimensions, convert by reference to non-embedded icon, omit alpha, silently accept invalid source or use different Linux/Windows icon. **No tests or mutations were run.**

Mode B global Stages 3–8 remain PARTIAL; no production code, tests, CI or release refs changed by this map.
