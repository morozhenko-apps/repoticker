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
