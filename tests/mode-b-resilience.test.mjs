import test from "node:test";
import assert from "node:assert/strict";

import {
  BILLING_MIN_INTERVAL_MS, billingMonth, createBillingCache,
  collectBillingUsage, reportedActionsMinutes
} from "../apps/desktop/ui/github-billing.mjs";
import {
  collectRecentCompleted, createCiFailureTracker
} from "../apps/desktop/ui/ci-failure-events.mjs";
import {
  listAvailableInstallations
} from "../apps/desktop/ui/github-installations.mjs";
import {
  listInstalledRepositories
} from "../apps/desktop/ui/github-monitor.mjs";
import {
  createScanRefreshQueue
} from "../apps/desktop/ui/scan-refresh.mjs";
import {
  mergeMonitorPresentation, reconcileScanPresentation
} from "../apps/desktop/ui/monitor-presentation.mjs";
import {
  classifyJobLane, summarizeRunnerState
} from "../apps/desktop/ui/runner-state.mjs";
import {
  githubFailureReason, mostImportantGithubFailure, githubFailureMessage
} from "../apps/desktop/ui/github-errors.mjs";

const fixedClock = Date.parse("2026-10-31T23:59:59Z");
const usage = (quantity = 0) => ({
  usageItems: [{ sku: "actions_linux", grossQuantity: quantity }]
});

function createBillingTransport(calls, oldUsage = null) {
  return async path => {
    calls.push(path);
    if (path === "/user") return { login: "tester", plan: { name: "free" } };
    if (path.startsWith("/orgs/")) {
      return { login: path.slice("/orgs/".length), plan: { name: "team" } };
    }
    if (path.startsWith("/organizations/old/") && oldUsage) return oldUsage;
    if (path.includes("/settings/billing/")) return usage(0);
    throw Error("Unexpected synthetic GitHub route");
  };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const notificationRun = (id, conclusion, run_attempt = 1) => ({
  id, conclusion, run_attempt, updated_at: "2026-10-29T12:00:00Z"
});

test("Mode B billing: TTL-1 is cache hit and exact TTL starts a fresh read", async () => {
  // Stay inside one UTC billing month: month rollover is a separate cache key.
  let now = Date.parse("2026-10-21T12:00:00Z");
  const requests = [];
  const cache = createBillingCache({
    get: createBillingTransport(requests),
    now: () => now,
    ttlMs: BILLING_MIN_INTERVAL_MS
  });
  const first = await cache.load("team", true);
  assert.equal(first.organization.reported, 0);
  assert.equal(first.organization.remaining, null);
  assert.equal(requests.length, 4);
  now += BILLING_MIN_INTERVAL_MS - 1;
  assert.strictEqual(await cache.load("team", true), first);
  assert.equal(requests.length, 4);
  now += 1;
  const fresh = await cache.load("team", true);
  assert.notStrictEqual(fresh, first);
  assert.equal(requests.length, 8);
});

test("Mode B billing: crossing UTC month refreshes even before TTL expires", async () => {
  let now = fixedClock;
  const requests = [];
  const cache = createBillingCache({
    get: createBillingTransport(requests),
    now: () => now
  });
  const october = await cache.load("team", true);
  assert.equal(october.month, "2026-10");
  assert.equal(requests.length, 4);
  now += 2_000;
  const november = await cache.load("team", true);
  assert.equal(november.month, "2026-11");
  assert.equal(requests.length, 8);
  assert.notStrictEqual(november, october);
});

test("Mode B billing: UTC year/month boundaries are independent from local timezone", () => {
  assert.deepEqual(billingMonth(new Date("2026-12-31T23:59:59Z")),
    { year: 2026, month: 12 });
  assert.deepEqual(billingMonth(new Date("2027-01-01T00:00:00Z")),
    { year: 2027, month: 1 });
  assert.deepEqual(billingMonth(new Date("2026-11-01T00:00:00+02:00")),
    { year: 2026, month: 10 });
  assert.throws(() => billingMonth("2026-10-29"), /Invalid billing clock/);
});

test("Mode B billing: old in-flight scope cannot replace newer cached scope", async () => {
  const pendingOld = deferred();
  const requests = [];
  const cache = createBillingCache({
    get: createBillingTransport(requests, pendingOld.promise),
    now: () => fixedClock
  });
  const stale = cache.load("old", true);
  cache.clear(); // native account/scope changed while REST request was pending
  const current = await cache.load("new", true);
  assert.equal(current.organization.plan, "team");
  assert.equal(current.organization.reported, 0);
  const callsBefore = requests.length;
  pendingOld.resolve(usage(98765));
  const old = await stale;
  assert.equal(old.organization.reported, 98765);
  assert.strictEqual(await cache.load("new", true), current);
  assert.equal(requests.length, callsBefore, "late old read cannot replace new cache");
});

test("Mode B billing: disconnect invalidates even an already running read", async () => {
  const pendingOld = deferred();
  const requests = [];
  const cache = createBillingCache({
    get: createBillingTransport(requests, pendingOld.promise),
    now: () => fixedClock
  });
  const stale = cache.load("old", true);
  assert.equal(await cache.load("old", false), null);
  const current = cache.load("old", true);
  // Both generations are pending; never await either before resolving
  // the synthetic HTTP response or the test would deadlock.
  assert.equal(requests.filter(p => p.startsWith("/organizations/old/")).length, 2);
  pendingOld.resolve(usage(1));
  await Promise.all([stale, current]);
  const before = requests.length;
  await cache.load("old", true);
  assert.equal(requests.length, before, "only current generation may be cached");
});

test("Mode B billing: exact 500 usage entries are valid but 501 fail closed", () => {
  const entries = count => ({
    usageItems: Array.from({ length: count }, () =>
      ({ sku: "actions_linux", grossQuantity: 0 }))
  });
  assert.equal(reportedActionsMinutes(entries(500)), 0);
  assert.throws(() => reportedActionsMinutes(entries(501)), /projection/);
  assert.throws(() => reportedActionsMinutes({
    usageItems: [{ sku: "../other", grossQuantity: 12 }]
  }), /Incomplete/);
  assert.throws(() => reportedActionsMinutes({
    usageItems: [{ sku: "actions_linux", grossQuantity: Number.NaN }]
  }), /Incomplete/);
});

test("Mode B billing: a valid zero is not a known allowance or remaining balance", async () => {
  const result = await collectBillingUsage({
    organization: "team",
    now: new Date(fixedClock),
    get: async path => {
      if (path === "/orgs/team")
        return { login: "someone-else", plan: { name: "Team" } };
      if (path.startsWith("/organizations/")) return usage(0);
      if (path === "/user") return { login: "invalid/name" };
      throw Error("Unexpected route must not be requested");
    }
  });
  assert.equal(result.organization.reported, 0);
  assert.equal(result.organization.state, "ready");
  assert.equal(result.organization.plan, null);
  assert.equal(result.organization.included, null);
  assert.equal(result.organization.remaining, null);
  assert.equal(result.personal.state, "unavailable");
  assert.equal(result.personal.reported, null);
});

test("Mode B notification tracker: a failed repository read preserves prior baseline", () => {
  const tracker = createCiFailureTracker();
  const settings = { account: "team", repositories: ["team/a", "team/b"] };
  assert.deepEqual(tracker.observe({ ...settings, results: [
    { repository: "team/a", runs: [notificationRun(1, "success")] },
    { repository: "team/b", runs: [notificationRun(2, "success")] }
  ] }), []);
  const first = tracker.observe({ ...settings, results: [
    { repository: "team/a", runs: [notificationRun(3, "failure")] },
    { repository: "team/b", error: "unavailable" }
  ] });
  assert.deepEqual(first.map(item => [item.repository, item.id]), [["team/a", 3]]);
  const second = tracker.observe({ ...settings, results: [
    { repository: "team/a", runs: [notificationRun(3, "failure")] },
    { repository: "team/b", runs: [notificationRun(4, "failure")] }
  ] });
  assert.deepEqual(second.map(item => [item.repository, item.id]), [["team/b", 4]]);
  assert.deepEqual(tracker.observe({ ...settings, results: [
    { repository: "team/a", runs: [notificationRun(3, "failure")] },
    { repository: "team/b", runs: [notificationRun(4, "failure")] }
  ] }), []);
});

test("Mode B notification tracker: bounded history still deduplicates newest run", () => {
  const tracker = createCiFailureTracker({ maxRemembered: 200 });
  const settings = { account: "team", repositories: ["team/app"] };
  tracker.observe({ ...settings, results: [{
    repository: "team/app",
    runs: Array.from({ length: 200 }, (_, i) => notificationRun(i + 1, "success"))
  }] });
  const fresh = { repository: "team/app", runs: [
    notificationRun(201, "failure"), notificationRun(200, "success")
  ] };
  assert.deepEqual(tracker.observe({ ...settings, results: [fresh] })
    .map(x => [x.id, x.run_attempt]), [[201, 1]]);
  assert.deepEqual(tracker.observe({ ...settings, results: [fresh] }), []);
});

test("Mode B notification collector: maxPages=1 cannot fetch a second page", async () => {
  const seen = [];
  const result = await collectRecentCompleted({
    account: "team", repositories: ["team/app"], maxPages: 1,
    get: async path => {
      seen.push(path);
      return { workflow_runs: Array.from({ length: 100 }, (_, i) =>
        notificationRun(i + 1, "success")) };
    }
  });
  assert.equal(seen.length, 1);
  assert.ok(seen[0].endsWith("&page=1"));
  assert.equal(result[0].runs.length, 100);
});

test("Mode B notification collector: one denied repository does not erase other results", async () => {
  const responses = await collectRecentCompleted({
    account: "team", repositories: ["team/denied", "team/ok"],
    get: async path => {
      if (path.startsWith("/repos/team/denied/")) throw Error("synthetic 403 secret");
      return { workflow_runs: [notificationRun(44, "failure")] };
    }
  });
  assert.deepEqual(responses[0], { repository: "team/denied", error: "unavailable" });
  assert.deepEqual(responses[1].runs, [notificationRun(44, "failure")]);
  assert.equal(JSON.stringify(responses).includes("synthetic 403 secret"), false);
});

test("Mode B installations: ten full pages retain incomplete authorization evidence", async () => {
  const paths = [];
  const inventory = await listAvailableInstallations(async path => {
    paths.push(path);
    return { installations: Array.from({ length: 100 }, (_, index) => ({
      id: paths.length * 100 + index + 1,
      account: { login: "account-" + paths.length + "-" + index }
    })) };
  });
  assert.equal(paths.length, 10);
  assert.equal(inventory.items.length, 1000);
  assert.equal(inventory.complete, false);
  assert.ok(paths.at(-1).endsWith("page=10"));
});

test("Mode B installations: authorized selected repo on later page remains resolvable", async () => {
  const requests = [];
  const found = await listInstalledRepositories(async path => {
    requests.push(path);
    if (path.endsWith("page=1")) return { repositories:
      Array.from({ length: 100 }, (_, i) => ({ full_name: "Team/repo" + i })) };
    return { repositories: [{ full_name: "Team/Target" }] };
  }, "Team", 77, ["team/target"]);
  assert.deepEqual(found, { items: ["Team/Target"], complete: true });
  assert.equal(requests.length, 2);
});

test("Mode B installations: all-repos view refuses confidence at pagination ceiling", async () => {
  let pages = 0;
  const found = await listInstalledRepositories(async () => {
    pages++;
    return { repositories: Array.from({ length: 100 }, (_, index) =>
      ({ full_name: "team/repo" + String((pages - 1) * 100 + index) })) };
  }, "team", 2);
  assert.equal(pages, 10);
  assert.equal(found.items.length, 100);
  assert.equal(found.complete, false);
});

test("Mode B presentation: provider fields cannot overwrite local Git data", () => {
  const local = {
    roots: ["/synthetic"], repositories: [{ name: "kept-local" }],
    connected: false, runner_state: null, monitor_message: null
  };
  const remote = {
    connected: true, runner_state: { coverage: { jobs: false } },
    monitor_message: "Checking GitHub connection...",
    roots: ["INJECTED-REMOTE-ROOT"],
    repositories: [{ name: "INJECTED-REMOTE-REPO" }],
    accessToken: "NOT-A-REAL-TOKEN"
  };
  const result = mergeMonitorPresentation(local, remote);
  assert.strictEqual(result.roots, local.roots);
  assert.strictEqual(result.repositories, local.repositories);
  assert.equal(result.connected, true);
  assert.strictEqual(result.runner_state, remote.runner_state);
  assert.equal(Object.hasOwn(result, "accessToken"), false);
  assert.strictEqual(local.connected, false);
});

test("Mode B presentation: stale Git scan changes rows, never newer monitor state", () => {
  const current = {
    repositories: [{ name: "before" }], connected: true,
    runner_state: { coverage: { jobs: true }, counts: { running: 0 } },
    monitor_message: null
  };
  const oldScan = {
    ...current, repositories: [{ name: "after" }],
    connected: false, runner_state: null, monitor_message: "stale"
  };
  const next = reconcileScanPresentation(oldScan, current, 2, 3);
  assert.strictEqual(next.repositories, oldScan.repositories);
  assert.strictEqual(next.runner_state, current.runner_state);
  assert.equal(next.connected, true);
  assert.equal(next.monitor_message, null);
  assert.strictEqual(reconcileScanPresentation(oldScan, current, 3, 3), oldScan);
});

test("Mode B scan queue: one hundred overlapping invalidations require one final read", async () => {
  const first = deferred();
  const second = deferred();
  let calls = 0;
  const published = [];
  const busy = [];
  const refresh = createScanRefreshQueue({
    scan: () => ++calls === 1 ? first.promise : second.promise,
    publish: value => published.push(value),
    onError: error => { throw error; },
    onBusyChange: value => busy.push(value)
  });
  const active = refresh();
  const concurrent = Array.from({ length: 100 }, () => refresh());
  assert.ok(concurrent.every(promise => promise === active));
  first.resolve("superseded");
  await Promise.resolve();
  second.resolve("latest");
  await active;
  assert.equal(calls, 2);
  assert.deepEqual(published, ["latest"]);
  assert.deepEqual(busy, [true, false]);
});

test("Mode B runner coverage: observed empty is zero; unobserved empty is unknown", () => {
  const complete = summarizeRunnerState({
    runners: [], jobs: [], runnerCoverage: true, jobCoverage: true
  });
  assert.equal(complete.coverage.runners, true);
  assert.equal(complete.coverage.jobs, true);
  for (const key of ["busy", "idle", "offline", "running", "queued", "waiting"]) {
    assert.equal(complete.counts[key], 0);
  }
  const unknown = summarizeRunnerState({
    runners: [], jobs: [], runnerCoverage: false, jobCoverage: false
  });
  assert.equal(unknown.coverage.runners, false);
  assert.equal(unknown.coverage.jobs, false);
  for (const key of ["busy", "idle", "offline", "running", "queued", "waiting"]) {
    assert.equal(unknown.counts[key], null);
  }
});

test("Mode B runner classification: unknown capacity is never invented from labels", () => {
  assert.equal(classifyJobLane({ labels: ["ubuntu-latest"] }), "githubHosted");
  assert.equal(classifyJobLane({ labels: ["self-hosted", "linux"] }), "selfHosted");
  assert.equal(classifyJobLane({ labels: ["GPU-custom"] }), "unknown");
  assert.equal(classifyJobLane({ labels: [] }), "unknown");
  assert.equal(classifyJobLane(null), "unknown");
});

test("Mode B GitHub failures: arbitrary provider details cannot override finite reason", () => {
  assert.equal(githubFailureReason("GitHub API rate limited."), "rate_limited");
  assert.equal(githubFailureReason("GitHub API rate limited. token=fake"), "unavailable");
  assert.equal(githubFailureReason({ message: "GitHub API authorization expired or revoked." }),
    "unavailable");
  assert.equal(mostImportantGithubFailure([
    { scope: "jobs", reason: "permission_denied" },
    { scope: "runner", reason: "rate_limited" },
    { scope: "auth", reason: "unauthorized" }
  ]), "unauthorized");
  assert.equal(githubFailureMessage("undefined-personal-state"),
    "GitHub Actions data unavailable.");
});
