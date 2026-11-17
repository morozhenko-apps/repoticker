# Mode B existing test inventory, part 1 (JS)

Source SHA `5b07a3273a27516af8ceb793f0d427a1bada964b`. This is an assertion-path **index**, not proof of branch coverage. Test declaration counts can undercount generated/parameterized cases; exact Node26 completed run has 747 individual tests across all `tests/*.test.mjs`. Source-contract tests (AST/regex) cannot be assumed to execute native code.

### `tests/about-locale.test.mjs`

Classification: **Source contract** (heuristic; confirm behavior). Direct relative references: `../apps/desktop/ui/about.html`, `../apps/desktop/ui/about.mjs?about-locale-e2e`, `../apps/desktop/ui/about.mjs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/tauri.conf.json`, `../apps/desktop/src-tauri/capabilities/about-drag.json`. **Declared tests (2)**:

- L5 test("About obtains saved EN/RU on first open and focus, without changing version/author/link", async () => {
- L97 test("About uses an undecorated Close-only titlebar and a scoped native drag permission", () => {

### `tests/artifact-retention.test.mjs`

Classification: **Source contract** (heuristic; confirm behavior). Direct relative references: `../scripts/cleanup-published-artifacts.mjs`. **Declared tests (12)**:

- L40 test("Given_a_release_When_cleanup_requires_verified_public_R2_receipt_before_any_network_call_Then_cleanup_contract_holds", async () => {
- L59 test("Given_a_release_When_cleanup_cannot_delete_source_archives_unless_final_latest.json_is_verified_Then_cleanup_contract_holds",async()=>{
- L77 test("Given_a_release_When_cleanup_deletes_only_matching_artifacts_and_independently_confirms_removal_Then_cleanup_contract_holds", async () => {
- L101 test("Given_a_release_When_foreign_commit_SHA_refuses_deletion_Then_cleanup_contract_holds", async () => {
- L116 test("Given_a_release_When_Mode_B_missing_or_malformed_publication_receipts_never_trigger_GitHub_DELETE_Then_cleanup_contract_holds",async()=>{
- L155 test("Given_a_release_When_Mode_B_GitHub_artifact_listing_errors_and_ambiguous_matches_block_cleanup_Then_cleanup_contract_holds",async()=>{
- L178 test("Given_a_release_When_Mode_B_failed_delete_and_failed_post-delete_confirmation_cannot_report_completion_Then_cleanup_contract_holds",async()=>{
- L199 test("Given_a_release_When_Mode_B_cleanup_with_no_credentials_or_missing_archived_runs_must_fail_closed_or_be_idempotent_Then_cleanup_contract_holds",async()=>{
- L207 test("Given_a_release_When_Mode_B_complete_platform_receipts_reject_wrong_file_sets_before_any_GitHub_request_Then_cleanup_contract_holds",async()=>{
- L241 test("Given_a_release_When_Mode_B_mixed-run_receipt_cannot_authorize_cleanup_of_either_archive_Then_cleanup_contract_holds",async()=>{
- L251 test("Given_a_release_When_Mode_B_verify_both_archive_provenances_before_deleting_either_Then_cleanup_contract_holds",async()=>{
- L294 test("Given_a_release_When_Mode_B_same_archive_ID_reused_for_two_distinct_platform_names_must_not_delete_Then_cleanup_contract_holds",async()=>{

### `tests/autostart-integration.test.mjs`

Classification: **Runtime module** (heuristic; confirm behavior). Direct relative references: `../apps/desktop/ui/settings-i18n.mjs`, `../apps/desktop/src-tauri/Cargo.toml`, `../apps/desktop/src-tauri/src/autostart.rs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/capabilities/default.json`, `../scripts/accept_autostart_linux.sh`, `../scripts/accept_autostart_windows.ps1`, `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/settings.mjs`. **Declared tests (3)**:

- L8 test("native OS login launch uses pinned maintained plugin and scoped IPC only", () => {
- L33 test("autostart acceptance warns on legacy executable after package rename", () => {
- L43 test("Settings offers keyboard-accessible EN/RU login launch, default disabled", () => {

### `tests/browser-context-menu.test.mjs`

Classification: **Runtime module** (heuristic; confirm behavior). Direct relative references: `../apps/desktop/ui/browser-context-menu.mjs`. **Declared tests (4)**:

- L8 test("Given a WebView document, a right click is prevented", () => {
- L19 test("Given four application windows, each installs the same guard once", () => {
- L27 test("Given native tray and repository menus, browser suppression does not remove them", () => {
- L35 test("Given background resize, native Windows ordering must preserve hidden state", () => {

### `tests/card-i18n.test.mjs`

Classification: **Runtime module** (heuristic; confirm behavior). Direct relative references: `../apps/desktop/ui/card-i18n.mjs`, `../apps/desktop/ui/locale-catalog.mjs`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/ui/index.html`, `../apps/desktop/src-tauri/src/main.rs`. **Declared tests (9)**:

- L13 test("card recognizes canonical locales and rejects unknown variants", () => {
- L27 test("complete compact-card control keys are available in both locales", () => {
- L45 test("accessible metric status keeps unknown distinct from real zero", () => {
- L59 test("initial locale lookup is config-only, guarded against late full-scan outcome", () => {
- L72 test("compact-card accessibility updates current counts and localized controls", () => {
- L87 test("compact accessible metrics isolate Arabic numeric values but not unknown", () => {
- L118 test("Fetch keeps progress percentage visible with cancellation available through its accessible label", () => {
- L131 test("repository source-refresh status uses existing translations in every supported locale", () => {
- L139 test("CI status indicators have locale-complete distinct semantics", () => {

### `tests/ci-failure-events.test.mjs`

Classification: **Runtime module** (heuristic; confirm behavior). Direct relative references: `../apps/desktop/ui/ci-failure-events.mjs`. **Declared tests (19)**:

- L13 test("Given first completed reads When failures predate startup Then baseline is silent", () => {
- L33 test("Given known run When a new attempt fails Then notification is distinct", () => {
- L41 test("Given completed non-failures When polled Then none are notified", () => {
- L50 test("Given corrected conclusion When it turns failure Then notify only once", () => {
- L69 test("Given changed account or repository selection When refreshed Then baseline resets", () => {
- L82 test("Given failed or missing source When first successful poll arrives Then no fabricated failures", () => {
- L99 test("Given invalid observations When evaluated Then history is not partially changed", () => {
- L123 test("Given unsafe scope or configuration When collecting Then no request is made", async () => {
- L143 test("Given completed API When paginated Then limits and per-repository errors are isolated", async () => {
- L161 test("Given oversized or malformed API response When reading Then no alert candidate is accepted", async () => {
- L175 test("Given many repositories When reading Then concurrency stays bounded", async () => {
- L193 test("Mode B: impossible calendar dates and normalized UTC timestamps never enter CI history", () => {
- L216 test("Mode B: real leap-day UTC timestamp remains accepted without changing notification semantics", () => {
- L229 test("Mode defaults off and never emits unselected completed conclusions", () => {
- L240 test("Successes mode is silent on baseline and emits a new success only once", () => {
- L255 test("Both mode retains distinct success/failure facts through stale API alternation", () => {
- L273 test("Switching notification mode does not replay old runs", () => {
- L287 test("Given prior baseline and a failed provider read When recovered Then missing interval is silent", () => {
- L304 test("Given one repository fails When another succeeds Then healthy history stays intact", () => {

### `tests/ci-native-integration.test.mjs`

Classification: **Controller/integration fixture** (heuristic; confirm behavior). Direct relative references: `../apps/desktop/ui/github-monitor.mjs`, `../apps/desktop/src-tauri/src/ci_notifications.rs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/ui/settings.html`, `../apps/desktop/ui/settings.mjs`, `../apps/desktop/ui/locales/notifications.json`. **Declared tests (15)**:

- L76 test("Given notifications disabled without a CI status consumer When monitoring Then no completed runs are read", async () => {
- L86 test("Given enabled notifications When failure appears after silent baseline Then native alert is sent once", async () => {
- L104 test("Given user disables notifications When configuration changes Then new historical failure is silent", async () => {
- L131 test("Given WebView alert data When native delivery runs Then permissions and config gate OS plugin", () => {
- L159 test("Given credential silently expires When authorization returns Then first recovered read is a silent baseline", async () => {
- L175 test("Given successful workflows When runs complete after opt-in Then no alert is delivered", async () => {
- L184 test("Given runner inventory permission denied When tasks remain covered Then new CI failures still notify", async () => {
- L196 test("Given jobs are incomplete or globally rate-limited When runs change Then no CI alert is fabricated", async () => {
- L216 test("Successes mode notifies only new successes; both mode baselines before dual alerts", async () => {
- L239 test("Given a completed-run API outage When it recovers Then old completions stay silent", async () => {
- L255 test("Given a failed task collection When monitoring recovers Then history is rebaselined", async () => {
- L272 test("Given CI status enabled with notifications off When tasks refresh Then last run is shown without alerts", async () => {
- L288 test("Given CI status presented When provider data fails or user disconnects Then prior green is cleared", async () => {
- L306 test("Given incomplete job coverage When CI status would otherwise be present Then do not read untrusted runs", async () => {
- L318 test("Given native Hybrid hint When received Then only read-only tasks reconcile and bursts coalesce", async () => {

### `tests/ci-status.test.mjs`

Classification: **Runtime module** (heuristic; confirm behavior). Direct relative references: `../apps/desktop/ui/ci-status.mjs`. **Declared tests (4)**:

- L8 test("CI status shows the latest completed failure or success, never local Git cleanliness", () => {
- L20 test("CI status never guesses identity from folder name, fork or a wrong account", () => {
- L34 test("CI status rejects scope contamination and duplicate provider identities", () => {
- L45 test("CI status treats non-failure conclusions, provider gaps and out-of-scope rows as unknown", () => {

### `tests/config-persistence.test.mjs`

Classification: **Source contract** (heuristic; confirm behavior). Direct relative references: `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/src-tauri/src/linux_surface.rs`, `../crates/repoticker-core/src/config_store.rs`. **Declared tests (3)**:

- L9 test("desktop settings updates use one managed JSON transaction gate", () => {
- L24 test("atomic JSON writer keeps old config and recovery evidence", () => {
- L35 test("Linux drag margin persistence cannot bypass serialized config updates", () => {

### `tests/git-concurrency-routing.test.mjs`

Classification: **Source contract** (heuristic; confirm behavior). Direct relative references: `../crates/repoticker-core/src/git.rs`, `../crates/repoticker-core/tests/git_integration.rs`. **Declared tests (3)**:

- L8 test("Safe pull checks pinned refs again after the last external-client checkpoint", () => {
- L20 test("Safe push checks route again after the live remote probe", () => {
- L29 test("Git fixtures cover external branch changes and nonstandard push defaults", () => {

### `tests/git-edge-config.test.mjs`

Classification: **Source contract** (heuristic; confirm behavior). Direct relative references: `../crates/repoticker-core/src/git.rs`, `../crates/repoticker-core/tests/git_integration.rs`. **Declared tests (2)**:

- L8 test("all Safe sync eligibility checks explicitly include tracked submodules", () => {
- L19 test("nested dirtiness, second remote and alternate hooks have real Git regressions", () => {

### `tests/git-fetch-cancel.test.mjs`

Classification: **Source contract** (heuristic; confirm behavior). Direct relative references: `../crates/repoticker-core/src/git.rs`, `../apps/desktop/src-tauri/src/main.rs`, `../apps/desktop/ui/app.mjs`, `../apps/desktop/ui/index.html`. **Declared tests (5)**:

- L10 test("Fetch cancellation belongs to registered child groups, not all Git processes", () => {
- L37 test("desktop cancellation IPC stays independent of the blocking Git operation lock", () => {
- L48 test("existing four-button card reuses Fetch as Cancel without interrupting Safe pull", () => {
- L62 test("per-repository Fetch outcomes preserve concrete errors instead of global cancellation", () => {
- L75 test("retry and pre-registration cleanup failure are covered by native regression tests", () => {

### `tests/git-process-timeout.test.mjs`

Classification: **Source contract** (heuristic; confirm behavior). Direct relative references: `../crates/repoticker-core/src/git.rs`, `../apps/desktop/src-tauri/src/main.rs`. **Declared tests (3)**:

- L8 test("read-only and remote Git commands have bounded owned execution", () => {
- L35 test("push timeout errors cannot be reported as success or Fetch cancellation", () => {
- L46 test("Fetch retains independent cancellation with finite child cleanup", () => {

