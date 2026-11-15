# Mode B Stage 8: additional existing-test ownership for UI callbacks

**Evidence type:** source-to-assertion reconciliation only; no product tests executed during this pass. Branch `audit/mode-b-testing`, immutable production source `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `5c004e982330035c9c2ff9aeba09e4bc4a945f49`.

The actual Settings controller is imported by `tests/settings-github-confirm.test.mjs:257` under a fake external Tauri/DOM environment. Its `mockNode.fire` at :22–26 throws if the production listener is missing; document/window dispatch at :270–320 retrieves the handler installed by the imported module. The Hybrid scheduling harness imports the actual `startGithubMonitoring` at `tests/hybrid-reconcile-schedule.test.mjs:3–5,45`, captures registered native event listeners at :47 and dispatches the real relay phase callback at :74–78. Therefore the direct calls below are real SUT execution, not regex/source-only tests. They are **not** proof of passing tests at the current audit HEAD.

## Fourteen newly matched callback declarations

| Production callable | Invoked by existing test | Observable assertion and already exercised branch | Independent unverified paths |
| --- | --- | --- | --- |
| `settings.mjs:241` Relay state listener | `tests/settings-github-confirm.test.mjs:287–291,2442–2455,2590–2596` | Online→fallback enables Worker URL editing; old online event cannot lock changed draft | Out-of-order duplicate native phases with close/reopen and unavailable status |
| `settings.mjs:330` dynamic repository checkbox | `tests/settings-github-confirm.test.mjs:484–512,1046–1054,1333–1358` | Actual dynamically created checkbox selection/clear changes staged choices and saved allowlist; selection limits exercised | Rapid scope change while checkbox event queued, stale/destroyed node |
| `settings.mjs:719` window focus listener | `tests/settings-github-confirm.test.mjs:297–301,2685–2715,2739–2762` | Focus re-evaluates native phase; missed opened-event recovery refreshes state while staged draft preservation is asserted | Focus during blocked Keyring commit and competing open event |
| `settings.mjs:771` native GitHub auth listener | `tests/settings-github-confirm.test.mjs:319–322,340–346,1373–1378,1815–1832` | Native event drives fresh authorization reconciliation; staged disconnect is not silently reversed; wallet failure remains unknown | Multiple auth notifications racing with shutdown and pending account switch |
| `settings.mjs:879` dynamic root remove | `tests/settings-github-confirm.test.mjs:1488–1503` | Added root is removed via the actual row button; Apply returns disabled and no native save occurs | Two root removals crossing a delayed folder picker |
| `settings.mjs:906` dynamic ignored-child remove | `tests/settings-github-confirm.test.mjs:644–655` | Actual row click removes excluded name; Save contains empty list and no unrelated root change | Stale row after re-render or concurrent ignored-child browse |
| `settings.mjs:1137` language trigger click | `tests/settings-github-confirm.test.mjs:740–752` | Hidden→open→hidden; active element moves to selected option then back to trigger | Click while saving, empty language option list |
| `settings.mjs:1141` trigger keyboard | `tests/settings-github-confirm.test.mjs:755–764,783–800` | ArrowDown/End open selector and focus corresponding option; no save | No draft / saving, Home and ArrowUp direct trigger permutations |
| `settings.mjs:1149` language list keyboard | `tests/settings-github-confirm.test.mjs:765–779,791–794` | Arrow wrap, Home, End, Escape, Tab and focus behavior asserted | Unknown key, empty list and invalid focused target |
| `settings.mjs:1172` dynamic language option click | `tests/settings-github-confirm.test.mjs:712–738,804–823` | Draft locale selection does not mutate persisted language before OK; Save and Cancel diverge | Clicking stale option after close; blocked save |
| `settings.mjs:1183` document outside pointer | `tests/settings-github-confirm.test.mjs:274–277,783–801` | Outside pointer hides list while preserving focus | Pointer inside picker, pointer after list already hidden |
| `settings.mjs:1186` document Escape | `tests/settings-github-confirm.test.mjs:270–273,804–823` | Escape restores trigger focus and hides opened list without saving | Escape while hidden or during save |
| `settings.mjs:1347` native Settings opened | `tests/settings-github-confirm.test.mjs:314–318,1617–1635,1644–1655` | Reopen event discards stale draft on config read failure and correctly reloads persisted language; secret-free redaction | Opening event while a previous refresh is resolving after close |
| `github-monitor.mjs:421` native Relay phase listener | `tests/hybrid-reconcile-schedule.test.mjs:74–78,122–131,149–163,219–226` | Actual callback drives immediate full REST fallback, rejects a late initial online snapshot, and treats unknown phase conservatively | Rapid online→fallback→online during rate cooldown; duplicate fallback hints |

**Classification:** change only these fourteen specific rows from `CALLBACK_P` to `E_PARTIAL`. Their subject callbacks are invoked in pre-existing tests and observable outcomes are asserted. A callable with untested independent outcomes stays partial. All 80 file-level Positive/N1–N12 aggregate rows remain unchanged (`810 ?`, `230 ✖`, `0 ✔`), since a partial callback does not make any entire file/category complete.

## Branch / negative / interaction planning for the next test batch

- **Settings auth and Relay:** Positive (native phase/status, successful account refresh), N3 (native status/Keyring permission failure), N4 (duplicate events), N5 (out-of-order focus, auth and reopening), N6 (stale saved configuration), N7/N10 (secret and scope are not inferred from events), N9 (close during pending operation), N12 (settings read/write failure). Keep real Settings controller, mock only external native IPC, and use controllable promises.
- **Settings dynamic lists and language:** Positive (add/remove/draft/save), N1/N2 (unknown/overflowing names and 100/101 visible repo options), N4/N5 (stale DOM node and double click), N8 (locale/RTL focus), N9 (Escape, Tab, Cancel) and N12 (failed settings persistence). Do not confuse DOM/mock registration with an executed handler; fire the same actual registered node.
- **Monitor phase:** Positive (online, fallback), N3 (native phase IPC rejection), N4/N5 (duplicate/out-of-order transitions), N8 (fake clock rollback and 15-minute boundary), N10 (no private data or workflow conclusion from relay hint). Verify only read-only GitHub commands and that cooldown is not bypassed.
- **N11:** Not applicable to these callbacks: none grants a purchase entitlement. Other categories without independently relevant input/state paths remain per-artifact `✖`, not fabricated test bodies.

### Mutation review obligations

Changing `phase === "online"` to accepting unknown, dropping `relayPhaseRevision`, or skipping forced full REST on fallback must fail the applicable Hybrid tests. Removing language focus restoration, allowing a locale commit before OK, or treating an unsaved root removal as a native save must fail current direct assertions. Unproven mutations (double-close, stale dynamic rows, async Keyring failure) remain planned cases rather than claimed kills.

### Limits and continuation

This is **14 existing callback owners**, not fourteen newly written tests. Previously identified 24 plus these 14 yields **38 of the 75 source-indexed new callbacks with partial direct assertions**, leaving 37 `CALLBACK_P` of the 75; the original older callback still pending means **38 global `CALLBACK_P`**. The generic `E_PARTIAL` total rises from 224 to 238; this is evidence classification, not runtime coverage or an execution count.

Before Stage 9, complete real AST/cfg closure (particularly `app.mjs` A1), all branch maps, per-method Positive/N1–N12 matrices and effective interactions. The unresolved native monitor schema NM1 and external URL trust policy remain architectural STOP factors for production contract changes. No changes to product code, tests, CI, environment, credentials, hosting or release refs are authorized by this receipt.
