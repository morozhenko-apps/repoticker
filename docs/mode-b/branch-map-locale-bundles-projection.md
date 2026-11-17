# Mode B: localized credential-safe terms and immutable Settings/Quota projections

Production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `1e72d56c84a31812408181de782b829a81d1532a`.
Source bundle modules (data-first, no independent executable methods):
- `apps/desktop/ui/locale-auth.mjs` blob `ea0e74127066b81038e5526e1833e262ae88eadc`, 437 lines, `AUTH_TERMS`; Device Flow canonical messages.
- `apps/desktop/ui/locale-card.mjs` blob `2cb1b83878d84da7ce3e3ab042ee81b7d7f58777`, 509 lines, `CARD_TERMS`; Safe Sync and dynamic name/count templates.
- `apps/desktop/ui/locale-extended.mjs` blob `485f94dea0a1dc70b1e4827c671930020c5768bb`, 1517 lines, `EXTENDED_TERMS`; Settings and monitor strings.
- `apps/desktop/ui/locale-surface.mjs` blob `ddcbc79e06b8418f92ca59bb855bfa8b7f9f1f55`, 327 lines, `SURFACE_TERMS`; About and hover labels.
- `apps/desktop/ui/locale-workflow.mjs` blob `3074935aa379b56dcb03b16a8c8e5c41369a2bcd`, 455 lines, `WORKFLOW_TERMS`; repository/device authorization states.
Executable projection modules:
- `apps/desktop/ui/locale-errors.mjs` blob `a46d66b65e7f52c5b50557534f25c2af22564214`, 1056 lines, `ERROR_TERMS` and `localizedKnownError`.
- `apps/desktop/ui/settings-i18n.mjs` blob `33f8452030c0c8e804aa749554ef7e60d737af7d`, 151 lines, `settingsLocale`, `settingsText`.
- `apps/desktop/ui/surface-i18n.mjs` blob `1f8e3e5a15e3b974c3837ab1151df43acad183fa`, 127 lines, `surfaceLocale`, `surfaceText`, `translateHoverDetails` and private status/message and bidi helpers.

Reviewed actual Node test bodies: `tests/locale-errors.test.mjs` blob `d61f7c4e3206955903cede3f214fbe03955e8562` (**14** tests), `tests/settings-i18n.test.mjs` blob `3bbf4c98ac414f72194b794177c0b71aebab405a` (**3** tests), `tests/surface-i18n.test.mjs` blob `04a001158e7a1c1f1e559068acdac550276dcc54` (**9** tests), `tests/localization-20.test.mjs` (**8** cross-bundle/roster tests). No new test suite or platform UI executed.

## Existing real assertions and limits

| Direct test contract | Exact demonstrated result | Residual branch/interaction |
| --- | --- | --- |
| 20-language catalog parity | `ERROR_TERMS` keys match 20 canonical locale codes; each locale's full fixed error list equals exact required key array; coreText/settingsText/surfaceText return same approved errors | E fixed-key parity and subset semantics, P actual quality review and live WebView translations |
| Error key provenance | Required strings occur literally in Rust/Settings/GitHub/source sites; dynamic OS errors excluded from fixed-key matching | E static cross-source assertion, not native runtime error |
| `localizedKnownError` exact known | For each 20 locale × fixed error, returns approved translation; source uses own property check and no partial translation | E extensive table; P tricky object coercion/reentrant toString and unusually long string |
| Unknown native/provider data | Error with appended token, path, URL, markup, prefix `Error:`, empty string remains exact raw; unknown locale falls back EN | E raw string preservation across 20, including invalid `pt-BR`, `RU`, `__proto__`, `constructor`, null; P hostile `toString()` exceptions |
| `cardNoticeText` error output | Existing 14-error-suite test calls real native/Git/resize branches: fixed Git safety messages translated, unknown native error passed through, invalid kind/count throws; resize prefixes localized but raw opaque OS data appended | E direct; this is a **presentation boundary, not raw native error sanitizer**. Privacy guarantees rely on upstream projection |
| `settingsLocale`, `settingsText` | RU legacy map, EN identity, `pt` Portugal, `pt-BR` unsupported EN; RU unknown key unchanged; null translation key throws | E direct. P invalid object locale + undefined key, Russian fallback to core when no local RU entry |
| Settings HTML/UI | All >=26 declarative Settings labels and accessibility keys have Russian translations; CI notification options distinct across 20; source checks draft language change does not immediately persist | E text and static checks, no actual Settings DOM localization under all 20 UI states |
| `surfaceText` | EN identity, RU local dictionary and fallback, pt canonical; invalid key throws; 20 Close labels nonempty | E direct. P invalid locale/empty string and inherited property injection rejected by underlying lookup |
| `translateHoverDetails` EN | Returns original details identity, no new model or translated provider values | E real direct assertion; no model mutation |
| `translateHoverDetails` non-EN | New immutable projected status, message, sections, rows; derived Status Runners/Tasks/Actions localized with numeric text preserved | E RU task and billing, IT task, 20 fallback names |
| Numeric bidi isolate | Arabic dynamic count/date wrapped U+2068/U+2069 except sentinel em dash; original provider runner IDs/labels not rewritten | E Arabic task 2/—, checked time, Runners=12, unknown, billing month=2026-10; P multiline RTL/a11y physical |
| Runner-name provenance | First N rows protected when they represent real runner labels even if equal to reserved built-in label; only `runnerLabelKinds[index] === "fallback"` translated | E `runnerNameRows=2`, provider `"Online"`/literal `"Unnamed runner"` remain; synthetic fallback translated across all 20 |
| Unknown/disconnected status | `Not connected`, `Connecting`, `Runners unavailable`, `Checked: Unknown` stay unknown, no zeros | E RU and four checked locales; P malformed status, missing section array, null row list |

## Branch map of executable functions

| Entry / branch | Direct E or P |
| --- | --- |
| `localizedKnownError` `String(value)`; fixed ERROR_TERMS.en allowlist; exact language own property, fallback EN | E real known/unknown across all locales and wrong language; P coercion-throws boundary |
| `settingsText` nonstring throws; RU map hit or fallback `coreText`; other code `coreText` | E null, RU/EN/pt; P RU missing exact key core fallback |
| `surfaceText` nonstring throws; RU override or `coreText`, non-RU core | E null and supported values; P empty/core fallback |
| `isolatedValue` Arabic and not em dash → FSI/PDI; otherwise unchanged | E Arabic numbers/date vs unknown; P empty string and abnormal encoded Unicode |
| `translatedStatus` EN identity; regex Runners, Tasks, Actions valid month/dash, else direct key lookup | E all three and unknown; P invalid month 00/13 and malformed status preserving raw |
| `translatedMessage` EN identity; invalid nonstring retains; exact `Checked: ...` Unknown translates, otherwise value isolated; fallback fixed text | E Unknown and real date, disconnected; P malformed checked prefix, null message and nested arbitrary text |
| `translateHoverDetails` EN or no details returns same object; otherwise immutable projection and strict runner-name origin protection | E EN, RU/pt/ar, fallback provider label, original deepEqual; P runnerNameRows -1/5/fractional, missing sections, malformed row tuple, unknown status |

## Semantic/privacy constraints

1. **Exact-key translation is not sanitization**. Unknown private OS/Git/provider strings are intentionally left byte-identical; they must be filtered or redacted at the producing native boundary. No code change justified merely by a literal canary surviving pure `localizedKnownError`.
2. **Don't translate provider identities**. `runnerLabelKinds` is UI-only provenance metadata from `buildHoverDetails`; runner names that collide with reserved words stay unchanged. When metadata absent, the numeric `runnerNameRows` fallback limits positional protection to 0..4.
3. **Don't confuse key parity with UX completeness**. The dictionaries are 1000+ lines, but there are only a few functions. Exhaustive static keys and placeholders already have direct tests; 20-language physical UI still requires selective OS tests for Arabic/pt-PT/Russian width, focus and screen reader.
4. **Input provenance**: string values from native may contain secrets/errors. The locale layer does not append privilege or network actions, but code rendering must use `textContent` rather than HTML. Tests verify source pattern, actual About/Quota DOM where imported; `app.mjs` remains A1.
5. **No N3/N12 in dictionary-only modules**: pure lookup no network/storage. Security N7/N10 applies at the consumer/native projection, not by fabricating network tests for frozen objects.
6. **Source facts vs possible defects**: `translatedMessage` exact English prefix does not recognize arbitrary localized provider errors; that's deliberate finite vocabulary, not a missing NLP translation bug.

## Positive / N1–N12

| Class | Source evidence vs missing |
| --- | --- |
| Positive | E all 20 fixed-error keys, Settings, About, Quota statuses, Arabic isolation |
| N1 | E nonstring translation keys, unknown locale/strings; P malformed status and row tuple |
| N2 | E 20 exact locales, runner protection 0–4 from source and test; P -1/5/float boundaries |
| N3 | NA data/localization only; network failure reason generated upstream |
| N4 | NA pure transformations, controller re-entry separate |
| N5 | NA pure transformations; Q3 controller pending locale remains separately mapped |
| N6 | E missing status/unknown checked date, fallbacks; P missing sections/malformed content |
| N7 | E canonical locale and finite error identity, raw error authorization external |
| N8 | E Arabic FSI/PDI, Portuguese pt-PT, native numeric data unchanged; OS RTL acceptance P |
| N9 | E synthetic About/Quota localization DOM elsewhere, physical focus/keyboard separate |
| N10 | E no mutation of provider name/value, canary passthrough expected; producer redaction P |
| N11 | NA |
| N12 | NA no files or DB |

## Stage 9 remaining cases and stop boundaries

- LB1: `translateHoverDetails` table runner-name origin markers and 0/1/4/5/fractional row limits, malformed sections, unknown month/status (do not mutate source as first response).
- LB2: pure `settingsText`, `surfaceText`, `localizedKnownError` invalid key/language, missing RU fallback, hostile object coercion and no accidental prototype lookup.
- LB3: integrated Quota/Settings localization during account scope changes and delayed IPC, including Arabic RTL and localized error display; no real network.
- LB4: native provider redaction and OS Keyring error string contract; no token should ever be passed to raw notice renderer. Security-contract changes require STOP FACTOR where applicable.
- LB5: owner physical KDE/Windows locale/focus/tooltip 20-language spot checks, not an E2E per string.

Mutants: translate only prefix of provider exception, mutate runner names, convert unknown to zero, lose bidi isolation, accept unsupported locale, replace `textContent` with `innerHTML`, render raw native bearer. No mutation run. Stage 3–8 overall PARTIAL.
