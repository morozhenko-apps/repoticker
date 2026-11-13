# Mode B: 20-locale catalog, pluralized Git counts, selection truth and accessible card labels

Production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Primary subjects:
- `apps/desktop/ui/locale-catalog.mjs` blob `63bf4d429df5744506863aefc6036062858b7143`, 1050 source lines of shared locale data plus `normalizeLocale`, `localeName`, `localeDirection`, `coreText`.
- `apps/desktop/ui/locale-counts.mjs` blob `89915ccd342571333b4ac52086ee38d6a2aba529`, 186 lines, `repositorySelectionMessage`, private `countText` and `render`.
- `apps/desktop/ui/locale-plurals.mjs` blob `0221787e612215a4d0eba7a18778ef4df5edf062`, 87 lines, `localizedGitCount`, `CARD_PLURALS`.
- `apps/desktop/ui/card-i18n.mjs` blob `38a476fd4eb3e918554c00b071066e8e469f6cd1`, 169 lines, `cardText`, `metricAccessibleLabel`, `cardNoticeText` and card dictionaries.

Evidence includes **8 actual Node tests** in `tests/localization-20.test.mjs` blob `daae1573ba861549caf5bd2c481659d35069f3e5`, **5 actual tests** in `tests/locale-counts-and-notifications.test.mjs` blob `eba7650d2f645020614f69522fc7d59e3e0431e8`, **9 actual tests** in `tests/card-i18n.test.mjs` blob `e65dd72753009a295ce324d0e86a6fa7683929ff`, and `tests/surface-i18n.test.mjs` for detached usage translations. Source bodies inspected, no new runtime test executed in this documentation turn. Parent `cd60196804b265a1418c64f5e2948278ff0d3b15` on `audit/mode-b-testing`.

## What existing assertions really establish

| Existing real test / group | True scope of direct executable assertions |
| --- | --- |
| `exact 20 canonical locales, native names, no accidental regional aliases` | `LOCALE_ROSTER` exact order of 20 codes; exact native.json keys and Settings option list; each code accepted by four locale normalizers; `ar` RTL and `pt` LTR; `pt-BR`, zh, zh-Hans, tl, EN, empty, null -> en |
| `all legacy static UI labels are present in every additional locale` | >=130 legacy source keys, additional 18 locale dictionaries contain nonempty, trimmed, placeholder-preserving keys and reject script/iframe/img tag patterns; `coreText` equal to translated values. This is a **literal template parity test**, not proof of translation quality or real DOM rendering |
| `shared Settings titlebar labels cannot shadow canonical core translations` | Additional locales cannot override Settings with EXTENDED_TERMS, exact precedence verified |
| `native catalog uses the identical seven fixed menu/title keys` | JSON for 20 locales contains exact 7 keys, selected native translations and source string linking native tray i18n; physical tray not executed |
| `technical semantics...` | Safe sync label different from Sync, Offline different from Unknown, Running from Queued, GitHub/HTTP/KWallet/shortcut/license words survive in all additional locales |
| `dynamic Git card templates...` | 18 additional CARD_TERMS key sets exact; one `{name}` and `{count}` for known dynamic cases, preserves fast-forward vs force distinction and Arabic U+2068/U+2069 isolation for a branch |
| `RTL locale isolates...` | Real `cardText` Arabic isolation plus **static** source expectations for app/settings/quota `dir` assignments, not physical RTL WebView |
| `every locale has complete, placeholder-safe repository-count sentences` | All 20 `REPO_STATUS_MESSAGES` have exact four keys and required placeholders, a `selected=2,total=17,complete=false,filterHasMore=true` result combines both incomplete-list notices |
| `repository selection formats non-fabricated quantities and locale plurals` | Direct English 1/2, unavailable 1; Polish unavailable 2, Russian unavailable 5, Arabic bidi isolation; selected -1 and total NaN raise RangeError |
| `Git counts choose plural rules without translating identifiers` | Every locale handles `syncReady=2` and `gitErrors=3`; negatives rejected, Russian/Polish forms 1/2/5, English singular error and Arabic numeric isolation |
| `card-i18n.test.mjs` | Nine cases mix real `cardLocale/cardText/metricAccessibleLabel` and source-string checks for `app.mjs` accessibility/event ordering; not a real main-card DOM/Tauri test |

## Function-by-function branch and coverage gaps

| Function / branch | Existing direct evidence | Missing independently meaningful assertion |
| --- | --- | --- |
| `normalizeLocale` | exact 20 codes and invalid regional aliases -> en | Symbol/object/array invalid input, attempts to alter frozen roster, locale alias with case/whitespace |
| `localeName` | all 20 canonical names by roster comparison | explicit unsupported value -> English and unexpected input types |
| `localeDirection` | Arabic RTL, all non-Arabic roster directions, unsupported -> en implied | unknown region/invalid type should always be LTR under real method |
| `coreText` | each >=130 source term in additional dictionary translates; Settings precedence | non-string key throws, unknown string falls back unchanged, missing key in one dictionary falls through to next, overlapping same key precedence across CORE/EXTENDED/WORKFLOW/AUTH/SURFACE/ERROR |
| `repositorySelectionMessage` | complete/incomplete, hasMore, unavailable selected count, invalid negative/NaN, 20 dictionary key parity | missing selected/total, fractional/Infinity/unsafe int, counts 0/1/MAX/+1, selected>total semantic contract, complete=false without filterHasMore, unavailable count 0 and 1/2/5/11/21 |
| `countText` Arabic | Source uses `Intl.NumberFormat(locale,{useGrouping:false})` and U+2068/U+2069 for ar; main formatter must not modify GitHub IDs | Arabic 0/1/large count and native digits under `Intl`; exact bidi controls, no alteration of repository name |
| `localizedGitCount` key | Only `syncReady` and `gitErrors`; invalid throws; count safe nonnegative integer | unsupported key, fractional/Infinity/unsafe; all 20 with 0/1/2/5/11/21 table |
| plural template precedence | `Intl.PluralRules(locale).select` → local category → other → CARD_TERMS or English/Russian default; E selected RU/PL/AR and general count 2 | Explicit missing-category fallback and Arabic zero/two/few/many; no force-rewriting all translations to fit one English plural |
| `cardText` | valid canonical locales, invalid key throws, static/dynamic keys, Arabic FSI/PDI dynamic branch and known count | malformed language, function-valued English/Russian rendering under bad value, unknown dynamic value, no HTML injection through source text |
| `metricAccessibleLabel` | runners/tasks + known/unknown rendered accessible text, busy=false/true, Arabic Arabic-count isolation directly tested in card-i18n | invalid `kind` throws, missing counts and malformed numeric string/leading zeros, exact busy toggle across 20 locales |
| `cardNoticeText` | Source: native localized-known-error, resize prefix + opaque error, git count>0 with localized known error; invalid throws | Direct table of native/resize/git/invalid inputs; arbitrary raw native/resize error is **not** guaranteed redacted by this presentation helper, so security relies on producing boundary |
| dictionaries | 20 supported locales including `pt` meaning Portugal, not `pt-BR`; English and Russian legacy dictionaries separate | Actual translation review, keyboard accessibility, constrained physical layout across languages |

## Risks, explicit source hypotheses and boundary ownership

- **L20-1 count truth:** `repositorySelectionMessage` validates nonnegative safe integers but does **not** enforce `selected<=total`. This might be legitimate when selected repos become inaccessible; the function has an explicit `unavailable` argument. Do not flag a bug or change it without the precise selected vs accessible semantics.
- **L20-2 plural category completeness:** `CARD_PLURALS` supplies only category overrides needed for some locales and falls back to card templates. Existing tests cover 1/2/5 in Russian/Polish and Arabic `2`, not every applicable category for every locale, especially Arabic 0/2/3/11/100 and Polish 12/22. The correct expected forms must be derived from current `Intl.PluralRules` + approved locale text before mutation-sensitive tests.
- **L20-3 credentials/privacy:** `cardNoticeText` localizes a fixed prefix and may append opaque resize/native messages; it is not a sanitizer. Actual provider/native adapters own secure error projection. Treat token exposure as a **source-derived trust risk**, not an observed leak.
- **L20-4 RTL provider identities:** Arabic mixed text uses U+2068/U+2069 isolation for dynamic values and `dir=ltr/auto` in UI source. Unit strings protect ordering, not real platform focus/ARIA or actual rendering; owner OS acceptance remains.
- **L20-5 main card:** UI test source can assert `setCardLanguage` before `renderMonitorMetrics`, but does not import `app.mjs`; A1 real main controller remains a separate Stage 9 gap.
- **L20-6 20-language consistency:** Python/Rust and JS text catalogs are distinct deployment consumers; tests check exact keys and selected strings, not guaranteed semantic equivalence across translated prose.

## Positive / N1–N12

| Class | Existing direct evidence / open |
| --- | --- |
| Positive | E 20 locale roster, 130+ term parity, Git count/plural and card access labels |
| N1 | E bad regional alias and negative/NaN counts; ? malformed keys, non-string, unsafe integers |
| N2 | E 20 roster and some plural 1/2/5; ? 0/1/MAX/overflow, 11/21/100 and full Arabic cardinality |
| N3 | NA locale pure dictionaries; network error projection external |
| N4 | NA pure formatters are idempotent by inputs; DOM re-render in app A1 |
| N5 | NA pure locale functions, asynchronous language switch in Quota/Settings separate |
| N6 | E unsupported locale returns English and unknown status distinct from zero; ? malformed key and undefined counts |
| N7 | E canonical locale allowlist, fixed key families and UI source bidi; native app authorization separate |
| N8 | E Arabic direction and Intl formatting, Portuguese pt-PT roster; ? full locale count matrix and physical RTL |
| N9 | OS keyboard, screenreader and DPI in separate acceptance |
| N10 | E value interpolation uses text content downstream per source, ? raw native resize error redaction upstream |
| N11 | NA RepoTicker has no entitlements |
| N12 | NA immutable dictionaries, no persistence |

## Stage 9 cases after full Stage 3–8

- LC1: table for normalize/name/direction/coreText invalid input, alias, missing translation and precedence, across 20 roster plus canonical unsupported values.
- LC2: `localizedGitCount` table for all 20 locales with 0,1,2,3,5,11,21,100 (and negatives, fractional, MAX); assert category-specific content where approved and no `{count}` placeholders.
- LC3: `repositorySelectionMessage` complete/partial x hasMore x unavailable (0/1/2/5/11) x malformed count, Arabic output and selected>total approved policy.
- LC4: `metricAccessibleLabel` runners/tasks, unknown vs zero, string with leading zeros, invalid kind, busy toggle, Arabic isolated count; no false zero.
- LC5: `cardNoticeText` native/resize/git plus bad kind/count/opaque error, check output and producer redaction boundary before adding a privacy fix.
- LC-OS: actual WebKit/WebView and native tray usability in Arabic, Russian and pt-PT, not assumed from dictionary parity.

Mutation targets: change canonical locale roster, lose RTL, translate unknown as zero, trim out placeholders, incorrect plural category, treat negative count as valid, erase dynamic Git identity, substitute HTML rendering, allow raw error path into a credential-less UI. No mutation run performed; global Stage 3–8 PARTIAL.
