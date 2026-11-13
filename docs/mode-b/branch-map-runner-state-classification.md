# Mode B: GitHub runner/job lanes, explicit coverage and duplicate-aware state projection

Source baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `apps/desktop/ui/runner-state.mjs` blob `c572081163c9422338837fd576179b947ca94fb2` (159 source lines). `tests/runner-state.test.mjs` blob `8109b4ca4014836969f1adedb76a0b903fbb73af` has **15 actual behavioral Node tests** calling `normalizeLabels`, `runnerLabelCompatible`, `isStandardGitHubHostedLabel`, `classifyJobLane`, `summarizeRunnerState`. No new execution. Parent `3c02d5b4a338c66a425dd57498d8cbab9614712a`, named `audit/mode-b-testing`.

## Function/branch-to-executable-assertion reconciliation

| Production entry | Independently meaningful branches/guarantees | Evidence / remaining |
| --- | --- | --- |
| `isObject` | Non-null object except array; null, array, primitive not accepted for runner/job | E malformed row cases, ? exotic object/accessor/Proxy errors (not normal JSON transport) |
| `label` | Only string normalized trim+lowercase, otherwise empty | E whitespace/mixed object and hosted custom labels, ? Unicode confusable/locale-specific case |
| `normalizeLabels` | Array mandatory; each item string or object with nonempty string `name`, reject any malformed element; case-normalize and dedup preserving order | E `runner labels accept GitHub string and object representations`; malformed labels null/`[{}]` denied; ? nested labels, 0/1/100, duplicates with differing case and blank at last position |
| `runnerLabelCompatible` | Job must demand `self-hosted`; runner must have each requested label; missing/malformed labels -> false | E queue matching and unsupported self-hosted labels tests, ? case/duplicate extra labels, requesting one label missing |
| `isStandardGitHubHostedLabel` | Strict allowlist for ubuntu/windows/macos version family; custom prefix, bare ubuntu and invalid patterns unknown | E exact ubuntu-24.04/ubuntu-latest/windows-2025/macos-15/macos-15-intel and invalid labels, ? long/ambiguous suffix limits |
| `classifyJobLane` | Nonobject => unknown; exact safe runner ID already in knownRunnerIds => selfHosted even labels absent; labels contain self-hosted => selfHosted; standard GitHub-hosted => githubHosted; other/empty => unknown | E mixed `ubuntu-latest`+`self-hosted` selfHosted priority, known ID with null labels, invalid custom names; ? ID collision/unknown runnerId at MAX_SAFE_INTEGER |
| `laneCounts` | Iterate each job, map unknown to unclassified, separate counts+details by lane | E direct `summarizeRunnerState` asserts totals and all-lane sum; ? shuffled identical jobs and count invariant under truncation |
| `summarizeRunnerState` runner normalization | Each runner object needs positive safe id, string name, online/offline, boolean busy, valid labels, unique id; malformed row marks inventoryComplete=false despite valid observed rows | E `Mode B: malformed runner rows must not report confident capacity`: null, object missing keys, id=0/MAX+1, bad status, wrong busy type, label {} and null => busy/idle/offline null and independent jobs still complete |
| runner sort | Sort names with localeCompare, then numeric ID; `ready` iff online & !busy | E busy/idle/offline classifications; ? equal-name IDs, platform locale sorting and deterministic name/order |
| jobs dedup | Positive safe job ID, supported status queued/in_progress/completed/waiting/pending/requested; identical duplicate idempotent, conflicting same-ID JSON => malformed and coverage=false | E `valid identical job duplicates are idempotent across pages`, `conflicting jobs and duplicate runner inventory fail closed`; ? same logical job with different property order despite identical values (stringify sensitive) |
| status partitions | in_progress→running, queued→queued, waiting/pending/requested→waiting, completed not counted; unmatched selfHosted requires *complete* runner inventory and incompatible labels | E primary counters for queued/running/waiting, unmatched label and waiting approval tests; ? exotic provider status, completed identity conflicts |
| `laneCounts` per status | Split running/queued into selfHosted/githubHosted/unclassified, independent total jobs vs confident lane coverage | E mixed hosted/unclassified and all lane counts sum; ? malformed jobs with partial observed counts |
| completeness | `coverage.runners` only explicit true input+array+all rows valid, `coverage.jobs` only explicit true input+array+all jobs valid; empty arrays do NOT imply coverage | E incomplete jobs => totals null while runners remain valid; unavailable runners => hosted job totals remain known |
| lane confidence | jobsComplete && unclassified count==0; `queuedUnclassified` always observed count; `unmatchedSelfHosted` only if complete runner inventory | E missing job labels preserve task totals but lane unknown; E unmatched self-hosted label; ? unsupported label combinations with incomplete inventory |
| primary counts | runner busy/idle/offline exact only when inventoryComplete; running/queued/waiting and lane totals exact only when jobsComplete, observed running/queued remain available | E independent coverage tests and null-vs-zero assertions |
| checkedAt | Accept ISO parseable string by `Date.parse`, else null (not strict canonical UTC date) | No dedicated real boundary for noncanonical-but-parseable date/time; source distinction matters; ? local offset, invalid leap date, DST and stale clock |

## Important direct test assertions

- Malformed runner with id 0, MAX_SAFE_INTEGER+1, wrong status/busy/labels forces all runner capacity totals null **without erasing known queue=0**.
- Same job ID, same content (copied object) deduped; resulting running=1 queued=1 and per-lane counts correct. Same ID with conflicting statuses invalidates task coverage and running count becomes null.
- Hosted labels accepted only for recognized GitHub labels, explicit `self-hosted` takes precedence over `ubuntu-latest`; known runner ID also classifies self-hosted even if labels are null.
- Incomplete jobs page makes `coverage.jobs=false`, running/queued confidence null while `coverage.runners` remains independently true.
- Waiting environment approvals counted in waiting, not queued.

## Interaction matrix

- Exact duplicate job ID across status queries vs different ID same runner: dedup by job ID, not runner ID, and no suppression of independent job.
- Runner inventory forbidden or malformed vs known hosted jobs: counts for jobs remain complete, occupancy unknown; user UI must not show `busy=0`.
- Unknown custom label vs known runner ID: known runner ID self-hosted, label alone nonstandard => unknown, not GitHub-hosted.
- Partial paging vs observed nonzero: `runningObserved`/`queuedObserved` may be nonzero while confident totals are **null**; never substitute observed for total.
- Locale-dependent sorting of runner names is view-only, not authorization identity. Clock parsing does not guarantee canonical UTC and must not be called verified timestamp provenance.

## Positive and N1–N12

| Class | Evidence / open |
| --- | --- |
| Positive | E real labels, lanes, runner occupancy and full/partial job totals |
| N1 | E malformed runners/jobs/labels/status and bad IDs |
| N2 | E 0 and >MAX_SAFE_INTEGER ids, duplicate IDs; ? exact MAX boundary, large arrays |
| N3 | NA pure projection; external REST failures evaluated by collector |
| N4 | E identical ID idempotence and conflicting ID rejection; ? different key order |
| N5 | NA pure synchronous projection (concurrent caller state in monitor) |
| N6 | E corrupt/missing rows and partial old data, explicit coverage required |
| N7 | E unknown labels not promoted to trusted lane; provider authorization belongs to native API |
| N8 | E case-normalization for labels; ? noncanonical valid timestamps and locale-sorted tie names |
| N9 | NA no UI or asynchronous operations |
| N10 | E only projection fields used; no token input; raw names can display externally elsewhere |
| N11 | NA no monetization |
| N12 | NA no filesystem mutation |

## Stage 9 missing behavioral cases, after global Stage 3–8

- RSTATE1: label 0/1/max arrays, mixed-case and whitespace duplicates, missing object name, trailing invalid label; assert dedup order and denied summary.
- RSTATE2: runner names equal with distinct IDs, sort tie-break exact, runner online+busy/offline+busy combos, counts coherent.
- RSTATE3: job ID same content property order/duplicate vs conflict, status table across all six and unknown; assert all lane and observed totals.
- RSTATE4: unclassified+incomplete page+malformed runner matrix, explicit coverage unknown/known independent metrics.
- RSTATE5: date string table for canonical Z, offset, invalid, wrong type, DST/out-of-order; characterize actual `Date.parse` policy before any requirement change.

Mutation guards: invert ready, treat custom hosted label as GitHub-hosted, remove runner-id dedup, allow corrupted status, mark incomplete as zero, count waiting as queued, drop idempotent job duplicates, confuse runner and task coverage. Actual mutation runs not performed.

Mode B Stage 3–8 overall PARTIAL; no code, tests, releases, CI or dev branch changes.
