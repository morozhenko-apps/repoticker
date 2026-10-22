import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  listAvailableInstallations, listInstalledRepositories, collectForAccount,
  REFRESH_MS, monitorRefreshDelay, startGithubMonitoring
} from "../apps/desktop/ui/github-monitor.mjs";

const installation = (id, name) => ({ id, account: { login: name, type: "Organization" } });

test("single available GitHub App installation is selected automatically", async () => {
  const paths = [];
  const get = async path => {
    paths.push(path);
    if (path.startsWith("/user/installations?"))
      return { installations: [installation(14, "team")] };
    if (path.startsWith("/user/installations/14/repositories?"))
      return { repositories: [{ full_name: "team/service" }] };
    throw Error("unexpected path: " + path);
  };
  const result = await collectForAccount({
    get,
    collect: async ({ org, repositories }) => {
      assert.equal(org, "team");
      assert.deepEqual(repositories, ["team/service"]);
      return { counts: { running: 2, queued: 1 },
        coverage: { jobs: true, running: true, queue: true }, errors: [] };
    },
  });
  assert.equal(result.state.counts.running, 2);
  assert.equal(result.reason, null);
  assert.equal(REFRESH_MS, 60_000);
  assert.equal(monitorRefreshDelay(10), 120_000);
  assert.equal(monitorRefreshDelay(40), 180_000);
  assert.equal(monitorRefreshDelay(100), 420_000);
  assert.ok(paths.some(path => path.includes("/repositories?")));
});

test("multiple installations require explicit account choice", async () => {
  const get = async path => {
    if (path.startsWith("/user/installations?"))
      return { installations: [installation(1, "one"), installation(2, "two")] };
    return { repositories: [{ full_name: "two/app" }] };
  };
  const noChoice = await collectForAccount({ get });
  assert.equal(noChoice.state, null);
  assert.match(noChoice.reason, /Select a GitHub account/);
  const selected = await collectForAccount({
    get, selected: "two",
    collect: async ({ org, repositories }) => {
      assert.equal(org, "two");
      assert.deepEqual(repositories, ["two/app"]);
      return { counts: {}, coverage: {}, errors: [] };
    }
  });
  assert.ok(selected.state);
});

test("inaccessible or missing repository list cannot fabricate zero jobs", async () => {
  const get = async path => {
    if (path.startsWith("/user/installations?"))
      return { installations: [installation(5, "org")] };
    return { repositories: [] };
  };
  const result = await collectForAccount({ get });
  assert.equal(result.state, null);
  assert.match(result.reason, /No accessible repositories/);
});

test("truncated >100 repository scope forces running/queue to unknown", async () => {
  const get = async path => {
    if (path.startsWith("/user/installations?"))
      return { installations: [installation(9, "org")] };
    if (path.includes("page=1")) return {
      repositories: Array.from({ length: 100 }, (_, i) => ({
        full_name: "org/repo-" + i
      }))
    };
    return { repositories: [{ full_name: "org/extra" }] };
  };
  const result = await collectForAccount({
    get,
    collect: async () => ({ counts: { running: 3, queued: 7 },
      coverage: { jobs: true, running: true, queue: true }, errors: [] })
  });
  assert.equal(result.state.counts.running, null);
  assert.equal(result.state.counts.queued, null);
  assert.equal(result.state.coverage.jobs, false);
  assert.match(result.reason, /partial/);
});

test("installation pagination preserves truncation evidence", async () => {
  const get = async () => ({ installations:
    Array.from({ length: 100 }, (_, i) => installation(i + 1, "org" + i))
  });
  const result = await listAvailableInstallations(get);
  assert.equal(result.complete, false);
  assert.equal(result.items.length, 1000);
});

test("unbounded org repository sets are not silently represented as complete", async () => {
  const get = async path => path.includes("page=1")
    ? { repositories: Array.from({ length: 100 }, (_, i) =>
      ({ full_name: "team/project" + i })) }
    : { repositories: [{ full_name: "team/project100" }] };
  const result = await listInstalledRepositories(get, "team", 23);
  assert.equal(result.complete, false);
  assert.equal(result.items.length, 100);
});

test("runner-only permission denial gives a bounded diagnostic and keeps job totals", async () => {
  const get = async path => {
    if (path.startsWith("/user/installations?"))
      return { installations: [installation(14, "team")] };
    if (path.startsWith("/user/installations/14/repositories?"))
      return { repositories: [{ full_name: "team/service" }] };
    throw Error("unexpected path");
  };
  const state = { counts: { busy: null, running: 4, queued: 2 },
    coverage: { runners: false, jobs: true },
    errors: [
      { scope: "runners", reason: "permission_denied" },
      { scope: "runners", reason: "incomplete" }
    ] };
  const result = await collectForAccount({ get, collect: async () => state });
  assert.equal(result.state.counts.running, 4);
  assert.equal(result.state.counts.queued, 2);
  assert.equal(result.state.counts.busy, null);
  assert.match(result.reason, /Runner inventory access denied/);
  assert.doesNotMatch(result.reason, /team\/service|token/);
});

test("rate-limited job collection shows explicit rate-limit status without fabricated zero", async () => {
  const get = async path => {
    if (path.startsWith("/user/installations?"))
      return { installations: [installation(14, "team")] };
    if (path.startsWith("/user/installations/14/repositories?"))
      return { repositories: [{ full_name: "team/service" }] };
    throw Error("unexpected path");
  };
  const state = { counts: { busy: 0, running: null, queued: null },
    coverage: { runners: true, jobs: false },
    errors: [{ scope: "team/service", reason: "rate_limited" }] };
  const result = await collectForAccount({ get, collect: async () => state });
  assert.equal(result.state.counts.running, null);
  assert.match(result.reason, /API rate limited/);
});

test("monitor says Connecting after native authorization before slow data collection", async () => {
  const messages = [];
  const registered = [];
  let finishCollection;
  const collecting = new Promise(resolve => { finishCollection = resolve; });
  const collect = async () => collecting;
  const invoke = async (name, args) => {
    if (name === "github_auth_status") return { connected: true };
    if (name === "get_monitor_scope") return "team";
    if (name === "github_monitor_publish") {
      messages.push(args);
      return;
    }
    throw Error("unexpected command " + name);
  };
  startGithubMonitoring({
    invoke, collect,
    schedule: (callback, delay) => {
      assert.equal(delay, REFRESH_MS);
      registered.push(callback);
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(registered.length, 1);
  assert.deepEqual(messages.map(m => [m.connected, m.runnerState, m.message]),
    [[true, null, "Connecting to GitHub..."]]);
  finishCollection({
    state: { coverage: { jobs: true, runners: true }, counts: { running: 1 } },
    repositoryCount: 1, reason: null,
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(messages.length, 2);
  assert.equal(messages[1].connected, true);
  assert.equal(messages[1].runnerState.counts.running, 1);
  assert.equal(messages[1].message, null);
});

test("disconnected native credential check never claims Connecting or authorized", async () => {
  const messages = [];
  let collectionCalls = 0;
  startGithubMonitoring({
    invoke: async (name, args) => {
      if (name === "github_auth_status") return { connected: false };
      if (name === "github_monitor_publish") messages.push(args);
      return null;
    },
    collect: async () => { collectionCalls++; },
    schedule: () => {},
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(collectionCalls, 0);
  assert.deepEqual(messages.map(m => [m.connected, m.runnerState, m.message]),
    [[false, null, null]]);
});

test("GitHub monitor uses config-only scope without invoking the local Git scan", async () => {
  const native = readFileSync(
    new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  const getter = native.match(/fn get_monitor_scope\([\s\S]*?\n\}/)?.[0];
  assert.ok(getter, "read-only native monitor scope command must exist");
  assert.match(getter, /read_config\(&app\)\?\.github_monitor_org/);
  assert.doesNotMatch(getter, /scan\(|git::discover|git::inspect/);
  assert.match(native, /generate_handler!\[[\s\S]*?get_monitor_scope,/);

  const commands = [];
  const published = [];
  let selectedFromCollector = null;
  startGithubMonitoring({
    invoke: async (name, args) => {
      commands.push(name);
      if (name === "github_auth_status") return { connected: true };
      if (name === "get_monitor_scope") return "team";
      if (name === "github_monitor_publish") {
        published.push(args);
        return;
      }
      if (name === "get_snapshot")
        throw Error("Local Git scanning must not gate remote monitoring");
      throw Error("Unexpected IPC: " + name);
    },
    collect: async ({ selected }) => {
      selectedFromCollector = selected;
      return { state: null, reason: "No accessible repositories." };
    },
    schedule: () => {},
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(selectedFromCollector, "team");
  assert.equal(commands.filter(name => name === "get_monitor_scope").length, 1);
  assert.equal(commands.includes("get_snapshot"), false);
  assert.deepEqual(published.map(p => p.message),
    ["Connecting to GitHub...", "No accessible repositories."]);
});
