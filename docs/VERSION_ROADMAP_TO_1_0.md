# RepoTicker — versioned roadmap v0.1.0 to v1.0.0

## Relationship to the current handoff

This approved roadmap owns allocations, continuous-dev policy, final L10N-20
and v0.9 Mode B/public-v1 gates. Its dated "active v0.3" and planned v0.4
paragraphs are historical allocation snapshots; the
[current handoff](ROADMAP.md#current-development-handoff-2026-10-24) links the
already overlapping v0.3/v0.4/v0.5 source and remaining acceptance. Development
bucket labels do not authorize a bump/tag/main promotion or imply all work is
done. The original roadmap, test matrices and owner decisions remain intact.


Status: **APPROVED ROADMAP, not a software release** (2026-10-21).
Working branch: `dev`. Release branch: `main`. No extra permanent branches.

## Authority and scope

This document **maps the existing functional P0–P4 roadmap to proposed
product versions**, as accepted by the owner after discussion on 2026-10-21.
The original priorities and historical engineering evidence remain in
[ROADMAP.md](ROADMAP.md). Individual version allocations beyond the already
published v0.1.0 are product planning targets, **not previously established
historical facts**, guaranteed delivery dates, or permission to ship
unfinished code.

**Mandatory owner addition:** complete **Mode B — Testing** at the v0.9.0 RC gate before
declaring RepoTicker v1.0.0 stable. Mode B is the testing process defined in
the user-provided current `AGENT.md` SSOT (Stage 1–12, Positive/N1–N12,
risk-driven inventory, branch/interaction/coverage maps, mutation review,
stable/flaky separation and evidence). Do not confuse Mode B with merely
running a green Preflight.

Versioning principle: v0.1.0 is the immutable original local-Git release;
v0.2.0 was published on 2026-10-22 with the GitHub monitoring module.
The active development milestone is v0.3.0 (GitHub hardening and startup).
From v0.3.0 on, proposed feature groupings may be adjusted through an
explicit documented product decision. Patch releases are reserved for
compatible corrections; no arbitrary obligation to publish every minor.
SemVer pre-1.0 does not itself guarantee stability.

**Owner delivery policy (2026-10-22): Continuous development, not a release
per milestone.** v0.3–v0.8 below name work packages and checkpoints, **not
mandatory public versions**. Continue adding architecture and tests to
`dev` without creating a GitHub Release, Cargo version bump, main promotion,
or signed APT publication after every completed slice. If work takes
longer than expected, or there is a useful independently accepted state,
the owner may decide to cut an intermediate version following the full
release gate. Numbering can be consolidated or skipped with documented
reason; v0.9 Mode B and the final v1.0 acceptance gates remain mandatory.
Never reinterpret the plan as permission to release untested code.

**Owner addition (2026-10-23): L10N-20 is the mandatory final feature milestone**
after all other functional/platform development and BEFORE starting the
v0.9.0 Mode B campaign. Translate every UI surface into the
[20 canonical PersonalLanding languages](localization/LOCALE_CONTEXT_AUDIT.md),
complete an independent **contextual audit for each language**, and
resolve findings before RC freeze. The internal L10N-20 checkpoint
does not require its own published minor release.
[Tracking issue #16](https://github.com/morozhenko-apps/repoticker/issues/16).

## Version milestones

| Version | Target feature contract | Current evidence/status | Mode B exit work |
| --- | --- | --- | --- |
| **v0.1.0** | P0: local Git companion, tray/card, manual Fetch, safe `ff-only` pull, Linux DEB/AppImage, Windows NSIS build, signed APT distribution | **Published 2026-10-19.** KDE local smoke and CI; not full lifetime/Windows physical acceptance | Baseline inventory of core Git, package/signing and UI tests; identify historical gaps |
| **v0.2.0** | P2: GitHub App Device Flow, OS keyring, self-hosted runner status, Actions job counts and separate hover views; opt-in read-only billing | **Published 2026-10-22.** Signed APT index offers `repo-ticker 0.2.0` on Alcotester. Windows physical runtime and selected live failure paths remain unverified | Auth/session transition and bounded GitHub response contracts; per-account failures, fake clock/pagination, no secret leakage; record matrix gaps |
| **v0.3.0** | P2 hardening: expiry/refresh/revocation, API `401/403/404/429`, rate limits, offline/stale, ETags/conditional polling where supportable; monitored-repository selection; **fix slow staged startup and premature GitHub ‘Not connected’ display ([#12](https://github.com/morozhenko-apps/repoticker/issues/12))** | **Started in `dev`**; [v0.3 development plan](DEVELOPMENT_0_3_0.md), first slice removes full Git scan from monitor scope lookup; cold/warm timing, wallet and remote startup still pending | Focused startup-state, authorization and API adapter regression tests; full Mode B remains scheduled for v0.9.0 |
| **v0.4.0** | P1 hardening: terminate long Git/SSH tasks, external concurrent changes, linked worktrees, submodules, hooks, multiple remotes, adversarial configs; atomic configuration and recovery | Planned | Local Git/filesystem and `ff-only` invariant matrices; N1/N2/N4/N5/N6/N7/N12, mutation checks against unsafe Git changes |
| **v0.5.0** | P1/P4: native CI notifications, autostart, monitoring preferences, EN/RU localization foundation, settings/error clarity and accessibility basics | **Active in `dev`**: direct REST + native opt-in failure alerts, monitored repositories and initial EN/RU card/Settings/About/GitHub tooltip translation implemented; [v0.5 development evidence](DEVELOPMENT_0_5_0.md). Autostart remains a separate undecided architecture gate; real CI-failure notification and Windows runtime acceptance still open; no v0.5 release | Settings and event integration matrix; N8 timezone/DST, N9 cancel/close/reopen, N10 redaction, N12 persistence; critical UI E2E only |
| **v0.6.0** | **Optional P3:** opt-in unattended Git sync with explicit schedule, unchanged safe `ff-only` invariants and cancellation | Conditional product milestone; OFF by default, not a v1.0 prerequisite if explicitly deferred | If shipped: destructive-state/race/state-machine and restart/recovery tests; Mode B applies in full before enabling, never bypassed |
| **v0.7.0** | **Optional P3:** Hybrid webhook relay, signed/replay-safe events, optional Cloudflare Worker/DO and Docker/VPS, websocket/reconnect and authoritative REST fallback | Conditional product milestone; no mandatory cloud backend for local-first v1.0 | If shipped: HMAC/replay/dedup/tenant isolation/queue ordering, N3–N7/N9/N10 and chaos/failure-path tests prior to enabling |
| **v0.8.0** | P4 platform/distribution: Windows native lifecycle and installers, signed APT upgrade/rollback policy, high-DPI/multimonitor, portable settings/credentials, KDE regression, accessibility | Partially implemented; Windows runtime and upgrade not physically verified | Linux and Windows physical matrix; signed APT install/upgrade/remove, corrupted config/keyring/permission denial, multi-screen, native UI E2E |
| **L10N-20 (after v0.8, before v0.9)** | Mandatory last feature: 20 canonical UI locales with contextual audit **per locale** across all card/tray/Settings/About/status/GitHub/Git/errors/notifications; RTL, fonts, placeholders, long texts and safe terminology | Planned, **not implemented**. [Localization matrix](localization/LOCALE_CONTEXT_AUDIT.md) and [#16](https://github.com/morozhenko-apps/repoticker/issues/16). Must finish **before** Mode B RC source freeze | 20/20 translated complete UI and separate context audit signoff; all locale-critical findings resolved before starting full Mode B |
| **v0.9.0** | **Release Candidate + complete Mode B audit**: no new major functionality, defect correction, stable API/UX, migration compatibility, coverage and security review | Not started | **All 12 Mode B stages and every applicable Positive/N1–N12 cell resolved; stable/flaky and CI verification on frozen RC SHA; critical real-device integration accepted** |
| **v1.0.0** | Public **stable** contract for documented supported OSes and enabled features; upgrade/restore, security, reproducible release, support/runbooks | Target, not yet released | Gate: approved Mode B completion report, stable CI/release checks, verified installers and no unwaived critical failures |

**Optional feature policy:** the P3 background-sync and Hybrid milestones
remain visible in the version plan, but the original functional roadmap
explicitly calls them optional. They **do not block v1.0** if formally
deferred and disabled/absent from the stable product contract. If shipped
before 1.0, they are fully subject to Mode B and security acceptance.
macOS is likewise excluded from the claimed support matrix until signed
and physically accepted. Do not claim Windows support from NSIS build alone.

## Mode B — Testing: binding test program before v1.0

**Full campaign starts at v0.9.0, only AFTER L10N-20 is finished and all 20 context audits have passed.** Earlier feature milestones (v0.2–v0.8 plus L10N-20) must still include normal targeted feature/regression tests and final stable CI, but do not require exhaustive Mode B branch/matrix/mutation deliverables. The preliminary October source scan is archived as exploratory material, **not** a prerequisite to further feature implementation.

The **latest approved agent SSOT** is the user-provided `AGENT.md`,
sections 8.1 and 5.2. Testing is its own primary **MODE B**, used for
inventory, coverage, test implementation and defect investigation. Feature
implementation remains Mode A; do not claim Mode B complete merely because
feature tests were added in Mode A.

### B1 — Inventory and design (must finish before writing Mode B tests)

1. **Repository scan:** identify every production module and test framework:
   Rust core, native GitHub transport/auth/keyring, JS monitoring/settings/
   UI controllers, GTK/Wayland bridge, the download Worker, release/installer
   and signed APT scripts. Identify applicable platform-specific paths;
   skip trivial DTO-only code until business logic is mapped.
2. **Risk/invariant analysis:** record critical protections: Git safe
   `ff-only` and explicit enrollment; no token/PII in JS/logs;
   correct Actions vs self-hosted counts and unknown coverage; billing
   honesty; idempotent signed publishing and package lifecycle.
3. **Test inventory:** every exported use case, validator, parser, state
   machine, API, storage adapter, formatter, integration and critical UI
   flow, annotated by risk, test level, expected cases and Positive/N1–N12.
   Inventory must be complete **before test implementation**.
4. **Branch map:** each executable branch in the scoped public
   methods/business rules maps to a planned test (or documented exclusion).
5. **Test matrix:** rows are artifacts, columns are **Positive and N1–N12**.
   Every cell is `Covered`, `Planned`, or `N/A — reason`; never blank.
6. **Interaction matrix:** meaningful combinations of independent states
   (e.g. auth × scope × API coverage × card visible × UI locale/RTL; Git dirtiness ×
   remote state × concurrent operation; upgrade × keyring state).
7. **Coverage estimate:** expected test cases per category and module,
   with a reasoned count; no symbolic one-test-per-category sampling.
8. **Coverage map:** production file/function/branch, covered/remaining,
   reason and evidence; source-only coverage is not physical acceptance.

### B2 — Implementation and mutation adequacy

9. Implement every applicable planned case with deterministic
   fixtures/seeded RNG/fake clocks, injected API/IO boundaries and
   stable selectors. Do **not** mock business/domain logic. Tests should
   be order independent. Follow test pyramid (~70–80% unit/domain,
   15–25% integration/contract, 5–10% critical UI/E2E) as a
   **planning guide**, not manufactured coverage numbers.
10. Mutation review of critical operators, validation, ordering, security
    allowlists, state transitions, and cancellation/retry. Record escaped
    mutations and missing assertions; repair tests **or product defects**,
    never weaken a test or disguise a failure as success.

### B3 — Final execution and evidence, only at the end

11. Once implementation and test documentation are complete, run the
    applicable **STABLE suite once** as the normal final gate; execute
    a separately registered **known-FLAKY** group independently once.
    Distinguish `flaky-risk` (race-sensitive yet stable) from genuinely
    demonstrated flaky. Report failed/quarantined tests explicitly;
    a newly failing stable test is a defect, **not** automatically flaky.
    Targeted bounded reruns or multiple-run repeatability diagnostics are
    permitted only when justified by real race/instability evidence.
    **Do not require 10× of every test** or run expensive suites between
    implementation stages. The current manual `strict.yml` repeats
    Rust+JS ten times and is a legacy optional diagnostic, **not yet an
    integrated Mode B stable/flaky policy**. Align its behavior and
    documentation before the v0.9.0 gate; do not treat its presence as
    passed evidence. Run any mandated OS/release CI independently.
12. **Completion gate:** answer YES, with evidence, to public methods,
    executable branches, business rules, invariants, boundaries,
    applicable Positive/N1–N12, and interaction combinations. Show the
    real test counts by category, independently measured per-module
    branch coverage, mutation results, stable/flaky results, platform
    acceptance and remaining exceptions. Any unresolved applicable
    branch/cell or critical failure means Mode B is **NOT COMPLETE**.

### RepoTicker negative matrix (apply all relevant cases per public flow)

| Category | Concrete RepoTicker risks |
| --- | --- |
| Positive | valid enrolled repos, successful safe FF pull, authorized jobs and runners, signed package lifecycle |
| N1 Input validation | malformed paths, runner labels, API input, webhook signatures, corrupt timestamps |
| N2 Boundaries/limits | 0/1/max/max+1 roots, runs/jobs/pages, 128KiB API body, card height, archive/file bounds |
| N3 Network errors | offline, TLS/DNS/timeout, Git remote refusal, GitHub 401/403/404/429/5xx, missing Retry-After |
| N4 Retry/idempotency | duplicate Fetch/OK/Cancel, reissued Device Flow, resumed deployment and partial APT upload |
| N5 Race conditions | simultaneous Git clients, token refresh vs disconnect, stale hover/monitor result, duplicate jobs |
| N6 Corrupt/stale data | broken settings JSON, stale schema, missing pagination fields, corrupt response, expired tokens |
| N7 Security/permissions | token/keyring denial, route allowlists, symlink/hook abuse, unauthorized org scope, HMAC if enabled |
| N8 Time/locale | refresh-clock changes, OAuth expiration, UTC billing periods, timezone/DST, 20-language UI labels, plural/placeholder parity, RTL/fonts and language override persistence |
| N9 User interruption | Settings Cancel/OK, app termination, tray Hide/Open, suspend/resume, interrupted install |
| N10 Privacy/PII | no access/refresh token in WebView, logs, diagnostics, crash text, app configs or billing projection |
| N11 Monetization | **N/A to product entitlements:** RepoTicker is free with no purchase or subscription. Billing display is informational and must still be validated under N1/N6/N7/N8/N10. Reassess if monetization is added |
| N12 Storage failure | filesystem read-only/full/permission denied; atomic settings; keyring locked/unavailable; package rollback |

N/A cells require explicit documented justification, not silently skipped
tests. For each applicable N-category test boundary variants and state
interactions; avoid cherry-picking simple DTOs and claiming overall coverage.

## Mode B documentation and audit artifacts

Versioned required SSOT artifacts to produce *during the actual test
campaign*; this roadmap alone is **not** the completed inventory:

- `docs/testing/MODE_B_INVENTORY.md`: all public artifacts, risk,
  level, expected tests and relevant N categories.
- `docs/testing/MODE_B_BRANCH_MAP.md`: branch-to-test mapping,
  justified exclusions and interaction matrix.
- `docs/testing/MODE_B_MATRIX.md`: Positive+N1–N12 for each artifact.
- `docs/testing/MODE_B_COVERAGE.md`: per-production-module actual
  function/branch measurements and independent mutation outcomes.
- `docs/localization/LOCALE_CONTEXT_AUDIT.md`: 20 independent locale-context review records and findings, completed before Mode B; no invented reviewer approvals.
- `docs/testing/MODE_B_FINAL_REPORT.md`: actual command/SHA/status,
  stable/flaky runs, applicable test counts, residual risks, Linux/Windows
  physical acceptance, reproducible release assets and explicit YES/NO gate.

Create these files in docs-only commits as each stage is undertaken.
Do not prefill future audit results, claim coverage percentages before
measurement, or count CI compilations as tests of KWin runtime behavior.

## Milestone acceptance, branching and publication

Every milestone follows docs decision -> Mode A implementation ->
Mode B gap coverage when needed -> final stable CI once -> physical
acceptance relevant to that milestone -> version/package validation
-> optional promotion. Source tests do not replace end-user package smoke.
Keep production code, test changes and documentation in logically atomic
commits; **docs-only commits separate from code/test commits**.

A 1.0.0 tag is permitted only after:
- L10N-20 has **20/20 contextual audit signoffs** after all enabled functionality and before Mode B RC freeze.
- v0.9 RC has a **COMPLETE** Mode B report (all applicable maps/matrices
  and failure gates closed; any waivers must be justified and must not
  cover a critical security/data-loss bug).
- All enabled Git operations retain safe data invariants and GitHub
  authorization/error handling is accepted.
- Linux and Windows runtime are accepted **if both are advertised**;
  unsupported platforms are honestly excluded from the release.
- APT signed install/upgrade/restart/remove is verified on the target
  supported distributions; authentication and user configuration persist.
- All required stable/native CI, candidate build/release signing,
  immutable tag, artifact digests and public readback have evidence.
- `dev` is promoted to `main` only after its acceptance; the released
  tag matches the **exact main SHA**. No third permanent branch.

## Tracking

- [20-locale feature and contextual audit #16](https://github.com/morozhenko-apps/repoticker/issues/16)
- [Deferred integration acceptance #15](https://github.com/morozhenko-apps/repoticker/issues/15)
- [Mode B before v1.0 acceptance issue #10](https://github.com/morozhenko-apps/repoticker/issues/10)
- [v0.2 release readiness issue #9](https://github.com/morozhenko-apps/repoticker/issues/9)
- [GitHub integration reliability issue #4](https://github.com/morozhenko-apps/repoticker/issues/4)

## Checkpoint as of 2026-10-21

- [x] Functional P0–P4 mapped to proposed v0.1–v1.0 milestone series.
- [x] Mode B declared **mandatory before stable 1.0.0** with explicit
      source-of-truth pipeline and negative testing requirements.
- [x] Roadmap published in the GitHub repository on `dev`.
- [x] Optional preliminary Mode B source inventory archived in [`MODE_B_INVENTORY.md`](testing/MODE_B_INVENTORY.md). The full Mode B campaign starts at **v0.9.0**, after v0.2–v0.8 development. Its matrices and metrics remain unstarted as a release gate.
- [ ] Preliminary [branch map](testing/MODE_B_BRANCH_MAP.md) is parked; it must be regenerated/reconciled against the v0.9.0 RC source. No full audit or quality metrics claimed.
- [ ] STABLE/known-FLAKY split wired to CI for the pre-1.0 gate.
- [ ] v0.2 release candidate built/tagged/published; unchanged here.
- [ ] L10N-20: 20/20 UI languages and per-language context audit accepted **before** v0.9 Mode B starts.
- [ ] v0.9 RC and v1.0 product/OS/QA acceptance achieved.

## Scope freeze decision — 2026-10-25 (owner approved)

**Stop inventing work.** The product goal is a finite v1.0 delivery,
not an open-ended Git-hardening investigation. The owner accepted
the six remaining delivery phases and a feature freeze. This
section overrides earlier speculative suggestions of additional
pre-1.0 hardening, while retaining the previously mandatory
L10N-20 and Mode B acceptance gates.

**The six remaining gates (in this order, no extra gates invented):**

1. **Close the known executable blocker:** fix `E0597` at the
   `request_quit` operation-lock guard (Linux desktop compile
   of [Preflight #40195794530](https://github.com/morozhenko-apps/repoticker/actions/runs/40195794530));
   exact-source stable Preflight 4/4, then freeze Git core.
2. **Close essential v0.3–v0.5 functional acceptance:** focus on
   real GitHub failure notification, startup/credentials,
   selected-repository correctness and important settings.
   Resolve the **autostart architecture STOP factor** by an explicit
   owner decision; do not silently implement it.
   Record real failures only; no additional micro-polish.
3. **v0.8 platform gate:** batch one final KDE/Windows physical
   acceptance and packaging/upgrade tests for the platforms
   actually advertised, including APT signed upgrade and
   Quit-during-Fetch.
4. **L10N-20:** all 20 canonical UI languages and 20 separate
   contextual audits, after feature/platform freeze and
   before the full Mode B campaign.
5. **v0.9 Mode B:** the existing mandatory 12-stage risk,
   branch/interaction/coverage/mutation/negative-case
   review and acceptance on a frozen release candidate.
6. **v1.0:** immutable tagged source, installers/signatures/
   hashes, release/docs/support gates, public readback.

**Explicit exclusions for v1.0:** optional v0.6 unattended Git
sync, optional v0.7 Cloudflare Hybrid/Webhook relay and unverified
macOS support are **deferred to post-1.0**, absent/disabled in the
stable feature contract. They are *not* blockers and may be
reconsidered only by a separate future product decision.

**Git-core freeze begins as soon as gate 1 is CI-green.** From
that point accept Git/native behavior changes only for
reproduced functional failures, confirmed security/data-loss
risk, or a failure of one of the explicitly mandatory
acceptance gates. Potential races, speculative reliability
work, cosmetic controls, CI percentage chasing, and
"one more enhancement" become post-1.0 backlog entries.
Existing safe `ff-only`/non-force push, bounded cancellation
and error-honesty invariants remain mandatory. A new confirmed
critical bug may create a correction within a named gate,
**not** a seventh milestone or another indefinite hardening
phase.

**Evidence policy:** each completed gate needs one exact SHA,
an explicit pass/fail decision and a bounded remaining
exception list. A Preflight success is not physical desktop
acceptance or Mode B completion. No automatic promotions
from `dev` to `main`; no releases without owner approval.

**Current gate-1 known defect:** in native
`request_quit`, the temporary produced by
`match operation.0.lock()` outlives the local
`operation` Tauri state binding within the closure.
Rust compiler E0597 occurs on Linux desktop compile,
while Rust-core/Node jobs passed. Fix by binding
the lock result before matching; preserve actual
lock-held exit behavior. Add one focused source
contract and rerun the exact code/test gate only.

### Gate 2: fixed acceptance set — not a new development backlog

Gate 2 is capped at these **five observable checks**, drawn from
the already-open issues [#4](https://github.com/morozhenko-apps/repoticker/issues/4),
[#12](https://github.com/morozhenko-apps/repoticker/issues/12),
[#15](https://github.com/morozhenko-apps/repoticker/issues/15)
and the existing v0.5 work package. They do **not** authorize
new features, cosmetic UI adjustments or speculative optimizations.

1. **Startup correctness:** one cold and one warm KDE launch on
   the same enrolled root set; record time to first local snapshot
   and first authorized monitor result, full local scan count,
   and whether false `Not connected` or repeated request storms
   occur. Prior 2026-10-22 trace (~8.21 s local and ~18.23 s
   visible metrics) is historical comparison, **not** a
   fabricated SLA. If startup remains bounded, responsive and
   truthful, defer speed micro-optimizations.
2. **GitHub auth and secrets:** authorization/restart, refresh
   or revoked access, explicit disconnect, locked wallet,
   401/403/404/429 and network recovery must preserve
   truthful unknown/stale results and keep access tokens
   out of WebView/config/logs. Already-covered pure source
   negatives need not be reimplemented or repeatedly rerun.
3. **Monitored scope and counters:** all vs selected repositories
   (including account switch and restart), authorized
   multi-page selection, runner/job and opt-in informational
   quota counters; inaccessible/partial data stays unknown,
   not false zero. One successful test per meaningful
   real integration transition, recorded in issue #15.
4. **Real opt-in CI-failure alert:** enable notifications,
   observe one *actual* GitHub job transition to failure,
   ensure the single desktop notification is emitted once
   (no startup historical replay), and test disabled
   notifications. An artificial test notification is not
   acceptance of this path.
5. **Autostart decision:** the platform-specific architectural
   STOP remains. The owner must explicitly choose
   **include + design/test** or **defer/disable for 1.0**;
   until then do not code or advertise autostart. This is
   a decision gate, not permission to begin another
   implementation phase.

Gate-2 **stop condition**: all five checks have either
explicit, dated acceptance evidence or an approved
feature-defer/support-scope decision. A confirmed
functional/security/data-loss failure is a scoped defect
within this gate. An unconfirmed hypothetical race,
minor layout tweak or additional unrequested test
does not reopen Git-core development.

Gate 3 remains the single combined platform/packaging
acceptance rather than asking the owner to manually
smoke each code commit. Do not duplicate the actual
KDE/Windows OS acceptance in Gate 2 and Gate 3: reuse
the same evidence when a check legitimately covers both.

### Gate 1 — CLOSED / Git-core change freeze ACTIVATED (2026-10-25)

- Exact functional patch: `301145ef54da141caff46e889acaffde0234be0a`;
  Rust E0597 on the explicit Quit `OperationLock` path was
  fixed by assigning the mutex lock result to a named
  binding before matching it. No other native behavior
  was modified.
- [Preflight #40197325988](https://github.com/morozhenko-apps/repoticker/actions/runs/40197325988)
  completed **4/4 SUCCESS** on that exact code/test SHA:
  91/91 Rust core/integration/origin tests, 236/236 Node
  tests, 14/14 Python release contracts, Rustfmt,
  Clippy, Linux desktop compile, aggregate result.
  This validates compilation/source, **not** a real
  KDE/Windows Quit-during-Fetch physical smoke.
- **Git-core scope is now FROZEN** under the approved
  decision above. No more routine core refactor,
  speculative races or micro-improvements. Reopen only
  for reproduced defects, verified security/data-loss
  risk, or failed mandatory acceptance.
- **Current next gate: 2/6** functional acceptance
  with exactly the five observable checks specified
  above. The five items are not marked passed by
  source CI; no real-device evidence has been
  fabricated. Autostart architecture remains an owner
  STOP decision and must not be implemented implicitly.
- Main branch remains on published v0.2.0. No release,
  tag, installer, push to main, or deployment.
