# Mode B: UI CI status, error redaction, installations and WebView context menu

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `904dc7e3ee8aa8bfde0967945bdad6ccef809ac6`. Exact blobs: `browser-context-menu.mjs=bdd386b87c34a4f1e8b495340243d2b6e5785236`, `ci-status.mjs=8884f58ad7829afcec65f3b56c3f0c0422b5d172`, `github-errors.mjs=a4003a56c41c6a5967e157cd066601ab8f9bbe3b`, `github-installations.mjs=5bba2eae8f490a6b70f2e013f2aaaef4f4f66382`.

Actual source-exact behavioral tests inspected: `tests/browser-context-menu.test.mjs` (first test calls the real guard), `tests/ci-status.test.mjs` (four tests call the real projection), `tests/github-errors.test.mjs` (four tests call real message functions), and `tests/github-installations-mode-b.test.mjs` (seven tests execute real paginated listing and injected GET). No suite was run now. Test source text and direct executable assertions are distinct evidence.

## Stage 3–4 method receipts

| Source:line | Status | Existing direct/indirect assertions and remaining independent cases |
| --- | --- | --- |
| `browser-context-menu.mjs:2 disableBrowserContextMenu` | E_PARTIAL | Real call registers contextmenu listener and simulated event calls preventDefault; repeated registration, listener teardown and real WebView event delegation untested |
| `ci-status.mjs:4 identity` | I_PARTIAL | Actual project/lookup calls cover malformed origin, nested path, URL, dot traversal and case-insensitive match; byte-length 1/100/101 and type-edge combinations missing |
| `ci-status.mjs:12 projectLatestCiStatuses` | E_PARTIAL | Four Node tests exercise success/failure/unknown, wrong account, duplicate case-folded identity and empty observations. Missing exact 100/101 rows, non-array and malformed nested run/error combinations |
| `ci-status.mjs:31 ciOutcomeForRepo` | E_PARTIAL | Real calls reject missing github_repo, wrong account, folder guesses, null statuses and nested path; missing Map type/falsy/malformed statuses.account and inherited/getter side effects |
| `github-errors.mjs:19 githubFailureReason` | E_PARTIAL | Test table checks 10 native error spellings as strings and Error objects; arbitrary provider token, URL and invalid types become unavailable. Remaining known message entries and unusual Error subclasses/canaries |
| `github-errors.mjs:26 githubFailureMessage` | E_PARTIAL | Fixed scope override, unauthorized/rate fallback, full 20-locale reason projection; unknown reason/scope types and exact fallback allowlist table need direct assert |
| `github-errors.mjs:52 mostImportantGithubFailure` | E_PARTIAL | Empty/non-array/null, unknown reason, permission/rate/unauthorized precedence; equal-priority ties, malformed entries and exhaustive pairwise seven-reason ordering pending |
| `github-installations.mjs:5 validAccountName` | I_PARTIAL | Real listing accepts 100-char login, rejects 101, empty/dot/dotdot/slash and malformed; mixed-case collisions and unknown types go through real consumer |
| `github-installations.mjs:8 listAvailableInstallations` | E_PARTIAL | Seven direct tests: valid 0/2 items, corrupt row stops on first page, 100+partial overlap dedup, duplicate ID/owner conflicts, missing/101 page, downstream collector blocked, 100/101 name length. Missing 10×100 vs 9×100+99 completeness, page 2 network denial and same-owner late conflicting IDs |

## Positive / N1–N12

- **Positive:** Existing direct tests prove basic UI context suppression, CI status and reason projections, legitimate installation pagination and account identity.
- **N1/N2:** wrong types, invalid repo names and 100/101 installation-name/page-count checks partly covered; 10-page exhaustion and 100/101 CI observations are planned.
- **N3/N4:** fake GET rejection on a subsequent page and retries after partial success are not independently asserted; installation inventory must not claim complete after a denied later page. No network exists inside pure CI status/error functions.
- **N5:** no proof of multiple simultaneous installations requests and stale scope switch downstream; source collector integration maps own account-revision guard.
- **N6/N7/N10:** malformed, cross-account and provider-secret values are rejected/canonicalized by real pure helpers, but unusual nested types and cross-boundary native events are not comprehensively tested.
- **N8:** case-insensitive owner identity applies, no clock-dependent logic in these four helpers; locale presentation has separate test suite.
- **N9:** native WebView contextmenu and window teardown are OS smoke, separate from synthetic event testing.
- **N11:** NA, no entitlements.
- **N12:** NA within pure functions; install GET externally provided, no local storage.

## Stage 6–10 planned cases and mutation targets

- **UI1:** full account-name and CI observation length/identity tables including 0/1/100/101, inherited/injected malformed values; changed case normalization or duplicate rejection must fail.
- **UI2:** enumerate seven reason priorities and ties, all native reason spellings and unknown scope; a mutation returning provider text or incorrectly ordering severity must fail.
- **UI3:** 10×100 complete=false vs earlier partial exhaustion complete=true, second-page failure and cross-page duplicate owner/ID conflict. Assert precise requested paths and no downstream collection on error; a mutation treating cap exhaustion as complete must fail.
- **UI4:** contextmenu registration/duplicate listener and synthetic cancellation plus physical KDE/Windows WebView context menu acceptance. This is not a Git tray-menu behavioral test.

Do not replace real helpers with stubs. Only external GET/Tauri/document event dependencies may be faked. No implementation, test, CI, OS acceptance or production contract change was performed. Mode B Stage 3–8 PARTIAL.
