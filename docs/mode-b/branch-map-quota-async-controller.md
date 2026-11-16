# Mode B: detached Quota WebView, native kind authority and async race admission

Production source-equivalent baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `apps/desktop/ui/quota.mjs` blob `d43ce98c8a8b000d7f344b39fe3f55b4b142e4d5`, 274 source lines. Direct `tests/quota-mode-b.test.mjs` blob `4c5b8eadc240fcb3de61652885c7d3d0b5d60e6f` has **10 actual Node tests** that import the production top-level controller with synthetic DOM/event/async Tauri native invokes. Other subject tests `tests/quota-details.test.mjs` (8 tests) call separate pure hover functions, and `tests/quota-surface.test.mjs` (12 tests) mostly inspect HTML/CSS/Rust source plus real `usageHeight`. Parent `1f96f4208e70e1a44cd0771e26bdbbe72702f947` on `audit/mode-b-testing`.

**Evidence discipline:** direct test bodies inspected; no new tests, provider access, native WebView or screenshot performed. Synthetic event emission is not proof of physical popup pointer/focus behavior. Q3 denotes the specific **unverified multiway hover kind/locale/IPC race**, not a proven defect.

## Actually asserted by real Quota controller tests

| Existing test scenario | Direct observed assertions |
| --- | --- |
| conflicting owner provenance | `selectedOrganization` returns configured/monitored matching case-insensitively, returns unknown on different owners, no wrong-owner billing call |
| old initial monitor IPC vs newer event | delay `github_monitor_snapshot` initial response, publish event with Running=5 Queued=2, then release older Running=1: title remains 5/2, no `get_snapshot` |
| monitor-only read failure | previously known 5/2, fail native monitor IPC, title becomes Status unavailable with finite public message, no leaked provider error |
| late old-owner billing | old `team-old` usage pending, switch `team-new` and publish 222; old 111 arrives late and never replaces 222; no local Git scan |
| failing billing transport | raw `SECRET_PROVIDER_BODY_NOT_FOR_WEBVIEW` injected in fake `github_api_get`; appears nowhere in DOM; public unavailable message |
| initial monitor denial then event recovery | startup Status unavailable becomes Running=4 Queued=2 after later valid native monitor event |
| invalid scope then correction | `get_monitor_scope` returns number: reject before any GitHub billing; later valid team scope event starts exact `/orgs/team` request |
| failed popup kind IPC and recovery | failed `get_usage_popup_kind` yields unavailable without private IPC error; valid monitor event later shows task metrics |
| failed locale read | fallback English preserves trusted running/queued metrics and makes no new GitHub billing or local Git scan |
| old locale read after newer config event | deferred older `pt` language finishes after newer `ru`; Russian title and language remain, no local Git scan |

## Real `quota.mjs` method branch map and unverified outcomes

| Entry | Branches/priority | Evidence + gap |
| --- | --- | --- |
| `add/line` | DOM textContent rather than HTML; providerName dir=auto, numeric dir=ltr | S source, ? hostile provider label and actual DOM direction |
| `setLocale/paint` | canonical/fallback locale, repaint active snapshot or raw details, connected/disconnected section rows, optional headings/messages; natural-height clone vs compact min; native resize denied silently | E RU/EN config updates, ? Arabic RTL, huge row list, clone height and failed resize, hidden/reopen |
| `invalidateBilling` | bump version, clear `createBillingCache`, billingState and fetch | E account switch and auth event in fixture; ? repeated invalidations with old reject during new scope |
| `selectedOrganization` | configured only, monitored only, both same casefold, both conflict -> unknown | E direct assertions for four outcomes |
| `scheduleBilling` | only active billing AND connected; skip in-flight same scope; accept result only if current billingVersion, billingScope and active kind; catch redacts errors; finally clears only matching pending request | E old-owner completion and raw error; ? repeated same-scope event while pending, old rejection after new success, switch kind before completion |
| `refresh` | initial full lightweight three-way IPC (native monitor cache, configured owner, language), wait for authoritative native kind last; monotone `refreshId` and localeRevision gates | E stale initial monitor, invalid scope, bad kind and language, ? contradictory kind event while initial get_usage_popup_kind pending and account disconnect during read |
| `refreshMonitorOnly` | only monitor cache and native kind; reject stale id, merge last config owner, independently invalidate stale billing, no local Git scan | E later valid update, denial state, ? two concurrent monitor events with older failure after newer success |
| `refreshLocale` | new revision on event, choose saved language with catch English fallback; only latest paints | E deferred pt vs ru; ? invalid object and full RTL, config event while full refresh waiting |
| `subscribe` | event API absent vs available vs Promise rejecting; denial shows fixed finite status, increments refreshId to invalidate earlier calls | Subject fixture exercises successful subscriptions; ? missing `window.__TAURI__.event.listen`, rejected listener and stale status |
| `applyHoverKind` | reject kind outside billing/runners/tasks; same kind with snapshot return; otherwise repaint or fresh refresh; callback exposed as `window.__repotickerSetHoverKind` | E startup tasks/kind IPC and recovery; ? direct callback kind sequence, same-kind no read and invalid kind ignored |
| `onUsageShown` | awaits native kind and then calls `applyHoverKind`; catches errors without fabricating a new kind | S source; ? older async reply vs direct newer kind callback and newer `repoticker-usage-shown` event, actual authority policy |

## Explicit Q3 race and preconditions for a bug conclusion

- **Q3-A:** Direct callback sets `billing`, then an earlier `onUsageShown` native get returns `runners`; current source applies the returned valid kind without independent request generation. This is a **testable interleaving**. Whether that is *wrong* depends on the source of native kind at time of response: `get_usage_popup_kind` is documented as authoritative, while the callback is an explicit native relocation of the same selected kind. Capture the native command write/read ordering before deciding whether last callback or last native persisted kind should win.
- **Q3-B:** Repeated native events while billing fetch pending and subsequent logout: `billingVersion` and `refreshId` protect two different flows, so assert no old account's billing numbers appear after disconnected state. Existing pairwise old-owner test is meaningful but does not cover kind+locale+scope three-way ordering.
- **Q3-C:** Failed `listen` after one successful snapshot calls `statusUnavailable` and increments `refreshId`; verify it shows a fixed availability message and cannot leak raw native error. Native `usage-events.json` permissions remain a separate external OS fact.
- **Q3-D:** Unsupported kind returned by native `get_usage_popup_kind` on a **successful** promise is silently ignored; this differs from a *rejected* command that fails refresh. Test both with exact rendered kind, no invented task metric or billing call.
- **Q3-E:** `resize_usage_popup` failure is swallowed; this keeps business status accessible in DOM but does not prove the popup remains visually accessible on constrained Wayland/Windows geometries.

Do not modify event arbitration, native permissions, billing authority or network access under this doc-only audit. If changed precedence would alter the agreed native/UI public contract or trust boundary, document alternatives and invoke STOP FACTOR.

## Positive / N1–N12

| Category | Verified direct evidence / open |
| --- | --- |
| Positive | E imported controller 10 tests, trusted snapshots, billing and locale |
| N1 | E invalid owner, native kind command failure, denied monitor, ? successful invalid kind and malformed nested metrics |
| N2 | ? repeated kind, 20 locales, large rows/natural dimensions and popup cap |
| N3 | E fake provider exception redacted, native monitor unavailable; physical API/IPC ? |
| N4 | E recovery after failure, ? same-scope duplicate billing and repeated kind callbacks |
| N5 | E initial snapshot, old billing owner, old locale; ? three-way kind+scope+locale, overlapping usage shown |
| N6 | E missing scope, stale IPC; ? corrupted snapshot nested content and invalid locale |
| N7 | E no arbitrary repo read and scoped billing; native permission rejection untested |
| N8 | E pt/ru stale locale, ? Arabic RTL, timezone presentation separate |
| N9 | E synthetic shown/monitor/config event, OS focus/pointer lifecycle ? |
| N10 | E raw provider and native error not rendered, ? hostile provider name in text nodes |
| N11 | NA RepoTicker does not sell entitlements |
| N12 | NA pure UI; native settings Keyring failure external |

## Stage 9 after global branch/matrix sign-off

- Q3-1: extend existing actual DOM import fixture with deferred `get_usage_popup_kind`; interleave direct `__repotickerSetHoverKind`, two `repoticker-usage-shown` events and another monitor event; assert **approved** native kind authority and no previous selection resurrection.
- Q3-2: invalid fulfilled native kind vs rejected command; assert no wrong metric or billing request, eventual recovery.
- Q3-3: same-scope simultaneous event emissions and pending billing result, count actual GETs and no stale account after logout; late rejection must not clear new scope.
- Q3-4: missing/denied event permissions, failed resize, hostile provider names, RTL string direction, large measured rows.
- Q3-OS: real detached WebView pointer-pass-through, focus, layout, and monitor-only refresh under Windows/KDE.

Mutation kills: remove refreshId/localeRevision guards, accept stale billingVersion, rewrite wrong owner, change allowlisted native kind to arbitrary string, pass raw error to tooltip, trigger full local Git scan, allow deferred old kind to win without current authority. No mutation execution. Global Stage 3–8 PARTIAL.
