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
