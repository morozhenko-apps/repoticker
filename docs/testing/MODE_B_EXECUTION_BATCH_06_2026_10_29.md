# Mode B — native GitHub authorization and REST robustness (batch 06)

**Date:** 2026-10-29. **Source baseline:** `2d3c8716f66b6cba3196ecfd7541e34c785cc36f`.
**Primary mode:** B — Testing. User requires a large consolidated
test submission, exactly one final `dev` fast-forward and no
intermediate runner-triggering pushes. Windows/KDE and independent
20-locale acceptance follow Mode B.

## Analysis / existing assertions

Read the actual source in `github_session.rs`, `github_etag_cache.rs`,
`github_rate_gate.rs`, `github_api.rs`, `github_oauth_wire.rs`,
`github-monitor.mjs`, plus existing native and JS regression tests.

Existing source contracts already serialize credential reads, rotations
and disconnect via `vault_gate`, tie ETag snapshots to the same auth
generation, redact provider response bodies and route GitHub REST
through a strict read-only path allowlist. Existing tests confirm basic
same-generation 304, auth invalidation, client reuse, OAuth reply
vocabulary and asynchronous monitor scope switching. Their presence
is not a CI PASS.

**Risks for incremental negative testing:** ETag path/size cap and
eviction under multiple paths; weak/malformed ETag input; billing
must never be conditionally cached; stale old-generation data with
successful new account reads; HTTP 403 permission versus rate 429,
retry-after precedence and nondecreasing rate cooldown; OAuth
authorization/code boundaries and token validation with arbitrary
provider error details; GitHub REST route allowlist and exact
projection fields; native auth manager generations and failure
redaction. Async JS monitor revision behavior is a separate UI
observation invariant, not an OS keychain test.

## Stage 3–8 scoped tests (no whole-project coverage claim)

| Production seam | P | N1 malformed | N2 bounds | N3 HTTP | N4 retry | N5 race | N6 corrupt | N7 auth | N8 time | N9 cancel | N10 secrecy | N11 paid | N12 disk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GitHubETagCache | existing | add ETag | add LRU/sizes | N/A pure | add cache eviction | add multiple generations | add wrong path | add scope | N/A | add invalidate | add private/noncacheable | N/A free | N/A memory |
| backoff_duration / gate | existing | add bad headers | add upper/exact | add 403/429 | add extend | add concurrent monotonic | add overflow | add permission | add reset time | N/A | add no raw header | N/A free | N/A memory |
| OAuth wire parse | existing | add malformed | add code/lease | N/A parser | add slow_down | N/A | add invalid fields | add token type | add expiry | add denied | add no secret debug | N/A free | N/A pure |
| REST path/project | existing | add unsafe URLs | add 100/101 | N/A pure | N/A | N/A | add bad JSON fields | add route allowlist | add year/month | N/A | add projected secrecy | N/A free | N/A pure |
| GitHubAuthManager | existing | N/A typed | add overflow boundary | N/A pure | add lifecycle | add parallel epoch | N/A | add status | N/A | add cancel | add redacted phases | N/A free | N/A memory |
| JS monitor revision | existing | add invalid events | add forced requests | add partial | add backoff | add race | add stale data | add scope transitions | add synthetic clock | add disconnect | add provider text | N/A free | N/A pure UI |

## Implementation and validation

1. Add tests to the actual native Rust `#[cfg(test)]` modules;
   avoid behavioral/contract modifications to auth, cache, credentials
   or route policy without a confirmed defect.
2. Add targeted deterministic Node monitor tests with injected
   `invoke`, `event`, `collect`, clock and notification callbacks.
   Verify stale outcomes do not mutate the new account and no
   notification goes to a disconnected account.
3. Preserve all current tests. Keep synthetic data only and avoid
   real GitHub credentials, keyring writes, network, R2 and Git changes.
4. Assemble docs plan, code/test commits and docs completion report
   off-branch, then advance `dev` with **one** `update_ref`.
   No CI polling. Do not claim Rust suite passed without cargo.
5. At the final local gate, run available focused JS source tests;
   native Rust tests require actual externally observed cargo
   execution on the submitted exact SHA. The full Preflight
   (Node 24, Rust, Python release, desktop compile) is not
   substituted by source inspection or isolated V8.

**Open beyond this batch:** exhaustive global Mode B branches/mutation
evidence, cross-writer immutable R2 publication atomicity,
`latest.json` failure recovery and deferred OS/locale acceptance.
No new architecture or public release is authorized.

**Status at plan creation:** no executable changes submitted.


## Implementation checkpoint — batch 06 ready for exact-SHA Preflight

**Code/test commit chain (staged before one branch update):**
- `737959119f15de6821273fb76004b78250ab5fbd` — 15 native Rust tests.
- `89550a8fb55d5ef214573d4df0eda08921695915` — focused native fixture correction.
- `3e4219aea28ad14f61e1312af8dccf83fdeac993` — 12 JS monitor interaction tests.
- `eea7dccdd4a95825e983a27d2bd35702c15582b2` — align simulated native disconnect status with auth event.
- `057efe4691af50db0c60ebbc9558cf60fdec1be5` — remove scheduling-sensitive tight-time expectation from the concurrent quota test.

**15 added native Rust tests**: 3 ETag cache generation/path/billing
boundaries, 3 native rate-limit header/permission/concurrency
boundaries, 3 OAuth response/token/debug redaction checks,
4 native GitHub API route/allowlist/projection checks, and
2 auth manager generation/sanitized reason checks.

**12 new JS tests** in `tests/mode-b-native-monitor-races.test.mjs`:
initial disconnected versus connected snapshot, invalid refresh kind,
forced refresh coalescing, delayed result after native logout,
account scope/config changes while an async response is pending,
rate cooldown under forced refresh, failed task refresh unknown
semantics, notification opt-out, observed baseline versus one new
CI failure notification, and denial of a late notification after logout.

**Focused execution:** **12/12 new JavaScript tests passed** in an
isolated V8 harness that loads the actual staged production
functions from GitHub and evaluates the test bodies. The initial
11/12 check found a fixture mismatch: the fake auth event reported
a logout without changing the fake `github_auth_status` outcome.
After correcting both signals to represent actual native logout,
12/12 passed. The production monitor code was not changed.

**NOT executed here:** the 15 new Rust tests, `cargo fmt --check`,
`cargo clippy`, native desktop compile, full Node 24 STABLE,
Python release tests, complete Preflight, installed OS UI/locale
acceptance and full mutation/branch gates. No `cargo` or
`rustfmt` is available in the current container. Source review
and a focused V8 run are not substitutes for Rust execution.

**Scope:** tests only, no production auth, security/persistence
contract, GitHub App config, Git actions, signed release or R2
object changes. Full 20-locale and Windows/KDE acceptance remains
after Mode B but still blocks publication. R2 external
immutable-writer atomicity and `latest.json` readback
failure recovery remain separately unresolved release risks.

**Runner discipline:** all code and documentation commits were
staged before updating the branch. Publish exactly once with
a fast-forward of `dev` at the end. CI status is deliberately
not polled after that publication.
