import { collectRunnerState } from "./runner-collector.mjs";
import { listAvailableInstallations } from "./github-installations.mjs";
export { listAvailableInstallations } from "./github-installations.mjs";
import { githubFailureReason, githubFailureMessage, mostImportantGithubFailure } from "./github-errors.mjs";

// Existing job classification is reused; bearer tokens remain in native Rust.
// Adaptive 2-7 minute refresh avoids excessive REST usage across many repos.
export const REFRESH_MS = 60_000;
export function monitorRefreshDelay(repositoryCount) {
  // Each repo requires two run-list queries; a larger portfolio must
  // refresh less often to respect GitHub App user-token API limits.
  const count = Number.isSafeInteger(repositoryCount) ? repositoryCount : 100;
  return 60_000 * Math.max(2, Math.ceil(Math.max(1, count) / 15));
}
const INSTALL_PAGE_LIMIT = 10;
const ACCOUNT_NAME = /^[a-zA-Z0-9_.-]+$/;


export async function listInstalledRepositories(get, owner, installationId,
  selection = []) {
  const repositories = [];
  const requested = new Set(selection.map(name => name.toLowerCase()));
  let complete = true;
  for (let page = 1; page <= INSTALL_PAGE_LIMIT; page++) {
    const payload = await get("/user/installations/" + installationId +
      "/repositories?per_page=100&page=" + page);
    if (!Array.isArray(payload?.repositories)) throw Error("Invalid repository response");
    for (const repo of payload.repositories) {
      if (typeof repo?.full_name === "string" &&
          repo.full_name.split("/")[0].toLowerCase() === owner.toLowerCase() &&
          ACCOUNT_NAME.test(repo.full_name.split("/")[1] || "") &&
          (!requested.size || requested.has(repo.full_name.toLowerCase()))) {
        repositories.push(repo.full_name);
      }
    }
    if (payload.repositories.length < 100) break;
    if (page === INSTALL_PAGE_LIMIT) complete = false;
  }
  const unique = [...new Set(repositories)];
  // For explicit subsets, unrelated inaccessible pages do not fabricate
  // completion. All selected names must be present and authorized.
  const matching = requested.size === 0 || requested.size ===
    new Set(unique.map(name => name.toLowerCase())).size;
  return { items: unique.slice(0, 100),
    complete: matching && (requested.size > 0 ? true : complete && unique.length <= 100) };
}

export async function collectForAccount({
  get, account, selected, selectedRepositories = [], collect = collectRunnerState,
  kind = "all", previousState = null
}) {
  const available = await listAvailableInstallations(get);
  if (!available.complete) return { state: null, reason: "GitHub installation list incomplete." };
  const install = available.items.find(x => x.name.toLowerCase() === (selected || account || "").toLowerCase()) ??
    (available.items.length === 1 && !selected ? available.items[0] : null);
  if (!install) return { state: null, reason: available.items.length
    ? "Select a GitHub account in Settings." : "No accessible GitHub App installation." };
  if (!Array.isArray(selectedRepositories) || selectedRepositories.length > 100 ||
      selectedRepositories.some(name => typeof name !== "string" ||
        name.split("/").length !== 2 ||
        name.split("/")[0].toLowerCase() !== install.name.toLowerCase() ||
        !ACCOUNT_NAME.test(name.split("/")[1]))) {
    throw Error("Invalid selected repositories.");
  }
  const repos = await listInstalledRepositories(
    get, install.name, install.id, selectedRepositories
  );
  if (selectedRepositories.length && !repos.complete) {
    return { state: null, repositoryCount: selectedRepositories.length,
      reason: "Some selected GitHub repositories are unavailable." };
  }
  if (!repos.items.length) {
    return { state: null, reason: "No accessible repositories for " + install.name + "." };
  }
  const previous = previousState?.scope?.organization === install.name &&
    JSON.stringify(previousState?.scope?.repositories) === JSON.stringify(repos.items)
    ? previousState : null;
  const state = await collect({
    org: install.name, repositories: repos.items, get,
    maxRunnerPages: 10, maxRunPages: 2, maxJobPages: 2,
    maxActiveRunsPerRepo: 30, concurrency: 4,
    kind, previousState: previous,
  });
  if (!repos.complete && kind !== "runners") {
    state.coverage.jobs = false;
    state.coverage.queue = false;
    state.coverage.running = false;
    state.counts.running = null;
    state.counts.queued = null;
    state.checkedAtTasks = null;
    state.errors.push({ scope: "repositories", reason: "incomplete" });
  }
  const failure = mostImportantGithubFailure(state.errors);
  const runnerOnlyPermissionDenied = state.errors.some(error =>
    error.scope === "runners" && error.reason === "permission_denied"
  ) && state.errors.every(error => error.scope === "runners");
  return { state, repositoryCount: repos.items.length, failure, reason: failure
    ? githubFailureMessage(failure, runnerOnlyPermissionDenied ? "runners" : "monitor")
    : null };
}


// Preserve the unrelated metric group in a targeted refresh, including
// its original coverage and timestamp. An unsuccessful requested group
// becomes unknown; never retain stale counts as though freshly checked.
export function mergeMetricGroup(previous, next, kind) {
  if (kind === "all" || !previous) return next;
  const runners = kind === "runners";
  const keepCount = runners
    ? ["running", "queued", "waiting", "runningSelfHosted", "runningGitHubHosted",
      "runningUnclassified", "queuedSelfHosted", "queuedGitHubHosted",
      "queuedUnclassified", "runningObserved", "queuedObserved"]
    : ["busy", "idle", "offline"];
  const keepCoverage = runners
    ? ["jobs", "queue", "running", "runningLanes", "queuedLanes", "queuedUnclassified"]
    : ["runners", "unmatchedSelfHosted"];
  const merged = {
    ...next,
    runners: runners ? next.runners : previous.runners,
    runningJobs: runners ? previous.runningJobs : next.runningJobs,
    queuedJobs: runners ? previous.queuedJobs : next.queuedJobs,
    waitingJobs: runners ? previous.waitingJobs : next.waitingJobs,
    runningByLane: runners ? previous.runningByLane : next.runningByLane,
    queuedByLane: runners ? previous.queuedByLane : next.queuedByLane,
    counts: { ...next.counts },
    coverage: { ...next.coverage },
    checkedAtRunners: runners ? next.checkedAtRunners : previous.checkedAtRunners ?? previous.checkedAt,
    checkedAtTasks: runners ? previous.checkedAtTasks ?? previous.checkedAt : next.checkedAtTasks,
  };
  for (const key of keepCount) merged.counts[key] = previous.counts?.[key] ?? null;
  for (const key of keepCoverage) merged.coverage[key] = previous.coverage?.[key] ?? false;
  return merged;
}

export function invalidateMetricGroup(previous, kind) {
  if (!previous || kind === "all") return null;
  const clone = structuredClone(previous);
  if (kind === "runners") {
    clone.runners = [];
    clone.coverage.runners = false;
    clone.coverage.unmatchedSelfHosted = null;
    for (const key of ["busy", "idle", "offline"]) clone.counts[key] = null;
    clone.checkedAtRunners = null;
  } else {
    clone.runningJobs = [];
    clone.queuedJobs = [];
    clone.waitingJobs = [];
    clone.coverage.jobs = false;
    clone.coverage.queue = false;
    clone.coverage.running = false;
    for (const key of ["running", "queued", "waiting", "runningSelfHosted",
      "runningGitHubHosted", "runningUnclassified", "queuedSelfHosted",
      "queuedGitHubHosted", "queuedUnclassified"]) clone.counts[key] = null;
    clone.checkedAtTasks = null;
  }
  return clone;
}

export function startGithubMonitoring({ invoke, event, onError = () => {},
  collect = collectForAccount, schedule = setInterval, onStage = () => {},
  onRefreshState = () => {}, now = () => Date.now() }) {
  let busy = false;
  let rerunKind = null;
  let lastState = null;
  let lastAttempt = 0;
  let cooldownUntil = 0;
  let minIntervalMs = monitorRefreshDelay(100);
  let hasPublishedResult = false;
  let selectionRevision = 0;
  // Native presentation writes must complete in the order issued.
  // Check the revision when each queued write executes: a delayed
  // old-account publication must not supersede a newer auth transition.
  let publicationTail = Promise.resolve();
  const get = path => invoke("github_api_get", { path });
  function publish(connected, runnerState = null, message = null,
    revision = selectionRevision) {
    const write = publicationTail.catch(() => {}).then(() => {
      if (revision !== selectionRevision) return;
      return invoke("github_monitor_publish", { connected, runnerState, message });
    });
    publicationTail = write;
    return write;
  }
  function invalidatePresentation(message) {
    selectionRevision++;
    hasPublishedResult = false;
    lastState = null;
    // Clear the old account's counts now; never wait for an in-flight
    // REST collector or for the next scheduled monitoring tick.
    void publish(false, null, message).catch(onError);
    void refresh(true);
  }
  async function applyCooldown(reason) {
    if (reason !== "rate_limited") return;
    try {
      const seconds = await invoke("github_api_cooldown_seconds");
      if (Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 86_400)
        cooldownUntil = Math.max(cooldownUntil, now() + seconds * 1000);
    } catch (error) {
      onError(error);
    }
  }
  async function refresh(force = false, kind = "all") {
    if (!["all", "runners", "tasks"].includes(kind)) return;
    if (busy) {
      if (force) rerunKind = rerunKind && rerunKind !== kind ? "all" : kind;
      return;
    }
    if (!force && now() - lastAttempt < minIntervalMs) return;
    busy = true;
    onRefreshState(kind, true);
    lastAttempt = now();
    let authorized = false;
    const first = !hasPublishedResult;
    const revision = selectionRevision;
    try {
      if (first) onStage("monitor.auth_start");
      const auth = await invoke("github_auth_status");
      authorized = auth.connected === true;
      if (first) onStage("monitor.auth_ready");
      if (revision !== selectionRevision) return;
      if (!authorized) {
        hasPublishedResult = false;
        lastState = null;
        await publish(false, null, null, revision);
        return;
      }
      // Native credential validation precedes this message. Never say
      // "Connect GitHub" while an authorized account is loading.
      if (now() < cooldownUntil) {
        await publish(true, invalidateMetricGroup(lastState, kind),
          githubFailureMessage("rate_limited"), revision);
        lastState = invalidateMetricGroup(lastState, kind);
        hasPublishedResult = true;
        return;
      }
      if (!hasPublishedResult)
        await publish(true, null, "Connecting to GitHub...", revision);
      // Config-only read: the full snapshot inspects every local Git repo.
      // GitHub polling must never depend on completion of that scan.
      const selection = await invoke("get_monitor_selection");
      if (revision !== selectionRevision) return;
      if (first) onStage("monitor.scope_ready");
      const result = await collect({
        get, selected: selection.github_monitor_org,
        selectedRepositories: selection.github_monitor_repositories,
        kind, previousState: lastState,
      });
      if (revision !== selectionRevision) return;
      if (first) onStage("monitor.collect_ready");
      minIntervalMs = monitorRefreshDelay(result.repositoryCount ?? 100);
      await applyCooldown(result.failure);
      const next = result.state
        ? mergeMetricGroup(lastState, result.state, kind)
        : invalidateMetricGroup(lastState, kind);
      await publish(true, next, result.reason, revision);
      if (revision === selectionRevision) {
        lastState = next;
        hasPublishedResult = true;
      }
    } catch (error) {
      if (revision !== selectionRevision) return;
      if (first) onStage("monitor.failed");
      const reason = githubFailureReason(error);
      await applyCooldown(reason);
      // A failed live refresh must never keep old counts appearing current.
      const next = invalidateMetricGroup(lastState, kind);
      await publish(authorized, next,
        githubFailureMessage(reason), revision).catch(onError);
      if (revision === selectionRevision) {
        lastState = next;
        hasPublishedResult = true;
      }
    } finally {
      busy = false;
      onRefreshState(kind, false);
      if (rerunKind) {
        const next = rerunKind;
        rerunKind = null;
        void refresh(true, next);
      }
    }
  }
  event?.listen?.("repoticker-github-auth", evt => {
    if (evt?.payload?.status === "disconnected") {
      invalidatePresentation(null);
    } else if (evt?.payload?.status === "connected") {
      invalidatePresentation("Checking GitHub connection...");
    }
  });
  event?.listen?.("repoticker-github-scope-changed", () => {
    invalidatePresentation("Checking GitHub connection...");
  });
  // Refresh only while the application is running, never an API request
  // per hover, mouse movement or local Git scan.
  schedule(() => { void refresh(); }, REFRESH_MS);
  event?.listen?.("repoticker-card-shown", () => { void refresh(); });
  void refresh(true);
  return refresh;
}
