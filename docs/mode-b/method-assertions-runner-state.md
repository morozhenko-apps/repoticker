# Mode B: RunnerState labels, hosted/self-hosted lane and confidence method assertions

Baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, source `apps/desktop/ui/runner-state.mjs` blob `c572081163c9422338837fd576179b947ca94fb2` (160 lines), audit parent `4885f37a04434b1e47a1e4f0275af169b78ad153`.

**All nine original lexical candidates** now classified: 5 E_PARTIAL directly called exported functions, 3 I_PARTIAL private helpers used by real subject methods, 1 INLINE per-field `exact` closure owned by `summarizeRunnerState`. `tests/runner-state.test.mjs` blob `8109b4ca4014836969f1adedb76a0b903fbb73af` contains **15 real Node tests**, directly exercising the four label/domain helpers and `summarizeRunnerState`, with exact asserted status/count/coverage invariants. Source was reviewed; no tests newly executed.

| Line | Candidate | Evidence |
| ---: | --- | --- |
| 5 | `const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);` | I_PARTIAL |
| 6 | `const label = value => typeof value === "string" ? value.trim().toLowerCase() : "";` | I_PARTIAL |
| 8 | `export function normalizeLabels(values) {` | E_PARTIAL |
| 20 | `export function runnerLabelCompatible(jobLabels, runnerLabels) {` | E_PARTIAL |
| 29 | `export function isStandardGitHubHostedLabel(value) {` | E_PARTIAL |
| 36 | `export function classifyJobLane(job, knownRunnerIds = new Set()) {` | E_PARTIAL |
| 48 | `function laneCounts(jobs, ids) {` | I_PARTIAL |
| 63 | `export function summarizeRunnerState({` | E_PARTIAL |
| 124 | `const exact = value => jobsComplete ? value : null;` | INLINE |

## Actual assertions already present

- `normalizeLabels` accepts GitHub string and object-label representations; trims, lowercases, deduplicates; malformed row rejects. `runnerLabelCompatible` requires self-hosted and every requested label in available, no false positive for hosted labels.
- `isStandardGitHubHostedLabel` recognizes canonical ubuntu/windows/macos runner labels; arbitrary custom label or group name cannot certify hosted lane. `classifyJobLane` prioritizes known `runner_id` or explicit self-hosted over hosted even with mixed labels, otherwise unknown.
- `summarizeRunnerState` separates `runnerCoverage` and `jobCoverage`, with busy/idle/offline independent from hosted/queued tasks; missing inventory does not erase known hosted/job facts and incomplete job pages do not imply zero. Test `incomplete jobs pagination makes totals unknown, runner occupancy remains valid` directly verifies the fail-closed property.
- Duplicate runner IDs or conflicting repeated job IDs invalidate confidence, identical job duplicates are idempotent. Waiting/environment approval does not inflate queued jobs; queued self-hosted with unsupported labels stays counted in total while flagged unmatched when runner inventory authoritative.
- The internal `exact(value)` at line 124 returns count only when `jobsComplete`; it is a private closure, not independent public method. UI `compactStatus` and Billing authorities remain distinct.

## Uncovered independent branches after existing 15 tests

- `RS1` malformed job status type and ID 0/1/MAX/MAX+1, conflicting repeated body with key order difference, negative statuses and runner names with invalid Unicode, per-job nonallowlisted fields.
- `RS2` exact >500? **No source-internal 500-item cap exists here**; page bounds belong `runner-collector`. Do not invent a limit for this pure projection. Test aggregation of large valid arrays and safe integer precision explicitly.
- `RS3` all lane values and statuses `waiting`, `pending`, `requested` without inflating queued; unknown labels should not infer GitHub-hosted. Exact custom label ambiguities, mixed knownRunnerIds.
- `RS4` jobCoverage true with missing runners vs runnerCoverage true and missing jobs; checkedAt malformed timestamp; immutable caller input and stable normalized sort.
- `RS5` native `monitor_cache.rs` trusted JSON projection must validate unknown nested fields (NM1 STOP). Real pure RunnerState tests do not establish native IPC trust or prevent embedded unknown sensitive fields.

N1 invalid, N2 number/list bounds, N4 duplicate, N5 source-scope race external, N6 partial and stale, N7 authoritative coverage, N8 checkedAt, N10 raw runner field privacy, N12 native store external; N3 network/OS and N11 monetization NA for this pure state projection. No test/code/CI change, no suite run; Stage 3–8 PARTIAL.
