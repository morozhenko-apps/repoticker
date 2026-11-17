# Stage 3 source-line reconciliation: 2026-11-15

**Mode B — Testing.** Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `924bdca892495f1ff1d6882dc8ca9160555e0a3d`. This was a **source-backed lexical/grammar-heuristic reconciliation across 80 files**, not a complete AST/cfg or event-handler census. The connected repository exposes exact source files but does not supply an executable checked-out source tree plus Rust/JS/TS parser in this workflow. No tests or builds were run.

## Confirmed missing source artifacts (11)

| Source @ immutable blob | Line | Callable | Evidence classification |
| --- | ---: | --- | --- |
| `apps/relay-cloudflare/src/worker.mjs` @ `b13759d89d6c93ace5b23bfe89345f796042143d` | 7 | private response helper `fail` | I_PARTIAL |
| same | 8 | fixed Durable Object adapter `stub` | I_PARTIAL |
| same | 10 | signed webhook `ingest` | I_PARTIAL |
| same | 34 | native-only stream/polling `subscribe` | I_PARTIAL |
| `apps/relay-cloudflare/src/hub.mjs` @ `30cea0f820e9862233baa768090c3e63772118b9` | 8 | private `fail` | I_PARTIAL |
| same | 9 | `json` batch response | I_PARTIAL |
| same | 98 | `RelayHubController.fetch` HTTP entrypoint | E_PARTIAL |
| `apps/desktop/ui/ci-failure-events.mjs` @ `f78945f0b73010c1d700279413532672c8c9f7fb` | 99 | returned tracker `reset` | E_PARTIAL |
| same | 103 | returned tracker `observe` | E_PARTIAL |
| `apps/desktop/ui/native-drag.mjs` @ `9b330948793155617477da4c736228ee8fe1cf7f` | 16 | returned gesture `begin` | E_PARTIAL |
| same | 26 | returned gesture `end` | E_PARTIAL |

The `I_PARTIAL` cases are reached through **real** Worker/Hub public calls; `E_PARTIAL` cases are directly asserted in existing test sources. Source evidence includes `tests/mode-b-relay-worker.test.mjs`, `tests/relay-hub.test.mjs`, `tests/ci-failure-events.test.mjs`, `tests/native-drag.test.mjs`. Neither category means all branches passed or were executed in this continuation.

## Reconciliation arithmetic and exceptions

- Previously: **717** provisional records = **708 numbered candidates + nine non-method placeholders**. Now: **728** = **719 numbered candidates + nine placeholders**, with 11 source-exact candidates added. No attempt is made to call these 728 executable methods.
- Existing numbered source lines were compared against the immutable baseline across all 80 source headings. Two raw string differences were **escaped Markdown pipes**, not source drift: `settings.mjs:842` (`||`) and `index.ts:13` (`string | ArrayBuffer`). A parser-backed recheck is required to call the inventory exhaustive.
- **13 unindexed Rust helper declarations belong to test-only modules, not production APIs:** `ci_notifications.rs:172`, `github_native.rs:231`, `config_store.rs:220,230,241,250`, `git.rs:1321,1326,1344,1399,1578`, `github_auth.rs:171`, `lib.rs:60`. Rust `#[test]` bodies likewise cannot be counted as production functions. Runtime OS `cfg` and macro-generated interfaces need the AST/cfg pass.
- The source-method/branch candidate counts in the prior Stage 5/8 ledgers were **lexical estimates**. Only the four file `Functions/types` counters were corrected. Historical source-branch counts (18/21/33/6) were *not* recomputed and cannot be marked complete.

## Missing independent branch obligations (Stage 4–7, provisional)

| Owner | Existing real source assertion, partial | Remaining named independent scenarios |
| --- | --- | --- |
| Worker `fail/stub/ingest/subscribe` | Fixed 401/403/405/413/415/422/503 responses, signed request routing and DO fake-adapter contracts | WB1: DO binding throw/fail redacted; WB2: 65,536/65,537 raw signed boundary; WB3: browser Origin/Cookie and WS upgrade variants; WB4: no unintended header/target forwarding; HOST `index.ts` |
| Hub `fail/json/fetch` | Real `RelayHubController.fetch` with in-memory SQLite transaction/rate budget, existing denial/stream tests | HB1: 512/513 payload, decoded malformed item; HB2: SQL/storage fault with no leak; HB3: 8/9 live WebSocket and active revocation; HB4: real hosted DO/SQLite/WS |
| CI tracker `reset/observe` | Real tracker baseline, scope reset, validation before history writes, replay/duplicate cases | CT1: delayed native alert after auth revoke; CT2: 200/201 result bound, maxRemembered 200/500/1000/1001; CT3: multi-repository partial outage/correction sequence |
| Drag gesture `begin/end` | Real JS queue, duplicate begin, wrong release, start and stop ordering | DG1: rejected start after next session, old ownership; DG2: rejected stop with successful subsequent gesture; DG3: physical KDE Wayland pointer/hide/reopen |

**This is not Stage 3 signoff.** A full parser-backed AST inventory is still required for JS/TS object literal and arrow closures, DOM/native anonymous event handlers, Rust attributes/cfg/test modules and FFI, Python nested functions and Bash/PowerShell entrypoints. Every production method must then own branch outcomes and tests; matrix categories remain open unless fully proven. No source, test, production, CI, release, OS or mutation action occurred.
