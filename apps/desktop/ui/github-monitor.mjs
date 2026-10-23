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
  get, account, selected, selectedRepositories = [], collect = collectRunnerState
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
  const state = await collect({
    org: install.name, repositories: repos.items, get,
    maxRunnerPages: 10, maxRunPages: 2, maxJobPages: 2,
    maxActiveRunsPerRepo: 30, concurrency: 4,
  });
  if (!repos.complete) {
    state.coverage.jobs = false;
    state.coverage.queue = false;
    state.coverage.running = false;
    state.counts.running = null;
    state.counts.queued = null;
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

export function startGithubMonitoring({ invoke, event, onError = () => {},
  collect = collectForAccount, schedule = setInterval, onStage = () => {},
  now = () => Date.now() }) {
  let busy = false;
  let rerun = false;
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
  async function refresh(force = false) {
    if (busy) {
      if (force) rerun = true;
      return;
    }
    if (!force && now() - lastAttempt < minIntervalMs) return;
    busy = true;
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
        await publish(false, null, null, revision);
        return;
      }
      // Native credential validation precedes this message. Never say
      // "Connect GitHub" while an authorized account is loading.
      if (now() < cooldownUntil) {
        await publish(true, null, githubFailureMessage("rate_limited"), revision);
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
        selectedRepositories: selection.github_monitor_repositories
      });
      if (revision !== selectionRevision) return;
      if (first) onStage("monitor.collect_ready");
      minIntervalMs = monitorRefreshDelay(result.repositoryCount ?? 100);
      await applyCooldown(result.failure);
      await publish(true, result.state, result.reason, revision);
      if (revision === selectionRevision) hasPublishedResult = true;
    } catch (error) {
      if (revision !== selectionRevision) return;
      if (first) onStage("monitor.failed");
      const reason = githubFailureReason(error);
      await applyCooldown(reason);
      // A failed live refresh must never keep old counts appearing current.
      await publish(authorized, null,
        githubFailureMessage(reason), revision).catch(onError);
      if (revision === selectionRevision) hasPublishedResult = true;
    } finally {
      busy = false;
      if (rerun) {
        rerun = false;
        void refresh(true);
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
