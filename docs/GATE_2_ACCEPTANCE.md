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
| 5 | Autostart architecture owner STOP | Roadmap correctly identifies undecided autostart; no implementation or OS permission is added by the current freeze | **Explicit owner decision**: defer/disable for v1.0 (recommended), or include and approve a bounded cross-platform design/test requirement | **Pending decision** |

**Source conclusion:** existing source+targeted negative/contract suites
provide substantive evidence for all four implemented flows. No new
application bug was established by this review. **Zero of the five
runtime/product checks is marked accepted** solely from automated tests.

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

Gate 2 closes only when all five rows have explicit evidence
or an approved owner decision on feature/platform scope.
Failing a mandatory check permits a **targeted defect fix**,
not another generalized Git hardening campaign. Noncritical
UI polish and speculative performance changes go to
post-v1.0 backlog. Optional unattended Git sync, Hybrid/Webhook
relay and unsupported macOS stay out of v1.0.

Gate 1 passed; Gate 2 is **not accepted** without actual
runtime evidence or owner-approved scope decisions.
Do not prematurely start full Mode B or publish v1.0.
