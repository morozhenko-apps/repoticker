# Mode B inventory: language catalogs and plural/locale semantics

Source SHA `5b07a3273a27516af8ceb793f0d427a1bada964b`. This section intentionally distinguishes **pure translation tables** from executable plural/count/locale selection code. Under the anti-sampling rule, static key parity is not a substitute for testing Git safety, credentials, quota or relay logic.

Files 9, named operations 9, branch/return anchors 15.

### `apps/desktop/ui/locale-auth.mjs`

Risk **Medium**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~1 before existing test reconciliation.

**Named operations (0)**
- Static locale dictionary / data records; validate complete locale roster and keys in consumer integration

**Branch candidates (0)**
- No executable conditional in source; inspect data selection performed by importer

### `apps/desktop/ui/locale-card.mjs`

Risk **Medium**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~1 before existing test reconciliation.

**Named operations (0)**
- Static locale dictionary / data records; validate complete locale roster and keys in consumer integration

**Branch candidates (0)**
- No executable conditional in source; inspect data selection performed by importer

### `apps/desktop/ui/locale-catalog.mjs`

Risk **High**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~9 before existing test reconciliation.

**Named operations (4)**
- L1032 `export function normalizeLocale(value) {`
- L1035 `export function localeName(value) {`
- L1038 `export function localeDirection(value) {`
- L1041 `export function coreText(value, english) {`

**Branch candidates (5)**
- L1033 return LOCALE_ROSTER.some(locale => locale.code === value) ? value : "en";
- L1036 return LOCALE_ROSTER.find(locale => locale.code === value)?.name ?? "English";
- L1039 return normalizeLocale(value) === "ar" ? "rtl" : "ltr";
- L1042 if (typeof english !== "string") throw new Error("Invalid translation key");
- L1044 return CORE_TERMS[code]?.[english] ??

### `apps/desktop/ui/locale-counts.mjs`

Risk **High**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~7 before existing test reconciliation.

**Named operations (3)**
- L157 `function countText(locale, count) {`
- L164 `function render(template, values) {`
- L168 `export function repositorySelectionMessage(language, {`

**Branch candidates (4)**
- L158 if (!Number.isSafeInteger(count) \|\| count < 0)
- L161 return locale === "ar" ? "\u2068" + display + "\u2069" : display;
- L165 return template.replace(/\{(selected\|total\|count)\}/g, (_, field) => values[field]);
- L184 return [main, !complete && messages.truncated,

### `apps/desktop/ui/locale-errors.mjs`

Risk **Medium**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~3 before existing test reconciliation.

**Named operations (1)**
- L1050 `export function localizedKnownError(language, value) {`

**Branch candidates (2)**
- L1052 if (!Object.hasOwn(ERROR_TERMS.en, raw)) return raw;
- L1055 return terms[raw];

### `apps/desktop/ui/locale-extended.mjs`

Risk **Medium**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~1 before existing test reconciliation.

**Named operations (0)**
- Static locale dictionary / data records; validate complete locale roster and keys in consumer integration

**Branch candidates (0)**
- No executable conditional in source; inspect data selection performed by importer

### `apps/desktop/ui/locale-plurals.mjs`

Risk **High**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~5 before existing test reconciliation.

**Named operations (1)**
- L67 `export function localizedGitCount(language, key, count) {`

**Branch candidates (4)**
- L68 if (!["syncReady", "gitErrors"].includes(key)) throw new Error("Unsupported counter key");
- L69 if (!Number.isSafeInteger(count) \|\| count < 0) throw new RangeError("Invalid Git count");
- L83 if (typeof template !== "string" \|\| !template.includes("{count}"))
- L86 return template.replaceAll("{count}", value);

### `apps/desktop/ui/locale-surface.mjs`

Risk **Medium**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~1 before existing test reconciliation.

**Named operations (0)**
- Static locale dictionary / data records; validate complete locale roster and keys in consumer integration

**Branch candidates (0)**
- No executable conditional in source; inspect data selection performed by importer

### `apps/desktop/ui/locale-workflow.mjs`

Risk **Medium**. Test level **Unit + locale structural integration**, N1 N2 N6 N8 N9 N10 (N8 essential: plural, numeric, date/time/localization). Static translations do not independently trigger all N1/N2; validate the consuming renderer instead. Candidate expected new cases ~1 before existing test reconciliation.

**Named operations (0)**
- Static locale dictionary / data records; validate complete locale roster and keys in consumer integration

**Branch candidates (0)**
- No executable conditional in source; inspect data selection performed by importer


## Candidate evidence

The 20-language coverage tests, locale plural/counts and Settings/Quota locale suites must be mapped to: roster key completeness, fallback on unsupported locale, singular/zero/other form, invalid timestamp, device time and duration boundaries, contradictory shadow entries and accessible rendered text. N3, N4, N5, N7, N11 and N12 are not meaningful on **pure immutable dictionaries**; dynamic consumers can have those categories and are inventoried separately. No locale property is marked covered solely from key existence.
