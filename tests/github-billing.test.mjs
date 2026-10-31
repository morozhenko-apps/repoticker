import test from "node:test";
import assert from "node:assert/strict";
import {
  billingMonth, knownPersonalAllowance, knownOrganizationAllowance, reportedActionsMinutes,
  collectBillingUsage, createBillingCache, BILLING_MIN_INTERVAL_MS
} from "../apps/desktop/ui/github-billing.mjs";

const date = new Date("2026-10-21T17:00:00Z");
const summary = (...quantities) => ({ usageItems: quantities.map((n, i) =>
  ({ sku: i ? "actions_windows" : "actions_linux", grossQuantity: n })) });

test("billing requests use fixed owner paths and month, never legacy Actions billing", async () => {
  const paths = [];
  const get = async path => {
    paths.push(path);
    if (path === "/user") return { login: "rudev", plan: { name: "pro" } };
    if (path === "/orgs/morozhenko-apps") return { login: "morozhenko-apps", plan: { name: "team" } };
    if (path.includes("/organizations/")) return summary(123);
    if (path.includes("/users/")) return summary(40, 5);
    throw Error("Unexpected path");
  };
  const result = await collectBillingUsage({ get, organization: "morozhenko-apps", now: date });
  assert.deepEqual(paths.sort(), [
    "/organizations/morozhenko-apps/settings/billing/usage/summary?year=2026&month=10",
    "/orgs/morozhenko-apps",
    "/user",
    "/users/rudev/settings/billing/usage/summary?year=2026&month=10",
  ].sort());
  assert.equal(result.organization.reported, 123);
  assert.equal(result.organization.included, 3000);
  assert.equal(result.organization.plan, "team");
  assert.equal(result.personal.plan, "pro");
  assert.equal(result.personal.included, 3000);
  assert.equal(result.personal.reported, 45);
  assert.equal(result.organization.remaining, null);
  assert.equal(result.personal.remaining, null);
  assert.equal(result.month, "2026-10");
  assert.equal(BILLING_MIN_INTERVAL_MS, 600000);
});

test("only recognized direct-owner plans provide documented included allowances", () => {
  assert.equal(knownOrganizationAllowance("free"), 2000);
  assert.equal(knownOrganizationAllowance("Team"), 3000);
  assert.equal(knownOrganizationAllowance("enterprise"), null);
  assert.equal(knownOrganizationAllowance(null), null);
  assert.equal(knownPersonalAllowance("free"), 2000);
  assert.equal(knownPersonalAllowance("Pro"), 3000);
  assert.equal(knownPersonalAllowance("team"), null);
  assert.equal(knownPersonalAllowance("enterprise"), null);
  assert.equal(knownPersonalAllowance(null), null);
  assert.deepEqual(billingMonth(date), { year: 2026, month: 10 });
  assert.throws(() => billingMonth(new Date(Number.NaN)), /clock/);
});

test("strict billing projections reject malformed, negative and enormous minutes", () => {
  assert.equal(reportedActionsMinutes(summary()), 0);
  assert.equal(reportedActionsMinutes(summary(5, 2.5)), 7.5);
  for (const bad of [null, {}, { usageItems: [{}] },
    { usageItems: [{ sku: "actions_linux", grossQuantity: -1 }] },
    { usageItems: [{ sku: "actions_linux", grossQuantity: "5" }] },
    { usageItems: [{ sku: "actions_linux", grossQuantity: Number.POSITIVE_INFINITY }] },
    { usageItems: [{ sku: "actions_linux", grossQuantity: 2 ** 53 }] }]) {
    assert.throws(() => reportedActionsMinutes(bad));
  }
});

test("organization admin rejection is isolated from personal plan and billing", async () => {
  const result = await collectBillingUsage({
    get: async path => {
      if (path === "/user") return { login: "rudev", plan: { name: "free" } };
      if (path.startsWith("/organizations/")) throw Error("403");
      if (path.startsWith("/users/")) return summary(28);
      throw Error("unexpected path");
    },
    organization: "team", now: date,
  });
  assert.equal(result.organization.state, "unavailable");
  assert.equal(result.organization.reported, null);
  assert.equal(result.personal.state, "ready");
  assert.equal(result.personal.included, 2000);
  assert.equal(result.personal.reported, 28);
  assert.equal(result.personal.remaining, null);
});

test("malformed personal usage is unavailable even when org billing succeeds", async () => {
  const result = await collectBillingUsage({
    get: async path => path === "/user"
      ? { login: "rudev", plan: { name: "free" } }
      : path.startsWith("/organizations/") ? summary(10)
      : { usageItems: [{ sku: "actions_linux", grossQuantity: "secret" }] },
    organization: "team", now: date,
  });
  assert.equal(result.organization.reported, 10);
  assert.equal(result.personal.state, "unavailable");
  assert.equal(result.personal.reported, null);
});

test("unsupported owner, missing identity and unknown plans fail closed", async () => {
  const seen = [];
  const result = await collectBillingUsage({
    get: async path => {
      seen.push(path);
      if (path === "/user") return { login: "rudev", plan: { name: "legacy" } };
      return summary(11);
    }, organization: "../bad", now: date,
  });
  assert.equal(result.organization.state, "unavailable");
  assert.ok(!seen.some(path => path.includes("/organizations/")));
  assert.equal(result.personal.included, null);
  assert.equal(result.personal.reported, 11);
  assert.equal(result.personal.remaining, null);
  const denied = await collectBillingUsage({
    get: async path => {
      if (path === "/user") throw Error("not authorized");
      return summary(12);
    }, organization: "team", now: date,
  });
  assert.equal(denied.organization.reported, 12);
  assert.equal(denied.personal.reported, null);
});

test("recognized organization plan remains visible if Actions billing is denied", async () => {
  const result = await collectBillingUsage({
    get: async path => {
      if (path === "/orgs/team") return { login: "team", plan: { name: "free" } };
      if (path.startsWith("/organizations/")) throw Error("403 missing admin approval");
      if (path === "/user") return { login: "rudev", plan: { name: "free" } };
      if (path.startsWith("/users/")) return summary(5);
      throw Error("unexpected path");
    },
    organization: "team", now: date,
  });
  assert.equal(result.organization.plan, "free");
  assert.equal(result.organization.included, 2000);
  assert.equal(result.organization.reported, null);
  assert.equal(result.organization.remaining, null);
  assert.equal(result.personal.reported, 5);
});

test("organization plan denial does not erase available usage and never infers plan", async () => {
  const result = await collectBillingUsage({
    get: async path => {
      if (path === "/orgs/team") throw Error("Plan permission missing");
      if (path.startsWith("/organizations/")) return summary(40);
      if (path === "/user") return { login: "rudev", plan: { name: "free" } };
      if (path.startsWith("/users/")) return summary();
      throw Error("unexpected path");
    },
    organization: "team", now: date,
  });
  assert.equal(result.organization.reported, 40);
  assert.equal(result.organization.included, null);
  assert.equal(result.organization.plan, null);
  assert.equal(result.organization.remaining, null);
});

test("billing cache coalesces concurrent reads, throttles hover and invalidates on scope/disconnect", async () => {
  let clock = Date.parse("2026-10-21T17:00:00Z");
  let requests = 0;
  const get = async path => {
    requests++;
    return path === "/user" ? { login: "rudev", plan: { name: "free" } } : summary(4);
  };
  const cache = createBillingCache({ get, now: () => clock });
  const [a, b] = await Promise.all([cache.load("team", true), cache.load("team", true)]);
  assert.deepEqual(a, b);
  assert.equal(requests, 4);
  await cache.load("team", true);
  assert.equal(requests, 4);
  clock += BILLING_MIN_INTERVAL_MS + 1;
  await cache.load("team", true);
  assert.equal(requests, 8);
  await cache.load("another-team", true);
  assert.equal(requests, 12);
  assert.equal(await cache.load("team", false), null);
  await cache.load("team", true);
  assert.equal(requests, 16);
  clock = Date.parse("2026-11-01T00:01:00Z");
  await cache.load("team", true);
  assert.equal(requests, 20);
});

test("source contracts keep billing route exact, native-projected and token-free", async () => {
  const fs = await import("node:fs");
  const native = fs.readFileSync(new URL("../apps/desktop/src-tauri/src/github_api.rs", import.meta.url), "utf8");
  const controller = fs.readFileSync(new URL("../apps/desktop/ui/quota.mjs", import.meta.url), "utf8");
  assert.match(native, /fn project_billing/);
  assert.match(native, /"usageItems"/);
  assert.match(native, /"year"/);
  assert.match(native, /"month"/);
  assert.match(controller, /createBillingCache/);
  assert.match(controller, /scheduleBilling/);
  assert.doesNotMatch(controller, /accessToken|refreshToken|deviceCode|localStorage/);
});


test("Mode B: billing UTC month boundaries never use local offset or invent remaining", async () => {
  for (const [timestamp, year, month] of [
    ["2026-12-31T23:59:59Z", 2026, 12],
    ["2027-01-01T00:00:00Z", 2027, 1],
    ["2027-01-01T00:30:00+02:00", 2026, 12],
    ["2026-10-31T23:30:00-02:00", 2026, 11],
  ]) {
    const result = billingMonth(new Date(timestamp));
    assert.deepEqual(result, { year, month }, timestamp);
  }
});

test("Mode B: usage length, SKU, quantity and accumulated safe-number boundaries", () => {
  const valid = { sku: "actions_linux", grossQuantity: 1 };
  const items = count => ({ usageItems: Array.from({ length: count }, () => ({ ...valid })) });
  for (const size of [0, 1, 499, 500])
    assert.equal(reportedActionsMinutes(items(size)), size);
  assert.throws(() => reportedActionsMinutes(items(501)), /Invalid GitHub billing projection/);
  for (const bad of [
    { sku: "", grossQuantity: 1 },
    { sku: "../private", grossQuantity: 1 },
    { sku: "x".repeat(101), grossQuantity: 1 },
    { sku: "actions_linux", grossQuantity: NaN },
    { sku: "actions_linux", grossQuantity: -0.001 },
    { sku: "actions_linux", grossQuantity: 2 ** 53 },
    { sku: "actions_linux", grossQuantity: null },
  ]) {
    assert.throws(() => reportedActionsMinutes({ usageItems: [bad] }));
  }
  assert.equal(reportedActionsMinutes(summary(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
  assert.throws(() => reportedActionsMinutes(summary(Number.MAX_SAFE_INTEGER, 1)), /safe numeric range/);
});

test("Mode B: an old in-flight organization read cannot poison new scope cache", async () => {
  let resolveOld;
  const calls = [];
  const get = async path => {
    calls.push(path);
    if (path === "/orgs/old")
      return new Promise(resolve => { resolveOld = resolve; });
    if (path === "/user") return { login: "testuser", plan: { name: "free" } };
    if (path === "/orgs/new") return { login: "new", plan: { name: "team" } };
    return summary(2);
  };
  const cache = createBillingCache({
    get, now: () => Date.parse("2026-10-21T17:00:00Z"),
  });
  const old = cache.load("old", true);
  const newer = await cache.load("new", true);
  assert.equal(newer.organization.plan, "team");
  assert.equal(newer.organization.reported, 2);
  resolveOld({ login: "old", plan: { name: "free" } });
  const previous = await old;
  assert.equal(previous.organization.plan, "free");
  const before = calls.length;
  assert.deepEqual(await cache.load("new", true), newer);
  assert.equal(calls.length, before, "old completion must not evict new cache entry");
});

test("Mode B: billing cache refreshes at TTL boundary and after clock reversal", async () => {
  let clock = Date.parse("2026-10-21T17:00:00Z");
  let count = 0;
  const cache = createBillingCache({
    now: () => clock, ttlMs: 60_000,
    get: async path => {
      count++;
      return path === "/user"
        ? { login: "testuser", plan: { name: "free" } }
        : path === "/orgs/team"
          ? { login: "team", plan: { name: "team" } }
          : summary(1);
    }
  });
  await cache.load("team", true);
  assert.equal(count, 4);
  clock += 59_999;
  await cache.load("team", true);
  assert.equal(count, 4);
  clock += 1;
  await cache.load("team", true);
  assert.equal(count, 8);
  clock -= 300_000;
  await cache.load("team", true);
  assert.equal(count, 12);
  assert.equal(await cache.load("team", false), null);
  await cache.load("team", true);
  assert.equal(count, 16);
});
