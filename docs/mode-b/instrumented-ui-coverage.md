# Mode B actual Node26 UI branch coverage (baseline, not 100%)

**Actual executed evidence:** Preflight
[#43293012361](https://github.com/morozhenko-apps/repoticker/actions/runs/43293012361),
job `Card model and JS syntax`, Node 26.13.0:

```sh
node --experimental-test-coverage --test \
  --test-coverage-include='apps/desktop/ui/*.mjs' tests/*.test.mjs
```

Exact source SHA: `5b07a3273a27516af8ceb793f0d427a1bada964b`.
Job outcome: **success, 747/747 tests passed**. Coverage numbers
were extracted from the real job log, not inferred from file names.
These percentages describe only **loaded/instrumented JS modules**; they
exclude Rust, Cloudflare Worker and scripts.

| Module | Lines | Branches | Functions | Uncovered line ranges |
| --- | ---: | ---: | ---: | --- |
| `about.mjs` | 92.06% | 78.57% | 72.73% | 33-34 47 51 57 |
| `browser-context-menu.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `card-i18n.mjs` | 100.00% | 98.00% | 54.55% | None in report |
| `ci-failure-events.mjs` | 98.86% | 95.79% | 100.00% | 115-116 |
| `ci-status.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `github-billing.mjs` | 98.28% | 95.45% | 93.33% | 164-166 |
| `github-errors.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `github-installations.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `github-monitor.mjs` | 99.57% | 98.92% | 94.59% | 396-397 |
| `locale-auth.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `locale-card.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `locale-catalog.mjs` | 100.00% | 91.67% | 100.00% | None in report |
| `locale-counts.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `locale-errors.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `locale-extended.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `locale-plurals.mjs` | 100.00% | 91.30% | 100.00% | None in report |
| `locale-surface.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `locale-workflow.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `model.mjs` | 90.70% | 92.68% | 100.00% | 22-23 41-42 |
| `monitor-presentation.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `native-drag.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `quota-details.mjs` | 100.00% | 96.08% | 100.00% | None in report |
| `quota-size.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `quota.mjs` | 91.61% | 73.33% | 81.48% | 112-114 150-151 189-191 204-205 216-217 229-230 237-239 243-246 259-260 |
| `repo-menu.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `repo-row-indicator.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `runner-collector.mjs` | 100.00% | 97.84% | 100.00% | None in report |
| `runner-state.mjs` | 100.00% | 95.96% | 100.00% | None in report |
| `scan-refresh.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `settings-i18n.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `settings.mjs` | 60.13% | 50.58% | 48.24% | 90-91 94-95 98-99 110 112 142-144 150-151 199-201 207-208 211-228 242-243 255-258 292-299 303-304 320-351 353-359 401-404 409-413 417-429 436-438 468-479 501 506-508 512-531 536-538 543-565 638 656-667 671-703 707-716 720-731 736-739 743-744 747-754 757-768 772-774 799-800 855-856 864-868 880-882 898-913 916-937 1014-1029 1032-1034 1037-1041 1044-1051 1058-1075 1082-1108 1122-1136 1138-1139 1142-1147 1150-1169 1173-1180 1184 1187-1190 1193-1230 1255-1259 1283-1296 1298-1304 1306-1308 1327-1328 1330-1338 1348-1350 |
| `status-metrics.mjs` | 100.00% | 100.00% | 100.00% | None in report |
| `surface-i18n.mjs` | 100.00% | 92.31% | 100.00% | None in report |
| `view.mjs` | 100.00% | 95.24% | 100.00% | None in report |
| `all files` | 56.49% | 46.28% | 47.62% | None in report |

## Critical gaps and interpretation

1. `settings.mjs`: **50.58% branches, 48.24% functions** despite
   the extensive Settings fixture suite. Uncovered ranges include
   transport-phase UI, credential status, GitHub inventory/error handling,
   drafts and cleanup, language picker and close/confirm transitions.
   Prioritize high-risk authorization and persistence behavior; do not
   indiscriminately add DOM screenshot tests.
2. `quota.mjs`: **73.33% branches** with unexecuted error/
   event/presentation paths. Inspect why these controller branches are
   excluded by the current test harness, and add bounded IPC/DOM
   contract scenarios with real controller logic.
3. `about.mjs`: 78.57% branches; inspect actual error/retry and
   locale update behavior.
4. `model.mjs`: 92.68% branches; observe numeric/empty data branch
   semantics. Small critical cases may be added after gaps are mapped.
5. `github-monitor.mjs`, `runner-collector.mjs`: high branch
   coverage (98.92%, 97.84%) is useful evidence, but missing branches
   still require review; a passing suite alone does not prove all
   business invariants.
6. `app.mjs` **does not appear at all** in the instrumented table.
   That is *not* proof of 0% coverage. Browser/Tauri execution may be
   outside Node's imported-module set; include the main controller in
   a testable harness or collect platform coverage before claiming its
   behavior has been branch-tested. Keep E2E smoke minimal.
7. Other module results of 100% line/branch coverage reflect Node
   instrumented routes only and do not prove Tauri/OS or WebKit safety.

## Required next test-plan actions

- For each uncovered range in the table, map to the owning public
  operation, business rule and expected branch outcomes, then identify
  the nearest existing assertion and whether it invokes the real subject.
- Distinguish untested business branch, intentionally defensive branch,
  platform-only branch and non-applicable code. Do not mark any of these
  categories as ✔ without independent evidence.
- Use minimal external IPC/storage/clock adapters and deterministic
  controller state; do **not** mock the actual business rule or use
  timeout sleeps.
- Treat missing telemetry, empty account inventory, stale auth and
  failed Keyring cleanup as security-sensitive, even if they occur in
  an otherwise high-covered module.
- Complete entire repository Stage 3–8 before Stage 9 tests, then one
  final stable run. This coverage report alone does not satisfy Mode B
  Stage 12.

## Validation note

This document is a read-only CI evidence extraction and does not
change executable code, cloud infrastructure, Worker bindings or
release state. The summary row is Node's own weighted coverage result
and is **not** an arithmetic average of per-file percentages.
