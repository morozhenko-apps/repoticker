# Mode B semantic branch map: Settings, Quota, and main card

Baseline source: \`a3ba7fa30fc4c81890d3075f94142942d001cbf3\`.
No production behavior is changed in this document.

**Evidence taxonomy:** **E** = directly reviewed an existing test's
assertions against actual production module execution. **C** = candidate
existing test (name/source reference only; assertions not fully verified).
**P** = planned missing branch/case, requiring a deterministic regression.
**OS** = impossible to establish by DOM/IPC fixtures alone; native acceptance.
An executable assertion in a virtualized WebView is not proof that the OS
Keyring, external GitHub or native WebKit actually performed a transaction.

The baseline Node26 instrumented coverage is
[recorded separately](instrumented-ui-coverage.md): \`settings.mjs\`
50.58% branch, \`quota.mjs\` 73.33%; \`app.mjs\` not listed.
A successful 747-test suite means the executed assertions passed, **not**
that the reported uncovered branches are irrelevant.

## Settings: controller branches and exact candidate tests

Source: \`apps/desktop/ui/settings.mjs\`. Main test harness:
\`tests/settings-github-confirm.test.mjs\` (real code imported with a
cache-busting module URL and fake external Tauri IPC, no mocked Settings
domain functions), plus \`settings-controls\`,
\`settings-relay-draft\`, \`settings-visual-controls\`.

| Source lines / owning methods | Distinct observable outcomes that need mapping | Candidate test evidence and status | Deficit / next case |
| --- | --- | --- | --- |
| 14–40 \`applySettingsLanguage\` | supported/unsupported locale, right-to-left, fallback, initial/draft | \`settings-i18n\`, \`settings-github-confirm\` C | Test all 20 locale transitions and unchanged draft on Cancel |
| 62–120 \`confirmedRelayConnection\`, \`syncWorkerControls\` | online only for persisted Hybrid URL + stored bearer; draft mismatch; pending credential; offline/unknown; mask lock | \`settings-github-confirm\` tests “Connected native Worker locks URL…” and “Native fallback unlocks Worker URL…” C | Missing stored secret + late failure + redaction independent combinations |
| 121–145 \`applyRelayPhase\` | malformed phase/reason, stale draft, saved polling, unlocked URL, current event ahead of initial read | “Missing native phase…”, “Unavailable native Relay IPC…”, “Native failure reason…” C | Verify each finite reason and no raw provider URL/message in DOM |
| 146–167 Settings close/drag and initial native status | left mouse vs non-left, close target bypass, native async event and missed opened event | “Cancel with missed reopened event…” E; native drag tests C | OS: Wayland drag, custom titlebar keyboard/Close |
| 168–239 \`renderRelaySecretState\`, \`refreshRelaySecretStatus\`, disconnect and masked entry | stored/absent/error, stale read, masked candidate, duplicate clicks, staged removal, no plaintext leaks | “Inline secret remains…”, “Relay Disconnect preserves…”, postcommit Keyring read E/C | N5: delayed old Keyring status vs newer Disconnect and reopened Settings |
| 246–282 \`refreshRelayConnectionStatus\` | stale response vs newer event/reopen, IPC failure, missing fields, no implicit connected | “Native failure reason identifies…” C | P: failure late after successful online event, wrong revision and no changed draft |
| 283–362 \`validRepoName\`, \`normalizeRepoDraft\`, \`repoChoiceValid\`, \`renderRepoChoices\` | selected/all, zero/1/100/101, invalid casing/path/name, filter visible/hidden, unchanged offline | “selected GitHub repositories remain drafts…”, “OK persists repository subset…” C | P: test selected 100/101, all off/on and duplicate label normalization |
| 363–416 \`refreshRepoInventory\` | multi-page and max cap, invalid responses, late old account page, unavailable list | “Mode B: denied repository inventory…”, “Settings enumerates … beyond first page” C | P: page response half-valid and old scope request rejects after scope changed |
| 417–533 \`refreshMonitorScopes\`, \`clearMonitorScopes\` | zero/one/multiple, auto-init only previous auth, partial list, mismatch, write denied, late response | “Mode B: malformed installation scope…” and “auto scope initialization failure…” C | P: concurrent new Device Flow with late complete one-account inventory |
| 534–623 GitHub auth status timer/messages/buttons | pending/terminal, timer start/stop, error redaction, click gating; no untrusted message | “Mode B: unknown native GitHub failure reason…” C | P: shutdown/reopen while pending status read, non-overlap and no leaking reason |
| 624–776 \`refreshGithub\`, connect/cancel/disconnect and focus | auth stale/new, double Connect, challenge late after Cancel, typed code copy errors, preserved draft focus | “Mode B: Cancel during in-flight device challenge…”, “Mode B: concurrent Connect…”, “Ordinary focus…” E/C | P: all normal/auth error phase transitions with newer reopen priority |
| 782–820 \`validRelayUrl\`, \`validRelayDraft\`, \`syncConnectionAvailability\` | empty, malformed, non-HTTPS, URL length 512/513, bearer length 31/32/256/257 and invalid charset | \`settings-controls\`, \`settings-relay-draft\` C | P: exact param boundaries with UI disable and no secret IPC |
| 821–847 \`pollingNeedsRelayCleanup\`, \`isDirty\`, \`updateApply\` | dirty/unchanged, mode Polling/Hybrid, URL/keyring cleanup, pending auth; invalid state blocks OK | “Hybrid to Simple polling OK …”, “Failed native … cleanup” C | P: no accidental Hybrid switch on credential removal only |
| 849–938 \`displayRootPath\`, \`renderRoots\`, \`renderIgnoredChildren\` | Windows UNC prefix, empty/many, duplicate removal, invalid custom child, cancel | \`windows-settings-qa\` actual extracted display function E; \`settings-github-confirm\` C | P: UI keyboard interaction on 100/101 ignored children |
| 939–1030 \`refresh\` | async config failures, multiple launches, stale first response, auth unavailable, read consistency | “Mode B: failed Settings reopen…”, “late failed startup…” C | P: two rapid open generations with contradictory account + relay + config |
| 1031–1110 form/OS folder picker events | no draft, unchanged, unsupported notification mode; root selection cancel/error; ignored duplicate/limit | “Folder picker … Cancel…”, “ignored child folder edits draft-only…” C | P: invalid OS picker path/name and over-limit 101 with no write |
| 1111–1191 \`updateLanguagePicker\`, \`openLanguagePicker\`, \`closeLanguagePicker\` | Escape/Tab/Home/End/Up/Down, click outside, readonly saving state, focus restore, RTL | “Keyboard language choice stays a draft…” C | P: all focus/keyboard paths, long/empty option list, no persistence on Escape |
| 1192–1233 \`cancelSettings\` | clean/dirty/active OAuth, existing vs newly created token, deferred challenge, native close fails | “Cancel … preserves …”, “Mode B: Cancel during in-flight …” C | P: in-flight token revoke failure with error shown but no false cancellation |
| 1234–1353 Apply/OK transaction | double submit, staged secret, save order, config failure, account selection failure, autostart mismatch, Keyring commit error, Polling cleanup/readback, close failure | “Given concurrent OK taps …” E: exactly one stage/save/commit/close; “Given staged … rejected config write …” E: no premature Keyring persistence; “Given failed postcommit Keyring …” E | P: fail at every ordered write boundary and prove safe previous state/next retry; native OS acceptance |

**Required rule:** a title/line in a candidate suite is **not** a
Coverage Map ✔. Inspect each test's assertions and exercise the expected
true/false branch or replace C with P. The highest-priority gaps involve
OAuth generations, stored credential custody and the ordered native
\`save_settings\` → \`relay_commit_secret_draft\` transaction.

## Quota: executable controller branches

Source: \`apps/desktop/ui/quota.mjs\`; main behavior harness:
\`tests/quota-mode-b.test.mjs\` imports the actual module under fake
external IPC. This preserves the billing scope/snapshot business rules.

| Source lines / methods | Branch/outcomes | Asserted evidence | Gaps |
| --- | --- | --- | --- |
| 13–29 \`add\`, \`line\` | text escaping, name dir=auto only for provider, LTR numeric display | \`quota-mode-b\` C | P: hostile provider label remains text, not DOM markup |
| 31–102 \`setLocale\`, \`paint\` | 20 locale mapping; disconnected vs connected; title, empty section, rows, optional messages; clone measurement and min/max size | \`quota-surface\` size contracts and \`quota-mode-b\` controller C | P: connected/unconnected transitions, exact measured height, failed native resize handled without leaked data |
| 103–115 \`invalidateBilling\`, \`statusUnavailable\` | version increments on scope changes; unavailable state clears old confidence | “failed monitor-only IPC reports unavailable…” E | P: multiple consecutive invalidations, failed listen with old cache |
| 117–128 \`selectedOrganization\` | matching casefold; contradictory provenance => empty; only config or only monitored scope | “popup billing scope fails closed …” E, asserts all four outcomes | No known branch gap; monitor async consistency separately |
| 129–155 \`paintSnapshot\`, \`scheduleBilling\` | non-billing/offline skip, duplicate scope request, success, stale success, stale failure, late old-cache response | “prior-account billing arriving late…” E, “raw billing transport exception…” E | P: repeated same-scope event must not issue extra billing request; stale reject after new scope |
| 156–195 \`refresh\` | valid/invalid scope, failed locale fallback, native kind valid/invalid, late initial reply, monitor denial | “old initial monitor IPC reply…” E; “invalid native account scope fails closed…” C | P: rejected kind IPC cannot erase a newer event, auth lost during scope read |
| 196–221 \`refreshMonitorOnly\` | success/IPC fail; stale event; changed account; maintain last config | “failed monitor-only IPC reports unavailable…” E; “old initial…” E | P: two events cross, older failure may not invalidate newer success |
| 222–233 \`refreshLocale\` | valid/unsupported locale, failed read, older locale read vs new config event | “delayed old locale reply cannot override later config…” C | P: invalid locale object and full RTL directional labels |
| 234–250 \`subscribe\` | event permission absent, listener rejects; request refresh invalidation; no raw provider error | \`quota-surface\` structural C | P: actual async listener rejection with old status and no fake auth failure |
| 251–275 \`applyHoverKind\`, \`onUsageShown\` | invalid kind ignored, same kind no repaint, changed kind, initial no snapshot; native read failure | “unknown native popup kind … recovers…” C | P: rapid kind sequence with a late native read must not revert newer choice |

### Quota mutation obligations

Assertions must kill: \`configured.toLowerCase() !== monitored...\`
replaced with equality, \`id !== refreshId\` removed, an old
\`billingVersion\` gate removed, \`scope===... \` duplicate suppression
removed, \`statusUnavailable\` retaining stale confidence, and disclosure
of a raw provider exception.

## Main card \`app.mjs\`: no measured module coverage

\`apps/desktop/ui/app.mjs\` does not appear in the baseline Node UI
coverage table at all. **This means not instrumented, not 0% tested.**
Relevant existing contracts: \`tests/ui-layout\`, \`ui\`,
\`safe-sync-manual-refresh\`, \`git-fetch-cancel\`,
\`repo-local-actions\`, \`hover-fallback\`,
\`usage-events\`, \`native-drag\` and \`windows-card-regressions\`.
Most inspect source/DOM or invoke factored helpers, not the complete
\`app.mjs\` asynchronous lifecycle. Audit assertions before assigning E.

| Source functions/line bands | Mandatory outcomes and interactions | Next evidence task |
| --- | --- | --- |
| 51–113 activity indicator, autohide, notice/error | scan startup, timer cancellation, reentry, transient errors without fabricated state | Controller harness with fake timers/event signals |
| 125–214 menu open/close, focus and native actions | open identical menu vs another repo, keyboard Escape/Arrow, denied external URL, no arbitrary path access | Minimal DOM interaction contract |
| 215–309 repo rows, CI markers, Git action availability | dirty/upstream, ahead/behind precedence, CI unknown, Fetch cancellation vs Safe Sync | Cross with real \`model.mjs\` and IPC fixture |
| 320–429 hover/tooltip selection and manual monitor activity | rapidly switch Runners/Tasks/Billing; hide after focus leaves; no local Git scan during monitor-only update | Race-controlled event adapter; no physical E2E proliferation |
| 430–508 metrics/locale/render | empty vs partial/verified GitHub fields; 20 locale choices; no fake zero | Real presenter with bounded external adapters |
| 509–615 render and refresh/cancel/execute | outdated scan and GitHub monitor promises, errors, double Fetch, clear busy flag and progress | Capture actual ordering and no unexpected mutations |
| 615–717 view switch/layout/event handlers | compact/expanded state, late events after hide, repository action link source | Contract + one physical KDE/Windows smoke |
| 718–788 locale update and native drag | persistent locale without triggering a new Git scan, pointer cancel/leave and actual OS drag | Existing native drag helper tests + platform acceptance |

**Testability recommendation (NOT implemented):** use a separate
external DOM/Tauri adapter and deterministic fake clock to execute
\`app.mjs\` itself, not a copy or substituted domain helper. This need
not change public API or stored data, but implementation belongs in
Stage 9 after the all-file plan is complete.

## Cross-controller interactions (Stage 6 expansion)

| Inputs/states combined | Required invariant |
| --- | --- |
| Settings OAuth connect/revoke × GitHub monitor session × ETag cache | late old credentials cannot restore monitoring or private data |
| Settings Hybrid/Polling × Keyring available/unavailable × stored Worker URL | save/Cancel atomicity; only explicit Polling cleans both, Hybrid not silently lost |
| Settings two reopen generations × native delayed phase × user URL draft | newer event wins; ordinary focus cannot erase edits |
| Quota owner change × pending billing request × stale monitor update | wrong account not billed; old response cannot overwrite new |
| Popup kind change × locale update × delayed IPC | preserve latest chosen kind/locale; no false status |
| Main card Git Fetch running × Quit × reentrant action | only owned Git process terminated; no double shutdown |
| Main card monitor-only event × local scan active × disconnected GitHub | no extra local Git scan and unknown stays unknown |

## Planned negative scenarios (not yet implemented)

- **S1 (N5/N6/N7)** delayed Relay Keyring status and old window
  generation must not mark new Hybrid worker online.
- **S2 (N4/N5/N12)** full Settings save phase matrix with native failures
  at each boundary, no staged secret surviving Cancel or committed twice.
- **S3 (N2/N6/N9)** invalid/multiple Github installation or repository
  page permutations at exact 0/1/100/101 limits.
- **S4 (N9/N10)** keyboard/label accessibility across picker state,
  high-contrast/RTL and custom Close.
- **Q1 (N5/N8)** conflicting owner provenance + stale billing rejection
  after a new account already resolved.
- **Q2 (N3/N9/N10)** denied event listener and retry without displaying
  GitHub authorization falsehood or leaking provider error.
- **Q3 (N5/N6)** old hover-kind IPC response and locale/scope change
  during an active popup.
- **A1 (N4/N5/N9)** main card full lifecycle under queued render, hide
  and double user action, using real controller plus fake external IPC.
- **A2 (N2/N5/N9)** repeated fetch cancellation and safe-sync
  contention with no second Git mutation.
- **A3 (N6/N10)** incomplete CI/runner snapshot never changes unknown
  to zero or reveals private diagnostic body.

These tests are reserved for Stage 9; the full-repository Stage 3–8
inventory and assertion mapping is **not yet complete**.
