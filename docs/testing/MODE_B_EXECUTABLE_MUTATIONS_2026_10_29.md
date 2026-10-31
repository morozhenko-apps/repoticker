# Mode B executable source mutation review

Checkpoint: 2026-10-29. **Implemented; NOT YET EXECUTED.**
This file distinguishes actual executable mutants from the previously
listed hypothetical mutant ideas. Do not assert a kill rate until the
final required test run returns a result for the exact commit.

## How the review works

`tests/mode-b-mutations.test.mjs` loads the actual production JS
module for each scenario, verifies the safety invariant on it, makes
one uniquely anchored source mutation and dynamically loads the
modified real ESM module. A mutant is considered killed only when
the same assertion fails on the mutated module. An invalid/missing
mutation anchor, invalid import or unexpected runtime exception
fails the review instead of counting as a successful kill.
No HTTP calls, user credentials or real Git operations are used.
External GitHub responses and a clock are injected at their real
input boundaries; the subject under test is never replaced by a
mock. The twelve contracts are part of the normal Node test command,
not a separate ten-run stress loop.

| ID | Production branch mutation | Invariant / target |
| --- | --- | --- |
| M01 | Ignore malformed installation rows | Invalid inventory must reject rather than show shortened account scope |
| M02 | Disable contradictory ID/name detection | Conflict must reject, even when another valid installation is present |
| M03 | Raise page limit from 100 to 101 | 101 entries are invalid API data |
| M04 | Omit malformed-runner coverage invalidation | Runner counts become unknown, not zero |
| M05 | Omit malformed-job coverage invalidation | Job counts become unknown, not zero |
| M06 | Disable explicit self-hosted label priority | A mixed-label job still belongs to self-hosted lane |
| M07 | Change `every` to `some` for runner labels | Every requested constraint is mandatory |
| M08 | Allow 501 billing line items | Strict 500-item bound |
| M09 | Allow unsafe accumulated numeric usage | Overflow is rejected before presenting minutes |
| M10 | Treat TTL equality as a cache hit | A stale same-scope billing cache must refresh at TTL |
| M11 | Disable canonical UTC calendar comparison | Normalized impossible date must not create a CI failure alert |
| M12 | Remove maximum account-name length limit | Source 101-character GitHub names cannot enter the monitored account scope |

The existing Mode B source-contract tests for installations expecting
silent filtering were updated because the fail-closed safety contract
makes partial-inventory acceptance invalid. A match against a now
obsolete assertion is not a product defect.

## Coverage boundaries

This mutation run is a risk-focused executable subset, **not**
whole-repository mutation score. Remaining critical Rust native
auth/HTTP/Git, process cancellation, keyring, signed APT/R2, and
native shell UI should have explicit independent mutation evidence
before Mode B Stage 10 is declared complete. JS V8 coverage and
Rust/Python branch coverage remain separate measurements.

GitHub OAuth timing coverage was also expanded by three Rust unit
cases: backwards poll clock, early slow-down deadline extension and
refresh/access lifetime ordering. These are subject to the final
Rust-core stable test gate. No pass is inferred from source review.

At the final gate, run the normal stable Node/Rust/Python CI suite
only once on a complete frozen source batch. On success, record
actual killed/survived mutant counts, per-module measured coverage
and any excluded known-flaky cases. No CI is required for each
individual code or documentation commit.

## Native/JS completed-run timestamp boundary

Source hardening is implemented on both sides of the Tauri IPC
boundary: `github_api.rs` now validates actual Gregorian days and
24h clock units for exact UTC-second timestamps before projecting
completed workflow runs; `ci-failure-events.mjs` rejects
`Date.parse` normalizations by requiring exact canonical round-trip.
The earlier test that deliberately skipped impossible February 31
has been replaced with strict rejection. Native Rust cases test leap
years, month/day bounds and a malformed projected run; JS cases
add invalid calendar/time tables and a legitimate 2024 leap day.
The M11 mutant removes JS normalization protection. No test result
has been observed for this source branch yet.

## Identity input size alignment

`github-installations.mjs`, `github-monitor.mjs` and
`runner-collector.mjs` now require 1–100 ASCII characters in
account/repository segments, matching native
`github_api.rs::valid_name`. Numeric/non-string organization values
are rejected before network I/O, rather than coerced through a
regular expression. Source tests cover the exact 100-character limit,
101-character rejection and absence of provider calls on failure.
M12 removes that limit in installation discovery; its result remains
unknown until execution.

## Executed evidence (one actual CI attempt)

The `tests/mode-b-mutations.test.mjs` suite ran in
[Preflight #40959460474](https://github.com/morozhenko-apps/repoticker/actions/runs/40959460474)
at exact SHA `c507201398ce18479e54a61c250a6bb7805504b4`.
Log evidence: **M01 through M12 each reported PASS**. The
implementation of `mustKill` executes the unchanged production
invariant first, then imports a uniquely anchored modified source
module and requires that the same assertion reject that mutant.
Thus 12 of 12 **selected risk-targeted JS mutants** were caught
in this executed attempt. This is not a whole-code mutant count.

The overall Node pass was red (492/494), unrelated to these 12
mutants. Two test fixtures conflicted with the strict installation
deduplication and prior-snapshot provenance policies and were
repaired in the next source/test commit. The mutation score recorded
here refers to the original executed SHA; revalidation is required
for any new SHA.
