# Local Git Provider (manual prototype)

Implemented in `crates/repoticker-core/src/git.rs` and exposed by Tauri IPC in `apps/desktop/src-tauri/src/main.rs`. The user must explicitly enroll a root folder in RepoTicker Settings before it scans the disk. No global Git database is assumed: Git knows the status of a specific repository, but it does not offer a universal list of every checkout on disk.

## Enrollment and discovery

Enter an **absolute path** or `~/...` into the tray card Settings. The app persists a list of canonical roots in the OS application configuration directory. Removing a root changes RepoTicker's settings only; no user file or repository is deleted.

Each root is inspected as an explicit repository first. If it is not one, RepoTicker checks its **immediate child folders**, not an entire recursive tree. A discovered child must have a real `.git` directory and pass a `git rev-parse --show-toplevel` equality check. It ignores symlinks, hidden directories, `.worktrees` containers and known build/snapshot folders. Invalid or broken worktrees do not abort scanning of the other repositories. A valid linked worktree with a `.git` file may be enrolled **explicitly** as its own root.

This intentionally does not discover arbitrarily nested projects or clones located under `.local`. Add deeper roots explicitly if needed. Name collisions are allowed; the unique identifier is the canonical path.

## Data displayed

From installed Git: active branch (or detached state), upstream, ahead/behind counts, tracked/untracked status, and unfinished merge/cherry-pick/rebase/sequencer indicators. The card summary counts commits behind across registered checked-out branches. The displayed behind counts are relative to the **last fetched remote refs** and may be stale until Fetch or Safe pull is run.

GitHub Actions run status, runner availability and quotas are **not yet connected**. They remain unavailable in the UI, not zero.

## Operations

**Fetch** runs `git fetch --all --prune --quiet` for selected enrolled checkouts. It updates remote tracking refs only; working files and local branch refs stay put. A repo failure is recorded without preventing other enrolled repositories from being processed.

**Safe pull** fetches, reads local state, and invokes `git merge --ff-only --quiet @{upstream}` only when an active upstream-tracking branch is clean, not ahead/divergent and not in an unfinished operation. It does not stash, rebase, create merge commits, force-update branches or reset. Dirty, detached, ahead-only, diverged or no-upstream repositories are skipped.

All actions are currently **manual**, accessible from the card toolbar, each repo `…` menu or the tray menu. There is no background synchronization schedule, watchdog, webhook-triggered pull or auto pull at application launch.

## Risks / limitations before a stable release

- Git operations can use already-configured SSH/HTTPS credentials and local Git hooks. RepoTicker never runs a shell command constructed from repository metadata, but installed Git itself can invoke existing configured helpers/hooks.
- `GIT_TERMINAL_PROMPT=0` avoids Git terminal password prompts. There is no process timeout, cancellation or comprehensive SSH prompt policy yet; fetch can wait on slow remotes.
- A local agent or another Git client can modify the checkout concurrently. RepoTicker serializes its own operations and rechecks conditions immediately before fast-forward, but this does not constitute an OS-wide Git lock. Git remains the final authority over merge safety.
- Automatic discovery skips linked worktrees; explicitly enrolled valid worktrees are supported by `git --git-path` checks but need additional physical tests on each OS.
- The current on-disk config uses simple JSON writes; a crash-safe atomic configuration replacement and migration tests are future hardening tasks.
- The Tauri Linux tray click callback is unsupported. Use the right-click menu's **Open card** action until a platform-native tray adapter is implemented.
- Native Git/SSL configuration and LFS behavior vary by operating system. Cross-platform packaging and authentication must be verified before claiming release support.

## Tests

`cargo test -p repoticker-core` covers policy decisions and real Git process flows. The integration fixtures create an isolated bare remote and two local checkouts, then test remote updates, fetch-only HEAD preservation, fast-forward, untracked/dirty refusal, divergence, upstream absence, shallow discovery and explicit repository enrollment.

Additional tests are mandatory for staged tracked modifications, rebase/cherry-pick markers, concurrent head movements, symlink escapes, hooks/credential helpers, multiple remotes, timeout/cancel, and Windows/macOS path handling.

No repository deletion, reset, rebase, checkout switch or force operation is offered.
