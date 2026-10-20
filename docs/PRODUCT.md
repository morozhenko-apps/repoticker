# RepoTicker product contract and v0.1.0 state

RepoTicker is a small, Apache-2.0-licensed, local-first desktop Git companion. The GitHub CI monitoring and optional webhook relay described below are product goals, **not** features available in `v0.1.0`. No proprietary backend or paid tier is required.

## Implemented desktop experience

- A tray menu provides Open card, Settings, Fetch all, Safe pull all, About and Quit. Linux uses a native StatusNotifierItem (`ksni`) for tray activation/menu; non-Linux builds retain Tauri platform tray support pending real runtime acceptance.
- The compact card has four bottom actions: **Fetch, Safe pull, Repos, Hide**. Its narrow status strip reserves runner/CI running/queued fields, which remain **unknown/unavailable** until a GitHub provider exists. Do not show fabricated zeroes or fake activity.
- **Repos** opens a scrollable repository drawer and returns to compact on reopening. Each row shows repository name, active branch, local upstream-relative state and an individual action menu. Completed successful operations are silent; errors are visible without permanent success logs.
- Fetch has bounded four-repository concurrency and completion-based overall progress. Each repository has an indeterminate in-flight overlay; this is **not** byte-level Git network progress. Safe pull processes eligible repos sequentially and does not fetch.
- Settings is an independent window with transactional Apply/Cancel for enrolled roots and a stored `en`/`ru` language preference. The preference does not yet localize the interface. About presents package version, author and project site.

## Linux card behavior

On supported KDE Wayland environments, GTK Layer Shell owns a bottom/right compositor anchor above the panel. The card grows upward from its bottom edge, has transparent rounded corners, does not occupy the taskbar, and persists its anchor across reopen. The compact card hides after 15 seconds of inactivity; the expanded repository drawer does not idle-hide. Explicit Hide or the tray toggle remains available.

The card can be dragged in empty body space, but **movement jitters on KDE Wayland**: [Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2). Smooth dragging and multi-monitor/high-DPI/screen-bound acceptance are outstanding. Unsupported compositors use a frameless Tauri fallback with platform-dependent positioning. Linux local smoke is not evidence of Windows/macOS UI correctness.

## Implemented local Git contract

- Only user-enrolled roots are scanned; a root repository or valid direct-child repositories are considered. Hidden/snapshot/build containers and symlink traversal are excluded by default. An explicitly enrolled valid linked worktree can be accepted. No global Git database or unbounded recursive file scan.
- Status comes from installed Git: current branch or detached HEAD, upstream, ahead/behind relative to last-fetched refs, tracked/untracked dirtiness and unfinished operations.
- Manual Fetch updates remote-tracking references, not the checked-out branch or files. Failing repositories do not abort independent repositories.
- Manual Safe pull uses **the existing fetched refs**, re-inspects eligibility, and executes only `git merge --ff-only` on clean checked-out upstream-tracking branches that are behind and not ahead/diverged. It never stashes, rebases, resets, creates a merge commit, deletes a checkout or force-updates.
- Other tools may alter a checkout concurrently; Git remains the final authority. No scheduled background Git mutation exists in v0.1.0.

## Planned GitHub integration

The first planned connection mode is **Simple REST polling**, with least-privilege authorization, OS-managed secrets, per-resource cache, API rate-limit awareness, stale/offline handling, workflow run/job state, runner occupancy and permission-aware quota presentation. GitHub-hosted runner pool capacity is not directly observable; self-hosted runner busy is not a measure of CPU/RAM load.

Later, an optional **Hybrid** mode may accept verified GitHub webhook hints through a user-hosted relay, then reconcile via the authoritative REST API. An event cannot directly command a pull or execute untrusted shell content. The relay is neither part of v0.1.0 nor required for local Git use.

## Planned preferences and platform support

Future settings include GitHub credentials/filters, polling intervals, notifications, configured path ignores, optional automated sync and relay URL. Such controls are not active until the respective features exist.

Distribution targets are Linux amd64 DEB/AppImage and unsigned Windows x64 NSIS for the tagged v0.1.0 candidate. A configured packaging workflow is not proof of a published release or Windows OS acceptance. macOS remains disabled pending Apple signing/notarization. See [release gates](RELEASE.md) and [roadmap](ROADMAP.md).

## Runner and Actions detail popup (dev, not yet connected to GitHub)

The existing compact status strip retains its **three indicators in the
same order and at their original size and location**: Runners, Running,
Queued. The existing GitHub usage `ⓘ` tooltip now supports a detailed
readout containing self-hosted runner availability (busy/idle/offline),
Running/Queued totals split into self-hosted/GitHub-hosted/unclassified
jobs, runner names and bounded direct links to validated Actions jobs.
The tooltip still reserves usage/billing limits as *unavailable* until
a separately authorized source is implemented; job counts must not be
presented as billing or hosted-concurrency quotas.

A 122px compact Wayland card clips a regular browser overflow tooltip.
On opening the existing `ⓘ` popup, the application temporarily requests
the established bottom-anchored native 510px card height and returns to
122px on closing. The indicators stay bottom-anchored and are not
repositioned relative to the screen. An already expanded repository drawer
needs no extra native resize. CSS/keyboard/pointer behavior remains subject
to KDE physical acceptance alongside drag Issue #2.

**Important:** this release stage contains the tested **presentation and
aggregation contract**, not GitHub account authorization. Until native
GitHub REST transport/secret storage are integrated, `get_snapshot`
continues to report unconnected counters as `—` and the popup explicitly
shows `Not connected`. No sample values are inserted into production
state. The published v0.1.0 package remains unchanged.
