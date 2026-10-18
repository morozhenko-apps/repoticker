# RepoTicker product contract

Status: design baseline, 2026-10-18. Intended product and UI behavior; not a claim that integrations already work.

## Audience and identity

A small, fully open-source desktop companion for developers running multiple local Git repositories and GitHub Actions. Product name RepoTicker; executable repoticker; relay repoticker-relay. No paid/free tiers, no mandatory central service, no proprietary functionality. All platforms share the same product identity, while actual platform support is evidence-based.

## Card and tray interaction

- **Implemented Linux path (unverified on physical KDE):** custom StatusNotifierItem uses primary-click activation to toggle the card and secondary menu for Open, Settings, Fetch all, Safe pull all and Quit. On Windows/macOS, Tauri tray remains. Generic Tauri window placement may be blocked by the Wayland compositor; a native Layer Shell anchor is a separate acceptance/fallback item.
- Default compact card follows rQuickShare's closed/open drawer pattern: **four action buttons (Fetch, Safe pull, Repos, Hide)** and a tiny status strip (runners online, CI running, CI queued); no duplicate application header or counters for repository count/behind/modified. The Repos action opens a scrollable list, with no second accordion. Settings are opened from the tray context menu. Each time the tray card is reopened, it is compact. Resizing attempts to hold the prior physical bottom edge fixed; generic Tauri window positioning can be refused on KDE Wayland and requires physical acceptance or a future native Layer Shell surface.
- Each repository row now shows local name, active branch and behind/ahead/dirty status, with an `…` menu for Fetch or Safe pull. CI indicators are deferred until a working GitHub client exists.
- The Safe pull action shows eligible behind commits and is disabled if none are safe for ff-only after Fetch. Successful Fetch/Pull is silent: no permanent status line or per-repository success logs. Individual failures appear as a small dismissible/nonpersistent notice. Only runner/CI running/queued counts occupy the strip above the buttons; unavailable values display an em dash. Quota details are a hover/focus tooltip.
- A future runner-specific view may show online/offline and busy/idle. CPU/RAM requires an optional host telemetry component. Never interpret runner busy as actual CPU utilization.
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
