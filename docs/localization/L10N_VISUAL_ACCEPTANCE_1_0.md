# RepoTicker v1.0 — L10N-20 installed UI acceptance matrix

**Status: NOT EXECUTED / 0 of 20 independent locale reviews Passed.**
Preparation baseline: `dev` at `7187849404f8466eb80a38b1314809cda7c91660` (2026-10-29).
This is a reproducible **manual acceptance protocol**, not a test receipt.
See [L10N owner SSOT](LOCALE_CONTEXT_AUDIT.md) and
[implementation audit](L10N_20_AUDIT_2026_10_26.md).
Do not change a row to Passed without evidence of the reviewed **exact**
candidate SHA, tested installed build, native-speaker/context review and
platform acceptance. Keep real account IDs, repository paths and token data
out of screenshots and this public document.

## Context/safety contract to review

1. Git: `Fetch` updates remote references, not the checked-out branch;
   `Safe sync` is conditional fast-forward when behind or non-force push
   when ahead. Dirty, diverged, detached or moved-upstream paths do not
   silently mutate; show explicit refusal/manual retry, never imply push
   succeeded. Distinguish `Sync` (generic/native command) from safe-sync
   action labels.
2. GitHub: `Queued` is distinct from `Running`; unknown metrics and
   incomplete coverage remain `—`, never `0`. The first credential
   check is Connecting, not Disconnected. An HTTP 403 permission failure
   differs from 429 rate limiting. Partial inventory does not imply
   authorization failed or that unseen repositories were removed.
3. Billing: available gross used minutes are not remaining or billable
   totals; unavailable use/plan/account values remain unknown. Provider
   plan names, Git refs, URLs, identifiers and GitHub runner names are
   *data*, never translated. Numbers/dates are localized for display
   without mutating model values. Long Latin text in Arabic RTL must
   remain readable in logical order.
4. Native: Settings OK/Cancel must apply or discard the draft; autostart
   error versus verified registration, OS wallet failure, clipboard errors
   and CI notification opt-in retain their separate meanings.
5. Accessibility: language list, repo action menu, 5 keyboard menu items,
   focus restoration, full error notice text and detached tooltip
   remain operable. No clipped glyphs, missing font boxes, overlapped
   controls, inverted numbers or incorrect screen-reader labels.

## Repeatable platform matrix

For every one of the 20 locales, use an installed **Windows 11/WebView2**
and **Linux KDE/Wayland WebKitGTK** build from the same candidate SHA.
At **100%, 125%, 150%** display scaling, inspect the card in compact
and expanded modes, Settings including the language picker, repo
action menu, About, GitHub device flow (synthetic-safe preview), runner/
task/billing tooltip and native tray/notification labels. Check light
and dark scheme if the platform supports both. Record original scale
and screenshots, clipping, font fallback, keyboard result and a11y
result for each platform; never silently skip a case.

Synthetic fixture examples, **not** production credentials or private names:
`feature/rtl-عربي`, `qa/日本語-ไทย-🇵🇹`,
`runner-👩‍💻-é` (combining mark), `example/remote-upstream`,
`Queued 0 / Running —`, `Running 2 / Queued 0`,
`GitHub API rate limited.` and
`Remote upstream moved since Fetch; Safe sync did not push`.
For each locale verify the safety sentence stays distinguishable from
ordinary successful sync and a 403 denial is not called a retry quota.

| Locale | Primary semantic/font/layout risk | Windows receipt | KDE receipt | Independent reviewer |
| --- | --- | --- | --- | --- |
| `en` | Source safety verbs and reference copy | Pending | Pending | Pending |
| `ru` | Safe sync and Russian plural/width | Pending | Pending | Pending |
| `es` | Remote ahead/behind Git terms | Pending | Pending | Pending |
| `pt` | **pt-PT** vocabulary, long language label | Pending | Pending | Pending |
| `de` | Long action/menu labels and compound words | Pending | Pending | Pending |
| `fr` | Git safety and narrow separators | Pending | Pending | Pending |
| `it` | Git terminology and action distinctions | Pending | Pending | Pending |
| `pl` | 1/2/5 plural and inaccessible repositories | Pending | Pending | Pending |
| `hi` | Devanagari fallback/shaping/line breaks | Pending | Pending | Pending |
| `zh-Hant` | Traditional-only glyphs, CJK fallback | Pending | Pending | Pending |
| `ja` | Mixed Latin and Japanese run/job names | Pending | Pending | Pending |
| `nl` | Safe pull/non-force push register | Pending | Pending | Pending |
| `sv` | Runner terminology and narrow strip | Pending | Pending | Pending |
| `tr` | Case folding, dotted/dotless i, Git verbs | Pending | Pending | Pending |
| `ko` | Hangul fallback/shaping | Pending | Pending | Pending |
| `bn` | Bengali shaping and number/plural semantics | Pending | Pending | Pending |
| `th` | No-space Thai line break and font rendering | Pending | Pending | Pending |
| `id` | Safe sync/force terminology | Pending | Pending | Pending |
| `fil` | Git English/code switching and register | Pending | Pending | Pending |
| `ar` | RTL bidi Git refs, counts/date/time, LTR account IDs | Pending | Pending | Pending |

For **each** cell, capture: locale, candidate SHA, OS/desktop/build ID,
100/125/150% results, screen/context, case data (synthetic only),
font/glyph status, focus+keyboard/assistive tech outcome, defect ID,
screenshot filename and reviewer/date. A single OS screenshot is not
an independent 20-locale sign-off; actual linguistic review must
confirm idiomatic safety-critical wording as well.

## Stop rules and source-only checks

- Any lost negative/safety meaning, a data-loss claim, changed Git
  operation, ambiguous unknown/zero, reordered identifier, unsupported
  system dialog, broken keyboard navigation, missing glyph or clipped
  critical error is **FAIL** for the affected locale/context.
- Missing installed build, reviewer or screenshot/trace is **BLOCKED**,
  **never PASS**. Never invent native font availability based on CSS.
- Unit tests may prove catalog parity, safe projection, Unicode
  grapheme handling and Arabic bidi isolation, but **cannot** certify
  OS font rendering, native notifications, WebKitGTK/WebView2 layout,
  keyboard/reader UX, or translation accuracy.
- Source freeze for final Mode B needs the owner gate: **20/20 independently
  accepted locales** plus platform/Git safety evidence and exact-SHA
  stable CI. No release tag or R2 publication from this matrix.

## Live outcome

- Candidate SHA: **not frozen**.
- Windows complete: **0/20**, KDE complete: **0/20**.
- Independent locale reviews: **0/20**.
- Corrective source/test commit: `7140e59cf8e9c2c33187ef9055cd854e428dd405`.
  Runner preview truncation is now Unicode grapheme-aware when supported,
  with a code-point-safe compatibility fallback; the source model name
  remains unchanged. Arabic dynamic runner/task counts, billing period
  and checked timestamps are isolated in the display projection,
  preserving raw model data and unknown `—` semantics.
- **Source/focused validation:** deterministic test cases added and
  source-shape assertions performed; a standalone Node 22 check of
  the grapheme-segmentation examples passed. The committed Node tests,
  full Preflight and installed Windows/KDE behavior **have not been
  observed** at this checkpoint.
- This patch does **not** establish any 20/20 reviewer or native
  font/rendering acceptance. A fallback runtime without
  `Intl.Segmenter` preserves code points but may not preserve every
  multi-codepoint grapheme; installed WebView engines require testing.
