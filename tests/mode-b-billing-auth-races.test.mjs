import test from "node:test";
import assert from "node:assert/strict";
import {
  BILLING_MIN_INTERVAL_MS, billingMonth, createBillingCache,
  collectBillingUsage, reportedActionsMinutes
} from "../apps/desktop/ui/github-billing.mjs";
import {
  createCiFailureTracker, collectRecentCompleted
} from "../apps/desktop/ui/ci-failure-events.mjs";

const october = Date.parse("2026-10-21T12:00:00Z");
const summary = grossQuantity => ({
  usageItems: [{ sku: "actions_linux", grossQuantity }]
});
function pending() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function billingGateway(blocked = new Map()) {
  const calls = [];
  const get = async path => {
    calls.push(path);
    if (path === "/user") return { login: "synthetic", plan: { name: "free" } };
    if (path.startsWith("/users/")) return summary(1);
    if (path.startsWith("/orgs/")) {
      const login = path.slice("/orgs/".length);
      return { login, plan: { name: "team" } };
    }
    const match = /^\/organizations\/([^/]+)\/settings\/billing\//.exec(path);
    if (match) return blocked.get(match[1])?.promise ?? summary(match[1] === "old" ? 5 : 9);
    throw Error("Unexpected synthetic billing path");
  };
  return { get, calls };
}
const run = (id, conclusion, run_attempt = 1) =>
  ({ id, conclusion, run_attempt, updated_at: "2026-10-29T12:00:00Z" });
const scope = { account: "team", repositories: ["team/a", "team/b"] };
const observe = (tracker, a, b, override = scope) =>
  tracker.observe({ ...override, results: [
    { repository: override.repositories[0], runs: a },
    { repository: override.repositories[1], runs: b }
  ] });

test("Mode B05: late old-account result cannot overwrite current account without explicit clear", async () => {
  const old = pending();
  const gateway = billingGateway(new Map([["old", old]]));
  const cache = createBillingCache({ get: gateway.get, now: () => october });
  const first = cache.load("old", true);
  const second = await cache.load("new", true);
  assert.equal(second.organization.reported, 9);
  old.resolve(summary(5));
  assert.equal((await first).organization.reported, 5);
  assert.strictEqual(await cache.load("new", true), second);
  assert.equal(gateway.calls.length, 8, "stale old response cannot force a new read");
});

test("Mode B05: completing new account first cannot resurrect older cached scope", async () => {
  const a = pending(), b = pending();
  const gateway = billingGateway(new Map([["first", a], ["second", b]]));
  const cache = createBillingCache({ get: gateway.get, now: () => october });
  const old = cache.load("first", true);
  const current = cache.load("second", true);
  b.resolve(summary(22));
  const latest = await current;
  a.resolve(summary(11));
  await old;
  assert.strictEqual(await cache.load("second", true), latest);
  assert.equal(latest.organization.reported, 22);
  assert.equal(gateway.calls.length, 8);
});

test("Mode B05: returning to a prior key starts a new generation, not its old pending read", async () => {
  const a = pending();
  let aReads = 0;
  const gateway = billingGateway();
  const get = async path => {
    if (path.startsWith("/organizations/a/")) {
      aReads++;
      return aReads === 1 ? a.promise : summary(33);
    }
    return gateway.get(path);
  };
  const cache = createBillingCache({ get, now: () => october });
  const firstA = cache.load("a", true);
  await cache.load("b", true);
  const newA = await cache.load("a", true);
  assert.equal(newA.organization.reported, 33);
  a.resolve(summary(99));
  await firstA;
  assert.strictEqual(await cache.load("a", true), newA);
  assert.equal(aReads, 2);
});

test("Mode B05: same-scope parallel reads coalesce to one four-request snapshot", async () => {
  const delay = pending();
  const gateway = billingGateway(new Map([["team", delay]]));
  const cache = createBillingCache({ get: gateway.get, now: () => october });
  const a = cache.load("team", true), b = cache.load("team", true);
  delay.resolve(summary(7));
  const [one, two] = await Promise.all([a, b]);
  assert.strictEqual(one, two);
  assert.equal(gateway.calls.length, 4);
  assert.strictEqual(await cache.load("team", true), one);
});

test("Mode B05: explicit clear stops an earlier generation from replacing active cache", async () => {
  const old = pending();
  let oldReads = 0;
  const gateway = billingGateway();
  const get = async path => {
    if (path.startsWith("/organizations/team/")) {
      oldReads++;
      return oldReads === 1 ? old.promise : summary(41);
    }
    return gateway.get(path);
  };
  const cache = createBillingCache({ get, now: () => october });
  const first = cache.load("team", true);
  cache.clear();
  const current = await cache.load("team", true);
  old.resolve(summary(5));
  await first;
  assert.strictEqual(await cache.load("team", true), current);
  assert.equal(current.organization.reported, 41);
  assert.equal(oldReads, 2);
});

test("Mode B05: disconnect invalidates pending and saved results", async () => {
  const old = pending();
  const gateway = billingGateway(new Map([["team", old]]));
  const cache = createBillingCache({ get: gateway.get, now: () => october });
  const first = cache.load("team", true);
  assert.equal(await cache.load("team", false), null);
  old.resolve(summary(5));
  await first;
  gateway.calls.length = 0;
  const next = await cache.load("team", true);
  assert.equal(next.organization.reported, 5);
  assert.equal(gateway.calls.length, 4);
});

test("Mode B05: pending previous UTC month cannot replace current-month cache", async () => {
  let now = Date.parse("2026-10-31T23:59:59Z");
  const old = pending();
  const requests = [];
  const get = async path => {
    requests.push(path);
    if (path.includes("/organizations/team/") && path.includes("month=10"))
      return old.promise;
    if (path === "/user") return { login: "synthetic", plan: { name: "free" } };
    if (path.startsWith("/orgs/")) return { login: "team", plan: { name: "team" } };
    return summary(7);
  };
  const cache = createBillingCache({ get, now: () => now });
  const octoberRead = cache.load("team", true);
  now += 2000;
  const november = await cache.load("team", true);
  assert.equal(november.month, "2026-11");
  old.resolve(summary(45));
  await octoberRead;
  assert.strictEqual(await cache.load("team", true), november);
  assert.equal(requests.length, 8);
});

test("Mode B05: backwards clock jump does not extend cache freshness", async () => {
  let clock = october;
  const gateway = billingGateway();
  const cache = createBillingCache({ get: gateway.get, now: () => clock });
  await cache.load("team", true);
  clock -= 60_000;
  await cache.load("team", true);
  assert.equal(gateway.calls.length, 8);
});

test("Mode B05: exact TTL is expired, one millisecond before TTL is still fresh", async () => {
  let clock = october;
  const gateway = billingGateway();
  const cache = createBillingCache({
    get: gateway.get, now: () => clock, ttlMs: BILLING_MIN_INTERVAL_MS
  });
  const first = await cache.load("team", true);
  clock += BILLING_MIN_INTERVAL_MS - 1;
  assert.strictEqual(await cache.load("team", true), first);
  clock++;
  assert.notStrictEqual(await cache.load("team", true), first);
  assert.equal(gateway.calls.length, 8);
});

test("Mode B05: failed organization usage remains unknown, not a fictional zero", async () => {
  const result = await collectBillingUsage({
    organization: "team", now: new Date(october),
    get: async path => {
      if (path === "/user") return { login: "synthetic", plan: { name: "free" } };
      if (path.startsWith("/users/")) return summary(0);
      if (path.startsWith("/orgs/")) return { login: "team", plan: { name: "team" } };
      throw Error("403 synthetic");
    }
  });
  assert.equal(result.organization.plan, "team");
  assert.equal(result.organization.included, 3000);
  assert.equal(result.organization.reported, null);
  assert.equal(result.organization.remaining, null);
  assert.equal(result.personal.reported, 0);
});

test("Mode B05: organization path injection is rejected before requesting that route", async () => {
  const paths = [];
  const result = await collectBillingUsage({
    organization: "../fake", now: new Date(october),
    get: async path => {
      paths.push(path);
      return path === "/user" ? { login: "synthetic" } : summary(0);
    }
  });
  assert.equal(result.organization.state, "unavailable");
  assert.equal(result.organization.reported, null);
  assert.ok(paths.every(path => !path.startsWith("/orgs/") &&
    !path.startsWith("/organizations/")));
});

test("Mode B05: partial plan and usage success do not imply remaining allowance", async () => {
  const result = await collectBillingUsage({
    organization: "team", now: new Date(october),
    get: async path => {
      if (path === "/user") return { login: "synthetic", plan: { name: "unknown" } };
      if (path.startsWith("/users/")) return summary(9);
      if (path.startsWith("/orgs/")) throw Error("Plan denied");
      return summary(3);
    }
  });
  assert.equal(result.organization.plan, null);
  assert.equal(result.organization.reported, 3);
  assert.equal(result.organization.included, null);
  assert.equal(result.organization.remaining, null);
  assert.equal(result.personal.included, null);
});

test("Mode B05: usage projection refuses invalid entries without rounding to zero", () => {
  assert.equal(reportedActionsMinutes(summary(0)), 0);
  assert.equal(reportedActionsMinutes(summary(2.25)), 2.25);
  for (const invalid of [null, -0.1, "1", Infinity, NaN, 2 ** 53]) {
    assert.throws(() => reportedActionsMinutes({
      usageItems: [{ sku: "actions_linux", grossQuantity: invalid }]
    }));
  }
});

test("Mode B05: baseline failed observations are silent, later new failure alerts once", () => {
  const tracker = createCiFailureTracker();
  assert.deepEqual(observe(tracker, [run(1,"failure")], []), []);
  assert.deepEqual(observe(tracker, [run(1,"failure"),run(2,"failure")], [])
    .map(x=>x.id), [2]);
  assert.deepEqual(observe(tracker, [run(2,"failure")], []), []);
});

test("Mode B05: separate run attempts notify separately while repeat observations dedup", () => {
  const tracker = createCiFailureTracker();
  observe(tracker, [run(1,"success")], []);
  assert.deepEqual(observe(tracker, [run(1,"failure",1)], [])
    .map(x=>[x.id,x.run_attempt]), [[1,1]]);
  assert.deepEqual(observe(tracker, [run(1,"failure",2)], [])
    .map(x=>[x.id,x.run_attempt]), [[1,2]]);
  assert.deepEqual(observe(tracker, [run(1,"failure",2)], []), []);
});

test("Mode B05: permission error does not erase a repository's established baseline", () => {
  const tracker = createCiFailureTracker();
  observe(tracker, [run(1,"success")], []);
  tracker.observe({ ...scope, results: [
    { repository: "team/a", error: "unavailable" },
    { repository: "team/b", runs: [] }
  ] });
  const alerts = observe(tracker, [run(2,"failure")], []);
  assert.deepEqual(alerts.map(x=>x.id), [2]);
});

test("Mode B05: account case and reordered repositories preserve notification history", () => {
  const tracker = createCiFailureTracker();
  observe(tracker, [run(1,"success")], []);
  const changed = {
    account: "TEAM", repositories: ["TEAM/B","TEAM/A"]
  };
  const alerts = tracker.observe({ ...changed, results: [
    { repository:"TEAM/B",runs:[] },
    { repository:"TEAM/A",runs:[run(2,"failure")] }
  ] });
  assert.deepEqual(alerts.map(x=>x.id), [2]);
});

test("Mode B05: switching to another account creates a fresh silent baseline", () => {
  const tracker = createCiFailureTracker();
  observe(tracker, [run(1,"success")], []);
  const newScope = { account:"other",repositories:["other/a","other/b"] };
  const alerts = tracker.observe({ ...newScope, results:[
    { repository:"other/a",runs:[run(9,"failure")] },
    { repository:"other/b",runs:[] }
  ] });
  assert.deepEqual(alerts, []);
});

test("Mode B05: invalid second notification item cannot partially update first history", () => {
  const tracker = createCiFailureTracker();
  observe(tracker,[run(1,"success")],[]);
  assert.throws(() => tracker.observe({ ...scope, results: [
    { repository:"team/a",runs:[run(2,"failure")] },
    { repository:"team/b",runs:[run(3,"failure",0)] }
  ]}), /Invalid notification run facts/);
  assert.deepEqual(observe(tracker,[run(2,"failure")],[]).map(x=>x.id),[2]);
});

test("Mode B05: duplicate attempt within one observation is rejected without mutation", () => {
  const tracker = createCiFailureTracker();
  observe(tracker,[],[]);
  assert.throws(() => tracker.observe({ ...scope, results:[
    { repository:"team/a",runs:[run(2,"failure"),run(2,"failure")] },
    { repository:"team/b",runs:[] }
  ]}), /Invalid notification run facts/);
  assert.deepEqual(observe(tracker,[run(2,"failure")],[]).map(x=>x.id),[2]);
});

test("Mode B05: completed-run collector does not leak provider error or poison good repo", async () => {
  const observed = [];
  const result = await collectRecentCompleted({
    account:"team",repositories:["team/a","team/b"],get:async path=>{
      observed.push(path);
      if (path.startsWith("/repos/team/a/")) throw Error("Bearer SECRET-FIXTURE");
      return { workflow_runs:[run(2,"failure")] };
    }
  });
  assert.deepEqual(result[0],{repository:"team/a",error:"unavailable"});
  assert.equal(result[1].runs[0].id,2);
  assert.equal(observed.length,2);
  assert.ok(!JSON.stringify(result).includes("SECRET-FIXTURE"));
});

test("Mode B05: malformed CI scopes refuse all HTTP reads", async () => {
  let requests = 0;
  for (const repos of [["team/.."],["team/a","TEAM/A"],["other/x"],[]]) {
    await assert.rejects(collectRecentCompleted({
      get:async()=>{requests++;return {workflow_runs:[]}},
      account:"team",repositories:repos
    }));
  }
  assert.equal(requests,0);
});
