# Mode B: GitHub installations, CI scope, redacted errors and compact metrics assertion crosswalk

Mode B Stage 4–8, inspection **only**, no test execution. Same immutable production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `d44ca49be19d099ade5db7292f53da8a9c7510f8`. Exact production blobs:

- `apps/desktop/ui/status-metrics.mjs` `ef5f46f111fe22503863f58f072db78c63ba4537`, actual direct `tests/split-status-hover.test.mjs:37` (other tests in that file target different modules or only read source).
- `apps/desktop/ui/github-installations.mjs` `5bba2eae8f490a6b70f2e013f2aaaef4f4f66382`, actual seven relevant `tests/github-installations-mode-b.test.mjs:8–95`.
- `apps/desktop/ui/ci-status.mjs` `8884f58ad7829afcec65f3b56c3f0c0422b5d172`, four direct `tests/ci-status.test.mjs:8–54`.
- `apps/desktop/ui/github-errors.mjs` `a4003a56c41c6a5967e157cd066601ab8f9bbe3b`, four direct `tests/github-errors.test.mjs:10–81`.

Those are **16 distinct relevant existing test bodies**, not 16 newly implemented cases or one-to-one branch counts. All tested subjects are imported actual production modules; HTTP `get` is an injected external adapter, not the installation function. Actual Node test files were reopened on the immutable production baseline.

## Stage 4 method/guard-to-assertion ledger

| Source method/decision | Existing precise assertion (E real call; I real parent call) | Independent outcome not demonstrated (P) |
| --- | --- | --- |
| `status-metrics.mjs:2 shown` strict safe nonnegative integer → string, other→em dash | **I** `split-status-hover.test.mjs:37` invokes real `compactStatus`: valid 3/2/1/2/2 fields, null returns five unknowns, negative busy=>unknown online | P direct `shown` 0, 1, MAX_SAFE_INTEGER, MAX+1, -1, 1.5, NaN, Infinity, string, null |
| `status-metrics.mjs:4 compactStatus` coverage.runners/jobs independent | **E** split-status :37 covered true returns counts, runners false gives unknown total, jobs false gives unknown running | P both false, jobs covered with malformed running/queued, separate offline coverage and null counts |
| `compactStatus` aggregate sum | **E** 1+1+1=3, busy=-1 invalidates online in split-status :37 | P each input safe but sum overflows safe integer, 0/1/MAX combinations, invalid idle/offline and nonnumeric type |
| `github-installations.mjs:5 validAccountName` ASCII 1–100, not "."/".." | **I** installations :18 invalid empty/dot/traversal/slash; :85 exact 100 admitted, 101 rejected | P standalone closure invalid type Unicode, whitespace, leading/trailing dot with permitted characters, prototype-like names |
| `:8–11 listAvailableInstallations` initial empty and short page complete | **E** installations :8 empty yields `{items:[],complete:true}`; two items preserved, only page=1 | P single 100-item page always requires page 2, all 10 pages exactly full=>`complete:false` |
| `:12–17` malformed/101 provider page | **E** installations :61 null, absent/nonarray and 101 entries reject before continuing | P failed second-page HTTP/rejection; empty page after exactly full previous page |
| `:18–22` corrupt identity/id values | **E** installations :18 null item, missing login/id, 0/negative/2^53 and bad account names reject, exactly one GET | P fractional id, numeric-looking string id, safe max, id 1 name "." when mixed with other valid item |
| `:23–29` duplicate name/id conflict vs exact overlap | **E** installations :37 overlap `team1`/`TEAM1` id 1 dedups then adds 101; :52 conflicting id/login reject | P overlap across page 9/10, scope identity change with exact casing, client out-of-order pages |
| `:33–35` 10-page cap and truthfulness | **E** installations :37 first full 100 + second 2 results in 101 unique `complete:true` | P 10 fully populated pages ⇒ `complete:false` without silently declaring authorized scope complete; no 11th GET |
| Collecting after corrupt inventory | **E** installations :71 actually calls `collectForAccount` and asserts repository query does not start after invalid installation row | P post-pagination partial scope + selected installation under simultaneous account switch (monitor controller owner) |
| `ci-status.mjs:4 identity` exact owner/repo, case-fold | **I** CI :8/:20 wrong org, missing github_repo, nested repo, traversal and URL-as-identity give null; mixed-case valid succeeds | P empty segments, ASCII 100/101 per part, abnormal dot escapes and numeric/nonstring repo fields |
| `:12 projectLatestCiStatuses` bad account or invalid observations → null | **E** CI :34 null/empty/dot/path/101 account, foreign repo, duplicate case-folded provider identity rejected | P observations.length 100/101, array with null/malformed entry, uppercase account canonicalization with multiple entries |
| `:17–28` first run per identity and unknown conclusions | **E** CI :8/:45 success/failure and cancelled/neutral/timed_out/skipped/startup_failure unknown, missing runs or provider error unknown | P conflicting future/older observations order; provider error precedence when valid conclusion also present |
| `:31 ciOutcomeForRepo` strict scope and Map | **E** CI :8/:20 foreign/missing invalid, correct mapped case and unknown returns null independent of dirty/ahead | P statuses.outcomes non-Map, malformed account value, unsafe Map prototype entries |
| `github-errors.mjs:19 githubFailureReason` allowlist native errors | **E** errors :10 string and Error exact approved messages map to finite categories; :29 raw provider secret/URL/objects/number produce unavailable | P all aliases not listed in test; forged Error subclass getter throws, String subclass, source errors changed over time |
| `:26 githubFailureMessage` canonical fixed text | **E** errors :29 unauthorized/rate_limited/runners-only override and unknown token redaction; :60 all seven messages and runner override across 20 locales | P unknown scope + unknown reason, prototype-like reason, no raw provider text in actual DOM sink |
| `:52 mostImportantGithubFailure` severity and empty | **E** errors :44 []/null=>null, invalid-only=>unavailable, permission>incomplete, rate>network, unauthorized>rate | P equal-priority tie and mixed invalid/valid list in all orderings, malformed reason proxy |
| Cross-file trust | **E** CI identity never inferred from local git state; invalid installation blocks repo query; failure message fixed vocabulary | P actual `app.mjs` native Tauri IPC/DOM, late account switch before CI notification, raw provider sink and native authorization |

### Stage 5 category and applicability without false promotion

- **Positive:** E recognized counts/normal installations, CI mapping, failure categories. P exact zero, max and type boundaries across all four.
- **N1/N2:** E malformed installed IDs/pages, 100/101 login, invalid CI identity and account; P 10×100 full cap, CI observation 100/101, count overflows, unicode and noninteger input.
- **N3/N12:** `listAvailableInstallations` consumes external `get`; P rejected GET/page 2/permission failure. Pure compact/CI/error projections have **no direct network or persistent storage**; those categories belong consumer controller.
- **N4/N5:** P overlap across 10 pages, stale Settings account/monitor scope while async pagination pending; pure mappers deterministic and state-free, do not manufacture retry/race cases within them.
- **N6/N7/N10:** E corrupt installation cannot authorize scope; CI duplicate/foreign identity rejected, unknown provider errors sanitized to finite vocabulary. P end-to-end same-scope UI, redacted native error through real DOM and OAuth generation.
- **N8:** NA for these pure functions unless locale translation consumer; existing `githubFailureMessage` translation has real 20-language assertions, but locale, timezone and display still need caller coverage.
- **N9:** OS UI Settings close/cancel and main Card lifecycle require separate controller/physical acceptance.
- **N11:** NA no entitlements.

**Stage 8 decision:** the existing source tests prove partial outcomes, but no entire file×category `?` is safely promoted to global `✔` until its applicable independent branches are accounted for. Source anchors are lexical, not branch coverage. Method-level statuses remain `E_PARTIAL`/`I_PARTIAL`.

## Stage 6–7 new-case owners (deduplicate against other focused maps)

- MP1–MP3 strict compact numeric coverage for full safe integer boundaries, overflow and independent runner/job trust. Real `compactStatus` and `shown` imports, table-driven.
- INS1–INS3 full 10-page boundary, rejected page-2 GET and owner-id overlap across late pages, with bounded external get stub. Do not confuse `complete:false` with an empty authorized account.
- CI1–CI3 observations 100/101, account/repository malformed boundaries, and races in *caller* controller after auth switch (not pure CI function itself).
- GE1–GE2 source message finite allowlist and all-priority tie/different ordering, plus real DOM text-sink safety for raw strings. Do not turn unknown into success.
- A1/GM integration owns stale account scope and outstanding native notification; existing [Card/monitor/scan slice](stage-4-8-card-monitor-scan-slice.md) defines controller seam.
- Mutation targets (not run): overflow safe sum, drop complete:false cap, accept conflicting installation name, permit foreign CI scope, merge missing and zero, print raw error string, invert error severity order.

**This is an E/P migration, not 16 passing tests, no newly executed tests and no completion of Stage 3–8.** Do not claim 100% coverage or publish any hosted/native changes.
