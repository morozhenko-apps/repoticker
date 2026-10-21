import { collectRunnerState } from "./runner-collector.mjs";

// Existing job classification is reused; bearer tokens remain in native Rust.
// A 15-minute bounded refresh avoids excessive REST usage across many repos.
export const REFRESH_MS = 15 * 60_000;
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
  return { state, reason: state.errors.length
    ? "Some GitHub data is partial or permission-restricted." : null };
}

export function startGithubMonitoring({ invoke, event, onError = () => {} }) {
  let busy = false;
  let lastAttempt = 0;
  const get = path => invoke("github_api_get", { path });
  const publish = (connected, runnerState = null, message = null) =>
    invoke("github_monitor_publish", { connected, runnerState, message });
  async function refresh(force = false) {
    if (busy || (!force && Date.now() - lastAttempt < REFRESH_MS)) return;
    busy = true;
    lastAttempt = Date.now();
    try {
      const auth = await invoke("github_auth_status");
      if (!auth.connected) {
        await publish(false);
        return;
      }
      const snapshot = await invoke("get_snapshot");
      const result = await collectForAccount({
        get, selected: snapshot.github_monitor_org,
      });
      await publish(true, result.state, result.reason);
    } catch {
      await publish(true, null,
        "GitHub Actions data unavailable. Check permissions or network.").catch(onError);
    } finally {
      busy = false;
    }
  }
  event?.listen?.("repoticker-github-auth", evt => {
    if (["connected", "disconnected"].includes(evt?.payload?.status)) {
      void refresh(true);
    }
  });
  event?.listen?.("repoticker-github-scope-changed", () => { void refresh(true); });
  // Refresh only while the application is running, never an API request
  // per hover, mouse movement or local Git scan.
  setInterval(() => { void refresh(); }, REFRESH_MS);
  void refresh(true);
  return refresh;
}
