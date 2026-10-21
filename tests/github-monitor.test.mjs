import test from "node:test";
import assert from "node:assert/strict";
import {
  listAvailableInstallations, listInstalledRepositories, collectForAccount,
  REFRESH_MS, monitorRefreshDelay
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
