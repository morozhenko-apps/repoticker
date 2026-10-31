# Mode B JS critical domain source-entrypoint inventory

**Baseline:** `42d8d8bb19dc994b0d9cb3754f790cce61ebe001`. This is **part of Stage 3**
only, not a complete source-to-branch map or evidence of tests
passing. Ten directly read JS modules, 117 named syntactic
functions, including nonpublic helpers; anonymous event callbacks
and dynamic decision branches remain for manual enumeration.

## Stage 2 scope/risk

Critical: Git enrollment/actions, safe-sync refusal, cancellation
and revision races; GitHub API scope 401/403/429, secure
monitor error redaction, authorization and selected-installation
limits, billing truth and runner/job association. Stable tests
must separate `unknown` from zero, blocked from disconnected,
queued from running, authorized data from inaccessible inventory
and redacted provider text from arbitrary raw errors.

## Source indexes

| Module | Risk C/H | Named JS entries | Name:line |
| --- | --- | ---: | --- |
| `apps/desktop/ui/app.mjs` | C | 37 | byId:19, invoke:21, traceStartup:27, updateReposActivity:49, cancelAutoHide:58, armAutoHide:61, paintNotice:81, showError:92, showResizeError:96, showGitOperationErrors:100, clearError:104, addText:108, hideRepoMenus:120, showRepoMenu:131, makeRepoRow:210, updateActionState:249, traceHover:293, setActiveTooltip:309, resetQuota:316, setQuotaOpen:325, enter:373, monitorRefreshState:403, clearBrowserTooltips:414, updateMetricAccessibleNames:420, setCardLanguage:427, renderMonitorMetrics:461, traceMonitorReady:472, render:478, refresh:523, refreshMonitor:529, consumeResults:543, cancelActiveFetch:551, runGitAction:564, resetView:584, openView:593, refreshCardConfiguration:687, stopDragging:730 |
| `apps/desktop/ui/settings.mjs` | C | 29 | byId:9, t:11, applySettingsLanguage:14, syncWorkerControls:35, invoke:44, traceStartup:46, normalizeRepoDraft:79, updateRepoDirty:82, repoChoiceValid:87, renderRepoChoices:94, refreshRepoInventory:144, clearMonitorScopes:195, refreshMonitorScopes:207, stopGithubStatusUpdates:272, startGithubStatusUpdates:281, githubMessage:305, githubButtons:312, refreshGithub:356, message:464, isDirty:469, updateApply:478, authNeedsConfirmation:479, displayRootPath:485, renderRoots:496, renderIgnoredChildren:524, refresh:575, updateLanguagePicker:709, closeLanguagePicker:716, openLanguagePicker:722 |
| `apps/desktop/ui/model.mjs` | C | 5 | summarize:1, safeRunUrl:14, safeActionsJobUrl:27, validName:34, validNumber:35 |
| `apps/desktop/ui/view.mjs` | H | 4 | nextCardView:8, cardWindowHeight:14, pullReadyCommitCount:26, syncReadyCommitCount:39 |
| `apps/desktop/ui/github-monitor.mjs` | C | 12 | monitorRefreshDelay:10, listInstalledRepositories:20, collectForAccount:49, mergeMetricGroup:107, priorClock:114, invalidateMetricGroup:142, startGithubMonitoring:166, get:182, publish:183, invalidatePresentation:192, applyCooldown:202, refresh:212 |
| `apps/desktop/ui/github-errors.mjs` | C | 3 | githubFailureReason:19, githubFailureMessage:26, mostImportantGithubFailure:52 |
| `apps/desktop/ui/github-billing.mjs` | C | 11 | billingMonth:8, knownPersonalAllowance:14, knownOrganizationAllowance:25, reportedActionsMinutes:33, unavailable:49, collectBillingUsage:54, fetchOrganization:60, fetchPersonal:91, createBillingCache:121, clear:129, load:134 |
| `apps/desktop/ui/github-installations.mjs` | C | 1 | listAvailableInstallations:6 |
| `apps/desktop/ui/runner-collector.mjs` | C | 6 | getPages:10, boundedMap:21, limitRequests:40, dispatch:43, collectRunnerState:64, priorClock:161 |
| `apps/desktop/ui/runner-state.mjs` | C | 9 | isObject:5, label:6, normalizeLabels:8, runnerLabelCompatible:20, isStandardGitHubHostedLabel:29, classifyJobLane:36, laneCounts:48, summarizeRunnerState:63, exact:124 |

Next: enumerate anonymous callbacks, guards and branches in these
modules, match existing `tests/*.test.mjs` assertions, then
complete Stage 5 Positive/N1–N12, interactions, estimate and
coverage map before new Stage 9 tests. This file is NOT a
current coverage count or a Mode B completion receipt.
