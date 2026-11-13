# Mode B inspected monitor, runner and UI helper assertions

Production baseline: `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. This is source review of already present executable JS helper/controller tests, not newly run CI. Group-level E_PARTIAL means *some* hard assertions confirmed, never completion of the full test case group.

| Group | Confirmed executable assertions | Remaining uncovered combination or boundary |
| --- | --- | --- |
| A3 | github-monitor.test.mjs: truncated scope >100 => unknown; offline errors => unknown not old counts; github-errors.test.mjs: arbitrary provider token/URL fragments rejected from monitor descriptions | Main app.mjs DOM itself remains uninstrumented; provider text/unknown in complete main-card runtime still needs harness. |
| M1 | github-monitor.test.mjs: scope switch clears old account numbers before a pending collector completes; late old running=900 never publishes and new=2 persists; runner-collector.test.mjs: tasks-only refresh cannot display old organization's runner inventory | Single combined partial-denied page + rapid owner switch not directly exercised. |
| M2 | github-monitor.test.mjs: 429 prevents forced card refresh and scheduled poll; scope changes during pending async cooldown read cannot publish old account; disconnect suppresses older publication | Combine clock rollback + forced refresh + logout in one controlled sequence. |
| M3 | mode-b-monitor-edges.test.mjs: fully empty runner/job API produces authoritative zeros with coverage true; 100-runner page at maxRunnerPages=1 => incomplete, busy=null; malformed run id => task coverage false; job-run cap preserves observed partial but no confident totals | Exact max+1 runner/job page variants and every corrupt nested field need case-by-case mapping. |
| H1 | quota-details.test.mjs: safeActionsJobUrl rejects javascript, evil subdomain, userinfo, settings/tokens, query and fragment; canonical github.com action job URL succeeds | Encoded path confusion, numeric overflow run/job IDs and mixed-case URL normalization still open. |
| H2 | locale-counts-and-notifications.test.mjs: exact 20 locales count=2 render; RU and PL 1/2/5 plural distinctions; Arabic bidi isolation; negative/NaN counts throw | Other applicable plural categories incl Arabic 0/3/11/100 and device DST timezone shift remain. |
| H3 | github-billing.test.mjs: old owner billing resolves after new account and cannot evict new cached value; github-monitor.test.mjs: old account collection discarded after selection change; runner-collector.test.mjs: no other org runner copy | Concurrent 3-way runner/billing/CI response order and permission denial not yet covered in a single integration. |
| H4 | github-errors.test.mjs: unknown raw 'ghp_private_secret' and private resource paths map to finite unavailable and are absent from display; finite categories include 401/403/429/network; 20-locale renderer uses redacted reason | Native Tauri producer/log redaction and unknown binary/HTTP exception fields require separate native proof. |
| H6 | settings-github-confirm.test.mjs: denied config write retains draft and prevents unrelated native commits; stale first config response cannot overwrite newer reopened Settings; invalid locale IPC in quota-mode-b falls back to EN with unchanged metrics | Corrupt on-disk locale/config schema and read-only fs transaction rollback from actual Rust config_store not yet jointly verified. |

## Confirmed genuinely missing group tests

- **Q3:** Rapidly switched popup kind with a delayed old `onUsageShown`/native kind read and simultaneous scope+locale event has no exact behavior test; `quota-mode-b` tests unknown kind and stale locale independently, not the cross-race. Need actual quota.mjs fixture with controlled deferred IPC and last-user-selection asserted.
- **A2:** Current JS `safe-sync-manual-refresh.test.mjs` and `git-concurrency-routing.test.mjs` mostly source-structure assertions. Rust Safe Sync process tests cover Git safety but not **two rapid UI Fetch/Safe-Sync dispatches contending for one native OperationLock and Quit cancellation**. Need deterministic real Tauri command/core adapter or native smoke; no direct existing combined test found.

## Mode B execution impact

These existing tests run production helper/controller modules with injected *external* GitHub/Tauri/clock adapters. They prove incomplete-data honesty and scope isolation but cannot replace native AppHandle operations, physical Keyring or Windows/KDE compositor checks. Existing `app.mjs` remains absent from the instrumented Node UI report. Additional fixed-clock, missing-response and scope-swap cases require deterministic assertions that would fail on condition/ordering mutation.

No new tests, reruns, mutation commands or deployment are claimed.