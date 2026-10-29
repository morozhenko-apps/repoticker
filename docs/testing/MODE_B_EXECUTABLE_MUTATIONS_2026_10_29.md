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
mock. The ten contracts are part of the normal Node test command,
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
