# Post-v1.0.0 UI regressions

Owner report: 2026-11-07. Tracking: [issue #21](https://github.com/morozhenko-apps/repoticker/issues/21).

## Baseline and scope

Baseline: `dev` at `df22d025cca176243068876b5e0931aa6d0afd53`; `main` stays reserved for reviewed releases. This work is a regression batch, not a release or permission to change hosted infrastructure. Keep native Git invariants and GitHub API scopes unchanged.

## Source-level diagnosis

- Repos spinner: the card currently combines `localScanActive` and `fullMonitorActive`. Full GitHub monitoring does not inspect local repositories and must not drive the Repos loading signal. Local first snapshot latency, Git discovery and inspection still require separate physical timing before they can be called optimized.
- Fetch progress: native Git operation events already provide `completed` and `total`, but the card replaces Fetch percentage with a Cancel label. Display `completed / total` as a whole-repository count percentage. This is **not** per-repository network byte progress. Keep cancellation as the active button's click action, exposed through its accessible name and tooltip. Do not invent `100%` for an unknown total.
- Tray ordering: the Linux KSNI menu and Windows Tauri menu currently put Settings before Fetch and Sync. Order both as Open, Fetch, Sync, Settings, About, Quit. Preserve stable action IDs and dispatch semantics.
- Localized labels: align Russian tray/card Fetch as `Фетч`, Sync as `Синхр.`, and tray About as `О программе`; preserve operation identity and all 20 locale catalogs. The alternative label `Статус` would misrepresent a Git fetch, which updates remote-tracking refs even though it leaves the working tree alone.
- About: `minimizable: false` already exists in Tauri config, but the Linux platform ignores it. Implementing a guaranteed Close-only window needs a custom window frame/titlebar and a native physical KDE/Windows acceptance gate; do not mistake a redundant config flag for a fix.
- CI notifications: the existing native/persisted contract contains a single `ci_failure_notifications` boolean and intentionally ignores new successful runs. Independently selectable success and failure delivery requires an owner-approved configuration/API compatibility decision before code changes.

## Milestones

1. [x] Analyze the active dev source, relevant test assertions and native/platform boundaries. Record the user-visible requirements and a bounded diagnosis.
2. [x] Commit scoped card spinner/progress and native tray/localization adjustments with matching source-level regression tests. Notification configuration remains unchanged. Final execution is pending.
3. [x] Owner chose a single `ci_notification_mode` enum (`off | failures | successes | both`) on 2026-11-07; default `off`; **no migration** from `ci_failure_notifications`. Legacy boolean is deliberately ignored. Other persisted preferences and OS credentials remain untouched.
4. [x] Implement selected-mode Settings control, native configuration/authorization guard, event tracker and 20 native message templates, with deterministic JS/Rust regression tests for startup silence, identity, scope, deduplication and each choice. Runtime test gate is still pending.
5. [x] Implement a frameless About titlebar with only an accessible Close button, localized in 20 languages; restrict drag permission to the About window.
6. [ ] Validate actual KDE Wayland and Windows drag, keyboard close, focus, re-open and native presentation. No physical acceptance has been performed yet.
7. [ ] Execute final applicable STABLE JS, Rust and release-contract checks once and record exact evidence; no CI polling after a run is started.

## Final-gate repair: real Ubuntu test log (2026-11-07)

**Mode B — Testing**. The owner's exact `dev=c5f5606` local test log
reports Node v24.22.2 (instead of project-pinned 26.13.0), Node
`node --test tests/*.test.mjs` **538 pass / 23 fail / 561 total**,
Rust core 71 unit + 30 Git integration + 3 remote tests pass,
Rust native 69 pass, `cargo check --locked -p repoticker` passes, and
`cargo fmt --all --check` reports formatting diffs.

Six diagnostic hypotheses: (1) legacy failure-only config flags in
Mode B fixtures, (2) old checkbox IDs and Boolean semantics in Settings
fixtures, (3) pre-change error-recovery expectations, (4) obsolete
card/locale static assertions, (5) missing Rust formatting, (6) a real
production contract violation or Node toolchain incompatibility. Root
cause from exact failing assertions and current source is primarily
(1)/(2)/(3) plus unrelated renamed UI strings and Rust formatting.
All 23 failures have concrete source-level explanations; focus on
verifying, not weakening, the underlying test assertions. Restore
the repo's full existing Mode B scenarios and keep assertion intent.

Planned changes, separate from this docs commit:

1. Change existing notification Mode B test fixtures to explicitly
   opt into `failures` (or `both` where relevant), leaving no-mode
   default-off tests untouched. Replace the old native IPC command
   fixture with `ci_run_notify` and assert the conclusion payload.
2. Update the *one* obsolete provider-error expectation to require a
   silent recovery baseline for just the failing repository, preserving
   the healthy repository's notification history and a subsequent new
   completion alert. Retain identity, bounds, invalid-run and duplicate
   invariants.
3. Switch Settings integration fixtures from the Boolean checkbox to
   the four-value select. Preserve Apply/Cancel, error, re-open, auth,
   offline selected-repo and OS autostart assertions. Add explicit
   opt-in choices `successes` and `both` if not otherwise covered.
   The old `ci_failure_notifications: true` field remains ONLY in an
   intentional no-migration fixture.
4. Refresh static UI tests for progress-as-percentage (Fetch remains
   cancellable via accessible title), local scan-only busy state,
   Russian `Фетч` and `О программе`, retaining locale parity.
5. Apply precisely `cargo fmt`-compatible Rust whitespace changes,
   no Rust semantic modifications. Use focused test reruns first,
   then one fresh final full STABLE run **on Node26.13.0** on the
   owner's machine or trusted CI. This ChatGPT environment does not
   have a repo checkout with installed cargo.

No notification schema/API changes, no production behavioral changes,
no unrelated feature work, no `main`/tag/release changes.
Rollback: revert the scoped test/formatting commits independently
of this documentation change. The owner's successful Rust tests
already establish semantic native compilation on `c5f5606`,
not a new green final gate after source amendments.

## Validation and rollback

Use deterministic tests for scan/monitor isolation, progress semantics and cancellation, both tray menu orders, and translation key integrity. Relevant suites: `node --test tests/*.test.mjs`, `cargo test --workspace`, and `python3 -m unittest discover -s tests -v` (only if available locally or in trusted CI). A source-level change without executed checks is **PARTIAL**, never complete. Do not commit verbose tracing; use the existing opt-in `REPOTICKER_STARTUP_DEBUG=1` to measure local scan and monitor milestones without logging paths, tokens, repository names or runner inventory. Roll back the scoped functional commit independently of this document if required.

## Approved decision: one opt-in CI notification mode (2026-11-07)

The owner approved **Option B with no migration**. Persist a single enum `ci_notification_mode` with values `off`, `failures`, `successes`, `both`, defaulting to `off`. An older `ci_failure_notifications` field must be ignored, even when it was `true`; do not copy it or enable notifications. Other local settings, monitor scope, and OS credentials remain untouched. A later settings save may naturally drop the ignored unknown field. Reject invalid values on the native Settings command; fail closed on unknown persisted enum states.

Use a single labelled Settings select, transactional Apply/Cancel, and locale-complete labels for all twenty supported languages. A changed setting requires a native config event; no GitHub auth regrant should be necessary.

Notifications are only for the explicit conclusions `failure` and `success`, and only when that conclusion is selected. Restrict native IPC by currently persisted mode, monitored organization and repository selection; never accept arbitrary notification strings, links or provider payload. Independently deduplicate each `repository + run_id + run_attempt + conclusion` fact. The first successful observation after launch, scope/mode switch or provider recovery establishes a silent baseline; transient stale API responses must not create duplicate alerts. Keep bounded memory, provider request bounds and no extra API requests when notifications are off.

A successful GitHub workflow run must not be confused with a successfully completed local Git Fetch. These notification preferences affect GitHub Actions only. Avoid verbose operation logs and sensitive values.


## Follow-up: CI notification recovery and Mode B regression map

The approved opt-in enum and per-conclusion native guard remain unchanged. Existing
source-level tests covered launch baselines and mode changes, but a focused
reproduction found a recovery regression: after a **previously successful**
repository snapshot, a failed completed-run read retained its old tracker
history. Subsequent recovery incorrectly alerted on completions from the
unobserved interval. Whole-monitor task/API failure has the same potential
because it skips notification observation without clearing historical state.

Plan: clear **only the affected repository's** tracker history after a failed
completed-run read; preserve unaffected repositories' dedup history. When a
task/all monitoring cycle cannot provide trustworthy job coverage or provider
scope, reset notification history before a future successful poll. Runner-only
refreshes retain the existing independent task baseline. No extra REST calls,
persistent queues, logging, window changes or stored notification history.
This enforces the already-approved silent-on-recovery behavior.

Mode B risk mapping for this incremental feature (historical
`MODE_B_MATRIX.md` and `MODE_B_COVERAGE.md` remain in Git history,
not in the current public docs tree):

| Class | Required notification scenario | Test owner |
| --- | --- | --- |
| Positive | A new selected success/failure after valid baseline emits once | `tests/ci-failure-events.test.mjs`, `tests/ci-native-integration.test.mjs` |
| N1/N2 | Invalid mode, run ID, attempt, duplicate run facts, page/identity bounds reject | JS tracker + native Rust scope tests |
| N3/N5 | One repo fails, other remains live; recovery baselines silently; late refresh cannot rewind selection | JS tracker and monitor integration |
| N4 | Repeated identical poll, corrected conclusion, restart/mode switch do not replay | JS tracker |
| N6/N7 | Invalid UTC, malicious repo identity, unauthorized owner/conclusion never notify | JS collector and native Rust guard |
| N8/N9 | Time validity, disconnect, rate limit and permission failure respect silent baseline | JS tracker/monitor integration |
| N10 | User-selected mode and 20 native notification translations | Settings and localization tests |
| N11 | Not applicable: no paid notification entitlements | Contractual N/A |
| N12 | Native notification permission/delivery and OS window interaction require Linux/Windows physical evidence | Native tests and platform acceptance |

This is a **feature-specific test matrix**, not a claim of 100%
repository-wide branch coverage. Historic 2026-10-29 measurement was
60.95% JS lines, 56.34% branches and 48.22% functions on the specified
source. The owner’s earlier Mode B work should not be described as
unperformed; new code still needs its own exact-source execution evidence.

Recovery fix: [`26038df`](https://github.com/morozhenko-apps/repoticker/commit/26038df2bd53f0ec0f4963bd74611889f4c2e906).
An error in a single repository's completed-run API read clears only
that repository's notification history; global task/transport failure
clears the alert tracker, and runner-only polling preserves it.
The existing source tests also acquired an exact `conclusion` field
assertion, previously omitted from the expected alert structure.

Execution boundary: isolated GitHub-sourced JavaScript evaluation in the
connected tool environment executed **19 tracker tests, 11 monitor/native
integration tests and 9 Settings visual contract tests, all passing**.
The integration harness substitutes external I/O and asynchronous event
loop scheduling and is therefore focused diagnostic evidence, not a
Node test runner result. No Rust/Cargo compile, full STABLE suite or
installed KDE/Windows acceptance was executed for this commit.


## Implementation evidence (2026-11-07)

- Documentation-first plan: `0d719ef9a715b4146ca0364369bea23810c83e28`.
- Spinner isolation, Fetch percentage and cancellation accessible name, native Linux/Windows menu order, Russian labels and associated tests: `7bf604db29c563d8d417d81c5dad6f4fed4a2207`.
- Frameless About with scoped native drag permission, close-only UI, 20 localized accessible Close labels and associated tests: `86f57bdfbee467304055cd81a8c10653492aa052`.

**Current state: PARTIAL / unverified installed runtime.** No full Node/Rust/Python CI suite or KDE/Windows physical acceptance has been executed in this ChatGPT environment. No release/tag/main change was made. The single four-choice opt-in CI alert mode has replaced the old persisted boolean. A passing source diff is not a passing validation gate.

- Mode-selection decision documented before source changes: `c8c06a92f4dc07503bd785aafd63874d107d0180`.
- Native config, GitHub monitor, per-run conclusion tracking, localized option labels and native notification templates, plus related test contracts: `3253bc2d870106c53ad15314fd9d62352ce04f18`.
- Focused offline validation in the connected ChatGPT JS environment: transformed source syntax parses for the tracker, monitoring, Settings and locale catalog; tracker simulated baseline, both conclusions and deduplication; validated notification templates contain all three placeholders in all 20 locales and option text exists across 18 non-EN/RU locales. This does **not** replace Node test execution or Rust compilation.

## Ubuntu Mode B repair evidence (2026-11-07)

Owner-supplied `c5f5606` log: 561 Node tests, 538 pass and
23 fail on Node v24.22.2; Rust core 71 unit + 30 Git integration +
3 remote integration tests pass; Rust native 69 pass; Cargo check
passes; Rust format check fails with five reported formatting hunks.
The initial isolated JS evaluation did not replace this real execution.

- `3ee844de69de918953e4ea3e171732ea65f09902`: restored the
  preexisting Mode B and Settings integration scenarios with the
  approved four-choice `ci_notification_mode` contract. Preserved
  failure handling, scope, identity, atomic save/Cancel and test input
  bounds, including an explicit legacy Boolean `true` fixture which
  must still default to `off`. The changed recovery invariant
  requires a silent first snapshot for the previously unavailable repo.
  Healthy repositories must continue alerting.
- `9d8db09f56a18d7e321aa3105ce0d4bf443040fa`: updated old Fetch
  cancellation/percentage source expectations, local-only Repos busy
  signal, approved Russian Fetch and About text.
- `70d9749fba2b4ee2ca7e7c2a323fb3cc76cbca87`: adopted the exact
  Rust formatting shown by the owner's `cargo fmt --all --check`
  output. No Rust behavior or API change.

Focused diagnostics against the new GitHub source with real production
JS and injected external I/O: 9 Mode B notification-history scenarios,
3 Mode B monitor scenarios, 12 Settings integration scenarios passed.
Static review confirmed six UI invariants. These are **isolated
tool-environment checks**, not a new Node test runner/Cargo result.
Real per-platform release acceptance is not performed. There is no
verified whole-suite green run for the new tip; `main` and published
artifacts remain untouched.

Next exact-source gate: use Node **26.13.0** as pinned in
`docs/CI.md` and the Preflight workflow, execute the STABLE Node suite
once, check `cargo fmt --all --check`, and report results.
Only rerun relevant Rust tests if subsequent source changes warrant it;
the owner's Rust tests passed before the test-only/format-only changes.
Do not infer CI outcomes from push events or query active jobs repeatedly.


## Ubuntu follow-up: three format-sensitive tests (2026-11-07)

Mode B / Testing only. Local owner run at exact `dev=476f7d4`:
`node v24.22.2`, **562 tests / 559 pass / 3 fail**.
The owner attempted `nvm install 26.13.0` and `nvm use 26.13.0`;
both failed because `nvm` is not installed. `cargo fmt --all
--check` produced no diff after the Node run, consistent with clean
formatting (separate shell commands lack explicit exit codes in this
pasted transcript).

Failure map:

- `tests/ci-native-integration.test.mjs` and
  `tests/locale-counts-and-notifications.test.mjs`: same exact
  one-line `notification_text(...)` regex now mismatches a
  rustfmt-produced multi-line call. Its arguments, ordering, native
  mode check and authorization boundary remain intact.
- `tests/git-fetch-cancel.test.mjs`: stale assertion
  `cardText(cardLanguage, fetchCancelling...)`; production card
  now uses `fetchCancelling` as a separate title / accessible label
  ternary while keeping the button text as operation progress percent.

Diagnostics: confirmed actual Rust call, title/aria-label and unchanged
native `cancel_git_fetch` source. Alternatives considered: missing
native invocation, lost cancellation semantics, corrupted fixtures,
wrong revision, incompatible Node syntax and stale exact-source tests.
The evidence confirms the final cause; this change is **test-contract
maintenance only**, not production repair.

Plan: (1) tighten both Rust-source assertions to accept Rust
whitespace and optional trailing comma while still asserting the
exact five ordered arguments, (2) verify both Fetch title and
aria-label instead of matching an obsolete inline-label expression,
(3) perform one final focused local source contract validation, then
commit tests; (4) await owner's final Node/Cargo gate and KDE OS
acceptance. Rollback is an independent test-only commit revert.
No native config, notification schema, UI behavior, account scope,
or release flow may change in this repair.


## Three-test correction receipt (2026-11-07)

Implementation: [`d3990d6`](https://github.com/morozhenko-apps/repoticker/commit/d3990d6d791997f3ed2ae13d304d4be401b50f82).
Exact source examination confirmed that the Rust invocation still passes
five ordered arguments to `notification_text`, and Fetch still has
both the native cancellation IPC and the tooltip/accessible cancellation
labels while its visible action label shows percent complete.

Only three existing source contract test files were edited:
`tests/ci-native-integration.test.mjs`,
`tests/locale-counts-and-notifications.test.mjs`, and
`tests/git-fetch-cancel.test.mjs`. The assertions now tolerate
Rust formatting, preserve exact argument order, and require both Fetch
title and aria-label to expose the cancel state.

Focused verification: new regular expressions matched the exact
production source files read from the immutable `eecea7d` commit;
all three JavaScript test files parsed after replacement. This is
not a Node test runner pass. Native binary behavior is unchanged.
The owner must still run the complete STABLE gate on the final SHA
and visually accept the KDE Wayland behavior before marking Issue #21
complete. `nvm` is not installed in the owner's observed Ubuntu shell,
so Node26.13.0 has not yet been used for this gate.


## Owner-confirmed final Node and rustfmt gate (2026-11-07)

On an Ubuntu host, the owner executed the STABLE JS command from the
`dev` tree at exact SHA
`12ffe39c3c51ebd3d77d1568a7cfed8b7b980658` after `git pull
--ff-only`. A locally installed, official
`node-v26.13.0-linux-x64.tar.xz` archive passed the published
SHA-256 manifest verification. Node reported `v26.13.0`.

- `node --test tests/*.test.mjs` on **v26.13.0**:
  **562 tests, 562 pass, 0 fail, 0 skipped/cancelled**, total
  duration `2255.060149 ms`.
- `cargo fmt --all --check`: no diff/error output; the command
  group was run with `set -euo pipefail` and returned to the prompt.
- The three previously failing source-contract tests now pass:
  `Given WebView alert data When native delivery runs Then permissions
  and config gate OS plugin`, `all CI notifications preserve provider
  run identity and opt-in scope`, and `existing four-button card reuses
  Fetch as Cancel without interrupting Safe pull`.
- Earlier source revision `c5f5606` passed 71 core unit, 33 core
  integration and 69 desktop Rust tests plus native Cargo check; later
  Rust changes were formatting only. These are reused earlier test
  results, **not a new exact-SHA Rust execution**.

**Gate status:** STABLE JS on Node26.13.0 **PASS**, rustfmt **PASS**.
Linux KDE/Wayland installed-bundle UI and native OS notification
permission/delivery acceptance **NOT YET VERIFIED**. Windows
installed-bundle acceptance, any applicable final Python
distribution-contract check and exact-SHA remote platform CI evidence
are also not established by this local Node execution. Therefore
the UI regression batch and Issue #21 stay open; this is not
authorization to publish a release or modify `main`.
A source-only test pass must not be presented as full Mode B
branch/coverage completion. Rollback remains per prior atomic commits.



## QA DEB installer stale version guard (2026-11-07)

**Mode A / corrective tooling maintenance.** The owner executed
`bash scripts/install_qa_linux.sh 42417534851
14737da90be479ac4870b848e62042193e3be4e4`.
The workflow produced the exact-version artifact
`repoticker_1.0.0_amd64.deb`. The installer reported both Linux
SHA-256 sidecar checks as `OK`, then refused installation with
`Unexpected DEB package`. No package install was attempted.

Five considered causes: corrupted archive, mismatched source SHA,
wrong Debian `Package`, stale version expectation, or running/
conflicting installed binary. The first two are excluded by the
successful source/sidecar gates; the last is not reached. Direct
source comparison confirms an exact `repoticker_0.2.0_amd64.deb`
filename and `Version=0.2.0` check, while
`scripts/release_version.py` and the Tauri/Cargo project
configuration derive current `1.0.0`; release-asset collection
already uses that same authoritative version.

**Plan** (no version/schema/provenance relaxation):
1. Keep mandatory `gh run` success and exact `SOURCE_SHA.txt`
   equality; keep `sha256sum -c -- *.sha256`, the legacy package
   conflict check, running-process rejection, canonical binary
   verification and post-install launch.
2. Read the authoritative synchronized version from the installer
   checkout via `scripts/release_version.py`, independent of
   current working directory. Construct a **single exact** expected
   `repoticker_${VERSION}_amd64.deb`; validate Debian
   `Package=repoticker`, `Version=${VERSION}` and
   `Architecture=amd64`. A different checked-out version or
   unrecognized artifact must remain a hard failure, not a wildcard.
3. Extend the existing Linux QA installer regression contract to
   require synchronized version derivation and reject 0.2.0 pins.
   Use focused syntax/source checks. No remote candidate rebuild is
   needed since only the installer script/tests change.
4. Record a post-change receipt separately; owner installs the
   already verified run on Ubuntu, then performs KDE UI acceptance.

**Rollback**: revert the isolated installer/test commit, preserving
this diagnostic record. Do not alter `main`, release tags,
production distribution, Rust app behavior or CI workflows.


## QA DEB installer correction receipt (2026-11-07)

- Documentation-first diagnosis: `977c44635b671852020ad89ac401fb710b72361c`.
- Fix: `518917724ab11684e41cef2bd07aeacc0aac1f06`.
  `scripts/install_qa_linux.sh` now executes
  `scripts/release_version.py` to derive the exact current
  synchronized Cargo/Tauri version, independent of shell working
  directory. The filename remains canonical, the Debian
  `Package`, `Version` and `Architecture` checks are strict,
  and all earlier receipt/checksum/legacy/running-process and
  installed-binary gates are untouched.
- Targeted regression: `8c0317cd9bf77915f6ea1858d24d35b2e276c231`
  adds a direct contract asserting dynamic version sourcing,
  exact filename and exact Debian metadata guards, rejecting the
  obsolete `0.2.0` filename. Focused evaluation of the actual
  source and new regex assertions passed in the connected tool
  environment. This is **not** proof of a full Node/Cargo run
  or an installed runtime.
- The existing 7 November acceptance workflow
  `42417534851` was successful, with Linux and Windows
  artifacts generated from exact SHA `14737da90be479ac4870b848e62042193e3be4e4`.
  The fix only affects local QA tooling and tests, so a new
  native bundle is unnecessary. Re-run focused
  `node --test tests/linux-qa-installer.test.mjs` and
  `bash -n scripts/install_qa_linux.sh` on Ubuntu before
  executing the corrected script using the existing run ID
  and recorded source SHA.
- Await actual Debian installation and KDE Wayland physical
  acceptance. Do not claim a native install or release success
  based solely on the earlier SHA checks.


## Follow-up: KDE notification alignment, cached Repos reads, CI indicator, Hybrid (2026-11-07)

**Mode A — Feature / UX correction**, owner-observed physical KDE
candidate. Work is strictly on `dev`; no tag, release, main, or
production infrastructure changes.

### Diagnosis

The CI notification selector is the only GitHub choice whose
closed native `select` retains default WebKitGTK control painting:
the existing aligned native selectors already share a custom
34px closed control, but `.ci-alert-controls select` is excluded.
The CI label is also a wrapping flex row instead of a
two-column grid. Plausible causes: native block insets, flex
wrap, unequal label column, inherited line height, locale/RTL,
or platform-specific decoration. Source-level comparison favors
the first three; physical compositor validation remains required.

The Repos spinner currently receives `aria-busy=true` on **every**
local `get_snapshot` read. Causes considered: single-flight scan
busy callback, repeated config invalidations, Git-action rescan,
startup scan, monitor-driven request, and lack of initial-cache
visibility state. Code confirms the busy callback plus absence of
`firstSnapshotReady` gate. GitHub monitoring is already isolated
and must stay isolated. The list has no independent in-progress
status, so subsequent scans visibly spin the compact action.

The green `✓` in a local repository row indicates **clean and
up-to-date local Git refs**, *not* a successful GitHub Actions
workflow run. Replacing it with a last-workflow failure cross
requires a defined per-repository CI provenance/status, freshness,
scope and permission contract. Do not overwrite the Git meaning,
fabricate a successful latest run from absence of results, or
reuse the optional CI notification polling as an authoritative
per-repository latest-run feed. Keep this change out of the
unblocked CSS/local-scan patch until a design decision.

`Connection mode` currently offers Simple polling and a
**disabled/unavailable Hybrid** option. Both relay adapters are
not implemented and the Cloudflare adapter replies HTTP 501.
Prior high-level Hybrid plan covers signed GitHub webhook,
self-hosted relay/WebSocket and REST reconciliation, not a
final accepted authentication, tenancy and persistent protocol
contract. Activating Hybrid or accepting a Worker URL before
these security boundaries is a STOP FACTOR. Do not persist
secrets in the WebView or expose an unverified webhook.

### Unblocked UI plan

1. Bring the CI mode closed select into the existing shared,
   keyboard-accessible 34px selector paint/focus/forced-colors/
   RTL contract and align label/control to the existing
   two-column GitHub form. Keep its four native options and
   transactional Settings semantics.
2. Keep the Repos glyph spinner **only until the first successful
   local snapshot is cached in this card process**. Every later
   rescan keeps previous repository rows available, even when
   changing configuration or finishing Git actions. Show a
   localized in-list `Refreshing` status while source work runs;
   on first empty load show that status instead of a false
   `no repositories` result. After a failed first read do not
   invent authoritative emptiness or cached data; retain
   existing failure notice. The status must never be tied to
   GitHub monitor refresh or mutate Git state.
3. Keep existing card size, menu and independent GitHub metrics;
   add/adjust deterministic source regression assertions.
4. Record scoped commits and focused validation. Do not rebuild
   native candidates until the owner reviews the UI and the
   architectural blockers below.

### Deferred architectural choices

A) Define whether a latest GitHub Actions failure should be a
**separate CI status** (local Git check stays green) or whether
the repository-row status icon changes semantic meaning to
**latest CI workflow run** (losing the Git clean indication).
This also requires choosing a bounded, authenticated read-only
source, scope and unknown/stale semantics.

B) Hybrid relay contract must specify authenticated clients,
per-tenant isolation, replay/dedup bounds, signed GitHub delivery,
recoverable REST fallback and user-owned secret provisioning.
Alternatives to be presented for owner choice before
implementing a persistent public contract. Existing disabled
mode remains disabled.

Rollback: revert each isolated UI commit; no source Git-core
changes, credentials or GitHub API permission changes.


### Safe Hybrid groundwork without enabling a public endpoint

The owner explicitly requested continued implementation of connection mode.
The previously agreed read-only design mandates GitHub
`X-Hub-Signature-256` HMAC verification on **original HTTP body bytes**
before any webhook delivery can be acknowledged. This verification
primitive can be independently implemented and tested without choosing
a public endpoint/transport/storage/authentication contract.
Keep the existing Cloudflare Worker `501` handler, hidden Worker URL,
unavailable Hybrid selector and existing polling unchanged.

Plan: add a provider-independent, Cloudflare-Worker-compatible pure
async verifier using WebCrypto's HMAC SHA-256 `verify` (no ad-hoc
timing-sensitive string comparison); reject missing, multiple,
malformed or incorrect signatures, missing secret and wrong body;
retain exact raw body, including Unicode and whitespace; add
Node-based deterministic negative and known-vector tests. Do not
log secrets or bodies. Leave delivery ID dedup, per-tenant routing,
bounded payload/read, WebSocket client authentication and REST
reconciliation for the approved next architectural decision.

No deployment, Worker secret provisioning or HTTP POST success
responses in this incremental work. The verifier by itself is NOT
a functional Hybrid connection mode.


## Scoped follow-up implementation receipt (2026-11-07)

- `325c9c10bec7bac61da65f854c3a70407cb98fff`:
  the native CI notification `select` now shares the closed
  34px CSS paint/focus/forced-colors/RTL rules and aligned
  two-column grid of other GitHub selectors. It remains one
  keyboard-accessible native `select` with the existing four
  choices and transactional Save/Cancel. Updated its
  deterministic CSS contract tests.
- `596fa2bb5d8193ef47f08ba403f5a2dede506f98`:
  added `shouldSpinForRepos(scanActive, hasCachedSnapshot)`.
  The compact action spinner indicates **only the initial
  uncached local snapshot**, not repeated work. In-drawer
  `repo-scan-status` uses the preexisting twenty-language
  `refreshing` key during every source scan, retaining
  existing rows, Git cancellation, scan coalescing and
  nonmonitoring boundary. Added its four-state matrix and
  source contract checks. Cache is **process memory**, not
  persistent on-disk state; an actual new launch has no
  snapshot until its first successful read.
- `c00470a1961c687bea851c8e26fb8e4822a6ef4a`:
  added Cloudflare-compatible pure WebCrypto
  `verifyGithubWebhookSignature` over the unmodified
  `Uint8Array` payload, with strict lowercase 64-hex
  `sha256=` header and nonempty secret. Invalid data fails
  closed; no arbitrary body parsing or logs. The Worker
  endpoint itself remains `501`, and Hybrid Settings
  remain unavailable. No credentials, persistence,
  REST cadence or network scopes changed.
  Node `v22.16.0` isolated test execution in a clean
  disposable local sandbox **matched both exact Git blob
  hashes** (`fb10ad624fb5763b09db9254cd196f8b582be136`,
  `5d5039f402f5a5c0fb1ee0172b91c52ea58c2bdb`).
  `node --test tests/relay-webhook-signature.test.mjs`:
  **5 pass / 0 fail**. Sandbox removed after the run.

Focused connected-tool source checks for the CSS,
first-snapshot state machine and in-drawer status passed
(12 explicit assertions plus syntax checks of both
changed test modules). These are not a full Node26.13.0
STABLE gate, full Rust/Python gate or physical KDE
acceptance.

**Remaining unresolved architectural STOP FACTORS:**
The green local Git `✓` has no GitHub Actions semantic,
so the requested red cross needs owner choice on a
separate CI result signal versus redefined combined
status. The future WebSocket/relay authentication and
tenant isolation model needs an approved persistent
security protocol before enabling Hybrid/Worker URL.
Do not publish the existing 1.0.0 native artifacts as
containing these newer code changes.

Owner's next local gate: pull current dev; run pinned
Node26.13.0 `node --test tests/*.test.mjs`, verify KDE
UI directly; no release or native candidate build
until the applicable review/acceptance gate is ready.
