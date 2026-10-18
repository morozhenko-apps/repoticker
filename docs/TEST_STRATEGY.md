# Test strategy

Follow rQuickShare's principle of distinguishing planned tests, configured CI, source-level verified runs and actual device acceptance. No artificial coverage percentage.

## Initial tests

- Pure Rust sync decisions: clean behind, current, local ahead, divergent, worktree dirty, unfinished operation, missing upstream.
- JavaScript presentation model: empty state, runner busy vs online, local behind total, strict Actions run links.
- CI: fmt, Clippy, tests, Tauri compilation check. Strict manual ten-pass tests.
- Real local integration tests now run installed Git against temporary bare remotes with clone, remote push, fetch, fast-forward, dirty/untracked, divergence, no upstream, bounded discovery and invalid paths. They do **not** prove remote GitHub authentication, hooks and adversarial Git config, long-running command cancellation, webhook delivery, or physical OS tray acceptance.

## Mandatory next negative cases

1. Git repo discovery: dotgit directory vs linked worktree dotgit file, corrupted worktree metadata, nested snapshots, symlink loops, submodules.
2. Git sync: dirty staged/untracked, merge/rebase/cherry-pick state, checkout moves between preflight and merge, missing upstream, divergent histories, multiple remotes, detached HEAD, malicious repo config hooks, native ff-only refusal.
3. GitHub: expired token, 401/403/404, 429, secondary rate limits, malformed responses, pagination, branch/attempt distinctions, forbidden runner/billing data.
4. Relay: invalid/missing HMAC, byte/encoding confusions, repeated delivery IDs, out-of-order events, disconnected client resume, throttling, cross-tenant messages.
5. Tray UX: left/right click, focus/hide, auto-dismiss, Wayland positioning, multi-monitor, DPI, locked screen, DND and accessibility.
6. Packaging: clean install, upgrade, uninstall, startup disabled/enabled and data retention behavior.

Every new feature requires negative tests at its own trust boundary. CI passing a unit suite is not a substitute for physical multi-OS acceptance.
