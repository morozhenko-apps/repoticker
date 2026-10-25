# Windows QA defects, 2026-10-25 (Gate 2/3)

Status: Mode A / **verified runtime failures, targeted repairs only**.
Test source: unpublished Windows NSIS candidate from workflow #40227612556,
SHA `40aff5ec3a68e3053bf881bae9dafc2030250b3e`.
User provided four Windows screenshots. The tester reports GitHub sign-in,
repository and runner data working; do not regress these. The tester also
reports Chrome blocked ZIP as "dangerous" and Defender challenged it before
allowing execution. **Do not call the binary clean solely from CI success.**
No file reputation or AV verdict is established by the screenshots.

## Observations and hypotheses

| Priority | Runtime symptom | Plausible root causes / evidence | Diagnostic and planned action |
| --- | --- | --- | --- |
| P1 | An extra console opens beside GUI | `main.rs` has no Windows GUI-subsystem crate attribute; Rust default console subsystem is the leading explanation | Pin release-only `windows_subsystem="windows"`; native build and physical relaunch |
| P1 | Bottom anchor drifts after hide/show/resize | Unmanaged `show_compact_card` resizes a previously centered Tauri window; `stop_card_drag` ignores Windows, while only KDE persists bottom/right margins. DPI/outer size may also differ | Capture numeric work-area/outer position/size only when `REPOTICKER_UI_DEBUG` is set; restore persisted edge margins against monitor work area and clamp |
| P1 | First enrolled repo apparently missing until second is added | UI `render()` appends every member of `snapshot.repositories`; possible scan timing, direct-child enrollment semantics, draft vs committed Settings, or incorrect native count. No confirmed filtering bug | Diagnose counts and show one-repo fixture; do not change safe Git discovery speculatively |
| P2 | A zero/tiny repository set expands to an enormous window | `view.mjs` and native `set_card_view` hardcode 510 logical px; leading root cause confirmed | Shared bounded view-height rule based on repo count (0/1/2/10/large), IPC guard and final tests |
| P2 | "Add folder" requires typing path; no OS selector | Settings only has a text input + submit; no folder picker is registered | Add explicitly user-triggered native-only directory picker, preserving existing typed-path and OK/Cancel behavior; pin dependency/lock correctly |
| P2 | Unexpected gap between buttons and top | Fixed 510px expanded view plus flex:1 empty drawer makes excess area; Windows scaling amplifies gap | Fix intrinsic view height first; no arbitrary CSS negative margins |
| P2 | Rounded windows show pale rectangular corners | Transparent Tauri WebView + CSS radius exist, but undecorated Windows has default `shadow=true` producing a native 1px white border; WebView2 transparency defects remain possible | Disable Windows native shadow for transparent undecorated popups; physical Windows transparency check required |

Seven plausible causes were inspected: console subsystem; absent folder picker;
hardcoded 510px drawer; resize positioning from initial centered window;
missing Windows anchor persistence; lifecycle/snapshot race for one repo; and
native shadow/WebView2 composition. Most likely: console configuration and
fixed geometry for their respective defects; Windows anchor path and shadow
are the strongest source-backed hypotheses for movement/white outlines.

## Execution order

1. Log/contract checks: compare Windows native geometry and snapshot list count
   with UI count without logging repo names, paths, GitHub details or tokens.
2. Implement console fix, bounded list height and small CSS/native shadow
   corrections. Preserve compact 390x122 and existing KDE Layer Shell route.
3. Implement persisted Windows anchor, preserving existing config fields
   and avoiding unbounded config writes. Validate DPI scaling and work-area clamp.
4. Add native folder picker without exposing arbitrary dialogs or filesystem
   access to WebView. Keep manual path entry and transactional Settings.
5. Add targeted one-repo/zero-repo, resize, native wiring, settings and
   Windows subsystem regression checks. Run normal stable suite **only once**
   after all planned implementation changes.
6. Build a fresh unpublished Windows+Linux QA candidate, never overwrite
   published `main` or release. Report CI results separately from physical
   acceptance. Record remaining runtime failures in the same Gate-2 ledger.

Risks: Windows WebView2/DWM behavior needs a real Windows runtime;
Linux Wayland must not use Windows positioning; a native plugin must have a
generated Cargo.lock; the new Windows binary has no signing reputation.
Rollback: independent docs and code commits revertible; no persistent format
or Git-core changes, no release publication.
