# Mode B: Pillow icon import CLI, cross-platform resize output and non-atomic asset writes

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; tool `tools/import_icon.py` blob `1ace88b904225d6170f597c7da569eb6ebfbda32` (44 source lines), one `main()` entrypoint. Parent `8fc3d924ce9d2e96e2bb1d88ffb4ab2ccaa4a01d` on named `audit/mode-b-testing`.
Existing `branch-map-native-tray-icon.md` covers the **separate Rust consumer** `app_icon.rs` and the *committed* embedded `icons/icon.png`. The present file maps the **developer CLI that generates** those cross-platform assets.

**Existing executable assertion:** No dedicated test invokes `tools/import_icon.py` or directly calls its `main` in inspected `tests/` suite. The icon-related `ui-layout.test.mjs`, `package-identity.test.mjs`, `windows-tray-physical-regressions.test.mjs` and native icon map have only static references / source or binary-header evidence; they do not assert icon import resizing. No Pillow script was executed during this audit continuation.

## Exact method/branch contract

| Code decision | Independently observable paths | Existing evidence / missing direct proof |
| --- | --- | --- |
| `ArgumentParser` | One required `source`; absent/unknown flags fail via argparse before files change | S source; ? actual CLI usage/exit=2, no output mutation |
| `Path(...).expanduser()` | Expand `~`; keep explicit absolute or relative input; unsupported home/file path follows `is_file` | S; ? tmp HOME, whitespace/unicode source path, nonregular path |
| `source.is_file()` | Missing/directory fails `parser.error("Icon file not found: ...")` | S; ? missing/directory/symlink-to-file and invalid input path |
| `Image.open(source)` | Read via Pillow, errors propagate on unreadable/corrupt/unsupported image; convert to RGBA before closing input | S; ? truncated invalid image, RGB vs RGBA vs palette/grey fixture |
| dimensions | Reject non-square or width <32, regardless of height; accept square 32×32 or larger | S; ? 31×31/32×32/33×32/64×64 boundary, no asset changes on reject |
| output root | Derive repository root from script location, create `apps/desktop/src-tauri/icons` | S; ? missing destination, permissions, existing files |
| PNG size variants | Eight individual files `icon-16.png`, `icon-24.png`, `icon-32.png`, `icon-48.png`, `icon-64.png`, `icon-128.png`, `icon-256.png`, `icon-512.png` via Lanczos | S; ? actual dimensions/alpha per file, count and exact names |
| canonical PNG | Save `icons/icon.png` 256×256, and `apps/desktop/ui/icon.png` 128×128 | S; ? both real files, source untouched, filename/path parity |
| Windows ICO | Save `icons/icon.ico` at 256×256 with ICO sizes list (16–256) | S; ? Pillow-produced ICO embedded sizes and alpha on Windows |
| macOS ICNS | Save `icons/icon.icns` at 1024×1024 (resized), depends on Pillow ICNS writer | S; ? tool availability, format output, error propagation |
| completion | Print generated destination and review guidance **only after successful full write sequence** | S; ? missing final print on ICNS/ICO failure; no success claim |
| source custody | Original is read only; output filenames are fixed from script source, source path never used as output filename | S; ? original hash unchanged before/after valid conversion |

## Source-derived uncertainties requiring explicit tests

- **ICG1 input type mismatch (hypothesis):** usage/documentation calls input “PNG”, but code uses generic `PIL.Image.open` and checks dimensions, not PNG format. A valid JPEG/TIFF/etc that Pillow can decode may be accepted and converted to RGBA. Test this with a disposable JPEG fixture, then decide whether input format restriction is a real product requirement or merely a documentation label.
- **ICG2 output transaction (source fact, outcome not reproduced):** the program writes all PNGs, then ICO, then ICNS sequentially with **no temp/staging directory or rollback**. An error at ICO/ICNS can leave a partial asset set. This is a developer tool, not a live release publisher; characterize failure and decide desired atomicity before changing source.
- **ICG3 alpha/format:** converting RGB to RGBA makes an opaque alpha, while supplied RGBA transparency should be retained through Lanczos. Test semantic transparency and dimensions instead of exact resized RGB values that may differ with Pillow versions.
- **ICG4 destination safety:** output path is determined by `__file__`, not current directory. To execute the **actual source** safely, copy it unchanged into an isolated temporary project tree `tmp/tools/import_icon.py` and run there; do not run it on a developer's checked-out icon assets.
- **ICG5 visual approval:** source explicitly requires reviewing `icon-16.png` before committing generated graphics; automated decode is not visual/a11y acceptance for native tray/dark mode. No PNG edits allowed in the docs-only audit.

## Positive and N1–N12

| Category | Evidence / gap |
| --- | --- |
| Positive | S exact generated paths/sizes, no importer runtime executed |
| N1 | ? missing/corrupt/non-square source, bad permission, invalid image type |
| N2 | ? width 31/32, eight sizes and ICO multi-res count |
| N3 | NA no network |
| N4 | ? repeated import same input, deterministic generated bytes/metadata |
| N5 | ? concurrent two invocations overwrite files, no lock |
| N6 | ? partial prior output after failed late format write |
| N7 | S fixed output paths, read-only source; symlinked destination race ? |
| N8 | NA no wall clock/locales in business logic |
| N9 | OS Windows ICO/macOS ICNS/KDE PNG actual presentation independent |
| N10 | S source path printed only for errors; ? user's private home path in stderr and error/log privacy |
| N11 | NA |
| N12 | ? disk-full, output directory not writable, ICNS/ICO codec failure |

## Stage 9 directly executable fixtures after full global Stage 3–8

- ICG-T1: invoke **unchanged actual** CLI in a temp project tree, synthetic RGBA source 64×64 with transparent+opaque pixels; assert all 11 output filenames (8 PNG sizes, canonical PNG, UI PNG, ICO, ICNS), PNG dimensions and icon metadata, original hash unchanged.
- ICG-T2: 31/32 width, nonsquare, missing/directory, corrupt bytes and RGB image; assert exit and zero output writes on preflight errors.
- ICG-T3: valid JPEG fixture: confirm acceptance/rejection as source actually behaves before a design decision on format label.
- ICG-T4: inject destination permission or late ICO/ICNS encoder fault in isolated tree, inspect partial state and no “review” success message.
- ICG-T5: two simultaneous writes and symlink output path: only evaluate in a disposable tree; no host output changes.
- ICG-OS: native PNG/ICO/ICNS visual checks and packaging identity at relevant OS/DPI.

Mutation targets: accept non-square, resize to wrong size/algorithm, omit alpha conversion, output only one format, write source, print false success after failed ICNS. None were run. Global Stage 3–8 PARTIAL; no Python execution, source/test edits or release changes.
