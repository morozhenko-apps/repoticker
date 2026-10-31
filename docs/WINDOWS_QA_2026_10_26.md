# RepoTicker Windows UI acceptance follow-up (2026-10-26)

Branch: `dev` only. No `main`, tag or published release change.
This is a physical defect report and a source-fix ledger, **not** a
claim of passed Windows runtime acceptance.

## Physical findings and planned recheck

| # | Observed on Windows | Source correction | Acceptance |
|---|---|---|---|
| 1 | Tray commands are wordy | Short EN/RU labels; stable action IDs and Safe Sync semantics unchanged | Confirm actual tray menu on both locales |
| 2 | Native About title remains English | Read saved locale and set native About title before showing | Confirm RU native title and translated body |
| 3 | Runners/Tasks/allowance hover details do not appear | Remove misleading HTML `title`; on Windows set the usage popup nonfocusable and pointer-through | Hover three targets; validate information, anchoring and absence of focus theft |
| 4 | Hide arrow looks wrong and is offset | Use a single centered vector chevron instead of a font glyph | Confirm center/alignment at Windows scaling |
| 5 | Repo scrollbar is ugly and grabs window rather than scrolling | Thin themed scrollbar; drawer/rows/menu excluded from native drag gesture | Thumb drag, mousewheel, keyboard scrolling, blank-card native drag |
| 6 | Language and previously saved settings applied before/again after OK | Keep language as draft; pass only changed settings fields, skip unchanged GitHub scope; defer Disconnect until OK | Switch languages + Cancel/OK, check independent persisted values and unchanged token/scope |
| 7 | Native Settings title not translated | Apply saved locale to native Settings title; UI document title translated | RU/EN title upon reopening |
| 8 | Settings appear coupled to language selection | Explicit per-field patch and no scope/autostart reapply; regression tests | Change only language; verify roots, exclusions, CI and login untouched |
| 9 | Ignored child folder cannot be selected | Native Browse returns selected child **name only**, not its path | Pick name, OK and Cancel; reject invalid names |
| 10 | Windows project folder shows `\\?\C:\...` | Display-only conversion of verbatim path; retain exact canonical path internally | Verify full normal path, remove existing root after locale toggle |
| 11 | Expanded GitHub repo selection overflows Settings window | Scrollable Settings viewport, bounded inner list, sticky OK/Cancel footer | Reproduce with many repo choices at 100/125/150% display scaling |
| 12 | Dropdown options have excessive top gap | Center repo menu options, remove extra list padding, align language list items and closed GitHub controls | Inspect on Windows WebView2 and KDE GTK; note native OS popup painting limitations |

## QA invariants

- GitHub tokens never enter frontend debug logs, documents or telemetry.
- A saved root's canonical value is independent of the displayed path and language.
- Local roots, excluded child names, CI notifications, autostart and monitored
  GitHub repositories only change on explicit OK.
- GitHub Disconnect is provisional until OK; Cancel leaves the existing
  credential intact. The separate Device Flow cancellation path continues
  to revoke a newly created unconfirmed session.
- Existing GitHub account/repositories are not sent through
  `github_set_monitor_org` for unrelated Settings changes.
- Windows tooltips cannot focus themselves or intercept hover pointer
  interactions, and their content remains read-only.
- Mouse events on repository rows/scrollbars never start a card drag;
  actual empty draggable card space still may move it.
- No Git core or Fetch/Safe Sync behavior was modified in this UI batch.

## Automated evidence

Source regression tests include `windows-settings-qa.test.mjs`,
`settings-github-confirm.test.mjs`, `settings-visual-controls.test.mjs`,
`settings-i18n.test.mjs`, `tray-safe-sync.test.mjs`,
`ignored-children.test.mjs`, and `ci-native-integration.test.mjs`.

The current Linux/JS Preflight and new Windows candidate must finish before
claiming compiled binaries. Re-run the full 12-point physical check after
a successful, checksum-verified unpublished NSIS build. If a native selector
still paints an OS-specific option gap, record the exact screenshot and
platform styling instead of substituting an inaccessible control.
