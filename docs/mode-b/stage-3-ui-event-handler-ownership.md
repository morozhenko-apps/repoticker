# Mode B Stage 3/4: UI event-handler branch ownership, source-exact first pass

**Read-only planning evidence, 2026-11-15.** Immutable baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; parent audit `3106135a6582bc9046707ad884e13f27622d797e`. These are *event flow registrations*, not separately counted named production methods. The 728 numbered/placeholder source ledger remains provisional and does **not** absorb this group count without deduplication by a real AST parser. Syntax/source evidence ≠ execution.

E_PARTIAL = selected real source/controller assertions exist, not every handler outcome; P = needs direct handler assertion; OS = physical platform; A1 = missing actual `app.mjs` imported-controller harness.

## A. Card WebView `apps/desktop/ui/app.mjs` @ `a2692d9cbaa07863ef6f75a5df6503010cf0d8fe`

**No imported-controller execution identified.** Tests of imported `view.mjs`, `native-drag.mjs`, `scan-refresh.mjs`, `github-monitor.mjs` or source regex do not prove these actual event bindings. All A1 groups below retain P_CONTROLLER.

| Handler site | Real source registered behavior | Independent branch and assertion obligation |
| --- | --- | --- |
| `:66–83` idle timeout, five `AUTO_HIDE_EVENTS`, visibilitychange | Only visible compact + no expanded tooltip + no active local scan arms 15s timeout; visibility hidden cancels | **A1-E1** modal/drawer/scan vs idle callback; stale timeout after hide; no false hide during work; timer fake/barrier rather than sleep |
| `:161–214` dynamic repo-menu click, keydown, outside pointer/scroll/resize | Enrolled repository option dispatch via native fixed commands; arrow/home/end and focus restore; outside dismiss | **A1-E2** invalid menuRepoPath, old selection after re-render, 0 items keyboard, denied native open, focus/scroll preservation; source-only tests not enough |
| `:268` row more menu click | Uses actual row `repo.path` when menu is opened | **A1-E3** row removed/renamed while open, late click and foreign path IPC must be rejected natively |
| `:399–428` pointerenter/mouseenter/mouseleave/focusin/focusout and independent manual metrics click | Hover visibility and transient Quota; manual Runners/Tasks triggers targeted monitor refresh, not Git scan | **A1-E4** pointer/focus overlap, same metric double click, failed native tooltip show, pending refresh vs card hide, keyboard accessibility |
| `:644–668` buttons, Fetch/Cancel, Safe Sync, Escape | Fetch toggles cancellation if in-flight; hidden card resets view; drawer/Quota Escape has distinct precedence | **A1-E5** cancel repeated while Fetch ending; unknown progress phase; active Sync vs Fetch; never force or implicitly push unauthorized repo; focus |
| `:669–698` `repoticker-git-progress` callback | Checks operation allowlist; tracks monotonic completed count and row active/done/error without full list rebuild | **A1-E6** malformed total/completed/path/phase, late finish after a newer action, duplicate completion, progress from different repo; preserve scroll and no raw private error |
| `:699–714` `card-hidden`, `card-shown`, `reset-view` | Reset transient menus/drag/Quota, re-arm idle only when eligible, refresh on reset | **A1-E7** event ordering hide→show→hide, hidden drag release with pointer capture, no stale popup resurfacing |
| `:718–744` saved locale/config-changed; monitor-updated/auth/scope; git-action-finished | Locale revision prevents stale config; monitor metrics refresh is separate from local Git; completed action runs local refresh | **A1-E8** stale config after Git snapshot, same-time monitor and scan, malformed completion payload, repeated native event, old auth scope |
| `:755–787` Wayland drag start/stop native adapter; pointerdown/move/up/cancel/lostcapture | Pointer only triggers native gesture; ignores secondary button/interactive row elements; releases capture at stop | **A1-E9 / OS** release before start resolves, lostpointercapture during card-hide, duplicate/rejected stop, physical KDE relative pointer safety |

## B. Settings `apps/desktop/ui/settings.mjs` @ `a61b534c28e55767ed89b198d31a0e7781196c7e`

Unlike `app.mjs`, `tests/settings-github-confirm.test.mjs` imports the real Settings module against a fake external Tauri/DOM. **Selected** handlers have E_PARTIAL: OAuth duplicate/late challenge, Cancel/Apply and Relay draft. Do not grant all rows E based on the suite's 132 test bodies.

| Handler site | Tested/source-observed contract | Independent outcomes still P/OS |
| --- | --- | --- |
| `:128–151` connection mode/Worker URL input, titlebar drag | Polling draft clears URL/secret input; titlebar drag only on left click | **SET-E1** Hybrid→Polling→Hybrid Cancel preserving persisted credential, native denial/drag OS |
| `:206–210` Relay secret field / remove click | Stage only on explicit OK; selected real tests cover Set, Remove, failed native fake responses | **SET-E2** native keyring write after close/Quit RS1/RS2, denied system prompt, hidden stale draft |
| `:330,408–415,511` repo/scope choices, filters, checkboxes | Edits to selected authorization scope are staged, not immediately persisted | **SET-E3** new org→old org during async installation pagination, forged repository IDs, 100/101 selection and Apply race |
| `:543–565` 1500ms native `github_flow_status` interval | Polls only native memory phase while pending; `githubStatusBusy` guards overlap | **SET-E4** rejected phase with next tick, Cancel during pending phase, timer cleared at close; no real GitHub network or clock polling in test |
| `:670–765` Connect, Copy, focus, guide, device page, Cancel Device, provisional Disconnect | Real Settings harness covers duplicate Connect and delayed challenge cancellation and retryable UI paths | **SET-E5** clipboard denied, native release credential race, old generation publication and host browser opener |
| `:1031–1081` autostart, notifications, root add/browse | Draft and native dialog boundaries | **SET-E6** OS plugin enable/readback/rollback, focus-reopen while native folder prompt active, no unexpected config commit |
| `:1137–1192` language dropdown, keyboard, outside pointer | Supported 20-language labels and staged language change | **SET-E7** actual keyboard/RTL focus, unknown locale and response timing |
| `:1192–1353` two Cancel buttons and Apply/Save handler | Real harness covers double-OK single-flight, failed config, Relay staged then committed after persisted settings | **SET-E8** simultaneous Cancel and blocked Keyring commit, OS close failure, partial native writes and expiry/scope revision |

## C. Detached Quota `apps/desktop/ui/quota.mjs` @ `d43ce98c8a8b000d7f344b39fe3f55b4b142e4d5`

`tests/quota-mode-b.test.mjs` imports and drives the actual Quota controller through external IPC/event fakes; some event outcomes E_PARTIAL.

| Handler site | Behavior | P/OS remaining |
| --- | --- | --- |
| `:234–247` `subscribe` external Tauri event bridge | Missing/rejected permission shows bounded unavailable state without changing to disconnected auth; invalidates outstanding refresh | **QUO-E1** absent `event.listen`, async rejection after healthy response, multiple handlers failing independently, real Tauri permission |
| `:249–269` direct `__repotickerSetHoverKind` and reconciled usage-shown event | Native selected kind wins over late prior hover event | **QUO-E2** rapid Runners→Billing→Tasks, stale kind+scope response and detached popup OS |
| `:269–274` monitor/auth/scope/config event subscriptions | Refresh source-specific monitor, invalidate billing on auth/scope and reload language independently | **QUO-E3** stale billing after revoke, old locale response, two simultaneous scope changes, event listener cleanup on hide |

## D. GitHub monitoring `apps/desktop/ui/github-monitor.mjs` @ `076a37b271c1186a5fb5cd2c60e45338d8ccc5af`

`tests/github-monitor.test.mjs` and `tests/ci-native-integration.test.mjs` run actual `startGithubMonitoring` with fake external invoke/event. Covered subsets are E_PARTIAL; native authorization, REST and notification delivery remain P.

| Handler site | Real source behavior | Missing outcome |
| --- | --- | --- |
| `:392–406` auth/scope/config listeners | Disconnect invalidates trusted state; account/scope change triggers scope refresh | **MON-E1** three rapid generations, same-account reauthorization while old publish pending, accidental old alerts |
| `:410–430` relay-state event and initial native phase | Relay phase revision prevents late initial phase from overriding live event; disconnect falls back to REST | **MON-E2** old online after new offline, two coincident fallback refreshes and 429 cooldown, real WSS |
| `:434–447` relay-reconcile event | Only `tasks` and `all`, burst coalesces and preserves trailing tasks | **MON-E3** mixed 100 hints and cooldown edge, forged kind or old credential, no local Git mutation |
| `:449–469` scheduled tick plus card-shown | Safety all-reconcile at most 15 minutes, runner refresh independently, show-card triggers refresh | **MON-E4** fake clock rollback/DST, pending task hint vs full reconciliation, repeated show and no duplicate native publication |

## E. About `apps/desktop/ui/about.mjs` @ `8c7560e769effe2bcc36e3d309ad6259a3690302`

`tests/about-locale.test.mjs:5–95` imports real About controller and asserts current locale, focus repaint and context-menu prevention. Remaining native host behavior is P/OS.

| Handler site | E subset and open P |
| --- | --- |
| `:26–40` focus refresh & initial `get_settings_config` | E locale repaint; **AB-E1** multiple delayed/failed focus reads + window hidden/reshown |
| `:42–53` get_about_info promise, website click | E fake IPC renders immutable author/version; **AB-E2** denied native browser opener, raw thrown error in `title` sink |
| `:55–64` hide_about, Close click and Escape | E handler registration; **AB-E3** actual Close/Quit/drag OS, overlapping close and focus/locale update |

## Gate and non-additive count

These are **27 grouped event-flow ownership entries** (9 A1 + 8 Settings + 3 Quota + 4 Monitor + 3 About). They need AST-backed decomposition and deduplication. A single group may contain multiple anonymous closure nodes or native callback registrations, so it is **not an additional 27 function count or test estimate**. They are separately maintained until a grammar-based AST extract identifies exact callable boundaries. No source-only tests are credited as actual app.mjs controller execution.

Stage 4/5: every registered event has Positive/N1–N12 candidate dimensions where owned. Stage 6: cross-window auth/scope changes, Git progress and hidden card, popup revision and stale locale, native vault and Settings Save. Stage 7: deduplicate A1/SET/QUO/MON/AB scenario IDs against existing slices before estimating tests. Stage 8: all five files remain **PARTIAL**; 80/80 file routing is not full branch or callback coverage. Stage 9 remains blocked, no run/CI/build/mutation or production action.
