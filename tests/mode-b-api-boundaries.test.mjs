import test from "node:test";
import assert from "node:assert/strict";
import { listAvailableInstallations } from "../apps/desktop/ui/github-installations.mjs";
import { listInstalledRepositories, collectForAccount } from "../apps/desktop/ui/github-monitor.mjs";
import { collectRunnerState } from "../apps/desktop/ui/runner-collector.mjs";

const instant = "2026-10-29T16:00:00Z";
const acc = (name, id = 12) => ({ id, account: { login: name } });
const repo = full_name => ({ full_name });
const job = id => ({ id, status: "queued", labels: ["ubuntu-latest"] });
const fullPage = page => Array.from({ length: 100 }, (_, i) =>
  repo("team/r" + ((page - 1) * 100 + i)));
function api(names = ["team/a"], full = false) {
  const calls = [];
  const get = async path => {
    calls.push(path);
    if (path.startsWith("/user/installations?"))
      return { installations: [acc("team")] };
    if (path.includes("/repositories?")) {
      if (full) return { repositories: fullPage(Number(
        new URLSearchParams(path.split("?")[1]).get("page"))) };
      return { repositories: names.map(repo) };
    }
    throw Error("Unexpected fake route");
  };
  return { calls, get };
}
function empty(path) {
  if (path.includes("/actions/runners?")) return { runners: [] };
  if (path.includes("/actions/runs?")) return { workflow_runs: [] };
  throw Error("Unexpected route");
}
async function collect(get, extra = {}) {
  return collectForAccount({ get, selected: "team", ...extra });
}

test("batch 04: installations accept 100 plus a final partial page", async () => {
  let n = 0;
  const output = await listAvailableInstallations(async () => ({
    installations: ++n === 1
      ? Array.from({ length: 100 }, (_, i) => acc("user" + i, i + 1))
      : [acc("last", 101)]
  }));
  assert.equal(n, 2);
  assert.equal(output.items.length, 101);
  assert.equal(output.complete, true);
});
test("batch 04: oversized installation page is invalid before a second fetch", async () => {
  let n = 0;
  await assert.rejects(listAvailableInstallations(async () => {
    n++;
    return { installations: Array.from({ length: 101 }, (_, i) => acc("user" + i, i + 1)) };
  }), /Invalid installations response/);
  assert.equal(n, 1);
});
test("batch 04: missing installation payload is not a verified empty inventory", async () => {
  for (const payload of [null, {}, { installations: null }, { installations: "bad" }])
    await assert.rejects(listAvailableInstallations(async () => payload),
      /Invalid installations response/);
});
test("batch 04: forbidden dot and non-ASCII account identifiers are filtered", async () => {
  const result = await listAvailableInstallations(async () => ({
    installations: [acc("."), acc(".."), acc("bad/name"), acc("😀"), acc("team")]
  }));
  assert.deepEqual(result.items, [{ name: "team", id: 12 }]);
});
test("batch 04: oversized repository page is invalid before a second fetch", async () => {
  let n = 0;
  await assert.rejects(listInstalledRepositories(async () => {
    n++;
    return { repositories: Array.from({ length: 101 }, (_, i) => repo("team/r" + i)) };
  }, "team", 12), /Invalid repository response/);
  assert.equal(n, 1);
});
test("batch 04: missing repository array fails, not a known-zero scope", async () => {
  await assert.rejects(listInstalledRepositories(async () => ({}), "team", 12),
    /Invalid repository response/);
});
test("batch 04: only exact owner/repository names can enter all-repo inventory", async () => {
  const result = await listInstalledRepositories(async () => ({ repositories: [
    repo("team/good"), repo("team/.."), repo("team/."),
    repo("team/good/extra"), repo("team//blank"), repo("team/r/"),
    repo("elsewhere/other"), repo("TEAM/Second")
  ] }), "team", 12);
  assert.deepEqual(result.items, ["team/good", "TEAM/Second"]);
  assert.equal(result.complete, true);
});
test("batch 04: 100 valid repositories followed by empty page are complete", async () => {
  let page = 0;
  const result = await listInstalledRepositories(async () => ({
    repositories: ++page === 1 ? fullPage(1) : []
  }), "team", 12);
  assert.equal(page, 2);
  assert.equal(result.items.length, 100);
  assert.equal(result.complete, true);
});
test("batch 04: duplicate case-insensitive selection rejected before repo API", async () => {
  const client = api();
  await assert.rejects(collect(client.get, {
    selectedRepositories: ["team/a", "TEAM/A"], collect: async () => {
      throw Error("must not collect");
    }
  }), /Invalid selected repositories/);
  assert.equal(client.calls.filter(x => x.includes("/repositories?")).length, 0);
});
test("batch 04: dot components and traversal selection rejected before repo API", async () => {
  for (const invalid of ["team/.", "team/..", "team/../outside", "team/a/other"]) {
    const client = api();
    await assert.rejects(collect(client.get, { selectedRepositories: [invalid] }),
      /Invalid selected repositories/);
    assert.equal(client.calls.filter(x => x.includes("/repositories?")).length, 0);
  }
});
test("batch 04: valid mixed-case selection keeps native canonical repository name", async () => {
  const client = api(["Team/Project", "team/other"]);
  const result = await collect(client.get, {
    selectedRepositories: ["TEAM/PROJECT"],
    collect: async ({ org, repositories }) => {
      assert.equal(org, "team");
      assert.deepEqual(repositories, ["Team/Project"]);
      return { errors: [], coverage: { jobs: true },
        counts: { running: 0, queued: 0 } };
    }
  });
  assert.equal(result.repositoryCount, 1);
  assert.equal(result.failure, null);
});
test("batch 04: corrupted first installation page prevents Actions collection", async () => {
  let calls = 0;
  await assert.rejects(collect(async () => {
    calls++;
    return { installations: Array.from({ length: 101 }, (_, i) => acc("u" + i, i + 1)) };
  }, { collect: async () => { throw Error("must never collect"); } }),
  /Invalid installations response/);
  assert.equal(calls, 1);
});
test("batch 04: incomplete all-repo inventory invalidates all task derivatives", async () => {
  const client = api([], true);
  let raw;
  const result = await collect(client.get, {
    collect: async ({ org, repositories }) => {
      raw = {
        scope: { organization: org, repositories },
        runners: [{ id: 1, name: "runner" }],
        runningJobs: [{ id: 10 }], queuedJobs: [{ id: 11 }],
        waitingJobs: [{ id: 12 }],
        runningByLane: { selfHosted: [{ id: 10 }], githubHosted: [], unclassified: [] },
        queuedByLane: { selfHosted: [], githubHosted: [{ id: 11 }], unclassified: [] },
        counts: { busy: 1, idle: 0, offline: 0, running: 1, queued: 1,
          waiting: 1, runningSelfHosted: 1, queuedGitHubHosted: 1,
          runningObserved: 1, queuedObserved: 1 },
        coverage: { runners: true, jobs: true, queue: true, running: true,
          runningLanes: true, queuedLanes: true, queuedUnclassified: 0,
          unmatchedSelfHosted: 0 },
        checkedAtRunners: instant, checkedAtTasks: instant, errors: []
      };
      return raw;
    }
  });
  const state = result.state;
  assert.notStrictEqual(state, raw);
  assert.equal(client.calls.filter(x => x.includes("/repositories?")).length, 10);
  assert.equal(state.coverage.runners, true);
  assert.equal(state.coverage.jobs, false);
  assert.equal(state.coverage.runningLanes, false);
  assert.equal(state.coverage.queuedLanes, false);
  assert.equal(state.counts.busy, 1);
  for (const key of ["running", "queued", "waiting", "runningObserved",
    "queuedObserved", "runningSelfHosted", "queuedGitHubHosted"])
    assert.equal(state.counts[key], null, key);
  assert.deepEqual(state.runningJobs, []);
  assert.deepEqual(state.queuedJobs, []);
  assert.deepEqual(state.runningByLane,
    { selfHosted: [], githubHosted: [], unclassified: [] });
  assert.equal(state.checkedAtTasks, null);
  assert.equal(state.checkedAtRunners, instant);
  assert.equal(result.failure, "incomplete");
  assert.equal(raw.coverage.jobs, true);
  assert.equal(raw.runningJobs.length, 1);
});
test("batch 04: explicit selected repo stays trusted despite unrelated truncated pages", async () => {
  const client = api([], true);
  let called = 0;
  const result = await collect(client.get, {
    selectedRepositories: ["team/r0"],
    collect: async ({ repositories }) => {
      called++;
      assert.deepEqual(repositories, ["team/r0"]);
      return { errors: [], coverage: { jobs: true },
        counts: { running: 0, queued: 0 } };
    }
  });
  assert.equal(called, 1);
  assert.equal(result.repositoryCount, 1);
  assert.equal(result.state.counts.running, 0);
});
test("batch 04: runner-only collection does not discard independent tasks", async () => {
  const client = api([], true);
  const state = { coverage: { runners: true, jobs: true },
    counts: { busy: 0, running: 8, queued: 2 }, errors: [] };
  const result = await collect(client.get, {
    kind: "runners", collect: async () => state
  });
  assert.strictEqual(result.state, state);
  assert.equal(result.state.counts.running, 8);
});
test("batch 04: oversize runner list leaves job counts independent and known", async () => {
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"], now: () => instant,
    get: async path => path.includes("/actions/runners?")
      ? { runners: Array.from({ length: 101 }, (_, i) => ({
          id: i + 1, name: "r" + i, status: "online",
          busy: false, labels: ["self-hosted"]
        })) } : empty(path)
  });
  assert.equal(state.coverage.runners, false);
  assert.equal(state.counts.busy, null);
  assert.equal(state.coverage.jobs, true);
  assert.equal(state.counts.running, 0);
  assert.ok(state.errors.some(x => x.scope === "runners" && x.reason === "unavailable"));
});
test("batch 04: oversize queued runs cannot create authoritative zero jobs", async () => {
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"], now: () => instant,
    get: async path => {
      if (path.includes("/actions/runners?")) return { runners: [] };
      if (path.includes("status=queued")) return { workflow_runs:
        Array.from({ length: 101 }, (_, i) => ({ id: i + 1 })) };
      if (path.includes("status=in_progress")) return { workflow_runs: [] };
      throw Error("job endpoint must not be queried");
    }
  });
  assert.equal(state.coverage.runners, true);
  assert.equal(state.coverage.jobs, false);
  assert.equal(state.counts.queued, null);
});
test("batch 04: oversize job page cannot inflate counts", async () => {
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"], now: () => instant,
    get: async path => {
      if (path.includes("/actions/runners?")) return { runners: [] };
      if (path.includes("status=queued")) return { workflow_runs: [{ id: 9 }] };
      if (path.includes("status=in_progress")) return { workflow_runs: [] };
      if (path.includes("/runs/9/jobs?")) return {
        jobs: Array.from({ length: 101 }, (_, i) => job(i + 1)) };
      throw Error("bad route");
    }
  });
  assert.equal(state.coverage.jobs, false);
  assert.equal(state.counts.queued, null);
  assert.ok(state.errors.some(x => x.scope === "team/a" && x.reason === "unavailable"));
});
test("batch 04: exactly 100 jobs followed by empty page produce correct queue", async () => {
  let pages = 0;
  const state = await collectRunnerState({
    org: "team", repositories: ["team/a"], now: () => instant,
    get: async path => {
      if (path.includes("/actions/runners?")) return { runners: [] };
      if (path.includes("status=queued")) return { workflow_runs: [{ id: 9 }] };
      if (path.includes("status=in_progress")) return { workflow_runs: [] };
      if (path.includes("/runs/9/jobs?")) return {
        jobs: ++pages === 1 ? Array.from({ length: 100 }, (_, i) => job(i + 1)) : []
      };
      throw Error("bad route");
    }
  });
  assert.equal(pages, 2);
  assert.equal(state.coverage.jobs, true);
  assert.equal(state.counts.queued, 100);
  assert.equal(state.counts.queuedGitHubHosted, 100);
});
test("batch 04: malformed one-repo response preserves other runner facts", async () => {
  const result = await collectRunnerState({
    org: "team", repositories: ["team/bad", "team/good"], now: () => instant,
    get: async path => {
      if (path.includes("/actions/runners?")) return { runners: [] };
      if (path.includes("/team/bad/")) return { workflow_runs:
        Array.from({ length: 101 }, (_, i) => ({ id: i + 1 })) };
      if (path.includes("/team/good/")) return { workflow_runs: [] };
      throw Error("bad route");
    }
  });
  assert.equal(result.coverage.runners, true);
  assert.equal(result.coverage.jobs, false);
  assert.equal(result.counts.queued, null);
  assert.ok(result.errors.some(x => x.scope === "team/bad"));
});
test("batch 04: provider failure text never escapes into public error", async () => {
  const result = await collectRunnerState({
    org: "team", repositories: ["team/a"], now: () => instant,
    get: async path => {
      if (path.includes("/actions/runners?")) return { runners: [] };
      if (path.includes("status=queued")) return { workflow_runs: [{ id: 1 }] };
      if (path.includes("status=in_progress")) return { workflow_runs: [] };
      throw Error("Bearer NOT-A-REAL-SECRET");
    }
  });
  assert.equal(result.coverage.jobs, false);
  assert.equal(result.counts.queued, null);
  assert.ok(!JSON.stringify(result.errors).includes("NOT-A-REAL-SECRET"));
});
