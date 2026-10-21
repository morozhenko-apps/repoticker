# RepoTicker product contract and v0.1.0 state

> **Release boundary (2026-10-21):** `v0.1.0` is the immutable
> published local-Git-only baseline. On `dev`, native GitHub App
> Device Flow/KWallet, authorized Actions runs and jobs, organization
> runner occupancy, three distinct hover views (Runners, Tasks, Billing),
> and transactional Settings confirmation have been implemented and
> physically accepted for the normal KDE workflow. The text below
> describing GitHub integration as "planned" describes the published
> **v0.1.0** experience, not the latest `dev` source.
>
> Next release candidate: **v0.2.0**, with no current tag/main promotion.
> Full gates and outstanding validation: [v0.2.0 readiness](RELEASE_0_2_0.md).


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

## Current dev monitoring status and split hover UI (2026-10-21)

The published v0.1.0 still has its original baseline. The merged dev implementation includes GitHub App Device Flow with native KWallet-backed credentials, read-only Actions runs/jobs and organization self-hosted runner collection. Authorized monitoring and local Git are independent; partial or missing API coverage yields an unknown counter instead of a fabricated zero.

The compact status strip now displays just two grouped indicators:
- **Runners total / online / offline**, neutral / green / red, based solely on organization self-hosted runner registrations. The Runners hover title is `Runners · Total` and its only metric rows are Online, Busy, Idle and Offline, followed by last-checked time.
- **Tasks running / queued**, green / amber, based on jobs in selected repositories. The Tasks hover shows the Running/Queued total title, running-job counts for individual self-hosted runners, the GitHub-hosted running-job count at the end, and last-checked time. Queued jobs are not assigned to a runner. The former standalone Queued field is removed.

The ⓘ hover exclusively reports organization and personal-account GitHub-hosted billing allowances, usage and remaining free minutes. The current dev implementation fetches projected Actions billing usage and, when authorized, detects recognized personal and organization plans using the existing GitHub App. It reports only defensible plan allowances and gross SKU minutes, never fabricates consumed free minutes or remaining quota, and never sends tokens to the WebView.

All three hover targets share one independent pointer-pass-through native Layer Shell popup, with validated native view kind, no click/pin/scroll interaction, a content-dependent 118–320px height, and bounded runner rows. The main card remains 390x122. Normal KDE hover layout and authentication confirmation have been accepted; Linux package upgrade, Windows runtime and denied/expired/429 reliability validation are still pending. See [split hover security/acceptance contract](SPLIT_HOVER_BILLING.md).
