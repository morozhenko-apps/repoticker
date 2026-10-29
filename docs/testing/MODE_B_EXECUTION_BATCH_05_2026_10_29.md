# Mode B batch 05 — async billing ownership and notification monotonicity

**2026-10-29; source baseline:** `01adab6c57c6caac46bba569a35e53d2e52ac1f0`.
Mode B testing; all docs/code/tests will form a commit chain before
a **single** fast-forward of `dev`. Do not poll GitHub Actions or publish
`main`, release tags, APT/R2 or real credentials.

## Root cause analysis

Read `createBillingCache` / `collectBillingUsage` in
`github-billing.mjs`, its controller `quota.mjs`, the existing
`github-billing.test.mjs`, `mode-b-resilience.test.mjs`, and
`ci-failure-events.mjs` with its tests.

**Observed implementation seam:** `createBillingCache` uses a
monotonic generation only on explicit `clear()` or disconnected
`load`. Switching a connected account (or crossing a UTC billing
month) changes the `key`, but not the generation. Two overlapping
`load("old", true)` and `load("new", true)` can resolve out
of order; the *older* pending response then writes `saved`
after the current response. The detached tooltip's normal event
path usually calls `clear()` on scope change, but that is a
separate caller guard: the reusable cache's own documented
"isolate account switches" contract is incomplete. The same
race is possible across a month key change. A negative wall
clock delta also incorrectly qualifies as a fresh TTL hit.

Alternatives reviewed: GitHub native ETag generation is independent;
deferred HTTP not broken; UI repaint guards already exist;
billable/remaining minutes are deliberately not inferred;
relying on controller-only clear is a fragile second guard
(**selected root cause**). No change to GitHub API, quota model,
identity, permission or native IPC is necessary.

## Decision / safe implementation

Introduce a single **active cache key** (`organization+UTC month`)
inside `createBillingCache`. When it changes, advance generation,
drop the saved result and pending request atomically. A late
response may resolve to its *original caller* but must not mutate
the active cache. Preserve coalescing of parallel equal-key reads
and the explicit disconnect/clear generation barrier. Require
`0 <= elapsed < ttlMs` to use an entry; a reversed clock cannot
make cached billing data look new indefinitely.

Add a single new deterministic Node regression suite using
injected fake clock, delayed promises, fake `get(path)` and
synthetic account IDs. Do **not** weaken current tests. Include
billing permission isolation, data bounds and scope, and CI
tracker atomicity/conclusion/attempt boundary checks. No
network requests, secrets, persisted formats or OS dependency.

## Scoped N-category / interaction cases

| Artifact | Positive | N1 malformed | N2 bounds | N3 network | N4 retries | N5 async race | N6 corrupt | N7 account | N8 clock | N9 cancel | N10 privacy | N11 billing | N12 storage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| createBillingCache | existing | add invalid ttl | add ttl equality | existing | add failed read backoff | **add old/new and reverse** | add stale | **add scope switch** | **add month/reverse clock** | add clear/disconnect | existing | unknown not zero | N/A in-memory |
| collectBillingUsage | existing | add malformed identity | add 500/501 | add denial cases | N/A provider | existing | add corrupted usage | add case identity | add UTC | N/A pure | add provider isolation | add unknown allowances | N/A |
| createCiFailureTracker | existing | add duplicate/malformed | add 200/201 history | add unavailable repo | N/A | add reused baseline | add invalid batch | add scope reorder | add changed attempt | add reset | add sanitization | N/A free | N/A in-memory |

## Evidence / rollback

Reproduce out-of-order stale result with the old source and
verify the new test fails. Run the entire new case batch against
staged production functions under a focused isolated JavaScript
runtime; record exact counts and limitations. Existing full Node
24 STABLE and Rust/Python/native execution remain external
exact-SHA requirements. Do not claim green CI by inspection.

Rollback only the production fix/test commit. The source
repair is display-cache-only and does not change native
credentials, Git roots, API routes, release state or app data.
Physical Windows/KDE and independent L10N reviews remain after
Mode B and before the final v1 release.


## Implementation checkpoint — consolidated batch 05

**Code and regression commit:** `bfa238421a70985dff62fb71616bef57238e4d25`.
The reusable billing cache now has a single active `organization / UTC
month` ownership key. Switching connected scope or month advances
generation and clears obsolete results/pending identity; a delayed
previous request may return to its original caller but can never
rewrite the new cache. A backwards clock jump no longer counts as a
fresh TTL hit. Native ETag, GitHub permissions, displayed allowance
semantics, provider errors and persistent configuration are untouched.

**22 added deterministic JS tests** in
`tests/mode-b-billing-auth-races.test.mjs` cover out-of-order
two-account results, a switch back while the first request is
pending, duplicate same-key requests, explicit clear/disconnect,
an overlapping UTC billing month, reversed clock and exact TTL,
admin/personal usage failures, provider malformed and unsafe paths,
known zero versus unknown, CI notification baseline and run attempt
deduplication, account switching, invalid observation atomicity,
temporary API errors and provider-message redaction.

**Focused execution evidence:** **22/22 passed** in an isolated V8
harness that evaluates the actual staged JS source and test bodies.
The same 22 test bodies were run against the pre-fix `01adab6c57c6caac46bba569a35e53d2e52ac1f0`
source: **5 failed as expected**, specifically the three connected
scope ownership races, month-overlap race and backwards clock TTL
bug; 17 unrelated compatibility/positive scenarios passed. This is
scoped old-code/mutation evidence, **not full mutation coverage**.

**Not executed:** full `node --test tests/*.test.mjs` Node 24,
Rust unit, fmt/Clippy/desktop, Python release tests, platform UI
acceptance and native 20-locale review. Exact-SHA Preflight result
must be separately observed/received; agent must not poll.
Global Stage 3–8 artifacts and R2 concurrent creation /
`latest.json` failure recovery remain unresolved release gates.

**Submission:** the docs and code/test commits were staged without
intermediate `dev` updates. A single final fast-forward of `dev`
submits this whole batch to CI. No `main`, tags, secret access,
real GitHub/R2 operation or signed publication was modified.
