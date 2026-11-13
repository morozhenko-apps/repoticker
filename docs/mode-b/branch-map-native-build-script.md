# Mode B: Tauri build.rs target gating and external Wayland bridge toolchain

Production source SHA `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. File `apps/desktop/src-tauri/build.rs` blob `07f2494ee631d54af6353926bb6d50d16ece86e4` (84 source lines), 3 actual functions `execute`, `compile_wayland_bridge`, `main`.
Prepared parent `4f512c6b4c572ddd41aaf620f977f21b15253d5b` on branch `audit/mode-b-testing`.

**Current evidence:** No inline unit test in this build script and no direct test executing its error branches in the reviewed suite. `preflight.yml` Linux desktop job invokes `cargo check --locked -p repoticker` and `cargo test --locked -p repoticker --bin repoticker`, which (when run) require a successful build-script path. `desktop-acceptance-candidates.yml` builds Linux packages; Windows job compiles a non-Linux target path. These are CI workflow declarations and past baseline run evidence, not executed in this documentation turn and not failure-injection of build commands. `tests/test_release_native_gate_contract.py` only checks workflow strings. Do not credit C compile failure-path coverage from a normal successful native build.

## Exact branch map for real build helper

| Function / branch | Behavior and independently observable result | Existing proof / missing case |
| --- | --- | --- |
| `execute(name,args)` subprocess spawn | `Command::new(...).output()`, panic if program cannot be launched | ? deterministic missing helper executable, no fabricated fallback |
| `execute` exit status | If nonzero, panic with tool's stderr; success continues | ? external tool returns 1/127, correct error handling |
| `execute` UTF-8 | Reject malformed stdout; successful valid stdout trimmed before returning | ? non-UTF8 and whitespace/empty trimmed string |
| `compile_wayland_bridge` watch | Emits `cargo:rerun-if-changed=native/wayland_relative_drag.c` before generating | ? captured cargo stdout proves source watched |
| protocol discovery | Mandatory `OUT_DIR`, `pkg-config --variable=pkgdatadir wayland-protocols`, exact relative-pointer unstable v1 XML exists; missing protocol fails | ? unset OUT_DIR, missing pkg-config, missing/unreadable XML, relative join |
| Wayland generated header/code | Run `wayland-scanner client-header` and `private-code`, propagate each error, use output paths under OUT_DIR | ? first/second scanner failure; no compiling partial generated stubs |
| native pkg-config flags | `pkg-config --cflags gdk-wayland-3.0 wayland-client`; split whitespace into discrete cc args | ? empty flags, invalid flags; **source-only portability hypothesis**: a path containing spaces in a cflags argument is not kept intact by `split_whitespace` |
| C compilation | Two source units (real relative bridge and generated private code), C11/PIC/-Wall/-Wextra/-Werror, include OUT_DIR; fail if cc missing or returns nonzero | ? 0/1/2 object build status, verification of exact two object paths |
| static archive | `ar crs` creates librepoticker_wayland_relative.a from exactly two objects, nonzero exit panics | ? missing ar/error and no misleading success link lines |
| link contracts | Print native link search and static bridge, dyn gdk-3 and wayland-client | S source; ? exact Rust build-script stdout artifact from real Linux invocation |
| `main` target OS | Only exact `CARGO_CFG_TARGET_OS=linux` compiles Wayland bridge; other target avoids all Linux external helper invocations; both branches invoke `tauri_build::build()` | OS build contract; ? direct injected OS target and Windows compile check, not physical KDE |

## Key interactions

- **Linux build vs runtime Layer Shell:** a successful C bridge compile proves helper availability, not GTK runtime behavior, drag physical events or a real KDE Wayland compositor.
- **Windows target must not require Linux Wayland packages:** `if ... ==Ok("linux")` guards bridge, while Tauri build still runs. Executable Windows build acceptance is a separate CI job with dev-only guard.
- **Toolchain versions and reproducibility:** `cargo metadata --locked` pins Rust dependencies but does not pin system `wayland-scanner`, `pkg-config`, `cc` or `ar`. CI Ubuntu dependencies are explicit; outside CI versions and paths may differ.
- **External tool errors and privacy:** `execute` includes external stderr in a build panic. It is not a runtime user/provider error and is not currently demonstrated to contain secrets, but CI log exposure with tool-generated local paths should be reviewed.
- **No shell injection assumption:** process launch uses `Command` with literal argument lists, not `sh -c`. Argument splitting is a potential robustness problem for unusual flags, not automatically shell command injection.

## Positive / N1–N12

| Category | Evidence / missing |
| --- | --- |
| Positive | Workflow source validates Linux compile requested, historical baseline success separate; direct method tests ? |
| N1 | ? malformed flags, missing env, invalid protocol output |
| N2 | ? zero or two object outputs, long paths, empty flags |
| N3 | NA no network; external executable failure is N12 |
| N4 | ? repeat build after partial generated files |
| N5 | ? two parallel Cargo invocations writing different OUT_DIR directories |
| N6 | ? invalid/missing XML and stale generated C |
| N7 | E fixed relative source and called binaries; malformed OUT_DIR path ? |
| N8 | NA time/locale not business inputs |
| N9 | OS KDE/Windows actual runtime acceptance separate |
| N10 | ? build stderr paths/secret display; no token in source |
| N11 | NA |
| N12 | ? external compiler/scanner/ar and unwritable output location |

## Stage 9 test plan (after Stage 3–8 global sign-off)

- NB1: integration harness builds the **real production build.rs** in an isolated crate/target with `OUT_DIR`, fake external `pkg-config/wayland-scanner/cc/ar` command adapters. The script's logic must execute, not a copy implemented in tests. Supply minimal Tauri build dependency or externally observe the generated artifact when feasible.
- NB2: table each failure point: absent OUT_DIR, missing scanner, bad protocol path, scanner first/second failure, C first/second failure, ar failure; assert fail closed and no false completed artifact. Log calls in the shim, not user paths/secrets.
- NB3: exact link lines, C flags and two object paths on success; Linux output under test temp and non-Linux path never invoke any Wayland helper.
- NB4: physical CI Linux and Windows builds, runtime GTK relative drag, no live compositor requirement for unit tests.

Mutation targets: remove Linux target guard, ignore subprocess exit, swap scanner mode, omit one C object, remove required archive/link line, pass malformed UTF-8 output as valid. Do not claim kills without execution. Global Stage 3–8 PARTIAL; no build/tests/tools executed by this map.
