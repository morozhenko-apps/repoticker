# Mode B method assertions: detached Quota DOM/Tauri controller

Source-equivalent production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `apps/desktop/ui/quota.mjs` blob `d43ce98c8a8b000d7f344b39fe3f55b4b142e4d5` (274 production lines). Prepared parent `ca6d4908567c667defc1b3a57eb9e068776bb3b9`.

**Reviewed actual test source:** `tests/quota-mode-b.test.mjs` blob `4c5b8eadc240fcb3de61652885c7d3d0b5d60e6f` (10 Node tests directly import and execute production `quota.mjs` with a synthetic DOM and native IPC/event bus). Supporting `tests/quota-surface.test.mjs` (12 layout/source + direct size), `tests/quota-details.test.mjs` (8 real pure helper tests), `tests/surface-i18n.test.mjs` (9 mixed localization tests). Existing Quota behavior is substantially covered, **but the reviewed direct controller fixture contains no occurrence of `repoticker-usage-shown` or `__repotickerSetHoverKind`**. Source text and assertions inspected; no tests newly executed.

Legend: E_PARTIAL = method directly called by an existing test with some outputs asserted; I_PARTIAL = method is invoked as a private path through a real top-level controller and some outputs asserted; ADAPTER = simple private DOM/native wrapper, not a separate public service (must verify through consuming controller); P = method exists but a unique branch has no directly inspected executable assertion. None means FULL.

## Exact 17 lexical candidates: ownership, existing assertions and missing cases

| Source line | Actual method/candidate | Evidence status | Inspected assertion path and exact open branch |
| ---: | --- | --- | --- |
| 11 | `byId(id)` | ADAPTER | DOM `getElementById` wrapper, no decision; real import uses it. Missing element error belongs DOM/controller test, not an independent service |
| 12 | `invoke(name,args)` | ADAPTER | Fixed Tauri IPC call wrapper; 10 tests inject `core.invoke`. Native authorization and missing Tauri core separate |
| 13 | `add(parent,tag,value,cls)` | I_PARTIAL | Actual controller tests assert DOM text/sections, source uses `textContent=String(value)`. P provider-looking markup and optional class |
| 20 | `line(parent,label,value,providerName)` | I_PARTIAL | Billing and running metric rows rendered; P `providerName` true `dir=auto` vs numeric `dir=ltr`, malicious provider label |
| 31 | `setLocale(value)` | I_PARTIAL | `Mode B: failed locale IPC falls back to English without changing trusted metrics`; `Mode B: a delayed old locale reply cannot override the later config event`. P Arabic RTL DOM and no snapshot but last raw details |
| 40 | `paint(details,runnerNameRows)` | I_PARTIAL | Imported controller renders connected runner/billing views and disconnected finite errors; P natural clone geometry, 4/5 runner labels, failed resize and focus on constrained WebView |
| 103 | `invalidateBilling()` | I_PARTIAL | `prior-account billing arriving late cannot replace newer scope billing`; old 111 is not repainted over new 222. P repeated invalidation and rejected older callback after new scope |
| 112 | `statusUnavailable(message)` | I_PARTIAL | `failed monitor-only IPC reports unavailable, not old confident counts`; `unknown native popup kind cannot invent metrics and later recovers`. P denied event listen specifically |
| 117 | `selectedOrganization(snapshot)` | E_PARTIAL | Direct `popup billing scope fails closed on conflicting owner provenance`: configured only, monitored only, matching casefold, mismatch unknown. P wrong-type fields and whitespace/unknown ownership |
| 129 | `paintSnapshot(snapshot)` | I_PARTIAL | Direct controller paints trusted native monitor state under delayed event, and row labels when scope changes; P runners coverage false + stale array and exact fallback provenance |
| 136 | `scheduleBilling(snapshot)` | I_PARTIAL | Direct old-owner late billing and injected raw provider exception: no stale 111 and no secret body. P two events in same scope, switch from Billing to Runners while pending, old rejected Promise |
| 156 | `refresh()` | I_PARTIAL | `old initial monitor IPC reply never overwrites newer event metrics`; invalid scope fail closed; get_settings_config failure fallback; get_usage_popup_kind failure and recovery. P successful but unsupported native kind and overlapping kind event |
| 196 | `refreshMonitorOnly()` | I_PARTIAL | Native monitor event success, denied read unconfidence, recovery, old initial result suppressed. P two simultaneous monitor events with old rejection after new success |
| 222 | `refreshLocale()` | I_PARTIAL | Deferred older `pt` reply after newer `ru` config event: Russian wins; failure -> EN without new Git scan/API read. P Arabic RTL and malformed config object |
| 234 | `subscribe(eventName,handler)` | I_PARTIAL | Successful event subscriptions exercised via `ui.emit("repoticker-monitor-updated")`, scope/auth/config. P missing `event.listen`, rejected Promise, no unhandled native error and stale refreshId |
| 251 | `applyHoverKind(kind)` | **P** | Tests verify native kind during initial `refresh`, **not** this callback. Source: invalid ignored, identical kind+snapshot returns, new kind repaints or triggers `refresh`. Direct callback absent in inspected 10 tests |
| 264 | `onUsageShown()` | **P** | Source awaits native `get_usage_popup_kind` and calls `applyHoverKind`; catches denial. **No `repoticker-usage-shown` event emitted in reviewed controller test body**, no direct observed override/race |

## Independent missing event interleavings

| Case ID | Deterministic fixture | Required assertion / interpretation |
| --- | --- | --- |
| Q3-M01 | Real controller imported; initial native kind `tasks`, direct callback `billing` | Exact changed DOM/status and only authorized billing GETs; no stale connected counts |
| Q3-M02 | `repoticker-usage-shown` issued; defer native get; direct newer callback `runners`, release older `tasks` | Characterize current ordering; native kind is documented authoritative but last-callback-vs-last-native-write contract must be established **before changing arbitration** |
| Q3-M03 | `onUsageShown` returns invalid string vs rejects | Invalid kind must not fabricate counters; rejection may not render raw provider error |
| Q3-M04 | Direct callback same active kind and snapshot | No extra native/HTTP read or clone if no state change, unless native contract deliberately requires repaint |
| Q3-M05 | Two monitor-only events, first IPC rejects after second succeeds | Newest trusted result remains; stale failure cannot erase confidence |
| Q3-M06 | Billing pending, switch kind, switch account and locale, late old rejection | Old account and raw errors not repainted; no local Git `get_snapshot` |
| Q3-M07 | `event.listen` missing/rejected and `resize_usage_popup` rejected | Finite status, no raw native errors, no false GitHub disconnected state, view stays in supported native height bounds |

## N1–N12 and source limitation

- Positive: selectedOrganization E_PARTIAL, private controller paths I_PARTIAL, two callback methods P.
- N1 malformed kind/scope/IPC denial: existing E for rejected kind-IPC and invalid account; fulfilled unknown kind direct callback P.
- N2 repeat same kind/runner 4/5/billing scope, N4 duplicate event idempotence, N5 Q3 three-way callback+scope+locale: P.
- N3 fake native/API failure E, not live REST; N6 old snapshot failed E; N7 fixed native command + selected owner E, actual Tauri permission external; N8 pt→ru race E, RTL P; N9 physical pointer and Wayland/Windows popup P; N10 injected raw provider exception not displayed E, untrusted row text P; N11 NA; N12 native resize failure P.
- **No confirmed bug** follows just because an old async `get_usage_popup_kind` completes later: distinguish native authority timing from user-visible selection before changing production.
- Existing user-facing app main `app.mjs` still lacks a confirmed full top-level controller harness (A1); this Quota harness cannot satisfy that separate requirement.

**Stage 3 classification:** 17 lexical candidates = one exported pure method `selectedOrganization`, fourteen private executable helpers/handlers and two private adapters. The two hover-callback methods remain explicitly P. Stage 3–8 global PARTIAL, Stage 9 blocked until matrix sign-off. No production code or tests changed.
