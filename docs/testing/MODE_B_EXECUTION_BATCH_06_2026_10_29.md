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
