import test from "node:test";
import assert from "node:assert/strict";
import { collectRunnerState } from "../apps/desktop/ui/runner-collector.mjs";

const config = { org: "org", repositories: ["org/first", "org/second"],
  now: () => "2026-10-20T12:30:00Z" };
function mockGithub(path) {
  const url = new URL(path, "https://api.github.com");
  const p = url.pathname;
  if (p === "/orgs/org/actions/runners") return {
    runners: [{ id: 7, name: "worker", status: "online", busy: true,
      labels: [{ name: "self-hosted" }, { name: "linux" }] }],
  };
  if (p.endsWith("/actions/runs")) {
    const repoName = p.split("/")[3];
    const status = url.searchParams.get("status");
    if (repoName === "first" && status === "in_progress")
      return { workflow_runs: [{ id: 77 }] };
    if (repoName === "second" && status === "queued")
      return { workflow_runs: [{ id: 88 }] };
    return { workflow_runs: [] };
  }
  if (p.endsWith("/77/jobs")) return { jobs: [
    { id: 700, status: "in_progress", runner_id: 7,
      labels: ["self-hosted", "linux"] },
    { id: 701, status: "queued", runner_id: null,
      labels: ["self-hosted", "linux"] },
    { id: 702, status: "queued", runner_id: null,
      labels: ["ubuntu-latest"] },
  ] };
  if (p.endsWith("/88/jobs")) return { jobs: [
    { id: 703, status: "queued", runner_id: null,
      labels: ["self-hosted", "linux"] },
  ] };
  throw Error("Unexpected GitHub request: " + path);
}

test("queued jobs in running workflow counted with queued workflows across repos", async () => {
  const requested = [];
  const snapshot = await collectRunnerState({
    ...config,
    get: async path => { requested.push(path); return mockGithub(path); },
  });
  assert.deepEqual([snapshot.counts.busy, snapshot.counts.running, snapshot.counts.queued],
    [1, 1, 3]);
  assert.equal(snapshot.counts.runningSelfHosted, 1);
  assert.equal(snapshot.counts.queuedSelfHosted, 2);
  assert.equal(snapshot.counts.queuedGitHubHosted, 1);
  assert.equal(snapshot.checkedAt, "2026-10-20T12:30:00Z");
  assert.equal(snapshot.coverage.queue, true);
  assert.equal(requested.filter(path => path.includes("/77/jobs")).length, 1);
});

test("denied repository cannot convert a partial queue to zero", async () => {
  const snapshot = await collectRunnerState({
    ...config,
    get: async path => {
      if (path.includes("/repos/org/second/")) throw Error("private GitHub token text");
      return mockGithub(path);
    },
  });
  assert.equal(snapshot.counts.busy, 1);
  assert.equal(snapshot.counts.queued, null);
  assert.equal(snapshot.counts.queuedObserved, 2);
  assert.deepEqual(snapshot.errors, [{ scope: "org/second", reason: "unavailable" }]);
});

test("denied runner inventory keeps complete hosted job totals", async () => {
  const snapshot = await collectRunnerState({
    ...config,
    get: async path => {
      if (path.includes("/orgs/")) throw Error("unauthorized");
      return mockGithub(path);
    },
  });
  assert.equal(snapshot.counts.busy, null);
  assert.equal(snapshot.counts.queued, 3);
  assert.equal(snapshot.errors[0].scope, "runners");
});

test("capped runner pagination cannot report a confident zero", async () => {
  const many = Array.from({ length: 100 }, (_, id) => ({
    id: id + 1, name: "runner" + id, status: "online",
    busy: false, labels: ["self-hosted"],
  }));
  const snapshot = await collectRunnerState({
    ...config, maxRunnerPages: 1,
    get: async path => path.includes("/orgs/") ? { runners: many } : mockGithub(path),
  });
  assert.equal(snapshot.counts.busy, null);
  assert.equal(snapshot.coverage.runners, false);
  assert.equal(snapshot.errors[0].reason, "incomplete");
});

test("rejects cross-organization repository before contacting GitHub", async () => {
  let calls = 0;
  await assert.rejects(collectRunnerState({
    ...config, repositories: ["other/private"], get: async () => { calls++; },
  }), /Invalid selected repositories/);
  assert.equal(calls, 0);
});

test("same run in both active statuses has only one jobs query", async () => {
  let reads = 0;
  const snapshot = await collectRunnerState({
    ...config,
    get: async path => {
      if (path.includes("/77/jobs")) { reads++; return mockGithub(path); }
      if (path.includes("/repos/org/first/") && path.includes("/actions/runs?"))
        return { workflow_runs: [{ id: 77 }] };
      return mockGithub(path);
    },
  });
  assert.equal(reads, 1);
  assert.equal(snapshot.counts.running, 1);
});

test("rate-limited repo preserves independent runner inventory without leaking source text", async () => {
  const snapshot = await collectRunnerState({
    ...config,
    get: async path => {
      if (path.includes("/repos/org/second/"))
        throw Error("GitHub API rate limited.");
      return mockGithub(path);
    },
  });
  assert.equal(snapshot.coverage.runners, true);
  assert.equal(snapshot.counts.busy, 1);
  assert.equal(snapshot.coverage.jobs, false);
  assert.equal(snapshot.counts.running, null);
  assert.equal(snapshot.counts.queued, null);
  assert.ok(snapshot.errors.some(x =>
    x.scope === "org/second" && x.reason === "rate_limited"));
  assert.doesNotMatch(JSON.stringify(snapshot.errors), /token|private/);
});

test("runner permission denial does not erase complete Actions jobs", async () => {
  const snapshot = await collectRunnerState({
    ...config,
    get: async path => {
      if (path.startsWith("/orgs/")) throw Error("GitHub API permission denied.");
      return mockGithub(path);
    },
  });
  assert.equal(snapshot.coverage.runners, false);
  assert.equal(snapshot.counts.busy, null);
  assert.equal(snapshot.coverage.jobs, true);
  assert.equal(snapshot.counts.running, 1);
  assert.equal(snapshot.counts.queued, 3);
  assert.ok(snapshot.errors.some(x =>
    x.scope === "runners" && x.reason === "permission_denied"));
});

function manyQueuedRuns({ failJob = null } = {}) {
  const repositories = ["org/one", "org/two", "org/three", "org/four"];
  const names = repositories.map(repo => repo.split("/")[1]);
  let active = 0;
  let maximum = 0;
  let completed = 0;
  const get = async path => {
    active++;
    maximum = Math.max(maximum, active);
    // Flush asynchronously without timing sleeps; overlap is deterministic
    // across nested repo and job workers.
    await new Promise(resolve => setImmediate(resolve));
    try {
      const url = new URL(path, "https://api.github.com");
      if (url.pathname === "/orgs/org/actions/runners")
        return { runners: [] };
      const segments = url.pathname.split("/").filter(Boolean);
      const index = names.indexOf(segments[2]);
      if (segments[0] === "repos" && index >= 0 &&
          segments[3] === "actions" && segments[4] === "runs") {
        if (segments.length === 5) {
          return { workflow_runs: url.searchParams.get("status") === "queued"
            ? Array.from({ length: 4 }, (_, n) => ({ id: (index + 1) * 100 + n + 1 }))
            : [] };
        }
        if (segments.length === 7 && segments[6] === "jobs") {
          const id = Number(segments[5]);
          if (id === failJob) throw Error("ghu_PRIVATE must never reach presentation");
          return { jobs: [{ id: id * 10, status: "queued",
            runner_id: null, labels: ["ubuntu-latest"] }] };
        }
      }
      throw Error("Unexpected test GitHub request");
    } finally {
      active--;
      completed++;
    }
  };
  return {
    repositories, get,
    stats: () => ({ active, maximum, completed })
  };
}

test("global cap applies to all nested jobs requests across repositories", async () => {
  const fake = manyQueuedRuns();
  const snapshot = await collectRunnerState({
    org: "org", repositories: fake.repositories, get: fake.get,
    concurrency: 2, now: config.now, maxRunPages: 1, maxJobPages: 1,
  });
  assert.equal(fake.stats().active, 0);
  assert.equal(fake.stats().maximum, 2);
  assert.equal(snapshot.counts.queued, 16);
  assert.equal(snapshot.coverage.jobs, true);
  assert.equal(snapshot.errors.length, 0);
});

test("global cap releases failed requests without fabricating complete job counts", async () => {
  const fake = manyQueuedRuns({ failJob: 101 });
  const snapshot = await collectRunnerState({
    org: "org", repositories: fake.repositories, get: fake.get,
    concurrency: 2, now: config.now, maxRunPages: 1, maxJobPages: 1,
  });
  assert.ok(fake.stats().maximum <= 2);
  assert.equal(snapshot.coverage.runners, true);
  assert.equal(snapshot.coverage.jobs, false);
  assert.equal(snapshot.counts.queued, null);
  assert.ok(snapshot.errors.some(error =>
    error.scope === "org/one" && error.reason === "unavailable"));
  assert.doesNotMatch(JSON.stringify(snapshot.errors), /ghu_PRIVATE/);
  // Concurrent requests accepted before failure may finish afterwards;
  // the request limiter must release those slots as well.
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fake.stats().active, 0);
});


test("manual runners refresh calls only runner inventory and preserves task timestamp", async () => {
  const prior = await collectRunnerState({ ...config, get: async path => mockGithub(path) });
  const paths = [];
  const next = await collectRunnerState({
    ...config, kind: "runners", previousState: prior,
    now: () => "2026-10-20T13:45:00Z",
    get: async path => { paths.push(path); return mockGithub(path); }
  });
  assert.ok(paths.length > 0);
  assert.ok(paths.every(path => path.startsWith("/orgs/org/actions/runners?")));
  assert.equal(next.counts.running, prior.counts.running);
  assert.equal(next.counts.queued, prior.counts.queued);
  assert.equal(next.checkedAtRunners, "2026-10-20T13:45:00Z");
  assert.equal(next.checkedAtTasks, prior.checkedAt);
});

test("manual tasks refresh requests runs/jobs but never runner inventory", async () => {
  const prior = await collectRunnerState({ ...config, get: async path => mockGithub(path) });
  const paths = [];
  const next = await collectRunnerState({
    ...config, kind: "tasks", previousState: prior,
    now: () => "2026-10-20T14:20:00Z",
    get: async path => { paths.push(path); return mockGithub(path); }
  });
  assert.ok(paths.some(path => path.includes("/actions/runs?")));
  assert.ok(paths.every(path => !path.startsWith("/orgs/")));
  assert.equal(next.coverage.runners, prior.coverage.runners);
  assert.equal(next.counts.busy, prior.counts.busy);
  assert.equal(next.checkedAtRunners, prior.checkedAt);
  assert.equal(next.checkedAtTasks, "2026-10-20T14:20:00Z");
});

test("manual runner errors do not invent fresh successful runner timestamp", async () => {
  const prior = await collectRunnerState({ ...config, get: async path => mockGithub(path) });
  const next = await collectRunnerState({
    ...config, kind: "runners", previousState: prior,
    get: async path => {
      if (path.startsWith("/orgs/")) throw Error("unauthorized");
      throw Error("Wrong API endpoint for runner-only collection");
    }
  });
  assert.equal(next.counts.busy, null);
  assert.equal(next.checkedAtRunners, null);
  assert.equal(next.checkedAtTasks, prior.checkedAt);
});
