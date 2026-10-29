# Mode B — current critical-flow matrix (2026-10-29)

**Status:** source cases implemented; exact-SHA execution and measured
coverage not yet available. This is a risk-first expansion, not a
fabricated all-repository Stage 5 signoff. Canonical future 1.0 RC
matrix must include every production method, branch and interaction.

Notation: **C** = explicit committed source test is present, but must
still pass in CI; **P** = additional source/test or environment evidence
planned; **NA** = excluded for the stated reason. 13 required fields
are Positive and N1–N12. Absence of N11 purchases is deliberate for a
free product.

| Production artifact | Positive | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `runner-collector.mjs::collectRunnerState` | C | C | C | C | C | C | C | C | C | NA¹ | C | NA³ | NA² |
| `runner-state.mjs::summarizeRunnerState` | C | C | C | NA⁴ | C | NA⁵ | C | C | C | NA¹ | C | NA³ | NA² |
| `github-installations.mjs::listAvailableInstallations` | C | C | C | P | C | P | C | C | NA⁶ | NA¹ | C | NA³ | NA² |
| `github-billing.mjs::collectBillingUsage/createBillingCache` | C | C | C | C | C | C | C | C | C | C | C | NA³ | NA² |
| `github_auth.rs::DeviceSession/TokenExpiration` | C | C | C | NA⁴ | C | C | C | C | C | C | C | NA³ | NA² |
| `github_api.rs` native auth-bound HTTPS | C | C | C | C | C | C | C | C | C | C | C | NA³ | P |
| `r2_release.py` signed immutable publication | C | C | C | C | C | C | C | C | C | P | C | NA³ | P |

¹ No cancellation/interruption input on this **pure** public interface;
the calling UI lifecycle has its own required N9 matrix.

² Pure read-only projection has no direct writable storage; actual
filesystem and keyring adapters are audited separately.

³ RepoTicker has no paid entitlements or subscriptions (N11);
informational billing data still requires N1/2/3/6/7/8/10.

⁴ Synchronous pure policy has no network boundary; the native caller
retains N3.

⁵ Synchronous pure projection has no in-flight requests or threads;
the asynchronous collector retains N5.

⁶ Installation inventory has no time or locale interpretation; cache/
native refresh and user-visible locale surfaces retain N8.

## Traceable new code and test contracts

| Source branch or invariant | Test location / implemented assertion | Mutation that MUST fail once test suite runs |
| --- | --- | --- |
| Partial refresh with changed GitHub organization clears unrelated runner identity | `tests/runner-collector.test.mjs` Mode B org switch | Delete org comparison; keep old runners, busy and timestamp |
| New selected repo set invalidates previous task counts but retains fresh org runners | `tests/runner-collector.test.mjs` Mode B selection | Skip repository-set comparison; copy old task totals |
| Repo order/lettercase must not invalidate same authorized scope | `tests/runner-collector.test.mjs` Mode B order/case | Compare raw case-sensitive repo arrays |
| Missing/contradictory old scope cannot justify stale task confidence | `tests/runner-collector.test.mjs` Mode B provenance | Assume prior scope matches |
| Task refresh within same org retains valid organization runner inventory | `tests/runner-collector.test.mjs` Mode B same-org | Invalidate runner lane on every repo selection |
| Invalid runner/job rows yield unknown counts, other lane stays complete | `tests/runner-state.test.mjs` Mode B rows | Replace validity guard with truthy or coerce invalid to zero |
| Hosted-lane classification prioritizes explicit self-hosted label | `tests/runner-state.test.mjs` Mode B lanes | Reverse hosted/self-hosted rule priority |
| Identical duplicate jobs count once | `tests/runner-state.test.mjs` Mode B duplicates | Remove job ID dedup |
| Malformed installation rows refuse partial confident inventories | `tests/github-installations-mode-b.test.mjs` malformed rows | Restore silent `continue` / ignore invalid item |
| Identical installation page overlap is idempotent | same, dedup overlap | Remove ID/name dedup |
| Conflicting installation IDs/names fail closed | same, conflicting identity | Accept first or last record without conflict |
| Unknown/noncanonical installation pages fail closed | same, bad page | Drop array-size/schema constraints |
| Billing UTC rollover and TTL exact boundary | `tests/github-billing.test.mjs` Mode B clock cases | Use local time; change TTL comparison |
| Billing SKU, count and quantity boundaries | same, usage bounds | Remove SKU allowlist / 500 item cap / safe range |
| Late prior-org billing completion cannot replace current scope cache | same, in-flight org | Remove generation guard or key |
| Negative clock and disconnect require refresh | same, cache reversal | Remove clock rollback or clear invalidation |
| Native Rust `#[cfg(test)]` modules executed, not only compiled | `tests/test_release_native_gate_contract.py` | Delete native `cargo test` step |
| Node source line/branch coverage is measured by the final Preflight runner | `.github/workflows/preflight.yml` | Remove `--experimental-test-coverage` flag |

## Interaction matrix

- GitHub org A → org B × tasks-only refresh × old runners complete:
  old runner names/capacity/timestamp must disappear; newly fetched
  tasks can still count as complete.
- Same org with selected repo set A → B × runners-only refresh:
  old jobs/timestamp become unknown; fresh runner inventory remains.
- Same org with case/order-only changes × runners-only refresh:
  prior task counts remain valid.
- Installation API page overlap × same ID+name versus conflicting
  ID/name × bounded pages: exact duplicates dedup, contradictions fail.
- Billing org A → org B × unresolved A request × B already cached:
  A may resolve for its original caller, not rewrite B's cache.
- Offline/corrupt API × source trust/partial coverage: errors are
  redacted and zero is not invented.

## Execution and measurement

The development code commit contains 18 new Node tests (5 collector,
4 runner-state, 5 installation inventory, 4 billing) and two Python
native-CI policy tests. The Preflight code change calls
`cargo test --locked -p repoticker --bin repoticker` in the existing
Linux desktop job and instruments the existing single Node test pass
with V8 source coverage for `apps/desktop/ui/*.mjs`.
**No coverage percentages or mutation kill counts are claimed.**

Remaining mandatory work: all other production modules' function and
executable-branch maps, their Positive/N1–N12 cells and interactions,
Rust per-module branch coverage, escaped mutation analysis, full
stable suite and final report on the frozen candidate SHA. Passing a
subset of tests cannot close Mode B.
