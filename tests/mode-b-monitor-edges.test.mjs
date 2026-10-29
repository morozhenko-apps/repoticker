import test from "node:test";
import assert from "node:assert/strict";

import {
  monitorRefreshDelay, listInstalledRepositories, collectForAccount,
  mergeMetricGroup, invalidateMetricGroup
} from "../apps/desktop/ui/github-monitor.mjs";
import { listAvailableInstallations } from "../apps/desktop/ui/github-installations.mjs";
import { collectRunnerState } from "../apps/desktop/ui/runner-collector.mjs";
import { createCiFailureTracker, collectRecentCompleted } from "../apps/desktop/ui/ci-failure-events.mjs";
import { githubFailureReason, githubFailureMessage } from "../apps/desktop/ui/github-errors.mjs";

const time = "2026-10-29T12:00:00Z";
const installation = (name = "team", id = 17) =>
  ({ id, account: { login: name } });
const run = (id, conclusion = "success", run_attempt = 1) =>
  ({ id, conclusion, run_attempt, updated_at: time });
const jobs = (...items) => ({ jobs: items });
const runs = (...items) => ({ workflow_runs: items });

function available(getRepos = ["team/app"], name = "team") {
  const seen = [];
  const get = async path => {
    seen.push(path);
    if (path.startsWith("/user/installations?"))
      return { installations: [installation(name)] };
    if (path.startsWith("/user/installations/17/repositories?"))
      return { repositories: getRepos.map(full_name => ({ full_name })) };
    throw Error("Unexpected synthetic REST route: " + path);
  };
  return { get, seen };
}

function emptyRunnerAPI(path) {
  if (path.startsWith("/orgs/team/actions/runners?"))
    return { runners: [] };
  if (path.includes("/actions/runs?"))
    return { workflow_runs: [] };
  throw Error("Unexpected synthetic REST request: " + path);
}

test("Mode B monitor refresh: exact 15-repository boundaries never overpoll", () => {
  assert.equal(monitorRefreshDelay(0), 120_000);
  assert.equal(monitorRefreshDelay(1), 120_000);
  assert.equal(monitorRefreshDelay(15), 120_000);
  assert.equal(monitorRefreshDelay(30), 120_000);
  assert.equal(monitorRefreshDelay(31), 180_000);
  assert.equal(monitorRefreshDelay(60), 240_000);
  assert.equal(monitorRefreshDelay(100), 420_000);
  assert.equal(monitorRefreshDelay(-2), 120_000);
  for (const input of [Number.NaN, 1.25, "30", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(monitorRefreshDelay(input), 420_000);
  }
});

test("Mode B installations: malformed account facts are filtered before selection", async () => {
  const result = await listAvailableInstallations(async () => ({
    installations: [
      installation("team", 2), installation("other-team", 7),
      installation("unsafe/name", 3), installation("emoji😀", 4),
      installation("negative", -1), { account: { login: "missing-id" } },
      { id: 11 }, null
    ]
  }));
  assert.equal(result.complete, true);
  assert.deepEqual(result.items, [
    { name: "team", id: 2 }, { name: "other-team", id: 7 }
  ]);
});

test("Mode B installations: exactly full page plus final partial page is complete", async () => {
  const seen = [];
  const result = await listAvailableInstallations(async path => {
    seen.push(path);
    if (path.endsWith("page=1")) return { installations:
      Array.from({ length: 100 }, (_, index) => installation("o" + index, index + 1)) };
    return { installations: [installation("last", 101)] };
  });
  assert.equal(seen.length, 2);
  assert.equal(result.complete, true);
  assert.equal(result.items.length, 101);
  assert.equal(result.items.at(-1).name, "last");
});

test("Mode B installations: invalid response cannot masquerade as an empty authorized list", async () => {
  await assert.rejects(
    listAvailableInstallations(async () => ({ installations: null })),
    /Invalid installations response/
  );
  await assert.rejects(
    listInstalledRepositories(async () => ({ repositories: null }), "team", 17),
    /Invalid repository response/
  );
});

test("Mode B account collection: invalid selection never reaches installed repository endpoint", async () => {
  for (const bad of [
    ["team/../escape"], ["elsewhere/secret"], ["team/a?token=hidden"],
    ["/missing"], ["team/a/b"], [null],
    Array.from({ length: 101 }, (_, index) => "team/repo" + index)
  ]) {
    const { get, seen } = available();
    await assert.rejects(collectForAccount({
      get, selected: "team", selectedRepositories: bad,
      collect: async () => { throw Error("must not collect invalid selection"); }
    }), /Invalid selected repositories/);
    assert.equal(seen.filter(path => path.includes("/repositories?")).length, 0);
  }
});

test("Mode B account collection: missing selected repository never becomes an empty queue", async () => {
  const { get } = available(["team/a"]);
  let called = 0;
  const result = await collectForAccount({
    get, selected: "team",
    selectedRepositories: ["team/a", "team/private"],
    collect: async () => { called++; }
  });
  assert.equal(result.state, null);
  assert.equal(result.repositoryCount, 2);
  assert.equal(result.reason, "Some selected GitHub repositories are unavailable.");
  assert.equal(called, 0);
});

test("Mode B account collection: incomplete installation pages never authorize a selection", async () => {
  let calls = 0;
  const get = async path => {
    calls++;
    assert.ok(path.startsWith("/user/installations?"));
    return { installations: Array.from({ length: 100 }, (_, index) =>
      installation("account" + index, index + 1)) };
  };
  const result = await collectForAccount({
    get, selected: "account1", collect: async () => {
      throw Error("collection must not run with incomplete installations");
    }
  });
  assert.equal(calls, 10);
  assert.equal(result.state, null);
  assert.equal(result.reason, "GitHub installation list incomplete.");
});

test("Mode B account collection: matching scope passes previous state only for exact repository order", async () => {
  const { get } = available(["team/a", "team/b"]);
  const previous = {
    scope: { organization: "team", repositories: ["team/a", "team/b"] },
    coverage: { jobs: true }, counts: { queued: 4 }
  };
  let prior;
  const result = await collectForAccount({
    get, selected: "team", previousState: previous,
    collect: async params => {
      prior = params.previousState;
      return { scope: { organization: "team", repositories: params.repositories },
        coverage: { jobs: true }, counts: { queued: 0 }, errors: [] };
    }
  });
  assert.strictEqual(prior, previous);
  assert.equal(result.repositoryCount, 2);
  assert.equal(result.state.counts.queued, 0);

  const mismatched = {
    ...previous, scope: { organization: "team", repositories: ["team/b", "team/a"] }
  };
  await collectForAccount({
    get, selected: "team", previousState: mismatched,
    collect: async params => {
      assert.equal(params.previousState, null);
      return { coverage: { jobs: true }, counts: { queued: 0 }, errors: [] };
    }
  });
});

test("Mode B account collection: runner-only 403 keeps job metrics and bounded diagnostic", async () => {
  const { get } = available();
  const state = {
    scope: { organization: "team", repositories: ["team/app"] },
    counts: { running: 2, queued: 0, busy: null },
    coverage: { jobs: true, runners: false },
    errors: [{ scope: "runners", reason: "permission_denied" }]
  };
  const result = await collectForAccount({
    get, selected: "team", collect: async () => state
  });
  assert.strictEqual(result.state, state);
  assert.equal(result.failure, "permission_denied");
  assert.equal(result.reason,
    "Runner inventory access denied; authorized Actions jobs remain visible.");
  assert.equal(result.state.counts.running, 2);
});

test("Mode B targeted refresh: runner failure does not poison prior known task counts", () => {
  const previous = {
    scope: { organization: "team", repositories: ["team/app"] },
    runners: [{ id: 1, name: "fixture" }],
    runningJobs: [{ id: 44 }], queuedJobs: [{ id: 45 }],
    counts: { busy: 1, idle: 0, offline: 0, running: 1, queued: 1, waiting: 0 },
    coverage: { runners: true, jobs: true, running: true, queue: true },
    checkedAtRunners: "old-runners", checkedAtTasks: "old-tasks"
  };
  const next = {
    scope: { organization: "team", repositories: ["team/app"] },
    runners: [], runningJobs: [], queuedJobs: [],
    counts: { busy: null, idle: null, offline: null, running: null, queued: null },
    coverage: { runners: false, jobs: false, running: false, queue: false },
    checkedAtRunners: null, checkedAtTasks: null
  };
  const out = mergeMetricGroup(previous, next, "runners");
  assert.equal(out.counts.busy, null);
  assert.equal(out.coverage.runners, false);
  assert.equal(out.counts.running, 1);
  assert.equal(out.counts.queued, 1);
  assert.equal(out.coverage.jobs, true);
  assert.strictEqual(out.runningJobs, previous.runningJobs);
  assert.strictEqual(out.queuedJobs, previous.queuedJobs);
  assert.equal(out.checkedAtTasks, "old-tasks");
  assert.equal(out.checkedAtRunners, null);
});

test("Mode B targeted refresh: failed tasks invalidate counts but preserve runner inventory", () => {
  const prior = {
    scope: { organization: "team", repositories: ["team/a"] },
    runners: [{ id: 4, name: "name" }], runningJobs: [{ id: 1 }],
    queuedJobs: [], waitingJobs: [],
    counts: { busy: 1, idle: 0, offline: 0, running: 1, queued: 0, waiting: 0 },
    coverage: { runners: true, jobs: true, queue: true, running: true },
    checkedAtRunners: "r", checkedAtTasks: "t"
  };
  const result = invalidateMetricGroup(prior, "tasks");
  assert.equal(result.counts.running, null);
  assert.equal(result.counts.queued, null);
  assert.equal(result.checkedAtTasks, null);
  assert.equal(result.coverage.jobs, false);
  assert.equal(result.coverage.runners, true);
  assert.equal(result.checkedAtRunners, "r");
  assert.strictEqual(result.runners[0].id, 4);
  assert.deepEqual(result.runningJobs, []);
  assert.equal(prior.counts.running, 1);
  assert.equal(prior.checkedAtTasks, "t");
});

test("Mode B targeted refresh: different scope cannot import previous runner identities", () => {
  const previous = {
    scope: { organization: "old", repositories: ["old/x"] },
    runners: [{ id: 100, name: "private" }],
    counts: { running: 88, busy: 3 }, coverage: { jobs: true, runners: true }
  };
  const current = {
    scope: { organization: "new", repositories: ["new/x"] },
    runners: [], counts: { running: null, busy: null },
    coverage: { jobs: false, runners: false }
  };
  assert.strictEqual(mergeMetricGroup(previous, current, "tasks"), current);
  assert.strictEqual(mergeMetricGroup(previous, current, "runners"), current);
  assert.equal(current.counts.running, null);
  assert.equal(current.runners.length, 0);
});

test("Mode B runner collector: rejects all malformed scopes before the first REST call", async () => {
  const inputs = [
    { org: "../token", repositories: ["team/a"] },
    { org: "team", repositories: [] },
    { org: "team", repositories: ["else/a"] },
    { org: "team", repositories: ["team/../../escape"] },
    { org: "team", repositories: ["team/.."] },
    { org: "team", repositories: ["team/a"], concurrency: 9 },
    { org: "team", repositories: ["team/a"], maxRunPages: 0 },
    { org: "team", repositories: ["team/a"], maxJobPages: 101 },
    { org: "team", repositories: ["team/a"], kind: "unknown" }
  ];
  let calls = 0;
  for (const input of inputs) {
    await assert.rejects(collectRunnerState({
      get: async () => { calls++; throw Error("unsafe request"); },
      ...input
    }), /Invalid|Select repositories/);
  }
  assert.equal(calls, 0);
});

test("Mode B runner collector: complete empty API is authoritative zero", async () => {
  const seen = [];
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"], now: () => time,
    get: async path => { seen.push(path); return emptyRunnerAPI(path); }
  });
  assert.equal(state.coverage.runners, true);
  assert.equal(state.coverage.jobs, true);
  assert.equal(state.counts.running, 0);
  assert.equal(state.counts.queued, 0);
  assert.equal(state.counts.busy, 0);
  assert.equal(state.checkedAtRunners, time);
  assert.equal(state.checkedAtTasks, time);
  assert.equal(seen.length, 3);
});

test("Mode B runner collector: one full runner page without a next page is unknown", async () => {
  const result = await collectRunnerState({
    org: "team", repositories: ["team/a"], maxRunnerPages: 1,
    now: () => time,
    get: async path => path.startsWith("/orgs/team/actions/runners")
      ? { runners: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1, name: "runner" + i, status: "online",
          busy: false, labels: ["self-hosted"]
        })) }
      : emptyRunnerAPI(path)
  });
  assert.equal(result.coverage.runners, false);
  assert.equal(result.counts.busy, null);
  assert.equal(result.coverage.jobs, true);
  assert.equal(result.counts.running, 0);
  assert.equal(result.checkedAtRunners, null);
  assert.ok(result.errors.some(x => x.scope === "runners" && x.reason === "incomplete"));
});

test("Mode B runner collector: malformed workflow run ID cannot fabricate queue completeness", async () => {
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"], now: () => time,
    get: async path => {
      if (path.startsWith("/orgs/team/actions/runners")) return { runners: [] };
      if (path.includes("status=queued")) return runs({ id: "not-an-integer" });
      if (path.includes("status=in_progress")) return runs();
      throw Error("jobs request must not be made for an invalid ID");
    }
  });
  assert.equal(state.coverage.runners, true);
  assert.equal(state.coverage.jobs, false);
  assert.equal(state.counts.running, null);
  assert.equal(state.counts.queued, null);
  assert.equal(state.checkedAtTasks, null);
});

test("Mode B runner collector: job-run cap preserves partial evidence but no false totals", async () => {
  const seen = [];
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"],
    maxActiveRunsPerRepo: 1, now: () => time,
    get: async path => {
      seen.push(path);
      if (path.startsWith("/orgs/team/actions/runners")) return { runners: [] };
      if (path.includes("status=queued")) return runs({ id: 11 }, { id: 12 });
      if (path.includes("status=in_progress")) return runs();
      if (path.includes("/runs/11/jobs?")) return jobs({
        id: 101, status: "queued", labels: ["ubuntu-latest"]
      });
      throw Error("unselected run job page was queried");
    }
  });
  assert.equal(seen.filter(p => p.includes("/jobs?")).length, 1);
  assert.equal(state.coverage.jobs, false);
  assert.equal(state.counts.queued, null);
  assert.equal(state.counts.queuedObserved, 1);
  assert.equal(state.checkedAtTasks, null);
});

test("Mode B runner collector: denied jobs do not erase independently known runner capacity", async () => {
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"],
    now: () => time,
    get: async path => {
      if (path.startsWith("/orgs/team/actions/runners")) return { runners: [{
        id: 1, name: "worker", status: "online", busy: false,
        labels: ["self-hosted", "linux"]
      }] };
      if (path.includes("status=queued")) throw Error("GitHub API permission denied.");
      if (path.includes("status=in_progress")) return runs();
      throw Error("Unexpected jobs route");
    }
  });
  assert.equal(state.coverage.runners, true);
  assert.equal(state.counts.idle, 1);
  assert.equal(state.coverage.jobs, false);
  assert.equal(state.counts.queued, null);
  assert.equal(state.checkedAtRunners, time);
  assert.equal(state.checkedAtTasks, null);
  assert.ok(state.errors.some(x => x.scope === "team/a" && x.reason === "permission_denied"));
});

test("Mode B runner collector: targeted tasks preserve prior runner facts and clocks", async () => {
  const previous = {
    runners: [{ id: 1, name: "old", status: "online", busy: true,
      labels: ["self-hosted", "linux"] }],
    coverage: { runners: true, jobs: false },
    checkedAtRunners: "2026-10-28T08:00:00Z",
    checkedAtTasks: null
  };
  const seen = [];
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"], kind: "tasks",
    previousState: previous, now: () => time,
    get: async path => { seen.push(path); return emptyRunnerAPI(path); }
  });
  assert.equal(seen.some(path => path.includes("/actions/runners?")), false);
  assert.equal(state.counts.busy, 1);
  assert.equal(state.coverage.runners, true);
  assert.equal(state.checkedAtRunners, previous.checkedAtRunners);
  assert.equal(state.checkedAtTasks, time);
  assert.equal(state.counts.running, 0);
});

test("Mode B runner collector: targeted runners do not request workflow runs or reset task clock", async () => {
  const previous = {
    scope: { organization: "team", repositories: ["team/a"] },
    runners: [], runningJobs: [], queuedJobs: [], waitingJobs: [],
    coverage: { jobs: true, runners: false },
    checkedAtRunners: null,
    checkedAtTasks: "2026-10-28T09:00:00Z"
  };
  const seen = [];
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"], kind: "runners",
    previousState: previous, now: () => time,
    get: async path => { seen.push(path); return emptyRunnerAPI(path); }
  });
  assert.equal(seen.length, 1);
  assert.ok(seen[0].includes("/actions/runners?"));
  assert.equal(state.coverage.jobs, true);
  assert.equal(state.counts.running, 0);
  assert.equal(state.checkedAtTasks, previous.checkedAtTasks);
  assert.equal(state.checkedAtRunners, time);
});

test("Mode B CI tracker: scope order change is not a different security scope", () => {
  const tracker = createCiFailureTracker();
  tracker.observe({
    account: "team", repositories: ["team/a", "team/b"],
    results: [{ repository: "team/a", runs: [] }, { repository: "team/b", runs: [] }]
  });
  const alerts = tracker.observe({
    account: "TEAM", repositories: ["team/b", "team/a"],
    results: [{ repository: "TEAM/B", runs: [run(9, "failure")] },
      { repository: "TEAM/A", runs: [] }]
  });
  assert.deepEqual(alerts.map(x => [x.id, x.run_attempt]), [[9, 1]]);
  assert.deepEqual(tracker.observe({
    account: "team", repositories: ["team/a", "team/b"],
    results: [{ repository: "team/a", runs: [] },
      { repository: "team/b", runs: [run(9, "failure")] }]
  }), []);
});

test("Mode B CI tracker: invalid second repo never partially mutates first repo history", () => {
  const tracker = createCiFailureTracker();
  tracker.observe({
    account: "team", repositories: ["team/a", "team/b"],
    results: [{ repository: "team/a", runs: [] }, { repository: "team/b", runs: [] }]
  });
  assert.throws(() => tracker.observe({
    account: "team", repositories: ["team/a", "team/b"],
    results: [{ repository: "team/a", runs: [run(20, "failure")] },
      { repository: "team/b", runs: [run(21, "failure", 0)] }]
  }), /Invalid notification run facts/);
  const alerts = tracker.observe({
    account: "team", repositories: ["team/a", "team/b"],
    results: [{ repository: "team/a", runs: [run(20, "failure")] },
      { repository: "team/b", runs: [] }]
  });
  assert.deepEqual(alerts.map(x => x.id), [20]);
});

test("Mode B CI collection: malformed response or denied repo stays isolated and redacted", async () => {
  const reads = [];
  const result = await collectRecentCompleted({
    get: async path => {
      reads.push(path);
      if (path.includes("/team/denied/")) throw Error("token=DO-NOT-SHOW");
      if (path.includes("/team/invalid/"))
        return { workflow_runs: [{ ...run(1), id: "bad" }] };
      return runs(run(5, "success"));
    },
    account: "team",
    repositories: ["team/denied", "team/invalid", "team/valid"]
  });
  assert.deepEqual(result[0], { repository: "team/denied", error: "unavailable" });
  assert.deepEqual(result[1], { repository: "team/invalid", error: "unavailable" });
  assert.equal(result[2].runs[0].id, 5);
  assert.equal(JSON.stringify(result).includes("DO-NOT-SHOW"), false);
  assert.equal(reads.length, 3);
});

test("Mode B CI collection: invalid input is refused before issuing native REST requests", async () => {
  let calls = 0;
  for (const repositories of [["team/a", "TEAM/A"], ["other/a"],
    ["team/../x"], [], Array.from({ length: 101 }, (_, i) => "team/x" + i)]) {
    await assert.rejects(collectRecentCompleted({
      get: async () => { calls++; return runs(); },
      account: "team", repositories
    }), /Invalid notification|Duplicate notification/);
  }
  assert.equal(calls, 0);
});

test("Mode B GitHub errors: raw response fragments never enter user-facing status", () => {
  for (const text of ["Bearer fictional", "403 /repos/private/a", "GitHub API rate limited. token=secret"]) {
    assert.equal(githubFailureReason(text), "unavailable");
    assert.equal(githubFailureMessage(githubFailureReason(text)),
      "GitHub Actions data unavailable.");
  }
  assert.equal(githubFailureReason("GitHub API permission denied."), "permission_denied");
  assert.equal(githubFailureReason("GitHub API rate limited."), "rate_limited");
});
