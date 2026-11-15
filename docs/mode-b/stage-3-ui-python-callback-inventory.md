# Stage 3 source-exact UI/Python callback inventory (2026-11-15)

**MODE B / partial Stage 3.** Immutable baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. The six source files were read directly through the connected GitHub file API at this exact commit, each with its real Git blob SHA. All inserted rows are exact UTF-8 source lines including `=>` or `lambda`, verified absent from the old numbered ledger. This **is not parser-backed AST enumeration** and does not close anonymous callbacks not matching the chosen registration patterns, optional-chaining variations, inline callbacks, or nested Python function bodies. The existing [three-file Cloudflare TypeScript AST run](stage-3-real-ast-cloudflare-slice.md) remains the only reported actual TypeScript AST execution from this project.

## Source receipts and accounting

| Production source | Immutable source blob SHA | Old numbered rows | Added source callbacks | New numbered rows | Deduplicated Stage 4 owners |
| --- | --- | ---: | ---: | ---: | --- |
| `apps/desktop/ui/app.mjs` | `a2692d9cbaa07863ef6f75a5df6503010cf0d8fe` | 43 | 30 | 73 | A1-E1 (2); A1-E2 (5); A1-E3 (1); A1-E4 (5); A1-E8 (4); A1-E5 (5); A1-E6 (1); A1-E7 (3); A1-E9 (4) |
| `apps/desktop/ui/settings.mjs` | `a61b534c28e55767ed89b198d31a0e7781196c7e` | 43 | 34 | 77 | SET-E1 (3); SET-E2 (3); SET-E3 (3); SET-E4 (1); SET-E5 (8); SET-E6 (8); SET-E7 (6); SET-E8 (2) |
| `apps/desktop/ui/github-monitor.mjs` | `076a37b271c1186a5fb5cd2c60e45338d8ccc5af` | 14 | 8 | 22 | MON-PUBLISH (2); MON-E1 (3); MON-E2 (1); MON-E3 (1); MON-E4 (1) |
| `scripts/r2_release.py` | `b0fe41c6304733d44dd5a35cdaba6e3e906fffe2` | 19 | 1 | 20 | RELEASE-DIGEST (1) |
| `scripts/release_assets.py` | `e2a56854eec3579bf93206cd9193d32704c20b59` | 6 | 1 | 7 | RELEASE-DIGEST (1) |
| `scripts/apt_repository.py` | `21d659168d836a2ae994257c5e25d13d5443acb0` | 6 | 1 | 7 | APT-DIGEST (1) |

**Total newly indexed: 75 callable candidates** = 72 UI arrows and 3 Python digest lambdas. Prior registry 733 (724 numbered + nine placeholders); current **808 (799 numbered + nine placeholders)**. The six file-level `Functions/types` counters in Stage 5 and Stage 8 were updated to match. Their previously recorded **lexical branch counts are untouched and must not be mistaken for per-method AST branch maps**.

## Per-callback exact line ownership (all source-backed; test assertion mapping pending)

| File | Line | Existing Stage 4 case owner | Exact source declaration (start line) |
| --- | ---: | --- | --- |
| `apps/desktop/ui/app.mjs` | 72 | A1-E1 | `idleTimer = setTimeout(async () => {` |
| `apps/desktop/ui/app.mjs` | 80 | A1-E1 | `document.addEventListener("visibilitychange", () => {` |
| `apps/desktop/ui/app.mjs` | 172 | A1-E2 | `item.addEventListener("click", async () => {` |
| `apps/desktop/ui/app.mjs` | 193 | A1-E2 | `repoMenu.addEventListener("keydown", event => {` |
| `apps/desktop/ui/app.mjs` | 207 | A1-E2 | `document.addEventListener("pointerdown", event => {` |
| `apps/desktop/ui/app.mjs` | 212 | A1-E2 | `byId("repo-list").addEventListener("scroll", () => hideRepoMenus(), { passive: true });` |
| `apps/desktop/ui/app.mjs` | 213 | A1-E2 | `window.addEventListener("resize", () => hideRepoMenus());` |
| `apps/desktop/ui/app.mjs` | 268 | A1-E3 | `button.addEventListener("click", () => showRepoMenu(button, repo.path));` |
| `apps/desktop/ui/app.mjs` | 355 | A1-E4 | `quotaQueue = quotaQueue.then(async () => {` |
| `apps/desktop/ui/app.mjs` | 407 | A1-E4 | `anchor.addEventListener("pointerenter", () => traceHover(kind, "pointer-enter"));` |
| `apps/desktop/ui/app.mjs` | 409 | A1-E4 | `anchor.addEventListener("mouseleave", () => {` |
| `apps/desktop/ui/app.mjs` | 414 | A1-E4 | `anchor.addEventListener("focusout", () => {` |
| `apps/desktop/ui/app.mjs` | 422 | A1-E4 | `node.addEventListener("click", () => {` |
| `apps/desktop/ui/app.mjs` | 533 | A1-E8 | `onBusyChange: active => {` |
| `apps/desktop/ui/app.mjs` | 539 | A1-E8 | `scan: async () => {` |
| `apps/desktop/ui/app.mjs` | 544 | A1-E8 | `publish: ({ revision, next }) => {` |
| `apps/desktop/ui/app.mjs` | 644 | A1-E5 | `byId("show-repos").addEventListener("click", () => openView("repos"));` |
| `apps/desktop/ui/app.mjs` | 645 | A1-E5 | `byId("hide-card").addEventListener("click", async () => {` |
| `apps/desktop/ui/app.mjs` | 649 | A1-E5 | `byId("fetch-all").addEventListener("click", () => {` |
| `apps/desktop/ui/app.mjs` | 656 | A1-E5 | `byId("sync-all").addEventListener("click", () => runGitAction("safe_sync"));` |
| `apps/desktop/ui/app.mjs` | 657 | A1-E5 | `document.addEventListener("keydown", event => {` |
| `apps/desktop/ui/app.mjs` | 669 | A1-E6 | `window.__TAURI__?.event?.listen?.("repoticker-git-progress", event => {` |
| `apps/desktop/ui/app.mjs` | 699 | A1-E7 | `window.__TAURI__?.event?.listen?.("repoticker-card-hidden", () => {` |
| `apps/desktop/ui/app.mjs` | 706 | A1-E7 | `window.__TAURI__?.event?.listen?.("repoticker-card-shown", () => {` |
| `apps/desktop/ui/app.mjs` | 710 | A1-E7 | `window.__TAURI__?.event?.listen?.("repoticker-reset-view", () => {` |
| `apps/desktop/ui/app.mjs` | 733 | A1-E8 | `window.__TAURI__?.event?.listen?.("repoticker-git-action-finished", async event => {` |
| `apps/desktop/ui/app.mjs` | 756 | A1-E9 | `start: () => invoke("start_card_drag"),` |
| `apps/desktop/ui/app.mjs` | 757 | A1-E9 | `stop: () => invoke("stop_card_drag"),` |
| `apps/desktop/ui/app.mjs` | 773 | A1-E9 | `dragSurface.addEventListener("pointerdown", event => {` |
| `apps/desktop/ui/app.mjs` | 780 | A1-E9 | `dragSurface.addEventListener("pointermove", event => {` |
| `apps/desktop/ui/settings.mjs` | 128 | SET-E1 | `byId("github-connection-mode").addEventListener("change", event => {` |
| `apps/desktop/ui/settings.mjs` | 141 | SET-E1 | `byId("github-worker-url").addEventListener("input", event => {` |
| `apps/desktop/ui/settings.mjs` | 149 | SET-E1 | `byId("settings-titlebar").addEventListener("mousedown", event => {` |
| `apps/desktop/ui/settings.mjs` | 206 | SET-E2 | `byId("relay-secret-mask").addEventListener("input", () => {` |
| `apps/desktop/ui/settings.mjs` | 210 | SET-E2 | `byId("relay-remove-secret").addEventListener("click", async () => {` |
| `apps/desktop/ui/settings.mjs` | 241 | SET-E2 | `window.__TAURI__?.event?.listen?.("repoticker-relay-state", event => {` |
| `apps/desktop/ui/settings.mjs` | 330 | SET-E3 | `checkbox.addEventListener("change", () => {` |
| `apps/desktop/ui/settings.mjs` | 408 | SET-E3 | `byId("github-repo-mode").addEventListener("change", event => {` |
| `apps/desktop/ui/settings.mjs` | 511 | SET-E3 | `byId("github-monitor-scope").addEventListener("change", event => {` |
| `apps/desktop/ui/settings.mjs` | 545 | SET-E4 | `githubStatusTimer = setInterval(async () => {` |
| `apps/desktop/ui/settings.mjs` | 670 | SET-E5 | `byId("github-connect").addEventListener("click", async () => {` |
| `apps/desktop/ui/settings.mjs` | 706 | SET-E5 | `byId("github-copy-code").addEventListener("click", async () => {` |
| `apps/desktop/ui/settings.mjs` | 719 | SET-E5 | `window.addEventListener("focus", () => {` |
| `apps/desktop/ui/settings.mjs` | 735 | SET-E5 | `byId("relay-worker-guide-link").addEventListener("click", event => {` |
| `apps/desktop/ui/settings.mjs` | 742 | SET-E5 | `byId("github-open-device").addEventListener("click", async () => {` |
| `apps/desktop/ui/settings.mjs` | 746 | SET-E5 | `byId("github-cancel-device").addEventListener("click", async () => {` |
| `apps/desktop/ui/settings.mjs` | 756 | SET-E5 | `byId("github-disconnect").addEventListener("click", () => {` |
| `apps/desktop/ui/settings.mjs` | 771 | SET-E5 | `window.__TAURI__?.event?.listen?.("repoticker-github-auth", () => {` |
| `apps/desktop/ui/settings.mjs` | 879 | SET-E6 | `remove.addEventListener("click", () => {` |
| `apps/desktop/ui/settings.mjs` | 906 | SET-E6 | `remove.addEventListener("click", () => {` |
| `apps/desktop/ui/settings.mjs` | 915 | SET-E6 | `byId("ignore-child-form").addEventListener("submit", event => {` |
| `apps/desktop/ui/settings.mjs` | 1031 | SET-E6 | `byId("autostart-enabled").addEventListener("change", event => {` |
| `apps/desktop/ui/settings.mjs` | 1036 | SET-E6 | `byId("ci-notification-mode").addEventListener("change", event => {` |
| `apps/desktop/ui/settings.mjs` | 1043 | SET-E6 | `byId("add-root-form").addEventListener("submit", event => {` |
| `apps/desktop/ui/settings.mjs` | 1057 | SET-E6 | `byId("browse-root").addEventListener("click", async () => {` |
| `apps/desktop/ui/settings.mjs` | 1081 | SET-E6 | `byId("browse-ignored-child").addEventListener("click", async () => {` |
| `apps/desktop/ui/settings.mjs` | 1137 | SET-E7 | `languageTrigger.addEventListener("click", () => {` |
| `apps/desktop/ui/settings.mjs` | 1141 | SET-E7 | `languageTrigger.addEventListener("keydown", event => {` |
| `apps/desktop/ui/settings.mjs` | 1149 | SET-E7 | `languageList.addEventListener("keydown", event => {` |
| `apps/desktop/ui/settings.mjs` | 1172 | SET-E7 | `option.addEventListener("click", () => {` |
| `apps/desktop/ui/settings.mjs` | 1183 | SET-E7 | `document.addEventListener("pointerdown", event => {` |
| `apps/desktop/ui/settings.mjs` | 1186 | SET-E7 | `document.addEventListener("keydown", event => {` |
| `apps/desktop/ui/settings.mjs` | 1234 | SET-E8 | `byId("apply-settings").addEventListener("click", async () => {` |
| `apps/desktop/ui/settings.mjs` | 1347 | SET-E8 | `window.__TAURI__?.event?.listen?.("repoticker-settings-opened", () => {` |
| `apps/desktop/ui/github-monitor.mjs` | 209 | MON-PUBLISH (Rejected publication-tail recovery) | `const write = publicationTail.catch(() => {}).then(() => {` |
| `apps/desktop/ui/github-monitor.mjs` | 209 | MON-PUBLISH (Next serialized publication) | `const write = publicationTail.catch(() => {}).then(() => {` |
| `apps/desktop/ui/github-monitor.mjs` | 392 | MON-E1 | `event?.listen?.("repoticker-github-auth", evt => {` |
| `apps/desktop/ui/github-monitor.mjs` | 399 | MON-E1 | `event?.listen?.("repoticker-github-scope-changed", () => {` |
| `apps/desktop/ui/github-monitor.mjs` | 402 | MON-E1 | `event?.listen?.("repoticker-config-changed", () => {` |
| `apps/desktop/ui/github-monitor.mjs` | 421 | MON-E2 | `event?.listen?.("repoticker-relay-state", evt => {` |
| `apps/desktop/ui/github-monitor.mjs` | 436 | MON-E3 | `event?.listen?.("repoticker-relay-reconcile", evt => {` |
| `apps/desktop/ui/github-monitor.mjs` | 467 | MON-E4 | `event?.listen?.("repoticker-card-shown", () => { void refresh(); });` |
| `scripts/r2_release.py` | 42 | RELEASE-DIGEST | `for part in iter(lambda: fh.read(1024 * 1024), b""):` |
| `scripts/release_assets.py` | 28 | RELEASE-DIGEST | `for buf in iter(lambda: f.read(1024 * 1024), b""):` |
| `scripts/apt_repository.py` | 24 | APT-DIGEST | `for chunk in iter(lambda: f.read(1024 * 1024), b""):` |

## Distinguish executable subject tests from callbacks observed in source

- **Card / A1:** direct imported execution of `app.mjs` has not been demonstrated. Tests of helpers such as `scan-refresh.mjs`, `view.mjs`, native drag or source-code regex are **not** real Card controller callback assertions. A1-E1..E9 remain P_CONTROLLER and must be exercised through a faithful DOM + external fake Tauri host.
- **Settings / SET:** existing `tests/settings-github-confirm.test.mjs` imports the real Settings module against external DOM/Tauri fakes and has many positive/negative assertions of OAuth, saved draft, Keyring stage/commit, cancel and repository selection. This source scan does **not** establish that every 34 newly indexed closure body has a branch-specific real assertion; new ledger status stays `CALLBACK_P` until per-handler test-body mapping.
- **Monitor / MON:** `tests/github-monitor.test.mjs` and `tests/ci-native-integration.test.mjs` import and run real `startGithubMonitoring`. It is not proof of every callback/race outcome. The publication-tail statement at `github-monitor.mjs:209` contains **two distinct arrows**: the empty rejection recovery handler `.catch(() => {})` and the serialized `.then(() => {...})` publisher; each is separately tracked with the same source-line string pending AST column fingerprint.
- **Python / release digest:** `r2_release.py:42`, `release_assets.py:28` and `apt_repository.py:24` each contain an `iter(lambda: file.read(1 MiB), b"")` callback. The named `def` declarations in these three scripts already match their lexical registry rows; the three lambdas were missing. Existing publisher/packaging/GPG tests cover surrounding APIs, but digest callback-specific N1/N2/N12 still requires source-to-assertion reconciliation. Python `ast` did **not** run for these three sources in this continuation.

## Required next negative and interaction branches before Stage 5 promotion

| Owner | Planned independent assertions |
| --- | --- |
| A1-E1/E5/E6/E7/E8/E9 | Card timeout during local scan; repeated Fetch/Cancel and malformed progress payload; hidden/shown events and late config/monitor revision; pointer capture loss and rejected native drag |
| SET-E2/E3/E4/E5/E8 | Stage/commit Relay secret vs Cancel/Close; 1500ms poll race, delayed OAuth challenge, Scope/Account changes, double Save and rollback after persistent failure |
| MON-PUBLISH/MON-E1..E4 | A rejected native publish followed by next queued publication; auth/scope generation invalidation; late Relay state; event burst reconciliation and independent runner refresh |
| RELEASE-DIGEST/APT-DIGEST | Empty/huge source file, buffer chunk edges, unreadable/short-read/disappearing file, stable digest and no false R2/APT release success |

The planned cases **do not constitute tests written, tests passed or product defects**. N11 remains NA for these domains unless an entitlement requirement is later identified; other N1–N12 categories retain their existing file-level `?` or provisional `✖` status. We must deduplicate against existing real tests before Stage 7 estimates.

## Evidence and limits

Source read and row matching were performed in the connected GitHub environment, not a checked-out RepoTicker Git clone; each listed blob SHA came directly from the exact baseline file result. Literal source rows and previously indexed line numbers were machine-checked before insertion. A full TypeScript AST traversal and Python `ast` scan of these six files **has not been performed** in this environment. The 71 selected single-line callback expressions plus one duplicated line owner are source-supported but are **not exhaustive callable counts**. No product tests, CI, Cargo, release, mutation, OS/Keyring, network publication or application code were changed or executed. Stage 3–8 remain PARTIAL; Stage 9 is blocked.
