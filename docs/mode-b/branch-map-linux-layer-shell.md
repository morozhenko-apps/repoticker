# Mode B: Linux KDE Wayland GTK Layer Shell card, detached usage balloon and relative-pointer drag

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Source `apps/desktop/src-tauri/src/linux_surface.rs`, blob `30dc5253bae329655ab1455bb6dfcc1cba765bf9`, 597 lines. Prepared parent `e061373d1e2fbddd883a85cbd59c914e244a7ad9`.

This Linux/GTK native module has **no inline Rust tests**. `tests/quota-surface.test.mjs` verifies the actual pure `usageHeight` size helper and many static GTK source contracts. `tests/native-drag.test.mjs` executes the real JS `createNativeDragGesture` with synthetic native start/stop callbacks and tests queuing/identity/failure, **not** GTK/Wayland pointer extension or this native module. The existing `tests/ui-layout.test.mjs` likewise tests pure card height/DOM/source conditions. Do not count these as physical native assertions. No KDE/GTK runtime was used during this review.

## Native method-by-method decision inventory

| Function/region | Independently observable outcomes | Current proof vs required |
| --- | --- | --- |
| `enabled`/`visible` | Atomics initially false; lifecycle toggles with Acquire/Release | S production state; ? read while main thread event queued |
| `install` fallback | If WAYLAND_DISPLAY absent **or** gtk_layer_shell unsupported -> Ok without native conversion; else missing main window, GTK app/container or CSS load can error | S source, OS-L actual KDE Wayland and XWayland fallback |
| `install` success | Reparent existing Tauri WebView into separate transparent GTK Layer::Top, bottom/right anchored, fixed 390×122 viewport, no reserved workarea, keyboard OnDemand; clamp saved margins 0..5000, defaults bottom=46,right=10 | S source/UI regex; ? actual GTK surface, focus, geometry, hidden initial state |
| `install_usage_surface` | Usage Tauri view missing/errors vs reparented independent Layer::Overlay 340×initial 118, keyboard None, transparent and no reserved zone | S, OS-L exact surface and parent/child lifecycle |
| relative pointer init | `repoticker_relative_init` returns 0 -> log extension unavailable but install still sets ENABLED true; success permits later drag | S, OS Wayland protocol availability and graceful fallback |
| `on_relative_motion` | Ignore when !DRAG_ACTIVE/!VISIBLE/nonfinite dx or dy; accumulate subpixels and trunc toward 0, clamp packet to ±5000, update bottom/right margins 0..5000 if actual movement; mark moved, change GTK shell margins | S; ? actual packet ordering, fractional accumulation (0.4+0.6), negative delta, overflow/NaN and no CARD state |
| `on_usage_main` / `on_main` | Marshal to GTK main thread or return scheduling error; if window state None, closure not executed (often Ok) | S; ? missing window semantics and no falsely completed visual action |
| `anchor_usage` | Identify monitor_at_window if card GDK window exists, optionally move usage surface to exact monitor; offset bottom by COMPACT_HEIGHT+12 and right by +5, saturating arithmetic | S; ? multiscreen monitor switch and unavailable monitor/card paths |
| `show_usage` | Reject if VISIBLE=false; else anchor, present GTK overlay and enable GDK pointer pass-through when GDK window exists | S; ? missing usage native window silently no-op; physical pointer/focus |
| `hide_usage` | Enqueue GTK hide; missing surface closure no-op or scheduling failure | S; ? OS actual disappearance |
| `set_exact_viewport_height` | Grow: max then min, shrink/same: min then max, avoiding invalid transient GTK min>max | S static source; ? actual GTK warnings during 118↔320 |
| `resize_usage` | Reject height outside 118..320; marshal action, missing popup -> error, unchanged height -> no geometry update, changed height -> viewport/WebView/max+min/GTK size/atomic state, re-anchor; channel/send or receiver failure | E pure usageHeight helper only, S native; ? 117/118/319/320/321 and interrupted GTK/oneshot |
| `apply_size` | Set GTK min/max physical geometry hints and exact requested size; compositor ultimately owns allocation | S; OS GDK/compositor actually allocating requested dimensions |
| `apply_card_height` | Unchanged => Ok; missing child or wrong GTK child type => error; otherwise synchronized viewport/content/toplevel height, preserve margins and anchor, atomically set CARD_HEIGHT | S source; ? idempotence, invalid hierarchy, 122→500→122, no blank WebKit minimum |
| `validate_card_height` | Accept inclusive 120..900; outside reject | S; ? exact 119/120/900/901 direct Rust test |
| `request_resize` | Validate, enqueue main-thread resize, asynchronous GTK apply errors are logged without returning to original caller | S source; ? native tray reorder/error cannot falsely claim applied height |
| `resize` | Validate, enqueue/await GTK action; missing card/child/receiver errors propagated; UI promise resolves only after application call | S; ? actual WebView contract and compositor allocation, channel closed |
| `show` | Set VISIBLE=true, hide usage, queue GTK anchored card show, errors reported; no panel at startup | S; ? if hide_usage/on_main fails after state mutation, VISIBLE might remain true without shown card (**source-derived hypothesis**) |
| `hide` | Set VISIBLE=false, hide usage, cancel drag, enqueue GTK hide; late relative packet ignored | S; ? GTK scheduling/cancel error and visual state consistency |
| `persist_now` | Write bottom/right native margins via actual JsonStore update (changed=true) without changing roots | E core JsonStore transactions, S native; ? save failure, repeated no-motion, target directory readonly |
| `stop_on_gtk` | End native pointer, reset subpixel remainder; if DRAG_MOVED swap true, attempt persist; else no write | S; ? `persist_now` failure occurs **after swap(false)**, so no automatic retry of unsaved margin (**hypothesis**) |
| `cancel_drag` | Clear DRAG_ACTIVE immediately, asynchronously cleanup/log persist failure; no dangling active relative listener | E JS gesture subject only, S native; ? Quit/hide while an owned drag is active |
| `start_drag` | Hide usage first, marshal; hidden card deny; protocol begin()==1 activate and reset; other return -> unavailable/already-active; await channel and failure | E JS gestures with injected start, S native; ? protocol denied/disconnected/repeated and real GTK pointer seat |
| `stop_drag` | Clear DRAG_ACTIVE then marshal stop_on_gtk; propagate channel/persist failure | E JS gestures, S native; ? native failure, exact resulting persisted margins |

## Existing JS behavioral helper evidence

- `tests/native-drag.test.mjs`: gesture begin/end pointer identity; end before asynchronous start queues stop; sequential rapid gestures do not steal ownership; failed start does not leak "held" state; excludes obsolete WebView pointer-coordinate IPC via source inspection.
- `tests/quota-surface.test.mjs`: `usageHeight` pure helper and DOM/CSS/window config checks; static source regex checks GTK viewport sizing, separate usage surface, keyboard/pointer pass-through and monitor anchoring. These tests do not call GTK.
- `tests/windows-tray-physical-regressions.test.mjs` and `ui-layout.test.mjs` source assertions are not substitutes for KDE physical acceptance.

## Critical independent interactions and hypotheses

1. **Wayland vs XWayland vs unsupported compositor**: native Layer Shell must only enable when supported. A fallback card still needs functional visibility/positioning without reallocating the WebView.
2. **Drag × modal popup × multiple monitors**: relative pointer accumulates fractional motion; only matching pointer session may move card; usage overlay must follow card's monitor and margins after drag.
3. **Resize × tray × WebKit natural minimum**: viewport and embedded WebView must update in same GTK main-thread step, including shrinking; callback ordering and no spurious blank area require KDE physical assertion.
4. **Hide/Quit × drag persistence**: cancel must deactivate native pointer before late event, persist changed margins once, not leave active seat ownership or expose sensitive content in log.
5. **Observed state hypotheses, not confirmed bugs**: `show` sets VISIBLE before two fallible calls; `stop_on_gtk` clears DRAG_MOVED before persisted write. Deterministic fault injection and UX persistence contract needed before proposing a fix. Requiring window state to reflect failed scheduling may change observable behavior; use STOP FACTOR for any architectural change.
6. **Security/diagnostics**: opt-in drag debug logs relative dx/dy, margins and dimensions, not repo/provider secrets. Do not log private path or token if adding tests.

## Positive + N1–N12

| Category | Status | Remaining |
| --- | --- | --- |
| Positive | E JS helpers / S native | Actual KDE Layer Shell bootstrap, show/hide, drag, overlay and resize |
| N1 | S | Invalid height/nonfinite drag/unsupported backend and missing GTK objects |
| N2 | E JS size / S native | 118/320, 120/900, ±5000, fractional subpixel and 100+ repo rows |
| N3 | OS | Wayland protocol unavailable, failed GTK main scheduling/resize/persist |
| N4 | E JS gesture / ? native | Duplicate drag/resize/cancel, idempotent hide/show and no extra writes |
| N5 | E JS gesture / ? native | Drag start pending, hide/quit/resize queued in GTK event loop |
| N6 | S/OS | Invalid persisted margins, missing GTK surface, disconnected monitor |
| N7 | S | Only owned card/usage GTK surfaces, no arbitrary external pointer/surface |
| N8 | NA | GTK geometry not time/locale; locale influences physical layout but not these branches |
| N9 | **OS physical** | KDE Wayland compositor, click-through overlay, tray focus, suspend/quit |
| N10 | S | Opt-in fixed native geometry diagnostics, no token or repo name |
| N11 | NA | No paid entitlement |
| N12 | E JsonStore / ? native | Persist errors, GTK resource errors, failed pointer release |

## Stage 9 plan after global semantic inventory

- LS1: extract only platform GTK/Wayland *external* operations behind testable seams; exercise the real native sequencing of install/show/hide/missing card, popup anchor and viewport bounds. Do not replace geometry logic with test fakes.
- LS2: real relative motion handler with controlled dx/dy including 0.4+0.6, NaN, ±5000, inactive/hidden, and resulting clamp/margin state. No sleep.
- LS3: GTK resize 118↔320 usage, 122↔500 card, missing viewport and channel failure; assert no interim min>max warnings, no changed anchor, no false success.
- LS4: Quit or hide while drag active, failed persist and retry behavior under chosen contract. Assert pointer extension end once and no unrelated OS seat mutation.
- LS5: KDE Wayland physical acceptance of initial hidden card, tray show, 390×122 constrained no blank area, reparent, scroll, pointer pass-through, moving/second monitor/scale, fallback behavior and release.

Mutation kills: remove VISIBLE gates, accept NaN delta, drop fractional remainder, change sign of margin delta, omit monitor anchoring, reverse GTK min/max update order, show tooltip while hidden, leave pointer active after hide, lose failure status, persist arbitrary repositories with margins. No mutation or native platform run executed.

Overall Stage 3–8 remains PARTIAL, no runtime source/test/CI/Cloudflare/deploy changes.
