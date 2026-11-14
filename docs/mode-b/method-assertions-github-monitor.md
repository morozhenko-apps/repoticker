# Mode B method assertions: GitHub Monitor and Hybrid reconciliation

Production `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `apps/desktop/ui/github-monitor.mjs` blob `076a37b271c1186a5fb5cd2c60e45338d8ccc5af`. GitHub audit parent `fe80f812d8f38fcd32c4b272e1de2ccc6df464a0`.
Direct baseline tests reviewed at source:
- `tests/github-monitor.test.mjs` blob `df666c4f94a7292c53f6345cbd8fa8621a479cc3` (**30** tests)
- `tests/mode-b-monitor-edges.test.mjs` blob `ab8e2f268e30b8e3fd968f8adf0c526531982d22` (**26** mixed-domain tests)
- `tests/mode-b-native-monitor-races.test.mjs` blob `b9bae5fc259e9da035d877866f3d1a9b6156e146` (**12** monitor tests)
- `tests/hybrid-reconcile-schedule.test.mjs` blob `cf18776897349bb89ca7f1bd1c56797faad37ecf` (**11** actual-controller tests).

**E_PARTIAL** = direct exported method call with observable assertion; **I_PARTIAL** = private callback/closure behavior exercised and asserted through actual `startGithubMonitoring`; **INLINE** = lexical nested helper, not independent public API. None implies total branch coverage or executed in this turn. More detailed outcomes and test examples are in `branch-map-github-monitor-controller.md` and `branch-map-hybrid-reconciliation.md`.

## Exact 14 lexical candidates mapped to executable owners

| Line | Actual method/candidate | Ownership and evidence status | Existing assertion (specific test) | Missing independent branch |
| ---: | --- | --- | --- | --- |
| 15 | `monitorRefreshDelay` | Exported, E_PARTIAL | `single available GitHub App installation is selected automatically`: 10→120000, 40→180000, 100→420000; `Mode B monitor refresh: exact 15-repository boundaries never overpoll` checks thresholds | invalid/non-safe/noninteger, 0/1, huge sum/overflow and upper-bound interpretation |
| 23 | `validAccountName` | Private arrow, I_PARTIAL | `Mode B installations: malformed account facts invalidate the entire selection`; `Mode B account collection: invalid selection never reaches installed repository endpoint` | direct 1/100/101 characters, Unicode, dot/dotdot, arbitrary object; no duplicate exported API |
| 27 | `listInstalledRepositories` | Exported async, E_PARTIAL | `unbounded org repository sets are not silently represented as complete`, `selected repo outside first 100 remains addressable within authorized pagination`, `Mode B installations: exactly full page plus final partial page is complete` | mixed-case duplicate canonical forms, invalid nested full_name, provider failure after page 1 and exact page 10 |
| 59 | `collectForAccount` | Exported async, E_PARTIAL | `single available GitHub App installation is selected automatically`, `multiple installations require explicit account choice`, `truncated >100 repository scope forces running/queue to unknown`, `runner-only permission denial gives a bounded diagnostic and keeps job totals`, `Mode B account collection: matching scope passes previous state only for exact repository order` | provider failure mid-pagination, changed installed account while collecting, alternate malformed selected-case forms, unexpected collector rejection |
| 120 | `mergeMetricGroup` | Exported, E_PARTIAL | `targeted metric merge preserves unrelated coverage, totals and checked time`, `targeted updates preserve explicitly unknown clock without legacy fallback`, `manual metric refresh never merges identities from a different account` | no previous/all direct identities, malformed missing nested counts/coverage, nonstandard kind routing |
| 127 | `priorClock` | INLINE predicate of `mergeMetricGroup` | Same direct merge test preserves explicit `checkedAtRunners:null` without reverting to legacy `checkedAt`; code is not another public method | direct table of absent split clock vs explicit null, already part of merge owner |
| 155 | `invalidateMetricGroup` | Exported, E_PARTIAL | `Mode B failed task refresh clears all derived coverage without erasing runner state`; `targeted metric merge preserves unrelated coverage, totals and checked time` | `!previous` and `kind=all` identity/null, structurally corrupt prior state, deep-clone test with frozen input |
| 186 | `startGithubMonitoring` | Exported controller factory, E_PARTIAL | 30 monitor tests and 12 native-race tests call actual factory, dispatch event/callback, and assert auth/collection/publication; 11 Hybrid tests assert schedule | complete bad input shape/callback errors and actual Tauri IPC/OS acceptance; see private owners below |
| 206 | `get(path)` | INLINE native invoke adapter inside controller | Many collected requests passed through fake `invoke("github_api_get",{path})`; this is not independently exported or mocked as business logic | native Rust projected response and secret boundary separate |
| 207 | `publish` | Private closure, I_PARTIAL | `delayed native publication cannot overwrite later disconnect`, `slow prior Monitor account response cannot overwrite newly selected account` assert serialized revision/projection | publication rejects then third revision and stale-account CI callback 3-way |
| 216 | `invalidatePresentation` | Private closure, I_PARTIAL | `disconnect clears previous counts without waiting for a blocked collector`, `scope switch immediately clears other account counts while collection remains blocked`, `config event invalidates old data before new API collection completes` | rapid repeated config/auth/scope events after partial CI observations |
| 228 | `applyCooldown` | Private async closure, I_PARTIAL | `429 backoff prevents timer and forced card refresh from hitting GitHub early`, `Given GitHub cooldown When fallback forces a read Then no rate-limit bypass occurs` | cooldown command fails, malformed seconds (0,86401,fractional), time rollback |
| 238 | `refresh` | Private async closure, I_PARTIAL | `monitor says Connecting after native authorization before slow data collection`, `Mode B06: forced requests while busy coalesce into one final full refresh`, `offline errors publish unknown counts`, `Mode B06: notification opt-out causes no completed-run HTTP requests` | invalid kind direct call, exact 119999/120000 boundaries, three-way relay+scope+notification race and clock rollback |
| 411 | `applyRelayPhase` | Private closure, I_PARTIAL | `Given online-to-fallback transition When WebSocket is lost Then reconcile immediately and restore short polling`, `Given late native phase snapshot When newer fallback event arrives Then stale snapshot cannot restore online mode`, unknown phase uses direct REST | mixed all+tasks burst, unknown phase timing during pending full result, rollback of relay burst timestamp |

## Unique unresolved executable outcomes (not duplicate baseline tests)

| ID | Expected **source-characterization** predicate | What to assert after contract review |
| --- | --- | --- |
| GM-M01 | `monitorRefreshDelay` uses `Math.ceil(Math.max(1,count)/15)` then 60s×max(2,...); invalid safe-count fallback=100 | Count 0/1/15/16/30/31, negative/fractional/Infinity/MAX, finite interval and no invented global 7-minute ceiling |
| GM-M02 | `listInstalledRepositories` incomplete 10×100 and explicit 101 selected not all authorized; only `items.slice(0,100)` returned | Source does not promise a complete 1000-item *display* list: distinguish full page scanning from 100-item output cap |
| GM-M03 | On prior native scope change, `selectionRevision` and `publicationTail` decide which pending publication is authorized | Deterministic old queued write→disconnect→new collection→CI status callback, check exact publication order |
| GM-M04 | `applyCooldown` calls native `github_api_cooldown_seconds` only on rate_limited and bounds seconds in (0,86400]; uses `Math.max(cooldownUntil,now()+duration)` | Bad seconds and denied native cooldown; no provider request during active cooldown, no raw error rendered |
| GM-M05 | `now()-lastFullAttempt`, `now()-lastRunnerAttempt`, `now()-lastRelay[kind]` are wall-clock differences | **Rollback hypothesis:** negative elapsed time may suppress nonforced refresh/hints. Existing Hybrid tests only advance time. Characterize actual timestamps; do not assert a monotone implementation that source does not contain |
| GM-M06 | `rerunKind = rerunKind && rerunKind !== kind ? "all" : kind` while busy, then one queued forced refresh | all/runners/tasks combinations while busy; avoid spurious two parallel REST requests |
| GM-M07 | `lastRelay` separate task/all burst gates 15000 ms; runner schedule independent; hint does not report verdict | 14999/15000, all→tasks and tasks→all; successful full reconciliation still required after ≤15 minutes |
| GM-M08 | `trustedCiRead` requires authoritative jobs and scope; runner-only 403 may keep CI, other failures clear CI | 6 alerts max 5, opt-in/out transition + scope revision during pending CI response; no old account notification |
| GM-M09 | `collectForAccount` checks previous organization exact string and repository order exact JSON | Previous state accepted only on exact match, no wrong-owner runner identity reuse, nil previous on reorder |

## N-category mapping, evidence limits and architecture boundary

- Positive: E_PARTIAL across exported functions and major async controller branches; not full branch count.
- N1 invalid accounts, permissions, missing API payloads; N2 page 0/100/101 and refresh thresholds; N3 rate/403/provider failure; N4 duplicate events/notification baseline; N5 stale account and pending publication; N6 unknown coverage; N7 strict selected ownership and native token custody; N8 forward fake-clock exact windows and rollback P; N9 physical WebView/native event bridge P; N10 fixed public diagnostic and no tokens; N11 NA; N12 native OS vault/files external.
- `now()` clock rollback, relay hint trust and native Rust cooldown may require separate contract decisions **if any production behavior change is proposed**; these are test hypotheses, not observed defects.
- NM1 nested unknown monitor fields remains an architectural STOP FACTOR for actual trust-boundary modifications. This method classification does not authorize a schema change.
- Existing 30+12+26+11 tests include overlapping cross-module scenarios. **Do not sum 79 as 79 distinct direct method cases** or claim all 14 entries are FULL. No suite/mutation execution, no live GitHub, Cloudflare, WebView or credential access.

## Stage 9 after global Stage 3–8 closure

GM-T1 finite fake-clock rollback, active rate gate and forced/nonforced refresh table. GM-T2 mixed relay kind burst exact edges + full-reconciliation fairness. GM-T3 delayed native publish failure and scope switch while CI completion is pending. GM-T4 malformed cooldown seconds/request failure and expired queue state. GM-T5 selected repo late page failure and scope identity, no partial "zero" authority. Production method and external `invoke` adapter remain real.

All 14 lexical candidates now have explicit owner status (6 exported functions, 6 private controller methods, 2 inline helpers) **except note**: `validAccountName` is a separate private arrow callable only via exported collectors, so this is **7 exported methods?** Count source-level exports explicitly rather than using this descriptive subtotal. No global Stage 3–8 sign-off.
