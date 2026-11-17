# Mode B: Quota hover truth projection, Unicode runner identity and intrinsic size bounds

Source baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3` and audit parent `642ce4f3a178d490ae2f2612602cf2727652d317`.
- `apps/desktop/ui/quota-details.mjs` blob `d9f67bba06d11eefaf326c501fc5942a4f69d4cf` (134 lines), `displayRunnerName`, `localCheckedTime`, `isHoverKind`, `buildHoverDetails`, `buildQuotaDetails` and internal runner/task/billing projectors.
- `apps/desktop/ui/quota-size.mjs` blob `bb29cd504e5416bc1390c1770c252b3a3def2bad` (20 lines), `usageHeight` bounds 118..320, header/frame gap.

Source-to-real-assertion evidence: `tests/quota-details.test.mjs` blob `d90673d3a1d6bc7f9d05b817d51dac49e874d070` (8 direct tests except the independent `safeActionsJobUrl` model test); `tests/quota-surface.test.mjs` blob `e4fa50565acfecbb55d6e879fe8da345c16825a6` (12 mixed source/layout + actual `usageHeight` assertions); `tests/surface-i18n.test.mjs` (9 direct and source mixed tests); `tests/hover-fallback.test.mjs` (2 real projection and 2 source tests). Source bodies inspected, none newly executed.

## Direct existing assertions

- `buildQuotaDetails` with authorized billing `2026-10` renders Organization and Personal account, exact plan `free`/`pro`, 2000/3000 included and 2791.5/0 gross in English number formatting; no invented `remaining`.
- `buildHoverDetails(null,"runners",true,"GitHub data unavailable")` returns `Runners unavailable`, not disconnected. Initial status messages `Checking GitHub connection...` and `Connecting to GitHub...` return `Connecting` for all 3 kinds without claiming authorization.
- Unknown runner inventory with false coverage produces `Self-hosted —` and `GitHub-hosted —`, **not** one fabricated unnamed runner from untrusted stale array.
- Runner name trimming counts at most **38 Unicode grapheme clusters** when `Intl.Segmenter` is available, preserves emoji ZWJ, combining accent and Japanese characters; test asserts original provider runner name remains unchanged and UI-only fallback/provenance tagging is independent.
- Task preview max 4 runner names and `More self-hosted` when additional; provider name exactly `"Unnamed runner"` is distinguished from fallback-synthesized text via `runnerLabelKinds`.
- `usageHeight(18,[16,34])=118`, `usageHeight(20,[16,24,35])=139`, 30×24 clamps to 320, NaN title and negative row returns 118; connected popup clone measurement is source-checked, **not** physically exercised by Node.
- `localCheckedTime` actual UTC date format exercised in `locale-counts-and-notifications` with `Intl.DateTimeFormat("de")` equivalent, and unknown timestamp remains unknown in surface-i18n.

## Per-method branch/negative matrix

| Entry | Distinct branches | E existing / ? missing |
| --- | --- | --- |
| `displayRunnerName` | nonstring/blank -> Unnamed runner, trim, 38 grapheme boundary, 39+ truncation, `Intl.Segmenter` fallback codepoint iteration | E null/blank, ASCII 37+emoji, Japanese 39, no source mutation; ? fallback when `Intl.Segmenter` absent |
| `localCheckedTime` | finite Date.parse string, choose pt-PT/zh-TW/fil-PH display locales, user timezone/default; malformed -> Unknown | E UTC German, invalid unknown; ? incorrect timezone throws `RangeError` (not caught), DST and selected regional aliases |
| `isHoverKind` | exact runners/tasks/billing; other/null rejected | E indirectly Q3 native kind tests; ? direct table |
| `buildHoverDetails` invalid kind | finite unknown-type view, don't render counts or invoke API | S source, ? exact authorized false/true |
| `buildHoverDetails` connecting | two fixed status messages with no model -> Connecting even while not authorized | E all 3 kinds for both messages |
| `buildHoverDetails` billing | authorized gets two formatted sections, unknown/null billing fields -> dash; unauthorized fixed Not connected | E both, gross vs included, no remaining; ? invalid month 00/13, negative or NaN, overflow and malformed plan |
| runner projection | total/online/offline via `compactStatus`, shown busy/idle only when runner coverage; checkedAtRunners preferred when either split timestamp exists | E concrete runners and unknown, ? malformed counts/partial coverage combinations, separate time fallback |
| task projection | only complete runner coverage gives up to 4 runner labels; jobs coverage gives matched running count; otherwise unknown; GitHub-hosted independent | E 4 runner rows, fifth summary, false inventory no fabricated runner, ?? malformed runner null/id mismatch |
| timestamps | split `checkedAtRunners`/`checkedAtTasks` override legacy `checkedAt` if either split is present; arbitrary/absent date -> Unknown | S, ? one split field absent while other present, must remain unknown rather than silently using old aggregate |
| `usageHeight` preflight | title finite>=0, array of finite>=0 rows, otherwise 118 | E NaN/negative; ? Infinity, nonarray, element NaN/Infinity |
| `usageHeight` layout | contents sum plus 7*(n−1), fixed 30 frame, ceil, clamp 118..320 | E compact/mid/large, ? exact 117/118/319/320 boundaries, fractional row heights, empty list and overflow |

## Independent semantic interactions

1. **Unknown != zero:** source `status-metrics.shown` and explicit `coverage` prevent unknown runner/job facts from becoming zeros. No source proof that malformed nested `runner_state` is valid, and native NM1 unknown-key acceptance stays an architectural STOP FACTOR.
2. **Locale and identity:** human-readable dates/numbers may use `pt-PT`, `zh-TW`, `fil-PH` only for Intl display; stored locale is unchanged. Runner names are display-only clipped; authorization ID and job runner ID never truncated.
3. **Timestamp provenance:** a split timestamp in one group makes a missing other group's timestamp unknown; a stale legacy `checkedAt` is not used as false confidence.
4. **Intrinsics:** resize uses a cloned fixed-width probe instead of `scrollHeight` of a stretched scroll area; unit `usageHeight` cannot prove actual WebView native geometry nor a clipping bug.
5. **Error trust:** `buildHoverDetails` may display already-projected status message; provider/native error redaction belongs upstream. No arbitrary external body should cross into UI from native, but helper is not a sanitizer.

## Positive / N1–N12

| N | Existing / missing |
| --- | --- |
| Positive | E verified runner/task/billing and measured height |
| N1 | E invalid runner, missing coverage, NaN/negative size, ? invalid timezone and malformed rows |
| N2 | E 38-grapheme and 4/5 runner limit, min/mid/max height, ? exact boundary table |
| N3 | E finite unavailable view, external provider failure handled upstream |
| N4 | NA pure projection, controller event idempotence separate |
| N5 | NA pure projection; Q3 async kind race mapped separately |
| N6 | E unavailable legacy count, unknown timestamp; ? inconsistent split timestamps |
| N7 | E no arbitrary runner fabricated, native nested schema authority NM1 |
| N8 | E Unicode graphemes, Intl locale numbers, UTC date; ? time zones and DST |
| N9 | OS popup pointer, text clipping and accessibility separate |
| N10 | E display-only runner truncation; redacted provider message upstream |
| N11 | NA |
| N12 | NA pure projection, native resizing failure separate |

## Stage 9 exact missing direct tests

- QD1 invalid hover kind/null, all coverage combinations runner vs jobs, and split timestamp legacy/no-fallback interaction.
- QD2 malformed runner id/name/invalid status with complete=false, Unicode grapheme fallback without Segmenter where supported, runner 0/1/4/5 rows.
- QD3 billing month 00/12/13 and nonnumeric/negative/Infinity/large gross amounts, stable no remaining.
- QS1 table 0/1/118/119/319/320 input-derived height, negative/NaN/Infinity, array invalid and overflow; no scrollbar-based measurement.
- OS1 real KDE/Windows popup resize/min/max and RTL multiline natural-height clip, not inferred from unit source regex.

Mutation targets: turn false coverage into 0, show unknown as known, truncate provider identity, count UTF-16 halves, let stale checkedAt override missing split timestamp, exceed 320, measure stretching scrollHeight. No mutation run. Stage 3–8 PARTIAL.
