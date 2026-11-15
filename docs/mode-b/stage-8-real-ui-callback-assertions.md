# Stage 8: real imported UI callback to existing assertions

**MODE B Stage 8 evidence reconciliation; source-inspected, test suites NOT RUN on 2026-11-15.** Immutable production source `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `e280974b374d9ab11e2c327a7ae57771462c32df`. This document does not manufacture tests or claim they pass: it maps pre-existing executable subject assertions to **24** specific callback declarations newly indexed in Stage 3. An `E_PARTIAL` status is *real subject function invoked inside an existing test body*, not complete Positive/N1–N12 coverage.

## Fixture authenticity

- `tests/settings-github-confirm.test.mjs:22–26`: `mockNode.fire(type)` looks up the **actual handler registered on that same node** and invokes it; missing registration throws instead of silently stubbing the handler.
- `tests/settings-github-confirm.test.mjs:100–105,249–257`: only **external Tauri API** and DOM environment are injected, then the genuine `settings.mjs` module is imported with a unique session URL.
- The following **19** `byId(...).addEventListener` production handlers have **160 direct `ui.node(ID).fire(event)` call sites** located in the existing Settings tests. Multiple sites can occur in one test body. These are **not 160 tests**, and none was executed in this audit.

## Settings: actual handler call-site receipts

| Real source handler | DOM element / event | Existing test dispatch sites | One existing scenario exercising the handler |
| --- | --- | ---: | --- |
| `settings.mjs:128` | `github-connection-mode` / `change` | 17 | `tests/settings-github-confirm.test.mjs:2145` test("Hybrid mode and URL are committed together only after Settings OK", async () => { |
| `settings.mjs:141` | `github-worker-url` / `input` | 10 | `tests/settings-github-confirm.test.mjs:2147` test("Hybrid mode and URL are committed together only after Settings OK", async () => { |
| `settings.mjs:206` | `relay-secret-mask` / `input` | 4 | `tests/settings-github-confirm.test.mjs:2128` test("Failed Keyring commit retains retryable staged secret without closing Settings", async () => { |
| `settings.mjs:210` | `relay-remove-secret` / `click` | 3 | `tests/settings-github-confirm.test.mjs:2109` test("Relay Disconnect preserves selected Hybrid mode and commits removal only on OK", async () => { |
| `settings.mjs:408` | `github-repo-mode` / `change` | 6 | `tests/settings-github-confirm.test.mjs:484` test("selected GitHub repositories remain drafts until OK and Cancel never writes them", async () => { |
| `settings.mjs:511` | `github-monitor-scope` / `change` | 5 | `tests/settings-github-confirm.test.mjs:349` test("new authorization enables OK, confirms selected Monitor account and refreshes without hiding card", async () => { |
| `settings.mjs:670` | `github-connect` / `click` | 13 | `tests/settings-github-confirm.test.mjs:340` test("new authorization enables OK, confirms selected Monitor account and refreshes without hiding card", async () => { |
| `settings.mjs:706` | `github-copy-code` / `click` | 1 | `tests/settings-github-confirm.test.mjs:1395` test("Mode B: clipboard denial preserves public user code and allows manual copying", async () => { |
| `settings.mjs:735` | `relay-worker-guide-link` / `click` | 2 | `tests/settings-github-confirm.test.mjs:2386` test("Hybrid setup provides one native-browser deployment guide link", async () => { |
| `settings.mjs:742` | `github-open-device` / `click` | 1 | `tests/settings-github-confirm.test.mjs:1416` test("Mode B: browser launch failure does not consume GitHub challenge", async () => { |
| `settings.mjs:746` | `github-cancel-device` / `click` | 4 | `tests/settings-github-confirm.test.mjs:1402` test("Mode B: clipboard denial preserves public user code and allows manual copying", async () => { |
| `settings.mjs:756` | `github-disconnect` / `click` | 5 | `tests/settings-github-confirm.test.mjs:591` test("late installation API response cannot resurrect Settings account controls after disconnect", async () => { |
| `settings.mjs:915` | `ignore-child-form` / `submit` | 5 | `tests/settings-github-confirm.test.mjs:616` test("ignored child folder edits are draft-only and Cancel never persists them", async () => { |
| `settings.mjs:1031` | `autostart-enabled` / `change` | 5 | `tests/settings-github-confirm.test.mjs:832` test("Login launch remains OFF by default and Cancel never registers with OS", async () => { |
| `settings.mjs:1036` | `ci-notification-mode` / `change` | 14 | `tests/settings-github-confirm.test.mjs:664` test("CI notification mode defaults off and Cancel does not persist opt-in", async () => { |
| `settings.mjs:1043` | `add-root-form` / `submit` | 3 | `tests/settings-github-confirm.test.mjs:1476` test("Mode B: blank and duplicate root form submissions keep Settings pristine", async () => { |
| `settings.mjs:1057` | `browse-root` / `click` | 5 | `tests/settings-github-confirm.test.mjs:900` test("Native folder selection stays a draft until Settings OK", async () => { |
| `settings.mjs:1081` | `browse-ignored-child` / `click` | 3 | `tests/settings-github-confirm.test.mjs:971` test("Native browse for excluded children captures only the final folder NAME", async () => { |
| `settings.mjs:1234` | `apply-settings` / `click` | 54 | `tests/settings-github-confirm.test.mjs:352` test("new authorization enables OK, confirms selected Monitor account and refreshes without hiding card", async () => { |

The remaining Settings closures in the 34-node batch include timer polling, dynamic UI nodes, direct Tauri event bridge and keyboard/document-level handlers. Some may already be exercised indirectly by current test bodies, but they have **not** been promoted without exact invoked-handler linkage. `settings-titlebar` mouse down at `:149` has no direct `node.fire("mousedown")` call site in the inspected Settings test file; native drag remains OS P.

## GitHub Monitor: existing real callback invocation receipts

| Actual source callable | Existing source test invocation | Assertion ownership |
| --- | --- | --- |
| `github-monitor.mjs:209` second arrow (`publicationTail...then`) | `tests/github-monitor.test.mjs:562–597` calls real `startGithubMonitoring`, holds first native publish, dispatches disconnect, releases prior response, asserts the latest publication is disconnected with `runnerState === null` | E_PARTIAL async ordered publication, selection revision; the **first same-line `.catch(() => {})` remains CALLBACK_P** because a rejected prior publish/retry is not proven in this case |
| `github-monitor.mjs:392` auth listener | `tests/github-monitor.test.mjs:591–596` retrieves and calls `handlers.get("repoticker-github-auth")`, then asserts stale account information is not republished | E_PARTIAL auth revocation race |
| `github-monitor.mjs:399` scope changed listener | `tests/github-monitor.test.mjs:625–635` invokes `listeners.get("repoticker-github-scope-changed")`, checks old account's counts remain absent after stale cooldown completion | E_PARTIAL scope/HTTP race |
| `github-monitor.mjs:402` config changed listener | `tests/ci-native-integration.test.mjs:70–72,104–124` calls real registered config listener through `app.configChanged()`; checks notification mode state transitions | E_PARTIAL config-triggered real monitoring |
| `github-monitor.mjs:436` relay reconcile listener | `tests/ci-native-integration.test.mjs:318–341`: `app.relay("tasks"/"invalid"/"all")` forwards to the real `repoticker-relay-reconcile` callback; asserts task burst coalescing and no Git mutation | E_PARTIAL read-only relay refresh and bounded requests |

`github-monitor.mjs:421` real Relay-state WebSocket state event and `:467` card-show event remain CALLBACK_P: an explicit registered-listener invocation and expected state assertion have not yet been individually traced for them. The remaining `.catch(() => {})` at `:209` must be tested with injected **external** rejection and subsequent successful native publication before promotion; never replace the actual monitor logic with a mock.

## Counts and limits

- Initial 2026-11-15 source sweep: 75 `CALLBACK_P` new rows.
- This review: **24** rows upgraded to `E_PARTIAL` (19 Settings, 5 Monitor); **51** remain `CALLBACK_P`. Globally, `E_PARTIAL` becomes 224, `CALLBACK_P` becomes 52 (includes one older unclosed callback).
- This is *not* a fresh test run or suite result, and no N-category receives `✔` from these invocations alone. Other methods and inline anonymous event handlers require full parser/cfg and branch-by-branch enumeration. Card A1 actual imported controller still unverified, native IPC permission and OS Keyring still P. Stage 9 remains blocked.

## 2026-11-15 follow-up: 14 more real-handler assertions

[Source-to-subject evidence and missing branches](stage-8-existing-handler-closure-2026-11-15.md) verifies thirteen additional real Settings callbacks (native Relay/auth/open/focus, dynamic repository/root/ignored-child rows, and six language keyboard/click/escape handlers) and the actual GitHub Monitor Relay-phase callback via the imported Hybrid scheduling harness. These existing assertions are `E_PARTIAL` and **were not executed in this audit pass**. Totals: **38/75** newly indexed callbacks have partial direct subject assertions, **37/75** remain `CALLBACK_P`; including one older callback, **38 global `CALLBACK_P`** and **238 global `E_PARTIAL`**. No Stage 5 cell becomes `✔`, and the entire release/test validation gate remains open.
