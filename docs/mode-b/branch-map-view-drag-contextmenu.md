# Mode B: card view safety, serialized Wayland drag and WebView context-menu suppression

Baseline source `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `300bcd344ba383915a0c65e6242e0751d76c57b8`.
- `apps/desktop/ui/view.mjs` blob `d6214720f834bacb5f2d2edd58ba79e9e538a815`, 52 lines, `nextCardView`, `cardWindowHeight`, `pullReadyCommitCount`, `syncReadyCommitCount`.
- `apps/desktop/ui/native-drag.mjs` blob `9b330948793155617477da4c736228ee8fe1cf7f`, 34 lines, `createNativeDragGesture`.
- `apps/desktop/ui/browser-context-menu.mjs` blob `bdd386b87c34a4f1e8b495340243d2b6e5785236`, 4 lines, `disableBrowserContextMenu`.

Direct evidence reviewed: `tests/ui-layout.test.mjs` blob `342186d1809b9774413390159d0f4088642ad10b` includes actual view state and legacy pull helper tests among 17 mixed static/direct cases; `tests/safe-sync-manual-refresh.test.mjs` blob `d371a12ecc0f6bee5c44f90c723bb8557982d217` includes actual safe sync count and negative eligibility; `tests/native-drag.test.mjs` blob `2fa9fb3f8be3e9dc847f50b3b3b0a33ae13f8c0b` has 5 tests (four actual gesture behavior and one source contract); `tests/browser-context-menu.test.mjs` blob `4e896359d198620343e6d665e192838ef17011d2` has 4 tests (one actual event handler, three source). None newly executed; no physical Wayland/Windows drag or process invoked.

## View and Safe Sync branches

| Actual method | Proven executable assertions | Precise remaining |
| --- | --- | --- |
| `nextCardView` | `compact→repos`, `repos→repos` collapses to compact, `settings→repos`, `settings→settings` collapses; prototype key `constructor` rejected via own-key check | ? invalid/null/array requested and unknown current with valid requested; view reset via native event only static |
| `cardWindowHeight` | `compact=122`, `repos` > compact under default zero, capped maximum 510 from source; `CARD_HEIGHT` frozen | ? 0,1,9,10,11, 100, MAX, -1, fractional, NaN, noninteger, bad view; no real resize IPC success/error tested |
| `pullReadyCommitCount` | One clean behind=4 upstream returns 4; dirty, ahead, no upstream, unfinished, divergent, behind0 and behind−1 each return 0 | ? array with null row, NaN/Infinity behind, conflicting string `sync_state` count vs numeric `behind`, sum overflow across repos |
| `syncReadyCommitCount` | Behind=2 safe and ahead=4 safe; dirty, no upstream, diverged, unfinished, current zero rejected; legacy pull helper stays narrower | ? ahead+behind both positive with misleading sync_state, missing fields, nonarray input, repeated safe records and sum >MAX_SAFE_INTEGER |
| Native authorization | Pure eligibility counts only; actual Git side effects and live repo recheck in native core are separately mapped; never infer that button count executes safe Git operation | P A2 native lock/recheck and fail-closed after Quit |

## `createNativeDragGesture`: actual async seat ordering

| Decision | Direct behavior evidence / missing |
| --- | --- |
| `begin(id)` when idle | Sets `session`, schedules native `start`, returns true immediately. E one gesture begins |
| `begin` while held | Returns false, no extra start. E begin(6) while id5 held |
| `end(id)` wrong id or no gesture | No effect. E wrong id4 while id5 held; ? null unspecified vs omitted ID and repeated end |
| `end` matching gesture | Clears session and enqueues stop **after** start, even if start still pending. E controlled deferred start |
| consecutive gestures | New begin after prior end can enqueue next start, shared `queued` promise serializes seat across two gesture cycles. E exact calls start/stop/start/stop under deferred first |
| rejected start | Catch resets the matching session and reports to injected `onError`, subsequent begin allowed. E rejected native start and second start |
| rejected stop | `enqueue(stop).catch(onError)` reports error; queue recovers via swallowed internal rejection. ? direct rejecting stop and re-begin |
| late start rejection | Catch resets session only if `session===mine`; old gesture error must not erase newer session. Source guard, ? two overlapping sessions with late rejection |
| callback validation | `start/stop/onError` not type-checked by factory; invalid callback failure may be thrown/rejected asynchronously. Define external adapter contract before requiring a new validation policy |
| physical interface | Source avoids JS coordinate sampling; `main.rs` and C relative pointer bridge still require KDE compositor and native pointer focus acceptance; source-contract test not physical proof |

## Browser contextmenu handler

`disableBrowserContextMenu(documentRef)` installs a single `contextmenu` callback that invokes `event.preventDefault()`. **E one direct handler registration+event**. Static tests show all four WebViews (app/settings/about/quota) call helper once and native tray menus remain in Rust source. Missing: invalid document/event object, duplicate direct invocation, non-cancelable physical WebView event and accessibility keyboard context menu. Do not introduce host global suppression of system tray context menus to satisfy a WebView-only policy.

## Independent meaningful interactions

- Drag begin/end race with stale rejection and third gesture: one native seat owner, errors delivered, no invisible session stuck. E pairwise start pending and rejection; three-way pending old start+new begin+failed stop missing.
- View height 510 cap vs variable rows/locale: line-height may grow under 20 locales; view pure sizing is a budget not a physical guarantee. Simulate DOM measurement separately, preserve arrow keyboard/focus after drawer changes.
- Safe Sync button count and per-repo row indicator can legitimately differ in semantics: row can display divergent ahead/behind while eligibility remains zero. Tests prove both functions individually; A1 joint main-controller update pending.
- 0/1/MAX vs unsafe sum across multiple repo entries: current pure `syncReadyCommitCount` uses integer addition without final safe-range clamp; source-only overflow possibility, **not** an observed bug or reason to change count logic without correct high-volume input preconditions.
- Context-menu prevention in WebView does not remove native right-click tray actions (native Rust integration separate).

## N1–N12

| Category | E existing / P remaining |
| --- | --- |
| Positive | E view toggle, safe behind/ahead counts, native drag ordered start/stop, one contextmenu event |
| N1 | E prototype invalid view and unsafe Git repo state; P malformed rect/count/drag callbacks |
| N2 | E 122/510 constants and representative count; P 0/1/9/10/11/MAX, output overflow |
| N3 | E native start failure injected; P native stop failure and unavailable GTK |
| N4 | E repeated begin rejected, repeated view toggles; P stop failure recovery |
| N5 | E pending start release and two sequential gestures; P old failing start vs later begin |
| N6 | E stale Git state rejected by safe eligibility; P malformed repo entry and inconsistent fields |
| N7 | E no pull on dirty/diverged and no JS motion; real Tauri authorization separate |
| N8 | E locale-independent pure counts, OS RTL/clipped geometry not covered |
| N9 | E synthetic contextmenu/gesture, real keyboard/pointer/focus OS acceptance |
| N10 | E no movement coordinates or native tokens in helper; log redaction upstream |
| N11 | NA |
| N12 | P failed OS/window resize and native drag bridge absence |

## Stage 9 direct new cases after global N matrix closure

- VW1 `cardWindowHeight` complete table with no real OS window; invalid arguments throw without mutation.
- VW2 `syncReadyCommitCount` and legacy pull table for each malformed numeric/sync-state combination and accumulation; don't weaken native Safe Sync policy to match helper outputs.
- DG1 reject stop; late old start failure after newer session began; single seat order with deterministic deferred Promises and failure recovery.
- CT1 non-cancelable/invalid contextmenu event in real DOM mock; verify no interference with app's own repo menu and native tray user actions (A1/OS).
- OS1 KDE Wayland drag/drop/cancel and Windows hidden-resize acceptance, separate from these Node stubs.

Mutants: allow two drag starts, stop before start, accept unsafe ahead/behind, toggle unknown view to compact silently, spinner/menu steals tray contextmenu; direct existing tests already kill many. No mutation execution. Stage 3–8 overall PARTIAL.
