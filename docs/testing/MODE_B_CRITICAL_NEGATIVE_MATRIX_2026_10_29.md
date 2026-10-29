# Mode B critical-flow Positive/N1–N12 matrix and interaction seed

**Revision entering this plan:** `77d13a694a5d3668252c42f00118fff4ec074edd`.
**Stage:** 4–8 *initiated, PARTIAL*. Do not mistake this
matrix for completed Stage 5, an executed test or proven coverage.
All `?` entries are **Planned / assertion not yet verified**, including
cells where existing tests might eventually be sufficient.
`N/A: reason` means applicability excluded for this **specific**
flow; child modules may still need that category. Never infer PASS
from a named test file.

## Stage 5 provisional critical-flow matrix

| Domain flow | Positive | N1 input | N2 boundary | N3 network | N4 retry | N5 race | N6 corrupt | N7 auth | N8 locale/time | N9 cancel | N10 privacy | N11 purchase | N12 storage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Git classification / no-force policy | ? | ? | ? | N/A: pure | N/A: pure | ? | ? | N/A: no credentials | N/A: time-free | ? | N/A: no logging | N/A: free | N/A: pure |
| Enrolled Fetch / Safe sync | ? | ? | ? | ? | ? | ? | ? | ? | N/A: time-free | ? | ? | N/A: free | ? |
| GitHub device auth / keyring | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | N/A: free | ? |
| GitHub API / rate / ETag | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | N/A: free | N/A: API IO |
| Monitor cache / runner coverage | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | N/A: free | N/A: in-memory |
| Settings config / lifecycle | ? | ? | ? | N/A: local | ? | ? | ? | ? | ? | ? | ? | N/A: free | ? |
| R2 signed publication / readback | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | N/A: free | ? |
| Locale / metric / tooltip projections | ? | ? | ? | N/A: pure | ? | ? | ? | ? | ? | ? | ? | N/A: free | N/A: pure |

## Stage 6 interaction pairs to prove (not yet executed)

| Priority | Distinct input/state combination | Nonnegotiable expected outcome |
| --- | --- | --- |
| C | Dirty worktree + ahead/behind + Safe sync | No pull, no push, original working tree unchanged |
| C | Upstream moves after Fetch + pre-push recheck | No force push, clear refusal and manual retry |
| C | Concurrent Fetch + cancel + delayed progress event | No stale completed result, no mutation outside enrollment |
| C | OAuth device expiry + slow_down + pending poll | No early polling, no token acceptance after expiry |
| C | Keyring unavailable + authorized cache + app restart | Preserve safe failure state, never leak or fabricate credentials |
| C | 401 revoke + delayed success response from older monitor revision | Older success cannot override unauthorized current state |
| C | 429 + partial runner permission + queued job count | Distinct reasons; unknown remains unknown, not zero |
| C | R2 S3 write accepted + edge 403 public readback | Fail publication receipt; do not advance latest pointer |
| C | R2 200 challenge HTML + same size, wrong digest | Full checksum mismatch blocks release |
| H | Arabic RTL + zero vs `—` + provider name equal UI key | Numbers ordered, unknown remains unknown, name unchanged |
| H | Settings draft locale+autostart + Cancel + reopen | No changes persisted, prior OS autostart policy intact |
| H | Tooltip close + monitor event + Wayland/Windows resize | No stale popup, permission escalation, focus steal or crash |

## Stage 7–8 measurement rules

- Count **distinct branch/control variants**, not test function
  declarations. For each critical function connect the
  source:line, branch predicate, observed test assertion,
  Positive/N-category, and an important mutation the assertion
  kills. Current file-level maps are **not** measured coverage.
- At the code freeze, use real Node/Rust/Python execution
  results and exact SHA. Mutation examples to detect:
  `ahead>0 && behind>0` -> `||`; `force=false` ->
  `true`; `now>=expires` -> `now>expires`;
  `coverage.jobs===true` -> merely truthy;
  `HTTP 200` -> accepts `206` or `403`;
  `actualSha === expectedSha` -> unchecked.
- Keep `STABLE` tests gating. The manual `strict.yml`
  runs core/Node ten times on request; repetition is not
  a substitute for branch coverage, and no new flaky
  classification is inferred from a single run.

## Gates / next artifacts

1. Complete Stage 3 **per function** from the directly read
   Rust/JS/script indexes, including closure and OS-specific
   callback branches.
2. Complete Stage 4 for **every** current executable function,
   then expand this provisional Stage 5 matrix from domains
   to individual artifacts with exact N/A reasons.
3. Finalize interactions, case estimates and coverage map.
   Only then implement missing Mode B Stage 9 tests and
   perform Stage 10 mutation review.
4. At Stage 11 run full STABLE once and identified flaky tests
   separately. Physical KDE/Windows and independent 20/20
   locale acceptance follow source Mode B by owner decision,
   and still block public v1.0.

**Evidence:** source introspection and planning only.
CI was not polled and no new unit tests were executed in
this GitHub-only session.
