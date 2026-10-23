import { collectRunnerState } from "./runner-collector.mjs";
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

export async function listAvailableInstallations(get) {
  const result = [];
  for (let page = 1; page <= INSTALL_PAGE_LIMIT; page++) {
    const response = await get("/user/installations?per_page=100&page=" + page);
    if (!Array.isArray(response?.installations)) throw Error("Invalid installations response");
    for (const item of response.installations) {
      const name = item?.account?.login;
      if (typeof name === "string" && ACCOUNT_NAME.test(name) &&
          Number.isSafeInteger(item.id) && item.id > 0) {
        result.push({ name, id: item.id });
      }
    }
    if (response.installations.length < 100) return { items: result, complete: true };
  }
  return { items: result, complete: false };
}

export async function listInstalledRepositories(get, owner, installationId) {
  const repositories = [];
  let complete = true;
  for (let page = 1; page <= INSTALL_PAGE_LIMIT; page++) {
    const payload = await get("/user/installations/" + installationId +
      "/repositories?per_page=100&page=" + page);
    if (!Array.isArray(payload?.repositories)) throw Error("Invalid repository response");
    for (const repo of payload.repositories) {
      if (typeof repo?.full_name === "string" &&
          repo.full_name.split("/")[0].toLowerCase() === owner.toLowerCase() &&
          ACCOUNT_NAME.test(repo.full_name.split("/")[1] || "")) {
        repositories.push(repo.full_name);
      }
    }
    if (payload.repositories.length < 100) break;
    if (page === INSTALL_PAGE_LIMIT) complete = false;
  }
  const unique = [...new Set(repositories)];
  return { items: unique.slice(0, 100),
    complete: complete && unique.length <= 100 };
}

export async function collectForAccount({ get, account, selected, collect = collectRunnerState }) {
  const available = await listAvailableInstallations(get);
  if (!available.complete) return { state: null, reason: "GitHub installation list incomplete." };
  const install = available.items.find(x => x.name.toLowerCase() === (selected || account || "").toLowerCase()) ??
    (available.items.length === 1 && !selected ? available.items[0] : null);
  if (!install) return { state: null, reason: available.items.length
    ? "Select a GitHub account in Settings." : "No accessible GitHub App installation." };
  const repos = await listInstalledRepositories(get, install.name, install.id);
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
  const get = path => invoke("github_api_get", { path });
  const publish = (connected, runnerState = null, message = null) =>
    invoke("github_monitor_publish", { connected, runnerState, message });
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
        await publish(false);
        return;
      }
      // Native credential validation precedes this message. Never say
      // "Connect GitHub" while an authorized account is loading.
      if (now() < cooldownUntil) {
        await publish(true, null, githubFailureMessage("rate_limited"));
        hasPublishedResult = true;
        return;
      }
      if (!hasPublishedResult)
        await publish(true, null, "Connecting to GitHub...");
      // Config-only read: the full snapshot inspects every local Git repo.
      // GitHub polling must never depend on completion of that scan.
      const selected = await invoke("get_monitor_scope");
      if (revision !== selectionRevision) return;
      if (first) onStage("monitor.scope_ready");
      const result = await collect({ get, selected });
      if (revision !== selectionRevision) return;
      if (first) onStage("monitor.collect_ready");
      minIntervalMs = monitorRefreshDelay(result.repositoryCount ?? 100);
      await applyCooldown(result.failure);
      await publish(true, result.state, result.reason);
      hasPublishedResult = true;
    } catch (error) {
      if (revision !== selectionRevision) return;
      if (first) onStage("monitor.failed");
      const reason = githubFailureReason(error);
      await applyCooldown(reason);
      // A failed live refresh must never keep old counts appearing current.
      await publish(authorized, null,
        githubFailureMessage(reason)).catch(onError);
      hasPublishedResult = true;
    } finally {
      busy = false;
      if (rerun) {
        rerun = false;
        void refresh(true);
      }
    }
  }
  event?.listen?.("repoticker-github-auth", evt => {
    if (["connected", "disconnected"].includes(evt?.payload?.status)) {
      selectionRevision++;
      hasPublishedResult = false;
      void refresh(true);
    }
  });
  event?.listen?.("repoticker-github-scope-changed", () => {
    selectionRevision++;
    hasPublishedResult = false;
    void refresh(true);
  });
  // Refresh only while the application is running, never an API request
  // per hover, mouse movement or local Git scan.
  schedule(() => { void refresh(); }, REFRESH_MS);
  event?.listen?.("repoticker-card-shown", () => { void refresh(); });
  void refresh(true);
  return refresh;
}
