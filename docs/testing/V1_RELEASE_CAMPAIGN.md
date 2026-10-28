# RepoTicker v1.0.0 release campaign — tracked gates

Status: **BLOCKED / NOT A RELEASE**. Source baseline: `dev` at
`c3bae6af5ae5234cfe8cadd5e3de8f6909694890` (2026-10-28).
Execution priority: **L10N-20 completion first; Mode B — Testing is the subsequent formal campaign**. The source inventory below is non-gating preparation, not an early Mode B start. Published `v0.2.0` and `main`
must remain unchanged until all mandatory gates pass.

## Scope and evidence rules

This is the operational entry point for the already approved
[version roadmap](../VERSION_ROADMAP_TO_1_0.md), [Gate 2](../GATE_2_ACCEPTANCE.md),
[L10N-20](../localization/LOCALE_CONTEXT_AUDIT.md) and
[Mode B plan](MODE_B_PLAN.md). It does not change their acceptance criteria.
Feature milestones `v0.3–v0.8` need not have published versions; `v0.9`
is an internal quality gate, not an assumed published release.

A source test, green CI, successful installer build, and physical OS
acceptance are four distinct forms of evidence. A historical test report
is not evidence of the current SHA. Never mark a test, environment or
language Passed without a matching record; don't infer failures or successes
from issue titles. Do not place credentials, private paths, runner names,
account/billing identifiers or internal deployment configuration in this file.

## Ordered gates

| Gate | Required exit evidence | Current status |
| --- | --- | --- |
| G0 — release scope and build health | Dev revision recorded; Preflight for exact SHA is green | **Pending**: formatting-only correction submitted after previous failure; no green result recorded for this SHA |
| G1 — L10N-20 | 20 complete locale catalogs and **20/20 independent** contextual/a11y/platform audit receipts | **Blocked**: source catalogs exist; independent sign-off remains unproven |
| G2 — core platform behavior | Cold/warm startup, account/session failures, truthful scopes and counters, native notifications, autostart, error recovery, safe Git operations | **Pending physical and negative-path checks** (see Gate 2 issue and existing evidence) |
| G3 — OS/distribution behavior | Installed KDE and Windows: DPI, tray/popup, signed APT upgrade/rollback, NSIS credential lifecycle, persistence/restart/removal | **Partial**: owner accepted selected Windows UI paths; complete platform matrix not signed off |
| G4 — Mode B Stage 1–8 | Current exhaustive artifact inventory, executable branch map, Positive/N1–N12 matrix, interaction map, expected case counts and source-to-test coverage map | **In progress**: 2026-10-21 inventory and partial branch map were historical baselines |
| G5 — Mode B Stage 9–10 | All planned tests implemented against real subject logic; critical safety/security mutations detected | **Not accepted** |
| G6 — Mode B Stage 11–12 | Final STABLE suite on frozen SHA; separately tracked known-FLAKY suite if any; full final report with no unresolved critical cases | **Not accepted** |
| G7 — release admission | Approved v1 contract, synchronized `1.0.0` Cargo/Tauri/lockfile, reproducible source SHA, green protected checks, reviewed `dev` → `main` | **Not started** |
| G8 — publication | Immutable `v1.0.0` tag on `main`; Windows NSIS, Linux DEB/AppImage; protected signed APT/R2 publication; verified public readback, byte size and SHA-256 | **Not started** |

## Execution stages and rollback

1. **Preparatory source rescan (before Mode B):** classify all current production entrypoints,
   the four test stacks, native/platform conditions and release paths. Replace
   obsolete counts in a new inventory artifact; retain historical records.
2. **Risk maps (Mode B 4–8):** map every executable branch to a test requirement,
   populate all Positive/N1–N12 cells with Covered/Planned/N/A plus rationale,
   define real interaction pairs and expected case counts. No new Mode B tests
   before all these source maps are complete.
3. **Test implementation (Mode B 9–10):** risk-first Git data safety,
   credential persistence, bounded network/API, release immutability, state
   races and localization. Use deterministic contracts, not simulated success.
   Source/test code commits are isolated from documentation commits.
4. **Final gate (Mode B 11–12):** run the full stable gate once after the coherent
   implementation batch; investigate targeted failures, distinguish any
   registered known-flaky tests; record real counts, failures and mutations.
5. **Physical acceptance:** obtain native evidence for unsupported-to-automate
   platform paths. Reject release on missing essential safety/data-loss
   evidence; owner sign-off cannot be inferred from selected UI screenshots.
6. **Publication:** only after signed-off gates, bump version and lockfile,
   promote reviewed sources to `main`, tag it, and use the protected workflow.
   Verify public R2/APT assets and hashes before marking completion.

Every stage may be resumed from the last committed evidence; no waiting loop
or external CI polling. Rollback: pre-release documentation or tests can be
reverted in isolation; published immutable artifacts and tags are never
rewritten. **STOP** before R2 publish if any required gate remains open.

## Current execution ledger

- [x] Read `AGENTS.md`, owner Mode B SSOT and release contracts.
- [x] Established `dev`/public-`main` separation and mandatory gate order.
- [x] Preparatory current production/test file register captured (not exhaustive functions).
- [ ] Current exhaustive artifact/function inventory complete after L10N-20 freeze.
- [ ] Branch map and Positive/N1–N12 matrix complete.
- [ ] L10N-20 independent 20/20 acceptance.
- [ ] Native KDE/Windows failure-path acceptance.
- [ ] Mode B final report, exact-SHA stable CI and release admission.
- [ ] Protected v1.0.0 public publication and verified readback.
