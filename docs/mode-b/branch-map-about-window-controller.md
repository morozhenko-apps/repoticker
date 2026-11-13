# Mode B: About window actual DOM controller, localized refresh and native IPC

Baseline source `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, `apps/desktop/ui/about.mjs` blob `8c7560e769effe2bcc36e3d309ad6259a3690302`, 63 source lines.
Direct test `tests/about-locale.test.mjs` blob `c1581799b34cd32f600e84ab3396dd697486aaef` (**2 Node tests**). Prepared parent `e71a210a4d136f9449e51a6ca7e20056023971f8` on `audit/mode-b-testing`.

**Important evidence correction:** The first test **really imports the production `about.mjs` top-level controller** using a static synthetic DOM/Window and injected Tauri `invoke`; this is executable listener/closure integration, not just HTML source regex. The second test is static HTML/Rust/Tauri configuration inspection. Therefore **About already has a functioning first-order DOM/Tauri harness**. This does **not** close the unrelated A1 gap for the much larger `app.mjs` main card, which its tests do not import. Test source inspected, not executed in this audit turn.

## Direct existing assertions vs source branches

| Function/entry | Positive and negative outcomes | Source of proof and exact remaining |
| --- | --- | --- |
| Startup `disableBrowserContextMenu(document)` | Install contextmenu handler and call preventDefault on right click | E actual DOM mock registration and preventDefault |
| `invoke(command)` | Call `window.__TAURI__.core.invoke`; absent bridge returns rejected Promise and fixed `Open About in RepoTicker.` | E normal native stub; ? missing bridge and rejected native method |
| `paintLocale(value)` | `surfaceLocale` normalize fallback, `localeDirection` RTL, title, translated data-i18n text, alt and aria; close-about title translated | E RU→EN startup/focus text, aria, alt, version label; ? all 20 locales, invalid locale fallback, Arabic RTL `dir=rtl`, id=close-about title in DOM mock |
| `refreshLocale` | Increment `localeRevision`, read persisted language, catch error and fall back to en, paint only latest revision | E initial saved ru and focused en, exact twice get_settings_config; ? late older async settings resolves after newer focus, failed first/second config request |
| focus listener | Hidden/reopened About requests language again; does not reload immutable About info | E re-focus and get_about_info call count 1 |
| `get_about_info` success | Set textContent version/author and website.title only, no arbitrary markup or refresh Git snapshot | E explicit 0.2.0, author, URL and **no get_snapshot**; test uses real controller |
| `get_about_info` failure | Catch raw error into **version.textContent**; never throws from exception branch | ? injected error and fallback; raw error is shown (not HTML via innerHTML) but error text could include native-provided private path/token; separate upstream error redaction must be established |
| website click | invoke fixed `open_project_website`, success or failure; error failure writes raw error into website.title | E one click and success invocation; ? denial/rejection and error-string handling |
| `closeAbout` | Click close button or Escape invokes `hide_about`, failed native hide sets close button.title to raw error | E one click + one Escape => exactly two hide_about calls; ? failed hide, no duplicate reentrancy guard, non-Escape does nothing |
| HTML/Tauri drag capability | Undecorated, nonresizable About, single Close button, only About window has `core:window:allow-start-dragging` capability | S second test parses HTML/config/Rust source, no real Wayland/Windows drag or resize |

## Independent interactions and provenance

- About read-only details **must not cause Git scan/network**. Existing test proves it does not call `get_snapshot` and only calls specific native methods under the provided fixture. No generic IPC authorization proof for malicious WebView is established.
- Native `get_about_info` reports version/author/website. DOM controller consumes fields as text/title, rather than `innerHTML`. The test proves ordinary values, not a hostile author/version string such as markup.
- Two `get_settings_config` responses can complete out of order after repeated focus. Source `revision === localeRevision` is a last-request-wins guard; **direct reverse-order test still missing**. It must not revert an Arabic/Russian locale after a newer persisted English value.
- Browser context menu is explicitly disabled in About. This test does not establish physical Windows WebView2 context menu or platform native drag behavior.
- Every `invoke` failure could enter an error branch. Some paths render `String(error)` in title/textContent. This is a **source fact**, but whether sensitive information is exposed depends on the native redaction contract. Treat as security review hypothesis, not a reproduced secret leak.
- Existing fixture covers RU and EN translations only. All 20 locales and aria keyboard focus are supported by shared pure localization tests but not proven on real About DOM.

## Positive / N1–N12

| Class | Existing E / gap |
| --- | --- |
| Positive | E actual top-level About import, RU→EN focus, native info, close, website, preventDefault |
| N1 | ? missing Tauri bridge, bad config, malformed about info, rejected hide/website |
| N2 | ? 20 locales, repeated focus/click and no reentrant hide guard |
| N3 | E fake native calls, ? failed/rejected native responses |
| N4 | E focus re-read but info loaded once; ? duplicate clicks and repeated hide |
| N5 | ? overlapping delayed locale reads and focus transitions; source revision guard |
| N6 | ? invalid stored language, stale native error after success, missing info fields |
| N7 | E fixed native command names, no untrusted URL in website open method; native permission gate separate |
| N8 | E RU/EN and locale text/alt/aria, ? Arabic RTL, 20-locale entire DOM |
| N9 | E synthetic click/Escape, OS key/focus/drag acceptance separate |
| N10 | E `textContent` not innerHTML; ? raw native error in title/textContent and source redaction |
| N11 | NA |
| N12 | ? denied/failed config read and native window hide; no local file writes |

## Stage 9 exact incremental cases (after global Stages 3–8)

- AB1: extend **existing real import harness**, not duplicate it: missing bridge, failed `get_about_info`, failing native `open_project_website` and `hide_about`, controlled error strings and no HTML injection/secret exposure policy.
- AB2: deferred old settings result after newer focus; newer value wins and stale rejection cannot erase current language. Assert title/text/aria and `dir`.
- AB3: Arabic RTL and unsupported locale fallback, missing `get_about_info` fields; all 20 in real DOM where semantics matter, otherwise reuse shared locale tests.
- AB4: Escape vs unrelated key, two repeated Close clicks, no extra Git snapshots; identify whether repeated hide invocation is acceptable before changing behavior.
- AB-OS: real WebKit/WebView2 accessibility, drag and focus under KDE/Windows, not fake DOM.

Mutant guards: remove localeRevision check, fail to re-read on focus, replace translated aria/alt with English, accept WebView context menu, turn textContent into innerHTML, launch dynamic website URL instead of fixed native `open_project_website`. No mutations were executed.

Stage 3–8 globally PARTIAL; no code/test/CI, OS, GitHub API or live app changed.
