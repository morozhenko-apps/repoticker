# Mode B — consolidated resilience test batch 02

**Date:** 2026-10-29. **Baseline:** `b1c8ca2cb7abf384148145ac0fe9474cdee8502b`.
**Primary mode:** B — Testing. The user requires large validation batches,
a single final push, and no runner churn from intermediate commits.

## Source analysis and decisions

Inspected production and existing test assertions for:
`github-billing.mjs`, `ci-failure-events.mjs`,
`github-monitor.mjs`, `github-installations.mjs`,
`runner-state.mjs`, `scan-refresh.mjs`,
`monitor-presentation.mjs` and native `github_etag_cache.rs`.

Existing tests already cover ordinary billing cache coalescing,
a normal month change, 429 cooldown, disconnect and scope-switch
monitor races, CI failure baselines, a limited pagination sample,
runner coverage independence, ETag generation and late HTTP 200
suppression. **Do not duplicate existing named positive tests.**

The remaining targeted branch and interaction risks are:

1. **Billing cache under concurrent account changes:** a late
   old-generation request may not replace a newer account's
   cached result. Exact `TTL-1` and `TTL` boundaries and
   UTC month transitions must not suppress mandatory refreshes.
   Unknown plan/usage versus a valid reported zero remain distinct.
2. **CI notification observations across temporary failures:** a
   failed repo page must not erase a previously established
   baseline or generate new alerts from unobserved history.
   A restored repo preserves the run/attempt dedup contract.
   The parser must refuse malformed or cross-repo inputs before
   sending a notification.
3. **Native ETag cache identity:** 304 reuse must require the
   current auth generation, exact path and exact matching ETag;
   invalid replacement metadata evicts the stale entry rather
   than enabling older projected data. At the exact 64 KiB
   projected size limit, accept only appropriately bounded
   content; one excess byte must not be cached.
4. **UI presentation:** a monitor-only patch must never import
   provider-provided Git roots, tokens or other unrelated fields.
   A stale local Git scan must use the current authoritative
   monitor state while preserving the intended new local rows.
5. **Runner scope and incomplete data:** valid complete empty
   inventories must render true zeros; unobserved runner/job
   inventories must not claim zeros; compatibility/lane
   classification must not invent Github-hosted capacity.
6. **Scan concurrency:** many invalidations during an active
   scan must coalesce to the final required snapshot and publish
   no superseded error.

## Implementation contract

- Add deterministic tests to existing suites, grouped by domain.
- Do not change production runtime semantics, persistent formats,
  source authorization, R2 behavior or Git safety rules.
- Use injected clocks, deferred promises and synthetic values.
  No real GitHub/R2 HTTP requests, real user names, tokens or paths.
- Separate docs-only plan, test-source commits per domain and
  docs-only evidence checkpoint. Construct these as a local
  commit chain and advance `dev` **exactly once at the end**.
  A docs commit does not independently trigger CI when its
  ref is not published.
- Lightweight static/structure checks may run while authoring.
  Run complete STABLE once at the final validation gate if
  executable; if unavailable, explicitly report that CI was
  triggered but not verified. Do **not** poll external workflow
  status, create releases, promote main or touch R2.
- If a new test genuinely reveals a production flaw, record
  expected/actual behavior, isolate the root cause and obtain
  an architectural decision if a STOP FACTOR is triggered;
  never relax the assertion or fabricate a PASS.

## Release boundary

Mode B stage 3–8 matrices remain incomplete; this batch
does not certify total coverage, machine-installed Windows/KDE
or independently reviewed 20 languages. External R2 concurrent
immutable creation and already-mutated `latest.json`
readback failure remain architecture/release blockers, outside
this testing-only batch. Final v1 release is not authorized.

**Provisional state:** planned; no code/tests pushed or
execution results yet. Update the checkpoint once complete.

## Implementation and validation checkpoint — consolidated batch 02

**JavaScript code/test commit:** `acd358df9679801a39cabfc2377919fd78d62c60`.
**Rust unit-test commit:** `4446bdd23e5b3b4844e57420557939031393e32b`.

- 20 new JavaScript tests in `tests/mode-b-resilience.test.mjs`: billing TTL and UTC month rollover; stale and disconnected account generations; known zero versus unknown; billing SKU boundary; CI failure observation and page limits; 10-page installation truncation and late-page selection; monitor presentation source isolation; 100 overlapping scan invalidations; runner coverage; and provider error redaction.
- 3 new Rust unit tests in `github_etag_cache.rs`: malformed ETag evicts old projection; exact 64 KiB cached JSON limit versus one excess byte; delayed old-account HTTP 200 rejected after concurrent auth-generation invalidation.

**Final focused evidence:** all 20/20 new JavaScript test bodies passed in an isolated V8 harness using production function source retrieved from the staged GitHub commit. This is NOT `node --test`, NOT the full Node 24 STABLE suite, and NOT Windows WebView2/KDE WebKitGTK. The harness first uncovered a test-fixture error: its TTL assertion crossed a UTC month rollover, which correctly causes a new billing cache key. The fixture was corrected without production changes, a separate month-transition test was added, and focused re-execution passed 20/20.

**Not run here:** the three Rust tests (cargo and rustfmt unavailable), the full Node 24 STABLE suite, Python release suite, desktop compilation and GitHub Preflight. Local git cannot resolve github.com. External workflow status was not polled.

**Release blockers remain open:** exhaustive Mode B branch/mutation evidence, external R2 immutable-writer atomicity, final latest.json failure recovery, and deferred native Windows/KDE plus 20-language independent acceptance.

**Runner policy:** docs plan, JS tests, Rust tests and this checkpoint were chained without publishing intermediate refs, and `dev` is fast-forwarded exactly once at the end. No `main`, tag, release or R2 mutation.
