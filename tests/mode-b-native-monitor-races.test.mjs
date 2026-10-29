import test from "node:test";
import assert from "node:assert/strict";
import { startGithubMonitoring } from "../apps/desktop/ui/github-monitor.mjs";

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
async function settle() {
  for (let i = 0; i < 24; i++) await Promise.resolve();
}
const result = (count, failure = null) => ({
  state: {
    scope: { organization: "team", repositories: ["team/app"] },
    counts: { running: count, queued: 0, busy: 0 },
    coverage: { jobs: true, runners: true },
    runners: [], runningJobs: [], queuedJobs: [], errors: []
  },
  repositoryCount: 1, reason: null, failure
});
const completedRun = (id, conclusion) => ({
  id, run_attempt: 1, conclusion, updated_at: "2026-10-29T12:00:00Z"
});
function monitor({
  connected = true, selection = {}, collect = async () => result(0),
  get = async () => ({ workflow_runs: [] }), cooldownSeconds = 0,
  now = () => 100_000
} = {}) {
  const listeners = new Map(), writes = [], failures = [], notifications = [], apiReads = [];
  const scope = {
    github_monitor_org: "team", github_monitor_repositories: [],
    ci_failure_notifications: false, ...selection
  };
  const invoke = async (name, args) => {
    if (name === "github_auth_status") return { connected };
    if (name === "get_monitor_selection") return scope;
    if (name === "github_api_cooldown_seconds") return cooldownSeconds;
    if (name === "github_monitor_publish") { writes.push(args); return null; }
    if (name === "github_api_get") {
      apiReads.push(args.path);
      return get(args.path);
    }
    if (name === "ci_failure_notify") { notifications.push(args); return null; }
    throw Error("unexpected monitor IPC: " + name);
  };
  const refresh = startGithubMonitoring({
    invoke, event: { listen: (name, handler) => listeners.set(name, handler) },
    collect, now, schedule: () => {}, onError: error => failures.push(String(error))
  });
  return { refresh, listeners, writes, failures, notifications, apiReads, scope };
}

test("Mode B06: disconnected auth never collects or claims a connected job snapshot", async () => {
  let collections = 0;
  const h = monitor({ connected: false, collect: async () => {
    collections++; return result(10);
  } });
  await settle();
  assert.equal(collections, 0);
  assert.ok(h.writes.length > 0);
  assert.equal(h.writes.at(-1).connected, false);
  assert.equal(h.writes.at(-1).runnerState, null);
});

test("Mode B06: first authorized monitor publishes loading before populated result", async () => {
  const h = monitor({ collect: async () => result(4) });
  await settle();
  assert.ok(h.writes.some(write => write.message === "Connecting to GitHub..."));
  assert.equal(h.writes.at(-1).runnerState.counts.running, 4);
  assert.equal(h.writes.at(-1).connected, true);
});

test("Mode B06: malformed refresh kind cannot cause any REST or collect work", async () => {
  let calls = 0;
  const h = monitor({ collect: async () => { calls++; return result(1); } });
  await settle();
  const before = calls;
  await h.refresh(true, "invalid");
  assert.equal(calls, before);
});

test("Mode B06: forced requests while busy coalesce into one final full refresh", async () => {
  const pending = deferred(), kinds = [];
  const h = monitor({ collect: async ({ kind }) => {
    kinds.push(kind);
    return kinds.length === 1 ? pending.promise : result(2);
  } });
  await settle();
  assert.deepEqual(kinds, ["all"]);
  await h.refresh(true, "runners");
  await h.refresh(true, "tasks");
  await h.refresh(true, "runners");
  assert.deepEqual(kinds, ["all"]);
  pending.resolve(result(1));
  await settle();
  assert.deepEqual(kinds, ["all", "all"], "mixed invalidations require a complete refresh");
  assert.equal(h.writes.at(-1).runnerState.counts.running, 2);
});

test("Mode B06: a delayed old collector cannot publish after native disconnect", async () => {
  const late = deferred();
  const h = monitor({ collect: async () => late.promise });
  await settle();
  h.listeners.get("repoticker-github-auth")({ payload: { status: "disconnected" } });
  await settle();
  const after = h.writes.length;
  late.resolve(result(900));
  await settle();
  assert.ok(!h.writes.slice(after).some(write => write.runnerState?.counts?.running === 900));
});

test("Mode B06: account scope switch discards older completed result", async () => {
  const old = deferred();
  let calls = 0;
  const h = monitor({ collect: async () => ++calls === 1 ? old.promise : result(3) });
  await settle();
  h.listeners.get("repoticker-github-scope-changed")();
  old.resolve(result(999));
  await settle();
  assert.ok(!h.writes.some(write => write.runnerState?.counts?.running === 999));
  assert.equal(h.writes.at(-1).runnerState.counts.running, 3);
});

test("Mode B06: config event invalidates old data before new API collection completes", async () => {
  let calls = 0;
  const late = deferred();
  const h = monitor({ collect: async () => {
    calls++; return calls === 1 ? result(2) : late.promise;
  } });
  await settle();
  assert.equal(h.writes.at(-1).runnerState.counts.running, 2);
  h.listeners.get("repoticker-config-changed")();
  await settle();
  assert.ok(h.writes.some(write => write.connected === false &&
    write.runnerState === null));
  late.resolve(result(8));
  await settle();
  assert.equal(h.writes.at(-1).runnerState.counts.running, 8);
});

test("Mode B06: native rate cooldown blocks even forced card and manual refresh", async () => {
  let calls = 0, clock = 100_000;
  const h = monitor({
    now: () => clock, cooldownSeconds: 60,
    collect: async () => { calls++; return {
      ...result(2), failure: "rate_limited", reason: "GitHub API rate limited."
    }; }
  });
  await settle();
  assert.equal(calls, 1);
  await h.refresh(true, "tasks");
  await h.refresh(true, "runners");
  assert.equal(calls, 1);
  clock += 60_000;
  await h.refresh(true, "tasks");
  assert.equal(calls, 2);
});

test("Mode B06: failed GitHub collection invalidates old counts instead of keeping zero", async () => {
  let calls = 0;
  const h = monitor({ collect: async () => {
    calls++;
    if (calls === 1) return result(9);
    throw Error("GitHub API permission denied.");
  } });
  await settle();
  await h.refresh(true, "tasks");
  const displayed = h.writes.at(-1);
  assert.equal(displayed.runnerState?.counts?.running, null);
  assert.equal(displayed.runnerState?.coverage?.jobs, false);
  assert.equal(displayed.runnerState?.counts?.busy, 0);
  assert.ok(!displayed.message.includes("token"));
});

test("Mode B06: notification opt-out causes no completed-run HTTP requests", async () => {
  const h = monitor({ collect: async () => result(1) });
  await settle();
  await h.refresh(true);
  assert.deepEqual(h.apiReads, []);
  assert.deepEqual(h.notifications, []);
});

test("Mode B06: opted-in CI failure tracker has silent baseline then one new alert", async () => {
  let observations = [completedRun(1, "success")];
  const h = monitor({
    selection: { ci_failure_notifications: true },
    collect: async () => result(0),
    get: async () => ({ workflow_runs: observations })
  });
  await settle();
  assert.equal(h.notifications.length, 0);
  observations = [completedRun(2, "failure"), ...observations];
  await h.refresh(true);
  assert.deepEqual(h.notifications.map(item => [item.repository, item.runId, item.runAttempt]),
    [["team/app", 2, 1]]);
  await h.refresh(true);
  assert.equal(h.notifications.length, 1);
});

test("Mode B06: a stale CI response after logout cannot emit a notification", async () => {
  const oldRead = deferred();
  let count = 0;
  const h = monitor({
    selection: { ci_failure_notifications: true },
    collect: async () => result(0),
    get: async () => {
      count++;
      return count === 1
        ? { workflow_runs: [completedRun(1, "success")] }
        : oldRead.promise;
    }
  });
  await settle();
  assert.equal(h.notifications.length, 0);
  const second = h.refresh(true);
  await settle();
  h.listeners.get("repoticker-github-auth")({ payload: { status: "disconnected" } });
  oldRead.resolve({ workflow_runs: [completedRun(2, "failure")] });
  await second;
  await settle();
  assert.equal(h.notifications.length, 0);
});
