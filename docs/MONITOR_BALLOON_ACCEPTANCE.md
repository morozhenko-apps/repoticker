# Monitor balloon semantics and visibility acceptance

> Superseded by [SPLIT_HOVER_BILLING.md](SPLIT_HOVER_BILLING.md) after updated user requirements on 2026-10-21. This file records the earlier PR #5 design and should not be used for current UI acceptance.

Status: planned correction after KDE feedback on 2026-10-21. Target branch: `fix/monitor-balloon-visibility`, based on `dev`. The published v0.1.0 and `main` are not changed.

## Repro evidence and root cause

- Real GitHub-hosted CI job appeared as Running 1 / Queued 0 while the compact card showed Runners 2. In current code Runners = online organization *self-hosted* registrations (busy + idle); GitHub-hosted ephemeral machines are not included. The title does not explain that.
- When connected, `buildQuotaDetails` adds runner counts, running and queued splits, up to 10 runner names, up to 8 job links, a limits note and timestamp. This is not bounded by display height.
- The standalone usage overlay is 340px wide, with native/tauri maximum height 320px and `overflow-y:auto`; GTK explicitly makes the surface pointer-pass-through and icon mouseleave closes it immediately. Consequently content below the fold, including queue details, cannot be scrolled or accessed by pointer.
- The current tooltip status `Available` is derived from REST inventory/job coverage, **not billing/hosted capacity**. In particular, a private repository can have exhausted GitHub-hosted minutes while job/runners endpoints are accessible. GitHub billing is not collected and cannot be assumed from Actions jobs. Without separate authorized billing data, remaining minutes/concurrency must be **Unknown**.

## Scope and plan (MODE A)

1. Keep the existing compact 390x122 card, three indicator positions/order, 340px separate native tooltip, pass-through/hover-only lifetime and bounded 118..320px native resize. No new OAuth permissions or native transport changes.
2. Change the tooltip to a deliberately bounded, two-column read-only summary: self-hosted online/busy/idle/offline, running and queued lanes, unknown hosted-minute/concurrency limits and last collection time. Running/Queued must be visible without scrolling. At most two runner names are included when space allows. Long job-link lists are removed from this *noninteractive* tooltip; their links were never actionable with pass-through enabled.
3. Change `Available` to `Monitoring counts collected` (or a partial-data label), explicitly distinguishing job-count coverage from billing usage. Explain the primary Runners indicator through a title that says online self-hosted (busy + idle); never fold GitHub-hosted jobs into this number.
4. Add/adjust deterministic view-model, DOM controller and source/layout regressions, including many runners/jobs, partial coverage and exhausted-minutes/unknown-quota semantics.
5. Validate once at the final gate: Node stable tests, Rust checks and Linux desktop compile via the existing Preflight CI. Physical KDE Wayland hover/popup acceptance remains separate. Do not claim GitHub billing verification or ship until that acceptance succeeds.

## Non-goals / invariants

- No claim to detect exhausted private-repo GitHub-hosted billing minutes without an authorized usage source; this would require a separate, explicitly approved GitHub permissions/product contract decision.
- No click/pin/scroll interaction added to the hover-only balloon; no changes to read-only GitHub runner/job API, polling cadence or keyring.
- Do not erase partial/unknown values by displaying 0. No change to GitHub-hosted runner provenance or counts of self-hosted registrations.
- Documentation and code remain separate commits. Release tags and `main` remain unchanged.

## Acceptance checklist

- [ ] `Runners 2` is explained as online self-hosted; Busy 0 / Idle 2 is distinguishable from job Running 1.
- [ ] Queue section remains visible even with 10 registered runners and 8+ jobs in the snapshot.
- [ ] No unusable scrolling or dead job links in pointer-pass-through balloon; full data are still available through the existing provider/model for future interactive surfaces.
- [ ] The word `Available` does not imply hosted minutes; explicit Unknown billing/concurrency where permission is not granted.
- [ ] Normal/stale/partial/unknown and disconnected snapshots do not overflow under baseline font and native 340x320 bound (physical KDE acceptance required).
- [ ] Final CI evidence logged; no merge/tag until user acceptance.

Rollback: revert the isolated implementation commit on the feature branch; no persistent data or API migration.
