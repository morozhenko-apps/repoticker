# RepoTicker product contract

Status: design baseline, 2026-10-18. Intended product and UI behavior; not a claim that integrations already work.

## Audience and identity

A small, fully open-source desktop companion for developers running multiple local Git repositories and GitHub Actions. Product name RepoTicker; executable repoticker; relay repoticker-relay. No paid/free tiers, no mandatory central service, no proprietary functionality. All platforms share the same product identity, while actual platform support is evidence-based.

## Card and tray interaction

- Left-click tray icon toggles a small card. Right-click gives quick actions (Open/Hide, later Fetch all, Safe sync all, Settings, Quit).
- Card follows the density and disclosure pattern of rQuickShare: 32–36px repository rows, one line each, expandable repository and runner sections.
- Each repository row: name, active branch, behind/ahead or dirty state, compact CI status; contextual operations when implemented.
- Bottom footer shows aggregate local behind count, running and failed jobs, runner state; quota is a popover rather than a permanent row.
- Runner section: online/offline and busy/idle. CPU/RAM requires a separate optional host telemetry component. Never interpret runner busy as actual CPU utilization.
- Clicking a CI run opens the exact GitHub Actions URL in the system browser. No logs/step view in RepoTicker.
- No invented metrics. Unknown, unavailable, stale and insufficient-permissions states are explicit.

## Git behavior

Local-first. Fetch updates remote references; optional safe sync updates only eligible checked-out upstream-tracking branches using native Git ff-only. No automatic stash, rebase, merge commits, reset, force push or deletion. A webhook is merely a hint to inspect, not an instruction to mutate the checkout.

Only explicitly enrolled repositories are synchronized. Discovery must skip nested snapshot copies, linked worktree administrative entries, submodules and invalid repositories unless opted in. Honor explicit ignore paths and Git working tree ownership. Other user filesystem content is never scanned without consent.

## CI, runners and quotas

GitHub is the first provider; architecture allows others later. Surface workflow_run, workflow_job, push changes via REST polling and optionally webhook relay; reconcile against authoritative API snapshots.

Runner name, status and busy from GitHub when permitted; GitHub-hosted runner global pool capacity is not available. Quotas are permission-dependent and must distinguish real billing usage from estimated free allocation; self-hosted activity is not a billed GitHub-hosted minutes gauge.

## Preferences

Polling interval, sync automation enable/disable, repository roots/enrollment and ignore rules, CI filtering, OS notifications, connection mode (Simple or Hybrid), relay URL, authorization and UI density should all be configurable. Hybrid is opt-in, never an installation prerequisite.
