# RepoTicker — versioned roadmap v0.1.0 to v1.0.0

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

**Mandatory owner addition:** complete **Mode B — Testing** before
declaring RepoTicker v1.0.0 stable. Mode B is the testing process defined in
the user-provided current `AGENT.md` SSOT (Stage 1–12, Positive/N1–N12,
risk-driven inventory, branch/interaction/coverage maps, mutation review,
stable/flaky separation and evidence). Do not confuse Mode B with merely
running a green Preflight.

Versioning principle: v0.1.0 is the existing immutable local-Git release;
v0.2.0 is the next candidate due to the substantial new GitHub module.
From v0.3.0 on, proposed feature groupings may be adjusted through an
explicit documented product decision. Patch releases are reserved for
compatible corrections; no arbitrary obligation to publish every minor.
SemVer pre-1.0 does not itself guarantee stability.

## Version milestones

| Version | Target feature contract | Current evidence/status | Mode B exit work |
| --- | --- | --- | --- |
| **v0.1.0** | P0: local Git companion, tray/card, manual Fetch, safe `ff-only` pull, Linux DEB/AppImage, Windows NSIS build, signed APT distribution | **Published 2026-10-19.** KDE local smoke and CI; not full lifetime/Windows physical acceptance | Baseline inventory of core Git, package/signing and UI tests; identify historical gaps |
| **v0.2.0** | P2: GitHub App Device Flow, OS keyring, self-hosted runner status, Actions job counts and separate hover views; opt-in read-only billing | **Implemented on `dev`, not published.** Normal KDE flow accepted; failure-path/API/upgrade verification pending | Auth/session transition and bounded GitHub response contracts; per-account failures, fake clock/pagination, no secret leakage; record matrix gaps |
| **v0.3.0** | P2 hardening: expiry/refresh/revocation, API `401/403/404/429`, rate limits, offline/stale, ETags/conditional polling where supportable; monitored-repository selection | Planned; distinguish feature availability from reliability | Full monitoring/authorization branch and state-machine inventory; N3/N4/N5/N7/N8/N10 negative suites, independent API adapter contract tests |
| **v0.4.0** | P1 hardening: terminate long Git/SSH tasks, external concurrent changes, linked worktrees, submodules, hooks, multiple remotes, adversarial configs; atomic configuration and recovery | Planned | Local Git/filesystem and `ff-only` invariant matrices; N1/N2/N4/N5/N6/N7/N12, mutation checks against unsafe Git changes |
| **v0.5.0** | P1/P4: native CI notifications, autostart, monitoring preferences, complete EN/RU UI localization, settings/error clarity and accessibility basics | Planned | Settings and event integration matrix; N8 timezone/DST, N9 cancel/close/reopen, N10 redaction, N12 persistence; critical UI E2E only |
| **v0.6.0** | **Optional P3:** opt-in unattended Git sync with explicit schedule, unchanged safe `ff-only` invariants and cancellation | Conditional product milestone; OFF by default, not a v1.0 prerequisite if explicitly deferred | If shipped: destructive-state/race/state-machine and restart/recovery tests; Mode B applies in full before enabling, never bypassed |
| **v0.7.0** | **Optional P3:** Hybrid webhook relay, signed/replay-safe events, optional Cloudflare Worker/DO and Docker/VPS, websocket/reconnect and authoritative REST fallback | Conditional product milestone; no mandatory cloud backend for local-first v1.0 | If shipped: HMAC/replay/dedup/tenant isolation/queue ordering, N3–N7/N9/N10 and chaos/failure-path tests prior to enabling |
| **v0.8.0** | P4 platform/distribution: Windows native lifecycle and installers, signed APT upgrade/rollback policy, high-DPI/multimonitor, portable settings/credentials, KDE regression, accessibility | Partially implemented; Windows runtime and upgrade not physically verified | Linux and Windows physical matrix; signed APT install/upgrade/remove, corrupted config/keyring/permission denial, multi-screen, native UI E2E |
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
   (e.g. auth × scope × API coverage × card visible; Git dirtiness ×
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
| N8 Time/locale | refresh-clock changes, OAuth expiration, UTC billing periods, timezone/DST, EN/RU labels |
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

- [Mode B before v1.0 acceptance issue #10](https://github.com/morozhenko-apps/repoticker/issues/10)
- [v0.2 release readiness issue #9](https://github.com/morozhenko-apps/repoticker/issues/9)
- [GitHub integration reliability issue #4](https://github.com/morozhenko-apps/repoticker/issues/4)

## Checkpoint as of 2026-10-21

- [x] Functional P0–P4 mapped to proposed v0.1–v1.0 milestone series.
- [x] Mode B declared **mandatory before stable 1.0.0** with explicit
      source-of-truth pipeline and negative testing requirements.
- [x] Roadmap published in the GitHub repository on `dev`.
- [x] Mode B Stage 1–3 source scan and artifact inventory recorded in [`MODE_B_INVENTORY.md`](testing/MODE_B_INVENTORY.md); branch map/matrix and measured coverage remain open, so **Mode B is not complete**.
- [ ] Mode B Stage 4 [branch map](testing/MODE_B_BRANCH_MAP.md) started for high-risk source and remains incomplete. Tests/mutations/coverage are not complete; no quality metrics invented.
- [ ] STABLE/known-FLAKY split wired to CI for the pre-1.0 gate.
- [ ] v0.2 release candidate built/tagged/published; unchanged here.
- [ ] v0.9 RC and v1.0 product/OS/QA acceptance achieved.
