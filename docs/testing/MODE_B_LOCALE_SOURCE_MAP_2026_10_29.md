# Mode B localization and surface-presentation source inventory

**Baseline:** `fb0768d7212424e26ff29c644dd0f934ab1ff2a4` (2026-10-29). Directly read
12 source files; 19 syntactically named functions.
This Stage 1–3 inspection is **not a completed Stage 3/4 branch map
or a 20/20 acceptance report**. Translation catalog literals
are data with semantic/contextual and fallback correctness contracts,
not trivial untestable DTOs. Anonymous lambdas and PluralRules
branches require explicit further mapping.

## Risk-to-case contract

- Exactly 20 canonical language IDs; no unapproved pt-BR,
  zh alias or locale-specific path/identifier mutation.
- Non-English UI uses exact-key translation only for known
  RepoTicker text; arbitrary Git/provider/OS content remains
  opaque, especially tokens, paths and names.
- Safe sync / Fetch/force warning must retain safety meaning,
  no accidental implied push, manual retry distinction.
- Arabic isolates numeric tokens and dynamic names in RTL;
  a11y labels preserve unknown != 0. Other language numbers
  keep previous presentation. No truncation of CJK/Indic glyphs.
- Native CI notification run+attempt placeholders and
  qualified opt-in scope remain bijective, failure text
  redacted, settings OK/Cancel isolated from persistence.
- Generated `Unnamed runner` translated only under
  explicit fallback provenance; provider names identical
  to English labels remain unchanged.
- Cardinal rules: zero/one/two/few/many and language-specific
  forms, 0, 1, 2, 5, max safe integer, invalid/NaN values,
  secure curly-brace placeholders; unknown error strings
  are never substring translated.
- Long-string overflow and installed font/assistive-technology
  screenshots are deferred to the mandatory later OS gate.

## Direct function index

| Source | Named JS functions | Name:line |
| --- | ---: | --- |
| `apps/desktop/ui/card-i18n.mjs` | 4 | cardText:105, countText:124, metricAccessibleLabel:135, cardNoticeText:148 |
| `apps/desktop/ui/locale-auth.mjs` | 0 | Declarative translations; fallback keys/duplicate collisions to inspect |
| `apps/desktop/ui/locale-card.mjs` | 0 | Declarative translations; fallback keys/duplicate collisions to inspect |
| `apps/desktop/ui/locale-catalog.mjs` | 4 | normalizeLocale:942, localeName:945, localeDirection:948, coreText:951 |
| `apps/desktop/ui/locale-counts.mjs` | 3 | countText:157, render:164, repositorySelectionMessage:168 |
| `apps/desktop/ui/locale-errors.mjs` | 1 | localizedKnownError:1050 |
| `apps/desktop/ui/locale-extended.mjs` | 0 | Declarative translations; fallback keys/duplicate collisions to inspect |
| `apps/desktop/ui/locale-plurals.mjs` | 1 | localizedGitCount:67 |
| `apps/desktop/ui/locale-surface.mjs` | 0 | Declarative translations; fallback keys/duplicate collisions to inspect |
| `apps/desktop/ui/locale-workflow.mjs` | 0 | Declarative translations; fallback keys/duplicate collisions to inspect |
| `apps/desktop/ui/settings-i18n.mjs` | 1 | settingsText:97 |
| `apps/desktop/ui/surface-i18n.mjs` | 5 | surfaceText:56, isolatedValue:63, translatedStatus:67, translatedMessage:82, translateHoverDetails:97 |

## Required follow-up and execution boundaries

Expand translation lookup, fallback branches and per-language
catalogs into a Positive/N1–N12 test matrix; use existing
`tests/localization-20.test.mjs`,
`tests/locale-errors.test.mjs`,
`tests/locale-counts-and-notifications.test.mjs`,
`tests/card-i18n.test.mjs`, and
`tests/surface-i18n.test.mjs` as candidate coverage evidence
**only after checking actual assertions**. Final Node 24
stable and physical OS behavior remain unobserved.
