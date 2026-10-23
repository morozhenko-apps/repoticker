# RepoTicker — L10N-20, final feature before Mode B

Status: **PLANNED, NOT IMPLEMENTED OR AUDITED** (2026-10-23).
Owner decision: all other enabled product/platform features → **L10N-20**
→ source freeze and complete **v0.9 Mode B** → stable **v1.0.0**.
Tracking: [issue #16](https://github.com/morozhenko-apps/repoticker/issues/16).
Canonical sources: [PersonalLanding languageConfig.json](https://github.com/morozhenko-apps/PersonalLanding/blob/main/src/app/i18n/languageConfig.json),
[language.ts](https://github.com/morozhenko-apps/PersonalLanding/blob/main/src/app/i18n/language.ts).
The 20 locales are the website set, not the larger HandyLog app set.

## Exact canonical locale inventory and audit matrix

| Locale | Language variant | Context-specific audit risk | Status |
| --- | --- | --- | --- |
| `en` | English | Source string clarity, Git safety verbs | Planned |
| `ru` | Russian | Git jargon, UI length, actionable messages | Planned |
| `es` | Spanish | Git verbs, UI register and technical terms | Planned |
| `pt` | Portuguese (Portugal) | European variety; not Brazilian Portuguese | Planned |
| `de` | German | Compounds and long button/menu labels | Planned |
| `fr` | French | Articles, UI register and technical verbs | Planned |
| `it` | Italian | Git commands and natural status labels | Planned |
| `pl` | Polish | Case/number inflection, error clarity | Planned |
| `hi` | Hindi | Devanagari fonts, mixed technical terms | Planned |
| `zh-Hant` | Traditional Chinese | Traditional characters, CJK font fallback | Planned |
| `ja` | Japanese | Politeness, concise native UI, CJK glyphs | Planned |
| `nl` | Dutch | Natural developer-language terminology | Planned |
| `sv` | Swedish | Idiomatic Git/CI status terminology | Planned |
| `tr` | Turkish | Casing and UI inflections | Planned |
| `ko` | Korean | Politeness and Hangul font fallback | Planned |
| `bn` | Bengali | Bengali fonts/line breaking, inflection | Planned |
| `th` | Thai | Unspaced line breaking, font fallback | Planned |
| `id` | Indonesian | Technical tone and natural phrasing | Planned |
| `fil` | Filipino | Filipino terminology and natural code switching | Planned |
| `ar` | Arabic | RTL, bidi for code/paths/URLs/numbers | Planned |

Codes are case-sensitive. The site `pt` means Portugal. Do **not**
substitute `pt-BR`, `zh-Hans` or `zh` for any of the 20; `fil`
is canonical even if alternate `tl` is encountered in OS locale data.

## Implementation and independent contextual audit

1. **Inventory 100% of UI surfaces:** card, expanded local repo list,
   tray, About, Settings, native dialogs, auth/Device Flow, GitHub
   runner/job/usage, confirmations, errors, Git operations, status
   updates, offline/rate-limit, progress and notifications. Capture
   both native Rust and JavaScript/HTML strings and context.
2. **Translation architecture:** one key registry/format policy,
   20 complete bundles, exact key/placeholder parity, plural rules,
   locale-tag validation, system detection and persisted selection;
   no scattered `if (language === ...)` copies; safe fallbacks.
3. **Per-locale semantic audit:** compare translated copy against
   actual RepoTicker UI context, technical meaning and adjacent
   surfaces. Verify `Fetch` vs safe `ff-only Pull`; staged vs
   diverged vs dirty Git; queued/running/unknown counters;
   unauthorized/offline/locked wallet/rate limit, GitHub account
   vs monitored scope, informational billing and destructive
   action warnings. Correct literal mistranslations and vague terms.
4. **Per-locale layout/a11y:** test long labels, keyboard/focus,
   text truncation, Unicode script rendering and date/number
   formatting. Arabic RTL must isolate Latin repo names and Git
   refs, URLs and numeric counts, without changing the raw values.
5. **Evidence for EACH locale:** audit date, exact revision SHA,
   audited keys and UI contexts, found/corrected mistakes,
   terminology review, screenshot/platform, RTL/font notes,
   native-speaker approval or explicit absence. Only mark `Passed`
   with evidence; use `Blocked` for material unresolved errors.
   Do not label automated translation as native review.
6. **Exit:** 20/20 bundles; 20/20 independent audits **Passed**;
   security-critical Git/auth semantics unchanged; deterministic
   completeness/plural/placeholder/escape tests; UI smoke.
   Then and only then freeze the source for the complete Mode B
   program, which will verify locale × auth × Git status interactions.

**Nothing has been translated or audited in this checkpoint.**
This file records the mandatory future acceptance contract.
