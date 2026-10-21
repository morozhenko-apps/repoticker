# Mode B — first campaign: repository scan and inventory plan

Date: 2026-10-21
Primary mode: **MODE B — Testing**
Target: `dev`, baseline revision `eddb3bc11d47f711c46b54036e5cdea31af05962` (approval of 1.0 roadmap).
Status: **IN PROGRESS — Stage 1–3 only**. No quality gate passed and no new tests implemented by this document.

## Decision and guardrails

The owner approved the roadmap through 1.0 and made Mode B mandatory before the stable release (issue #10). Start the audit **now**, building test requirements for the current v0.2.0 candidate and extending them as later v0.3–v0.8 features land. The audit does not publish v0.2.0 or create a tag. A code branch is not needed: use `dev`. Keep `main` unchanged.

This campaign uses the user-supplied `AGENT.md` Mode B Stage 1–12 as testing SSOT. The normal stable suite must **not** run between development stages. No new tests until the complete current-source artifact inventory, branch map, Positive/N1–N12 matrix, interaction map and coverage estimate are produced. Separate STABLE and known-FLAKY suites at the final acceptance stage. A flaky-risk test is not a known flaky test merely because it is timing-sensitive; retain any failures without hiding or weakening them.

## Stage 1 — Repository scan (verified from Git tree)

GitHub tree: `GET /repos/morozhenko-apps/repoticker/git/trees/dev?recursive=1`; result `truncated:false`.

| Artifact family | Current source structure | Audit action |
| --- | --- | --- |
| Local-Git/domain | `crates/repoticker-core/src/{bounded,git,github_auth}.rs`, plus Rust integration tests | Exhaustive public APIs, FF safety states, bounded concurrency, Device Flow pure state machine |
| Native desktop | `apps/desktop/src-tauri/src/{main,github_api,github_native,github_oauth_wire,github_session,monitor_cache,linux_surface,linux_tray,app_icon}.rs`, `native/wayland_relative_drag.c`, `build.rs` | IPC/read allowlists, HTTPS response parsing, keyring lifecycle, native state/GTK/GDK Wayland lifecycle |
| Desktop JS | `apps/desktop/ui/` includes 14 `.mjs` modules (`about`, `app`, `github-billing`, `github-monitor`, `model`, `native-drag`, `quota-details`, `quota-size`, `quota`, `runner-collector`, `runner-state`, `settings`, `status-metrics`, `view`) | Public exports, state/controller functions, selected-account interactions, hover/authorization races, browser event fixtures |
| Distribution Worker | `infra/download-worker/src/worker.mjs` | Method/path allowlists, by-hash cache/404/405, HTTP privacy and bounded responses |
| Distribution scripts | `scripts/{apt_repository,r2_release,release_assets,release_version,verify_signing_key}.py`, `{provision_apt_key,verify_signing_passphrase}.sh` | Signed-APT/immutable release, SHA256, GPG key/secret handling, retries and partial remote publication |
| Optional relay prototype | `apps/relay-cloudflare/src/index.ts`, `apps/relay-{cloudflare,selfhost}/README.md` | Determine whether placeholder-only or executable; exclude not-shipped behavior with explicit reason, re-open if P3 ships |
| CI and configs | `.github/workflows/{preflight,strict,desktop-release-candidates}.yml`, Tauri capabilities/config and workspace Cargo manifests/lock | Stable/flaky separation, release admission, Linux/Windows build, version consistency and promotion |
| Existing test suites | 14 `tests/*.test.mjs`, 6 `tests/test_release_*.py`, 1 Rust `tests/git_integration.rs`; native module unit tests also embedded in Rust sources | Index scenarios/evidence and identify untested branches, do not claim a code path tested just because a file name suggests it |

Tree counts above are path-family counts, **not test case counts**. Do not synthesize coverage percentages. Images, icons, formatting-only CSS, routine DTOs and dependency lock entries are not top-level behavioral units; their integrity is checked through the relevant contract/integration tests.

**Execution environment evidence:** this agent has the connected GitHub API but no clone of the repository or Rust/Cargo toolchain in its container. `git ls-remote` fails DNS resolution to `github.com`; source files can be read and committed through GitHub connector. Node is available, but no local repository or production fixtures exist for truthful local test execution. Do not assert any freshly run stable test suite or Cargo lockfile regeneration from this environment.

## Stage 2 — High-risk invariant catalogue

1. **Git safety:** discovery cannot escape enrolled roots; no mutation of checked-out files by Fetch; Safe Pull only for clean, behind, upstream-tracking state using checked `ff-only` against previously fetched remote refs, never force/reset/rebase/stash; cancellation cannot corrupt worktrees.
2. **OAuth/Keyring:** expiring access/refresh token generation remains native-only, single durable keyring record, no browser secrets, no plaintext fallback, request cancellation and disconnect do not leave stale login; authorization denial must not turn into a valid session.
3. **REST and scope:** bounded fixed-origin HTTPS, fixed allowlist of methods/paths/query params, bounded pagination, correct 401/403/404/429/offline classification, no private repository leakage.
4. **Monitoring:** self-hosted runner registry counts distinct from GitHub-hosted execution, only actually running jobs assigned to runner IDs, queued jobs not assigned; unknown/incomplete state is never represented as an authoritative zero.
5. **Billing:** distinct personal/organization ownership, plan allowances only with verified plan name, reported SKU gross minutes not interpreted as free consumed/remaining; errors isolated per owner; scoped ten-minute caching.
6. **UI/KDE:** correct hover kind despite asynchronous events, pointer-pass-through secondary Wayland window, card 390×122 in compact state, no suspended drag after Hide/Open, predictable idle timeout and transactional Settings OK/Cancel.
7. **Distribution:** source/tag/main version agreement, signed metadata and immutable APT/R2 artifacts, secure signing subkey handling, readback and recovery from partial uploads; installed package lifecycle preserves user data.
8. **Forward compatibility:** no assumed Windows physical support, autostart, relay/HMAC/webhook or unattended Git automation until actually implemented and accepted.

## Ordered audit actions / expected evidence

- [x] Read current owner-provided Mode B agent prompt and approved version roadmap.
- [x] Enumerate complete tree, execution/test framework and principal source families.
- [x] Identify and document risk-bearing invariants.
- [x] **Stage 3:** inventory all production paths and current test declarations. Evidence: [`MODE_B_INVENTORY.md`](MODE_B_INVENTORY.md), commit `ccb9e30`; prospective case counts are not test passes or coverage measurements.
- [ ] **Stage 4:** `docs/testing/MODE_B_BRANCH_MAP.md`, mapping each executable branch to existing or planned cases.
- [ ] **Stage 5:** `docs/testing/MODE_B_MATRIX.md`, Positive + N1–N12 with no blank cells; `N/A` must explain why.
- [ ] **Stages 6–8:** interaction/state combination map, justified per-artifact test count estimate, function/branch coverage map.
- [ ] **Stage 9:** implement uncovered tests in atomic code/test commits only **after** inventory/branch/matrix complete.
- [ ] **Stage 10:** mutation review of each critical security/data-safety assertion, defects fixed at source.
- [ ] **Stage 11:** one final STABLE execution and one independent known-FLAKY execution (only if a registered known-FLAKY suite exists), plus platform/build release gates. Any repeated run must be justified diagnostic, not routine.
- [ ] **Stage 12:** report real counts, branch coverage, mutation evidence, CI IDs, physical acceptance and unresolved N-cells. Mark Mode B COMPLETE only with all questions YES.

**Rollback:** all changes in this stage are documentation-only. Remove/revert the docs commits without affecting production or the released v0.1.0 tag. New functional tests and workflow changes are not authorized by this scan document alone.
