# L10N-20 implementation acceleration (2026-10-26)

**Mode A — Feature / Refactor.** Owner explicitly moved the approved
20-locale feature from the post-UI slot to the current milestone. Keep
the exact locale IDs from [LOCALE_CONTEXT_AUDIT.md](localization/LOCALE_CONTEXT_AUDIT.md).
This change modifies *presentation*, not Git semantics, saved root
formats, tokens, monitors, authentication, package names, or CI.

## Baseline & inventory

The repository currently supports `en` and `ru` only. Separate
English/Russian dictionaries exist in `settings-i18n.mjs`,
`card-i18n.mjs`, `surface-i18n.mjs` and
`tray_i18n.rs`. Native `save_settings` and `set_language`
reject every other locale. Settings exposes two choices.
Native notifications and error messages also contain user-visible
English literals, some containing provider/user-controlled text.

### Semantic boundaries

- Never translate GitHub-owned names, repository paths, branch/ref names,
  job/runner names, URLs, token data, codes, and ISO timestamps.
- Use technical `Fetch` consistently for the Git operation and
  distinguish `Safe sync` (fast-forward pull/non-force push) from
  arbitrary merge, rebase or force push.
- Display unavailable data as **unknown**, never `0`.
- `pt` is Portugal Portuguese, `zh-Hant` Traditional Chinese,
  `fil` Filipino, and `ar` right-to-left with isolated Latin code
  segments. Exact 20 ID list remains authoritative.
- The language picker edits **draft state** only; Save/OK persists a
  valid code, Cancel leaves every existing setting unchanged.
- No locale-specific persistence schema, GitHub API call or permission.
- Core interface must remain functional even when a translation key
  is unresolved; such a fallback is a **detected audit failure**, not
  an audited/pass state.

## Stages (docs-first, atomic code commits)

1. **Catalog & access:** introduce a single reviewed locale roster and
   case-sensitive validation for UI/native; expose native-language names
   in the picker. Preserve `en` and `ru` old settings.
2. **Shared presentation glossary:** add translations of native titles,
   tray verbs, Settings/card/About/runner/job/usage vocabulary for all
   20 locales. Preserve keys and placeholder boundaries.
   Avoid translating dynamic provider content.
3. **UI integration:** use the validated stored code on Settings, card,
   About, detached usage window, and native menus. Keep existing
   transactional Settings semantics. Check RTL direction on Arabic
   content and LTR isolation for technical paths.
4. **Automated audits:** exact 20-code roster, key/placeholder parity,
   missing-English and language-mismatch screening, unsafe markup,
   pagination/truncation hazards, no-translated-path/token invariants,
   and context-specific terminology tests. Defer test execution to the
   final stable validation gate. Check Linux and Windows compilation.
5. **Independent semantic/contextual review:** inspect each locale
   against real Git, CI, auth and quota concepts; document any weak,
   context-dependent or unreviewed translations, and do *not* claim
   native-speaker acceptance without that evidence.
6. **Physical acceptance:** UI screenshots on Windows/KDE,
   RTL/font/overflow checks, persisted locale after restart,
   incomplete/transient auth state and hover panels. Source/CI
   does not replace physical acceptance. Then Mode B remains gated
   by 20/20 completed audits per existing SSOT.

## Risks and rollback

A single centrally keyed catalog reduces drift but errors can spread
to all surfaces. Native JSON parsing must be deterministic and typed.
Right-to-left direction must not reverse Git hashes/paths. Native
window titles are initialized from the **saved** locale, not Settings
draft. Rollback is isolated to catalog/provider/UI wiring and tests;
a previously stored valid `en`/`ru` preference remains valid.

**Evidence policy:** A locale may be `Implemented / Automated audited`
without being `Semantic independently reviewed` or `Physically passed`.
Missing labels, incorrect technical meanings or unreviewed scripts are
`BLOCKED`, not silently accepted via English fallback.
