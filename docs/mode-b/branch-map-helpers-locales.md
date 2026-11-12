# Mode B semantic mapping: UI helpers, localization and presentation

Baseline source a3ba7fa30fc4c81890d3075f94142942d001cbf3. This is an explicit Stage 3–8 **partial** review; existing suite names do not imply branch-exact evidence.

Legend: E = real helper exercised with observed assertions verified from source; C = candidate test which still needs assertion-level review; S = source/HTML/CSS structural test, OS = real platform acceptance. No duplicate-only tests shall be added simply for larger counts.

## Operations and N1–N12 obligations

| Production rule and exported API | Important outcomes and applicable categories | Candidate executed suites | Coverage gaps / required resolution |
| --- | --- | --- | --- |
| browser-context-menu.mjs disableBrowserContextMenu | prevent native browser menu on all rendered windows | browser-context-menu.test.mjs; windows-tray-physical-regressions.test.mjs | C/OS: attach DOM handler and physical right-click |
| card-i18n.mjs cardText/metricAccessibleLabel/cardNoticeText | 20 locales; known/unknown, zero/one/many, in-flight fetch vs cancel, live ARIA labels | card-i18n.test.mjs 9 tests; localization-20.test.mjs | C: test all permitted notice variants and unknown counts without false zero |
| ci-failure-events.mjs collectRecentCompleted/createCiFailureTracker | startup silent, account scope, 0/1/max, pagination, 401/403/429/503, invalid run time, dedup/rebaseline, opt-in | ci-failure-events.test.mjs 19 tests; ci-native-integration.test.mjs | C: 500/503 and 429 with missing retry header; concurrent notification mode change |
| ci-status.mjs projectLatestCiStatuses/ciOutcomeForRepo | completed success/failure, unknown/incomplete, wrong owner, repo identities, no naive folder mapping | ci-status.test.mjs | C: exact invalid/duplicate per-repo signal identity case |
| github-billing.mjs billingMonth/knownAllowances/reportedActionsMinutes/collectBillingUsage/createBillingCache | UTC monthly boundary, known plans only, NaN/Infinity, bad SKU, account denied vs personal, old in-flight response, cache TTL | github-billing.test.mjs 14 tests; quota-mode-b.test.mjs | E/C: UTC, TTL, stale owner covered; verify split DST clock and denied billing not false remaining |
| github-errors.mjs githubFailureReason/Message/mostImportantGithubFailure | fixed redacted enums, error precedence, 20 locales, raw server token not displayed | github-errors.test.mjs 4 tests | C: each priority pair including missing message and nested provider body |
| github-installations.mjs listAvailableInstallations | bounded pages, malformed row, same account with duplicate ID, incomplete cannot select owner | github-installations-mode-b.test.mjs 7 tests; github-monitor.test.mjs | E/C: exact API limit page cardinalities covered, concurrency scope switch still elsewhere |
| model.mjs summarize/safeRunUrl/safeActionsJobUrl | dirty/upstream vs CI, URL exact github.com, reject userinfo/query/fragment/unsafe resource | repo-row-indicator.test.mjs; quota-details.test.mjs; ui.test.mjs | C: URL ID numeric max / encoding and confusable hostname; 92.68% branch coverage reported |
| monitor-presentation.mjs mergeMonitorPresentation/reconcileScanPresentation | only defined fields; stale local scan not clobber monitor data; disconnected stays unknown | monitor-presentation.test.mjs | C: delayed out-of-order event with partial fields |
| native-drag.mjs createNativeDragGesture | down/up pending, second gesture, native start/stop rejection, no mouse-coordinate IPC | native-drag.test.mjs 5 executed helper tests | E: most state sequencing covered; physical OS-L1 separate |
| quota-details.mjs displayRunnerName/localCheckedTime/buildHoverDetails/buildQuotaDetails | grapheme truncation, invalid time, unknown runner/job count, RTL, provider data untouched | quota-details.test.mjs; surface-i18n.test.mjs; locale-counts-and-notifications.test.mjs | C: N8 DST ambiguous/invalid device timezone and 20 locale output |
| quota-size.mjs usageHeight | missing/negative/NaN, min/max, overflow, window frame still fixed | quota-surface.test.mjs executable usageHeight | E for tested bounds; inspect +/-1 exact cap branch and huge Infinity |
| repo-menu.mjs placeRepoMenu | below/above when near end, RTL/long labels, clamp within drawer | repo-menu.test.mjs | C: zero-height drawer and anchor outside bounds |
| repo-row-indicator.mjs repoRowIndicator | Git deltas outrank CI, no upstream/dirty unknown, last complete CI when clean | repo-row-indicator.test.mjs | C: exact precedence combinations and stale CI |
| runner-state.mjs normalizeLabels/runnerLabelCompatible/isStandardGitHubHostedLabel/classifyJobLane/summarizeRunnerState | string/object labels, hosted/self-hosted, unknown, duplicate jobs, capacity, partial pagination | runner-state.test.mjs 15 tests | E/C: many targeted known branches; malformed nested labels and quota fields require exact assertion review |
| scan-refresh.mjs shouldSpinForRepos/createScanRefreshQueue | first snapshot active/inactive; coalesce in-flight; stale success/error; true errors shown | scan-refresh.test.mjs 7 executed controller tests | E: explicit concurrent success/failure; edge rapid background/foreground to map |
| status-metrics.mjs shown/compactStatus | only nonnegative safe integers as numbers; null/undefined/NaN/Infinity unknown | status metrics invoked by card-i18n and ui tests | C: negative zero, MAX_SAFE_INTEGER exact edge and unknown |
| locale-catalog.mjs normalizeLocale/localeName/localeDirection/coreText | exact 20 roster, aliases unsupported, RTL dir, key fallback | localization-20.test.mjs | C: all roster/bad locale and missing key; pure catalog N3/N12 not applicable |
| locale-plurals.mjs localizedGitCount | 20-language plural categories for 0/1/2/5/11/21 and negatives/fractions, provider values untouched | locale-counts-and-notifications.test.mjs | C: exhaustive Intl plural categories (Russian, Arabic, Polish, etc.) and invalid count |
| locale-counts.mjs repositorySelectionMessage | all/selected, 0/1/100/101, unknown/incomplete selection and locale quantity | locale-counts-and-notifications.test.mjs | C: edge old selection format and truthfulness under malformed selected count |
| locale-errors.mjs localizedKnownError | exact known error translation; unknown source payload unchanged; do not claim raw error is safe for logs | locale-errors.test.mjs 14 tests | C: privacy handling is at producing boundary; verify redaction and not raw native provider error |
| locale-auth.mjs / locale-card.mjs / locale-extended.mjs / locale-surface.mjs / locale-workflow.mjs | static dictionaries across 20 locales; exact key/placeholder parity, semantics, RTL and no identity rewriting | localization-20.test.mjs; locale-errors.test.mjs; surface-i18n.test.mjs | C: data parity covered; contextual translation review and actual rendered accessibility still manual |
| settings-i18n.mjs / surface-i18n.mjs | localized Settings and detached surface labels, numeric/text identities, unknown statuses | settings-i18n.test.mjs; surface-i18n.test.mjs; windows-settings-qa.test.mjs | C: 20-locale provider names remain LTR and no accidental secret interpolation |
| repo rendering HTML/CSS (index/settings/quota/about + styles) | DOM IDs/role, focus, readable accessible text, responsive footer/scroll, no unwanted browser menus | ui-layout.test.mjs; settings-visual-controls.test.mjs; quota-surface.test.mjs | S/OS: structural tests cannot prove actual DPI/Wayland/Windows rendering |

## Interaction combinations (Stage 6)

| Independent dimensions | Observable result |
| --- | --- |
| New GitHub org x partial runner page x selected repo x locale change | no fabricated zero; metrics and owner remain authoritative |
| Locale Arabic RTL x technical owner/repo/device code x unknown negative data | UI translates labels, never modifies GitHub identifiers or negative facts |
| UTC billing month rollover x timezone DST x failed provider fetch | period cannot shift due to device timezone; no allowance inferred |
| App main-card scan pending x CI-only event x tooltip update | main card does not schedule extra full local Git scan |
| Menu open on low drawer row x translated long text x Windows DPI | visible menu stays in bounds, focus and keyboard paths usable |
| Rapidly switched Billing/Runner/Tasks x old request x app loses auth | old numbers and wrong account cannot surface as current |
| Notification opt-in x invalid or truncated completed-run pages x OAuth revoke | silent baseline and no private run in toast |

## Planned case groups and mutation review (Stage 7 / 10)

- H1 N1/N2/N7: strict safe URL validation (userinfo, query, encoded traversal, oversized numeric job IDs); assertion must fail if allowlist broadened.
- H2 N1/N2/N8: all applicable plural forms, exact numeric boundaries and time-zone changes; not one token test per locale.
- H3 N5/N6: 3-way state race among selected account, runner state and old pending billing/CI status.
- H4 N3/N4/N10: unknown native/provider error classifications must be redacted at the producer boundary; translations are not a sanitizer.
- H5 N9/N10: real keyboard focus, dynamic accessible labels and native WebView layout on KDE/Windows.
- H6 N6/N8/N12: corrupt saved locale fallback and invalid/old settings config across UI; N12 applies to settings storage adapter, not immutable dictionaries.

Source data dictionaries and CSS do not have meaningful N3 network or N12 disk failure themselves; their consuming async modules do. N11 is NA because RepoTicker has no entitlements. Every N1–N12 cell in the per-file matrix remains ? until assertion-level reconciliation.
