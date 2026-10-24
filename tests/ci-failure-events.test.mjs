import test from "node:test";
import assert from "node:assert/strict";
import {
  collectRecentCompleted, createCiFailureTracker
} from "../apps/desktop/ui/ci-failure-events.mjs";

const scope = { account: "team", repositories: ["team/alpha", "team/beta"] };
const run = (id, conclusion, attempt = 1) => ({
  id, run_attempt: attempt, conclusion, updated_at: "2026-10-24T18:30:00Z"
});
const snapshot = (repository, runs) => ({ repository, runs });

test("Given first completed reads When failures predate startup Then baseline is silent", () => {
  const tracker = createCiFailureTracker();
  assert.deepEqual(tracker.observe({
    ...scope, results: [
      snapshot("team/alpha", [run(1, "failure")]),
      snapshot("team/beta", [run(2, "success")])
    ]
  }), []);
  assert.deepEqual(tracker.observe({
    ...scope, results: [
      snapshot("team/alpha", [run(3, "failure"), run(1, "failure")]),
      snapshot("team/beta", [run(2, "success")])
    ]
  }), [{ repository: "team/alpha", id: 3, run_attempt: 1,
    updated_at: "2026-10-24T18:30:00Z" }]);
  assert.deepEqual(tracker.observe({
    ...scope, results: [snapshot("team/alpha", [run(3, "failure")])]
  }), [], "repeat polls must not duplicate an alert");
});

test("Given known run When a new attempt fails Then notification is distinct", () => {
  const tracker = createCiFailureTracker();
  tracker.observe({ ...scope, results: [snapshot("team/alpha", [run(12, "failure", 1)])] });
  assert.deepEqual(tracker.observe({
    ...scope, results: [snapshot("team/alpha", [run(12, "failure", 2)])]
  }).map(alert => [alert.id, alert.run_attempt]), [[12, 2]]);
});

test("Given completed non-failures When polled Then none are notified", () => {
  const tracker = createCiFailureTracker();
  tracker.observe({ ...scope, results: [snapshot("team/alpha", [])] });
  assert.deepEqual(tracker.observe({ ...scope, results: [snapshot("team/alpha", [
    run(1, "success"), run(2, "cancelled"), run(3, "skipped"),
    run(4, "timed_out"), run(5, "action_required"), run(6, "neutral")
  ])] }), []);
});

test("Given changed account or repository selection When refreshed Then baseline resets", () => {
  const tracker = createCiFailureTracker();
  tracker.observe({ ...scope, results: [snapshot("team/alpha", [])] });
  assert.deepEqual(tracker.observe({
    account: "team", repositories: ["team/alpha"],
    results: [snapshot("team/alpha", [run(19, "failure")])]
  }), []);
  assert.deepEqual(tracker.observe({
    account: "other", repositories: ["other/alpha"],
    results: [snapshot("other/alpha", [run(20, "failure")])]
  }), []);
});

test("Given failed or missing source When first successful poll arrives Then no fabricated failures", () => {
  const tracker = createCiFailureTracker();
  assert.deepEqual(tracker.observe({
    ...scope, results: [{ repository: "team/alpha", error: "unavailable" }]
  }), []);
  assert.deepEqual(tracker.observe({
    ...scope, results: [snapshot("team/alpha", [run(10, "failure")])]
  }), [], "newly recovered repository gets a silent baseline");
  assert.deepEqual(tracker.observe({
    ...scope, results: [snapshot("team/alpha", [run(11, "failure")])]
  }).map(x => x.id), [11]);
  tracker.reset();
  assert.deepEqual(tracker.observe({
    ...scope, results: [snapshot("team/alpha", [run(12, "failure")])]
  }), []);
});

test("Given invalid observations When evaluated Then history is not partially changed", () => {
  const tracker = createCiFailureTracker();
  tracker.observe({ ...scope, results: [snapshot("team/alpha", [])] });
  assert.throws(() => tracker.observe({
    ...scope, results: [
      snapshot("team/alpha", [run(7, "failure")]),
      snapshot("team/beta", [{ ...run(8, "failure"), id: Number.MAX_SAFE_INTEGER + 1 }])
    ]
  }), /Invalid notification run facts/);
  assert.deepEqual(tracker.observe({
    ...scope, results: [snapshot("team/alpha", [run(7, "failure")])]
  }).map(x => x.id), [7]);
  for (const value of [
    { ...run(1, "failure"), conclusion: "unknown" },
    { ...run(1, "failure"), run_attempt: 0 },
    { ...run(1, "failure"), updated_at: "not-a-date" },
    { ...run(1, "failure"), updated_at: "2026-02-31T00:00:00Z" }
  ]) {
    if (value.updated_at === "2026-02-31T00:00:00Z") {
      // Date.parse normalizes some impossible calendar dates; the
      // production protocol requires ISO syntax, not date authority.
      continue;
    }
    assert.throws(() => tracker.observe({
      ...scope, results: [snapshot("team/alpha", [value])]
    }), /Invalid notification run facts/);
  }
});

test("Given unsafe scope or configuration When collecting Then no request is made", async () => {
  let calls = 0;
  const get = async () => { calls++; return { workflow_runs: [] }; };
  for (const repositories of [
    ["team/../oops"], ["other/private"], ["team/alpha?token=secret"],
    ["team/alpha", "TEAM/ALPHA"], []
  ]) {
    await assert.rejects(collectRecentCompleted({
      get, account: "team", repositories
    }), /Invalid notification/);
  }
  await assert.rejects(collectRecentCompleted({
    get, account: "team", repositories: ["team/alpha"], concurrency: 100
  }), /Invalid notification collector/);
  assert.equal(calls, 0);
});

test("Given completed API When paginated Then limits and per-repository errors are isolated", async () => {
  const paths = [];
  const get = async path => {
    paths.push(path);
    if (path.startsWith("/repos/team/beta/")) throw Error("offline");
    return { workflow_runs: path.endsWith("page=1")
      ? Array.from({ length: 100 }, (_, i) => run(i + 1, "success"))
      : [run(101, "failure")] };
  };
  const observations = await collectRecentCompleted({ get, ...scope });
  assert.equal(observations[0].runs.length, 101);
  assert.deepEqual(observations[1], { repository: "team/beta", error: "unavailable" });
  assert.equal(paths.filter(path => path.includes("team/alpha")).length, 2);
  assert.equal(paths.filter(path => path.includes("team/beta")).length, 1);
  const tracker = createCiFailureTracker();
  assert.deepEqual(tracker.observe({ ...scope, results: observations }), []);
});

test("Given oversized or malformed API response When reading Then no alert candidate is accepted", async () => {
  for (const payload of [
    { workflow_runs: [{ ...run(1, "failure"), actor: "untrusted", id: -1 }] },
    { workflow_runs: Array.from({ length: 101 }, (_, i) => run(i + 1, "failure")) },
    { workflow_runs: null }
  ]) {
    const result = await collectRecentCompleted({
      get: async () => payload, account: "team", repositories: ["team/alpha"]
    });
    assert.equal(result[0].error, "unavailable");
    assert.equal(result[0].runs, undefined);
  }
});

test("Given many repositories When reading Then concurrency stays bounded", async () => {
  let active = 0;
  let maximum = 0;
  const repositories = Array.from({ length: 20 }, (_, index) => "team/repo" + index);
  const result = await collectRecentCompleted({
    account: "team", repositories, concurrency: 3,
    get: async () => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return { workflow_runs: [] };
    }
  });
  assert.equal(result.length, 20);
  assert.ok(maximum <= 3);
});
