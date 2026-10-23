# RepoTicker P1 hardening — development checkpoint (v0.4 work bucket)

Status: **Mode A / planned source change**, 2026-10-23.
Development branch: `dev`. Current public, immutable release:
[`v0.2.0`](https://github.com/morozhenko-apps/repoticker/releases/tag/v0.2.0).
The `v0.4` label is a functional work bucket, **not** a request to
increase Cargo/Tauri version, release a package, or promote `main`.
Authority: [version roadmap](VERSION_ROADMAP_TO_1_0.md),
[Git safety contract](GIT_PROVIDER.md) and user AGENT SSOT.

## P1-G1 — pin the validated upstream commit during manual Safe pull

### Evidence and risk analysis

`crates/repoticker-core/src/git.rs::safe_pull` presently calls
`inspect`, reads HEAD, calls `inspect` again, checks the active
branch, `SyncDecision` and HEAD, then executes:
`git merge --ff-only --quiet @{upstream}`.

That **last argument is a moving ref expression**. The method does
not compare the resolved upstream target or upstream branch name across
the double inspection. A second Git client can move the remote-tracking
ref to another commit with the *same ahead/behind values*, or repoint
the branch upstream, without changing the existing checked conditions.
The final Git subprocess then resolves whichever commit `@{upstream}`
names at execution time. `--ff-only` prevents a merge commit, but
does not prove the target was the commit actually checked.

Plausible sources of unsafe/incorrect behavior to distinguish:
1. Concurrent fetch changes the selected upstream OID (primary).
2. Concurrent `branch --set-upstream-to` changes upstream identity
   without changing the ahead/behind decision (primary).
3. Another client changes HEAD/checked-out branch (partially guarded).
4. An external worktree edit changes cleanliness (partially guarded).
5. A concurrent rebase/cherry-pick introduces operation markers
   between individual status calls (partially guarded).
6. Git hook/config side effects or other subprocesses alter references
   or worktree after validation (separate P1 follow-up).
7. Git's ref/index locks reject or serialize competing writes
   (upstream exact-target consistency is still not guaranteed by
   the existing `--ff-only` flag).

**Chosen fix:** resolve the already-fetched upstream tip to a full
verified Git object ID, compare it along with branch, upstream name,
HEAD and eligibility on the second inspection, and pass that pinned
OID to `git merge --ff-only --quiet`. Git remains the authority for
worktree/index/ref lock conflicts; this is not a universal transaction
across third-party Git processes. Do not silently retry a changed
repository, fetch, reset, stash, rebase, force or run a shell.
Validate the OID as 40/64 ASCII hex before passing it as argv.

### Implementation stages and gates

1. [x] Keep public `safe_pull(repo)` and `OperationOutcome` unchanged.
   Introduce a private, testable operation with controlled checkpoints
   to simulate precisely timed external ref changes using real Git.
2. [x] Pin and revalidate upstream identity/OID and HEAD before the
   actual merge. Abort with existing actionable concurrent-change
   error when any invariant changes; use pinned OID for the merge.
   Do not modify `fetch`, the GitHub monitor, or Settings.
3. [x] Deterministic real-Git tests:
   - same behind-count but different upstream tip during recheck
     produces error and leaves HEAD/worktree untouched;
   - upstream reconfigured to a distinct tracking ref with equal
     behind-count produces error;
   - upstream moves **after** the final check: merge uses
     the original validated commit, not the new ref;
   - normal fast-forward and existing refusal cases continue
     to behave unchanged. No sleep, shell, or network.
4. [ ] Review source/diffs/format; run the final STABLE Preflight once
   on the complete code-and-test candidate, including core integration
   tests and desktop compile. Native physical testing for actual
   third-party concurrent process races remains deferred to
   [issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).
5. [ ] Record evidence, exact SHA, remaining risks and rollback in a
   separate docs-only commit. No new release, tags, `main` promotion
   or full v0.9 Mode B campaign.

### Rollback / compatibility

Revert the P1-G1 code-and-test commit. The change is internal to
`repoticker-core`: no persisted data/schema, public API, Settings,
GitHub App permissions or release signing changes. Under races the
correct behavior becomes a fail-closed error or an exact validated
fast-forward; existing clean, stable upstream branches keep the
same result. `git merge --ff-only` remains mandatory, so the
existing local Git safety contract is preserved.

Known limit: there is no cross-process global Git lock covering the
entire series of `inspect` calls. An external process may still
modify the checkout during the final native Git operation. This slice
does not claim to solve cancellation/timeouts, hooks or every
worktree/index conflict, all retained in the broader P1 roadmap.

## P1-G1 implementation checkpoint — 2026-10-23

- **Native/core source and deterministic real-Git regressions** committed
  on `dev` as [`00183c3`](https://github.com/morozhenko-apps/repoticker/commit/00183c3fd236d2a867728e1d69ef84856fbe8cfa).
  The code reads full verified 40/64-digit commit IDs and compares
  current HEAD, current upstream name, upstream commit ID and
  `SyncDecision` against the initial observation. The mutation
  uses `git merge --ff-only --quiet <validated full OID>`.
- Three deterministic race fixtures use **real local Git** and
  checkpoint callbacks without sleeps or network: equal behind-count
  ref move, equal behind-count upstream reconfiguration, and a ref
  move immediately before the merge subprocess. Stable normal-case
  integration tests remain in the core suite.
- First source [Preflight #40022648349](https://github.com/morozhenko-apps/repoticker/actions/runs/40022648349)
  reported **Rustfmt-only** differences and did not execute the core
  test step. The corresponding [`a80f045`](https://github.com/morozhenko-apps/repoticker/commit/a80f045d4d842147140074ce5cdb701feaf97df6)
  is a mechanical formatting correction taken from the CI diff.
- A separate local Git diagnostic reproduced two distinct upstream
  commits with unchanged `HEAD...@{upstream}` ahead/behind values
  `0 1` before/after a tracking-ref move; merging the pinned first
  OID advanced to the first commit, not the changed upstream target.
  This validates the underlying Git behavior, **not** the compiled
  RepoTicker Rust tests or physical desktop acceptance.
- **Final stable Preflight candidate:** `a80f045d4d842147140074ce5cdb701feaf97df6`;
  [workflow #40022758425](https://github.com/morozhenko-apps/repoticker/actions/runs/40022758425)
  was pending at this checkpoint. Do not claim it passed without
  inspecting the exact run's final jobs.
- **Still deferred:** native KDE/Windows process-race smoke, hostile
  hooks/config, long-running SSH/Git cancellation, atomic config,
  and cross-process operation contention. No release, tag or `main`
  promotion. This stage's physical verification remains in #15.
