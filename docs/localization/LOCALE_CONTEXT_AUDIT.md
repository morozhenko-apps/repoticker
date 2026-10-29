# RepoTicker — L10N-20, final feature before Mode B

Status: **IMPLEMENTATION IN DEV; FULL ACCEPTANCE BLOCKED** (2026-10-27).
20 locale choices, presentation dictionaries and preliminary structural/
semantic checks have been implemented. See
[L10N_20_AUDIT_2026_10_26.md](L10N_20_AUDIT_2026_10_26.md) for exact
coverage and unresolved checks. Native-speaker and installed UI audits
remain outstanding.
Owner decision updated 2026-10-26: move **L10N-20** into the
current implementation milestone, then finish the remaining platform
acceptance; source freeze and complete **v0.9 Mode B** still require
the 20/20 independently reviewed locale evidence. Stable **v1.0.0**
remains gated.
Tracking: [issue #16](https://github.com/morozhenko-apps/repoticker/issues/16).
Canonical sources: [PersonalLanding languageConfig.json](https://github.com/morozhenko-apps/PersonalLanding/blob/main/src/app/i18n/languageConfig.json),
[language.ts](https://github.com/morozhenko-apps/PersonalLanding/blob/main/src/app/i18n/language.ts).
The 20 locales are the website set, not the larger HandyLog app set.

## Exact canonical locale inventory and audit matrix

| Locale | Language variant | Context-specific audit risk | Status |
| --- | --- | --- | --- |
| `en` | English | Source string clarity, Git safety verbs | Source implemented; independent audit pending |
| `ru` | Russian | Git jargon, UI length, actionable messages | Source implemented; independent audit pending |
| `es` | Spanish | Git verbs, UI register and technical terms | Source implemented; independent audit pending |
| `pt` | Portuguese (Portugal) | European variety; not Brazilian Portuguese | Source implemented; independent audit pending |
| `de` | German | Compounds and long button/menu labels | Source implemented; independent audit pending |
| `fr` | French | Articles, UI register and technical verbs | Source implemented; independent audit pending |
| `it` | Italian | Git commands and natural status labels | Source implemented; independent audit pending |
| `pl` | Polish | Case/number inflection, error clarity | Source implemented; independent audit pending |
| `hi` | Hindi | Devanagari fonts, mixed technical terms | Source implemented; independent audit pending |
| `zh-Hant` | Traditional Chinese | Traditional characters, CJK font fallback | Source implemented; independent audit pending |
| `ja` | Japanese | Politeness, concise native UI, CJK glyphs | Source implemented; independent audit pending |
| `nl` | Dutch | Natural developer-language terminology | Source implemented; independent audit pending |
| `sv` | Swedish | Idiomatic Git/CI status terminology | Source implemented; independent audit pending |
| `tr` | Turkish | Casing and UI inflections | Source implemented; independent audit pending |
| `ko` | Korean | Politeness and Hangul font fallback | Source implemented; independent audit pending |
| `bn` | Bengali | Bengali fonts/line breaking, inflection | Source implemented; independent audit pending |
| `th` | Thai | Unspaced line breaking, font fallback | Source implemented; independent audit pending |
| `id` | Indonesian | Technical tone and natural phrasing | Source implemented; independent audit pending |
| `fil` | Filipino | Filipino terminology and natural code switching | Source implemented; independent audit pending |
| `ar` | Arabic | RTL, bidi for code/paths/URLs/numbers | Source implemented; independent audit pending |

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

**Checkpoint 2026-10-27:** The 20-language implementation is in `dev`,
with catalog completeness checked against its known source keys and
regression tests added for status grammar and native notifications.
The completed independent audits count remains **0/20 Passed**.
Preflight and platform acceptance evidence are tracked in the
implementation audit receipt.

## Owner-attested locale acceptance checkpoint — 2026-10-29

The product owner reports that the UI's twenty languages have already
been checked and explicitly instructs that this manual follow-up be
closed, instead of demanding another full UI-language pass.
Issue #16 is closed based on this owner attestation.

A direct source inspection of the current 20-code `LOCALE_ROSTER`
and `ui/locales/native.json` verified exact roster equality,
the canonical order and nonempty native translations. This is real
source-structure evidence, not proof that each independent reviewer
signed a 20-language contextual check. No external per-language
screenshots, reviewer identities or installed-OS receipt files were
provided in this interaction, so the historical **0/20 independently
archived review receipts** must not be overwritten with invented PASS
entries. This distinction is a release-quality disclosure, not a
request that the owner repeat already accepted manual testing.
