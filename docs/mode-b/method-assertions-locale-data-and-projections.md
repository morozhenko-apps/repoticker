# Mode B: locale dictionary artifacts and callable translation projections

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `dc5102766cd7c54a4b6e0632ef226761d38a94f4`.

Verified actual source blobs: `locale-auth.mjs=ea0e74127066b81038e5526e1833e262ae88eadc`; `locale-card.mjs=2cb1b83878d84da7ce3e3ab042ee81b7d7f58777`; `locale-extended.mjs=485f94dea0a1dc70b1e4827c671930020c5768bb`; `locale-surface.mjs=ddcbc79e06b8418f92ca59bb855bfa8b7f9f1f55`; `locale-workflow.mjs=3074935aa379b56dcb03b16a8c8e5c41369a2bcd`; `locale-catalog.mjs=63bf4d429df5744506863aefc6036062858b7143`; `locale-counts.mjs=89915ccd342571333b4ac52086ee38d6a2aba529`; `locale-errors.mjs=a46d66b65e7f52c5b50557534f25c2af22564214`; `locale-plurals.mjs=0221787e612215a4d0eba7a18778ef4df5edf062`.

## Stage 3: source-exact callable versus data distinction

The five previously ambiguous rows in `locale-auth/card/extended/surface/workflow.mjs` are **DATA_ONLY**: each exports an `Object.freeze` translation dictionary and contains no executable function definitions. Their testable obligations are locale set parity, required key presence, nonempty strings, interpolation tokens, malicious markup exclusion, and consumer behavior. They are **not methods** and no fictitious positive/network branch is credited.

| Source:line | Tag | Actual source/real existing test evidence and outstanding gaps |
| --- | --- | --- |
| `locale-catalog.mjs:1032 normalizeLocale` | I_PARTIAL | Called by real `localizedGitCount` and `repositorySelectionMessage` in `tests/locale-counts-and-notifications.test.mjs`; invalid language fallback not yet independently table-asserted at this export |
| `locale-catalog.mjs:1035 localeName` | P | Source is exact roster lookup followed by English fallback; no inspected direct behavior assertion; all 20 names, unknown and prototype-like inputs need exact table |
| `locale-catalog.mjs:1038 localeDirection` | P | Source returns rtl only for normalized ar, ltr otherwise; direct assertion not established by inspected test bodies; Arabic/unknown/nonstring cases planned |
| `locale-catalog.mjs:1041 coreText` | E_PARTIAL | `tests/locale-errors.test.mjs` calls real helper for every fixed known error and raw unknown strings across 20 locales. Invalid key throws from source; exact precedence among CORE/EXTENDED/WORKFLOW/AUTH/SURFACE/ERROR and uncommon key overlap still open |
| `locale-counts.mjs:157 countText` | I_PARTIAL | Real `repositorySelectionMessage` tests 1/2/3/5, rejects negative or NaN counts, and checks Arabic isolate. Missing 0, 2^53−1, 2^53, noninteger/string/Infinity and locale-specific numeral boundaries |
| `locale-counts.mjs:164 render` | I_PARTIAL | Real messages assert all placeholders substituted and no `{` remains with valid count data; malformed/duplicate placeholder fixture and template injection not independently tested |
| `locale-counts.mjs:168 repositorySelectionMessage` | E_PARTIAL | Direct 20-locale text shape, selected/total, incomplete/filter-more, PL/RU plural, Arabic isolate, negative and NaN assertions in `tests/locale-counts-and-notifications.test.mjs`; cross-product unavailable/complete/filter flags and count exact boundaries open |
| `locale-errors.mjs:1050 localizedKnownError` | E_PARTIAL | `tests/locale-errors.test.mjs` asserts all fixed known translations in every locale, unknown canary strings unchanged, unknown locale fallback, Error object stringification; source has no sanitization of arbitrary raw text (consumer must use textContent), do not claim safe DOM HTML interpolation |
| `locale-plurals.mjs:67 localizedGitCount` | E_PARTIAL | Direct 20-locale tests for 2, negative count rejection, RU/PL 1/2/5 via cardText consumer and Arabic bidi isolate; missing Arabic 0/3/11/100, full plural cardinal table, Infinity/NaN and max-safe values |

## Stage 4–8: scenarios and interaction matrix

- **Positive, N1, N2, N6, N8:** complete key parity of five dictionaries and consumer lookup; exact 20 locales, missing/unknown keys, empty value, duplicate placeholder, case/regional variant, zero/one/many counts, Arabic RTL numeral isolation and unknown raw value identity.
- **N7/N10:** string tables do not themselves enforce HTML safety. Real UI consumers must use textContent. Unknown error payload is deliberately retained as raw text by `localizedKnownError`; this is not a sanitizer. Test the real DOM sink for encoded scripts/provider tokens, and ensure only fixed-redacted GitHub API errors are exposed.
- **N3/N4/N5/N9/N12:** no external network, retry, race, lifecycle or local persistence in pure dictionary data; locale-change event race and real compositor belong to Settings/Card/OS integration owners rather than these dictionary functions.
- **N11:** NA, no entitlements.

**Stage 9 named obligations:** LC-D1 dictionary cross-roster key/placeholder parity under every static collection; LC-P1 all `localeName` and `localeDirection` cases; LC-P2 all direct plural cardinal categories and count numeric bounds; LC-P3 precedence/fallback and raw text DOM sink test; LC-P4 locale-change event after late native Settings read and Arabic bidi physical acceptance. Mutations to kill: omit a locale, change fallbacks, change Arabic isolation, allow invalid integer, choose wrong plural category, switch `textContent` to `innerHTML`.

Existing tests reviewed from source: `tests/locale-counts-and-notifications.test.mjs`, `tests/locale-errors.test.mjs`, `tests/card-i18n.test.mjs`, `tests/surface-i18n.test.mjs`. No suite execution, source changes, test implementation or CI occurred. Stages 3–8 remain PARTIAL.
