# Test strategy and acceptance evidence

Tests must protect local Git data, fail closed on unsafe operations, and never fabricate CI/runners state. Distinguish **source tests**, **packaging jobs**, **local OS smoke** and **public release acceptance**. No artificial coverage percentage is claimed.

## Implemented tests

- Rust pure sync classifier: clean/behind, up-to-date, local ahead, diverged, dirty/untracked, unfinished operation, missing upstream, and bounded concurrency.
- Rust Git integration fixtures with temporary local/bare remotes: shallow discovery, direct enrollment, branch states, fetch-only preservation, safe fast-forward, dirty/untracked refusal, divergence and missing upstream.
- JavaScript presentation/unit checks: compact/drawer/settings invariants, runner unknown/online/busy modeling, safe Actions links, real progress and failure presentation, native icon/About data, popup position and idle behavior.
- Node tests for the **distribution** Worker: strict allowed paths, GET/HEAD vs POST, package-index cache rules and by-hash assets.
- Python release-contract tests: version/tag consistency, canonical artifact names/digests, signed APT fixture and gpgv verification, subkey-only signing authority and R2 artifact allowlisting.

**v0.1.0 evidence:** source Preflight on `dev` and `main` passed for commit `21f3b61d9774b931b57a4e3c83f61b2bcf2bb0ee`; local Python release suite passed 8/8 after installing APT packaging tools. Local user smoke covered DEB install/remove, AppImage launch and persistent settings. The Windows and signed public-APT release jobs require distinct evidence. See [CI.md](CI.md).

## Stable, flaky and OS gates

- Ordinary Preflight is the fast source-code gate. A manual `strict.yml` workflow exists for ten repeated core/UI passes; repetition is not evidence of no flaky tests.
- The project does not currently declare an independent known-flaky suite in CI. Any flaky tests added later must remain traceable and separate from required stable checks; failures must not be suppressed.
- Real OS acceptance is **not** established by compiler success, JS model tests or mock UI tests. Verify actual tray interaction, drag behavior, focus, DPI, multi-monitor, autostart, uninstall and process teardown.

## Required next negative and contract cases

1. **Git discovery:** linked worktree admin files, corrupted `.git`, snapshots, symlink loops/escapes, submodules, deep unexpected directories.
2. **Git sync:** staged/unstaged/untracked combinations, unfinished merge/rebase/cherry-pick markers, concurrent ref/head movement, detached head, hook/credential-helper abuse, multiple remotes, timeout/cancellation.
3. **GitHub REST (after implementation):** 401/403/404/429, secondary rate limits, pagination, stale/reconnect, forbidden runner/billing data, malformed payloads, auth/keyring failure.
4. **Relay (after implementation):** invalid/missing HMAC, byte-equivalence cases, replay, out-of-order event IDs, expired cursor, tenant isolation and disconnect recovery.
5. **UI:** native tray left/right click, focus, idle-hide in compact vs drawer, smooth Wayland dragging ([Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2)), multi-monitor, DND and accessibility.
6. **Distribution:** independently verify Linux APT enrollment/signature/readback, index refresh/rollback, clean install/upgrade/removal; Windows installer and unsigned SmartScreen behavior.

Run stable tests at the final validation gate for a change, and known flaky tests separately if such a suite exists. Re-run only relevant failing diagnostics, not the entire suite after each edit. Any asserted test success requires an actual run ID or local exit status.
