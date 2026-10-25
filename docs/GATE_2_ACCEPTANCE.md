# RepoTicker — Gate 2/6: finite functional acceptance

**Checkpoint:** 2026-10-25. **Branch:** `dev`. **Status:** SOURCE READY / OS ACCEPTANCE PENDING.
**Scope:** Exactly five checks from
[approved v1.0 delivery cap](VERSION_ROADMAP_TO_1_0.md#gate-2-fixed-acceptance-set--not-a-new-development-backlog).
This is not another feature design, a new mandatory test phase,
or authorization to work on speculative bugs.

## Latest executable/source evidence

- Exact patch SHA: `301145ef54da141caff46e889acaffde0234be0a`.
- [Preflight #40197325988](https://github.com/morozhenko-apps/repoticker/actions/runs/40197325988):
  **4/4 SUCCESS**: Rustfmt/Clippy, 91 Rust unit/integration/origin,
  236 Node, 14 Python release contracts, Linux desktop compile.
- App Git core is **FROZEN** after this checkpoint. Later docs-only
  commits do not change the executable or validate KDE/Windows behavior.
- No native KDE/Windows authenticated session, local keyring state,
  physical CI notification or new cold/warm timing measurement is
  accessible from repository source and CI logs alone. These are
  deliberately not marked accepted.

## Acceptance ledger — five and only five checks

| # | Contract | Source/CI evidence reviewed | Remaining runtime decision | Status |
| --- | --- | --- | --- | --- |
| 1 | Startup correctness, no false disconnected or scan storm | `github-monitor.mjs` separates `get_monitor_selection` from full local scan, `app.mjs` uses `scan-refresh.mjs` single-flight, opt-in native `startup_diagnostics.rs` has fixed nonsecret milestones; `tests/github-monitor.test.mjs` and scan-refresh regressions passed | One cold and one warm KDE start with same enrolled roots; actual time-to-local/monitor, Git scan counts, visible auth state; compare historical trace without a synthetic SLA | **Pending runtime** |
| 2 | Native GitHub auth and secrets, offline/revocation/denial recovery | `github_session.rs` confines tokens to native code and serialized wallet, `github-monitor.mjs` invalidates stale state and handles permission/rate limits; `tests/github-monitor.test.mjs`, GitHub native/core and source regressions included in green gate | Physical Device Flow + wallet/restart/disconnect, meaningful 401/403/404/429/offline/locked-wallet scenarios; confirm zero token disclosure | **Pending runtime** |
| 3 | Scope and counters are accurate, unknown != zero | `github-monitor.mjs` uses authorized installations/repositories and separate runner/job projection, `tests/settings-github-confirm.test.mjs` verifies draft vs OK/Cancel and account switch; `tests/github-monitor.test.mjs` verifies truncation, selected repo beyond first page, unknown coverage and scope races | Actual logged-in All/Selected/account-switch with pagination, runner/job/billing view, one unavailable repository and restart | **Pending runtime** |
| 4 | Exactly one real opt-in CI failure notification, never historical replay | `ci-failure-events.mjs` silently baselines observed runs, `ci_notifications.rs` checks persisted opt-in + account/repo + system permission and bounds dedup; `tests/ci-failure-events.test.mjs` and `tests/ci-native-integration.test.mjs` verify disabled, new failure, duplicates, stale permissions and recovery | With explicit consent, use a disposable authorized CI workflow to produce one new failure **after** enabling monitoring; verify KDE/Windows desktop notification once, not historical, then disable. Never sabotage a production workflow or fabricate a failure event | **Pending real delivery** |
| 5 | Native autostart for Linux and Windows, OFF by default | Owner confirmed 2026-10-25: required for v1.0. **Source implementation in `dev`** uses Tauri autostart 2.7.0, Single Instance 2.5.4, native IPC and Settings OK/Cancel draft semantics; [AUTOSTART1 evidence](DEVELOPMENT_0_5_0.md#autostart1-implementation-checkpoint-2026-10-25). Exact executable/lockfile SHA `faddbebb7e24633245f2b7b7321f459bfea4aa9d` passed [Preflight #40223171041](https://github.com/morozhenko-apps/repoticker/actions/runs/40223171041) **4/4 SUCCESS**; workflow-only follow-up `40aff5ec3a68e3053bf881bae9dafc2030250b3e` passed [Preflight #40227612584](https://github.com/morozhenko-apps/repoticker/actions/runs/40227612584) **4/4 SUCCESS**. Preflight includes Linux desktop compilation but not physical login or desktop Rust unit-test execution | Test enabling/disabling, login/relogin, exactly one tray app, no Git auto-sync, persistence, signed package upgrade/removal and no stale OS startup entries on physical KDE and Windows | **Source and Preflight passed; physical OS acceptance pending** |

**Source conclusion:** existing source+targeted negative/contract suites
provide substantive evidence for all four implemented flows. No new
application bug was established by this review. **None of the five
runtime/product checks is marked accepted** solely from automated tests.
The owner's autostart inclusion decision is recorded, but is not
proof of implementation or OS acceptance.

**CI checkpoint, 2026-10-25:** Both exact-source Preflight runs above are complete and green. Source-level checks close the pending build/compile subtask for row 5, but **do not** change its `Pending runtime` acceptance status. The unpublished [desktop acceptance candidate run #40227612556](https://github.com/morozhenko-apps/repoticker/actions/runs/40227612556) builds Linux/Windows installers independently; its artifacts must be checked only after both relevant build/upload jobs actually succeed. No OS or installer lifecycle acceptance is inferred from Preflight.

## One batched physical acceptance, no per-commit user interruptions

Reuse the **same** final owner KDE/Windows session and screenshots/logs
for [Gate 3](VERSION_ROADMAP_TO_1_0.md) platform acceptance and
[issue #15](https://github.com/morozhenko-apps/repoticker/issues/15).
Do not ask the owner to install each intermediate development commit.

- On KDE, check one **cold** and one **warm** session while
  `REPOTICKER_STARTUP_DEBUG=1`. Record only allowlisted
  stage/duration log fields, total local-snapshot spans,
  first verified GitHub counters and whether card is responsive.
  Never record raw GitHub access tokens, URLs with credentials,
  private repository names or unredacted keyring data.
- Within that accepted installed candidate, exercise actual
  account/device authorization, Settings selected-org/scope
  OK and Cancel, disconnect/restart/recover, runner/job
  accuracy and truthful offline states; no unsafe Git mutations.
- For alerts, explicitly authorize an expendable test repository
  / workflow before creating a new CI failure. Start from a
  silent baseline and observe a real **new** failure transition.
  Check exactly one native OS notification; repeat the
  observation to verify dedup; opt out and verify silence.
  The historic on-screen **Test notification** button was
  intentionally removed and is not used as proof.
- Reuse Windows checks from the established issue #13 physical
  smoke; no Windows passed claim based on Linux compile.
- Attach an acceptance receipt to this file or issue #15:
  `OS | distribution/version | installer SHA256 | exact Git SHA |
  time | scenario | observed result | PASS/FAIL/DEFER reason |
  link to redacted evidence`.
  Limit the total to the five rows above; do not add
  subjective UI polish as a sixth entry.

## Stop policy

Gate 2 closes only when all five rows have explicit evidence.
The autostart inclusion decision alone does not close check 5.
Failing a mandatory check permits a **targeted defect fix**,
not another generalized Git hardening campaign. Noncritical
UI polish and speculative performance changes go to
post-v1.0 backlog. Optional unattended Git sync, Hybrid/Webhook
relay and unsupported macOS stay out of v1.0.

Gate 1 passed; Gate 2 is **not accepted** without actual
runtime evidence or owner-approved scope decisions.
Do not prematurely start full Mode B or publish v1.0.

## Gate 2/3 autostart candidate build and OS test procedure (2026-10-25)

**Final build candidate source:** `40aff5ec3a68e3053bf881bae9dafc2030250b3e`.
[Non-publishing Linux+Windows candidate run #40227612556](https://github.com/morozhenko-apps/repoticker/actions/runs/40227612556)
builds **DEB, AppImage and unsigned Windows NSIS**
using the same source checkout, but never tags, signs,
publishes APT, deploys R2 or creates a GitHub Release.
It is independent from the published stable v0.2.0.

**CI build status must be verified at download time.**
A queued/in-progress build is **not an artifact**; do not
claim an installer exists or cite a download until
its corresponding job and upload succeed. Upon successful
build, use the GitHub Actions page's Artifacts section:
`repoticker-acceptance-linux` /
`repoticker-acceptance-windows` (7-day retention).
Each extracted archive contains `SOURCE_SHA.txt`,
`NOT_A_RELEASE.txt`, package hash sidecars and packages.
Confirm that `SOURCE_SHA.txt` matches the exact
above commit, and validate SHA256 before executing.
Windows NSIS is **unsigned**; this is a private QA
candidate, not a publicly trusted release.

**Important version constraint:** the development
candidate still declares `0.2.0`, identical to the
published release metadata. Do not interpret an equal
APT version as an upgrade and do not overwrite a
production install just for testing. Prefer the Linux
AppImage for initial login behavior on a designated
test session. Test DEB reinstall/uninstall and Windows
NSIS lifecycle separately on an explicitly approved
test installation. Back up any test-environment config
and ensure the known running stable app is quit first.

### KDE/Linux (one bounded session)

1. Download and extract the successful Linux artifact.
   From its extracted directory run
   `sha256sum -c -- *.sha256`; verify
   `SOURCE_SHA.txt` equals the CI run commit.
   Make the AppImage executable and launch it only
   after any existing RepoTicker process has quit.
2. Open Settings: confirm **Launch at login** is
   unchecked by default. Check it but press **Cancel**:
   no startup entry must be created. Reopen Settings,
   check it and press **OK**: exactly one XDG
   autostart entry must exist for this executable.
3. Run
   `bash scripts/accept_autostart_linux.sh`
   before/after enabling. It reports only counts,
   desktop type and entry basenames, not credentials
   or private paths. Do not use output counts in
   isolation as proof of GUI behavior.
4. Log out and back into the **test session** (not
   an active work session). The tray should start
   once with card windows hidden. Manually launch
   the same candidate again: there must still be
   one RepoTicker tray/process, with no new Fetch
   or Safe sync and no forced focus theft.
5. Uncheck **Launch at login** and press OK; confirm
   the XDG entry disappears. Recheck enabling and
   complete the **separate Gate 3** DEB removal/
   upgrade lifecycle on a sacrificial test install.
   A retained user XDG entry after removal is FAIL,
   not automatically excused by working runtime toggle.

### Windows (one bounded session)

1. On a separate test PC/user profile, validate
   `SOURCE_SHA.txt` and the NSIS EXE .sha256.
   Installation is intentionally unsigned; do not
   represent it as verified signed software.
   Avoid replacing a live stable 0.2.0 installation.
2. Confirm initial checkbox OFF; draft + Cancel
   leaves Run registry unchanged. Enable + OK
   should create exactly one user login entry.
   Inspect using
   `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/accept_autostart_windows.ps1`
   or review the current user's Startup Apps in
   Windows Settings. The script is read-only.
3. Sign out and in to the **test user**, check one
   tray instance with windows initially hidden,
   launch the candidate a second time and verify
   it exits without creating another instance or
   performing Git mutations. Disable + OK should
   remove its Run entry.
4. On the test install, verify an enabled entry
   is handled correctly on upgrade and uninstall,
   including absence of stale startup pointers.
   Capture observed result, not an inferred pass
   from successful Linux CI compilation.

Use the single five-row Gate 2 ledger above; append
observed `PASS/FAIL/DEFER` and redacted proof for
this autostart row only. A verified failure is a
targeted implementation/packaging defect; do not
add a seventh product milestone or re-open frozen
Git core. User installation/logout/uninstall actions
are explicitly manual; GitHub CI cannot exercise
the user's running KDE/Windows desktop.

### Candidate rebuild provenance (2026-10-25)

The first unpublished builder run [#40227242651](https://github.com/morozhenko-apps/repoticker/actions/runs/40227242651) was superseded before acceptance because its read-only Windows SHA256 verification command incorrectly escaped the whitespace separator. Workflow-only commit `40aff5ec3a68e3053bf881bae9dafc2030250b3e` fixes the PowerShell parser, and supersedes the older candidate with [run #40227612556](https://github.com/morozhenko-apps/repoticker/actions/runs/40227612556). The resulting `SOURCE_SHA.txt` must equal **40aff5ec3a68e3053bf881bae9dafc2030250b3e**. Workflow-only change; no executable functionality changed. The old run and its packages, if any, are **not accepted**.

Two read-only snapshots are now versioned in `scripts/accept_autostart_linux.sh` and `scripts/accept_autostart_windows.ps1`. Both deliberately hide executable paths, registry values and credentials. They provide observed counts to attach to **check 5**; no runtime PASS is inferred until the machine and session are exercised.
