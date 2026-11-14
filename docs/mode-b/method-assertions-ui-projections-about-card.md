# Mode B: About, card, monitor, quota-size, Settings and surface projection assertions

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, parent audit commit `1a514850c8142b5199e434557cd1cea7d3fcfad3`. Source blobs: `about.mjs=8c7560e769effe2bcc36e3d309ad6259a3690302`, `card-i18n.mjs=38a476fd4eb3e918554c00b071066e8e469f6cd1`, `monitor-presentation.mjs=2b3689bec1975d8a3ca9503d2410aec92d6499c9`, `quota-size.mjs=bb29cd504e5416bc1390c1770c252b3a3def2bad`, `settings-i18n.mjs=33f8452030c0c8e804aa749554ef7e60d737af7d`, `surface-i18n.mjs=1f8e3e5a15e3b974c3837ab1151df43acad183fa`.

Node test bodies inspected from `tests/about-locale.test.mjs`, `tests/card-i18n.test.mjs`, `tests/locale-errors.test.mjs`, `tests/monitor-presentation.test.mjs`, `tests/quota-surface.test.mjs`, `tests/settings-i18n.test.mjs`, `tests/surface-i18n.test.mjs`. No tests executed now. Real About module import is a genuine controller execution with faked *external* Tauri/DOM ports; source regex checks for unrelated windows are not execution evidence.

## Exact Stage 3–4 evidence and gaps

| Method / source line | Status | Existing direct or consumer execution; remaining branch |
| --- | --- | --- |
| `about.mjs:7 invoke` | I_PARTIAL | In actual About import, fake native invoke receives get_settings_config/get_about_info/open_project_website/hide_about; unavailable Tauri and all rejected IPC responses not directly asserted |
| `about.mjs:11 paintLocale` | I_PARTIAL | About test imports whole controller: ru at open, en on focus, text/ARIA/alt/title and immutable app info; Arabic rtl, invalid saved locale and missing DOM node outcomes unasserted |
| `about.mjs:26 refreshLocale` | I_PARTIAL | Initial get_settings_config and focus refresh observed; failed config and out-of-order two concurrent config reads (revision guard) not directly tested |
| `about.mjs:55 closeAbout` | I_PARTIAL | Click and Escape both issue hide_about twice; rejected native hide and missing website/window errors unasserted |
| `card-i18n.mjs:111 cardText` | E_PARTIAL | Direct tests English/Russian/pt, all 20 CI statuses, invalid key rejection, value interpolation and plural branches; Arabic dynamic provider value isolation and complete fallbacks remain open |
| `card-i18n.mjs:130 countText` | I_PARTIAL | Called through real metricAccessibleLabel tests: numeric string vs unknown em dash, Arabic bidi isolation; empty/leading zeros/very large numeric-looking string not individually asserted |
| `card-i18n.mjs:141 metricAccessibleLabel` | E_PARTIAL | Runners/tasks unknown vs 0, busy labels, Arabic isolate, all 20 locale source counts, invalid metric; malformed counts object and different numeric encodings remain |
| `card-i18n.mjs:154 cardNoticeText` | E_PARTIAL | `tests/locale-errors.test.mjs` direct tests native/git/resize notices, 20-locale exact known errors, unknown data identity, invalid structures and Arabic/pt fallback; raw unknown error text requires safe downstream textContent |
| `monitor-presentation.mjs:4 mergeMonitorPresentation` | E_PARTIAL | Direct Node tests verify remote-only field projection, local repositories/roots/errors preserved and invalid native snapshots throw; nested runner_state trust shape not validated here (NM1 STOP contract) |
| `monitor-presentation.mjs:18 reconcileScanPresentation` | E_PARTIAL | Before==after preserves scan; change merges newer remote monitor state while preserving latest Git rows; full concurrent scan/monitor/auth race needs actual app.mjs A1 |
| `quota-size.mjs:10 usageHeight` | E_PARTIAL | `tests/quota-surface.test.mjs` asserts 118 floor, 139 normal, 320 ceiling, NaN/negative fallback and long list; missing 117/118/119/319/320/321 precise transitions, Infinity and nonarray |
| `settings-i18n.mjs:147 settingsText` | E_PARTIAL | Real tests EN/RU/pt, text keys, unknown literal passthrough, invalid key error, 20-language CI option labels; missing direct Arabic RTL and collisions with native provider strings |
| `surface-i18n.mjs:57 surfaceText` | E_PARTIAL | Real surface tests About labels, invalid null, pt/ru, passthrough unknown values, all 20 locale Close; unexpected value types and key precedence remain |
| `surface-i18n.mjs:64 isolatedValue` | I_PARTIAL | Indirect Arabic runner/task/billing/datetime isolate in translateHoverDetails test, unknown em dash preserved; unusual nonstring values and double isolation cases open |
| `surface-i18n.mjs:68 translatedStatus` | I_PARTIAL | Indirect tests runners, tasks, billing and unavailable statuses, Arabic exact isolate, preserves unknown; malformed status type and oddly formatted date unasserted |
| `surface-i18n.mjs:83 translatedMessage` | I_PARTIAL | Indirect tests Checked Unknown vs date and external provider message unchanged; malformed values and untrusted prefix spoofing not fully asserted |
| `surface-i18n.mjs:98 translateHoverDetails` | E_PARTIAL | Real tests immutable source, runner names preserving raw provider identity, active label translation, fallback tags and Arabic bidi, English returns source; 0/1/4/5 protected row boundary and broken nested sections remain |

## Stage 5 and 6 cross-domain obligations

- Positive/E partial: all 17 callables have actual test execution via direct exports or consumer About import, but not exhaustive branches.
- N1/N2: bad key, null/nonstring values, exact heights and unusual runner/locale strings; 20-locale cardinal translation table, Arabic bidi and malformed nested data.
- N3/N9: About unavailable native commands, failed hide/open and window/OS teardown; separate physical KDE/Windows About behavior not implied by fake DOM.
- N4/N5: concurrent focus config reads and revision drop; late Git scan vs monitor-only refresh; stale delayed Settings locale vs About close.
- N6/N7/N10: raw provider values remain verbatim *in text nodes*, never infer that translation helper sanitizes arbitrary data. NM1 runner_state nested JSON contract is not silently tightened.
- N8: fixed Arabic RTL and date display; no timezone conversion in pure translation functions.
- N11: NA. N12 only for native persisted Settings read; pure functions do no I/O.

**Stage 9 cases:** AB1 real controller deferred config read/focus/scope races, AB2 native rejection and accessibility on actual DOM; CARD1 complete notice table including untrusted canaries, CARD2 unknown/zero counts and Arabic isolate; MON1 true nested monitor/scan interaction under app.mjs; QU1 exact intrinsic height boundaries and malformed input; SUR1 protected runner row boundaries and unknown provider text. Mutation review should kill removed revision guard, changed source preservation, mistaken zero defaults, wrong Arabic isolates, unsafe DOM sink and height clamp changes.

No source, test, CI, release, OS or external connection changed. Stage 3–8 PARTIAL.
