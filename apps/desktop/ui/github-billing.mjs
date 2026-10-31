/** Read-only GitHub Actions billing reports, deliberately separate from job counts.
 * Native github_api_get owns the HTTPS bearer token and response redaction.
 * These quantities are reported per billing SKU, NOT free-allowance consumption.
 */
const NAME = /^[a-zA-Z0-9_.-]{1,100}$/;
export const BILLING_MIN_INTERVAL_MS = 10 * 60_000;

export function billingMonth(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
    throw Error("Invalid billing clock");
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function knownPersonalAllowance(plan) {
  switch (typeof plan === "string" ? plan.toLowerCase() : "") {
    case "free": return 2000;
    case "pro": return 3000;
    default: return null;
  }
}

/** Only direct organization plans with unambiguous published hosted allowances.
 * Enterprise entitlements may be billed at enterprise scope, never guessed here.
 */
export function knownOrganizationAllowance(plan) {
  switch (typeof plan === "string" ? plan.toLowerCase() : "") {
    case "free": return 2000;
    case "team": return 3000;
    default: return null;
  }
}

export function reportedActionsMinutes(payload) {
  if (!payload || !Array.isArray(payload.usageItems) || payload.usageItems.length > 500)
    throw Error("Invalid GitHub billing projection");
  let total = 0;
  for (const item of payload.usageItems) {
    if (!item || !NAME.test(item.sku) ||
        typeof item.grossQuantity !== "number" ||
        !Number.isFinite(item.grossQuantity) || item.grossQuantity < 0)
      throw Error("Incomplete GitHub Actions usage");
    total += item.grossQuantity;
    if (!Number.isSafeInteger(Math.ceil(total)))
      throw Error("Actions usage exceeds safe numeric range");
  }
  return total;
}

const unavailable = reason => ({
  state: "unavailable", plan: null, included: null, reported: null,
  remaining: null, reason,
});

export async function collectBillingUsage({ get, organization, now = new Date() }) {
  if (typeof get !== "function") throw Error("Missing native billing transport");
  const { year, month } = billingMonth(now);
  const suffix = "?year=" + year + "&month=" + month;
  const monthLabel = String(year) + "-" + String(month).padStart(2, "0");

  async function fetchOrganization() {
    if (typeof organization !== "string" || !NAME.test(organization))
      return unavailable("Choose a monitored organization in Settings.");
    // Plan and usage have separate permission/reliability boundaries.
    // A partial failure must never erase the other successful resource.
    const [planResult, usageResult] = await Promise.allSettled([
      get("/orgs/" + organization),
      get("/organizations/" + organization +
        "/settings/billing/usage/summary" + suffix),
    ]);
    const rawPlan = planResult.status === "fulfilled" &&
      planResult.value?.login?.toLowerCase() === organization.toLowerCase()
      ? planResult.value?.plan?.name : null;
    const plan = typeof rawPlan === "string" && rawPlan.length <= 40
      ? rawPlan : null;
    let reported = null;
    if (usageResult.status === "fulfilled") {
      try { reported = reportedActionsMinutes(usageResult.value); }
      catch { /* A malformed report stays unknown. */ }
    }
    const ready = reported !== null || knownOrganizationAllowance(plan) !== null;
    const reason = reported === null
      ? "Organization usage unavailable; check admin access or API support."
      : plan === null
        ? "Organization plan unavailable; free allowance is unknown."
        : "Billing SKU minutes do not prove free-minute consumption.";
    return { state: ready ? "ready" : "unavailable",
      plan, included: knownOrganizationAllowance(plan),
      reported, remaining: null, reason };
  }

  async function fetchPersonal() {
    let account;
    try {
      account = await get("/user");
    } catch {
      return unavailable("GitHub account identity unavailable; reconnect after approval.");
    }
    if (!NAME.test(account?.login))
      return unavailable("GitHub account identity unavailable.");
    const plan = typeof account?.plan?.name === "string" &&
      account.plan.name.length <= 40 ? account.plan.name : null;
    try {
      const projection = await get("/users/" + account.login +
        "/settings/billing/usage/summary" + suffix);
      return { state: "ready", plan, included: knownPersonalAllowance(plan),
        reported: reportedActionsMinutes(projection), remaining: null,
        reason: "Billing SKU minutes do not prove free-minute consumption." };
    } catch {
      return { ...unavailable("Personal billing unavailable; reauthorize Plan: read."),
        plan, included: knownPersonalAllowance(plan) };
    }
  }

  const [org, personal] = await Promise.all([fetchOrganization(), fetchPersonal()]);
  return { month: monthLabel, organization: org, personal };
}

/** Deduplicate all mouse-hover updates and isolate account switches.
 * A failed read also backs off; reconnect/explicit scope changes invalidate.
 */
export function createBillingCache({ get, now = () => Date.now(),
  ttlMs = BILLING_MIN_INTERVAL_MS } = {}) {
  if (typeof get !== "function" || typeof now !== "function" ||
      !Number.isSafeInteger(ttlMs) || ttlMs < 60_000)
    throw Error("Invalid billing refresh contract");
  let saved = null;
  let generation = 0;
  let pending = null;
  let activeKey = null;
  function clear() {
    generation++;
    activeKey = null;
    saved = null;
    pending = null;
  }
  async function load(organization, connected) {
    if (!connected) {
      clear();
      return null;
    }
    const scope = typeof organization === "string" ? organization : "";
    const month = billingMonth(new Date(now()));
    const key = scope.toLowerCase() + "/" + month.year + "-" + month.month;
    // A connected account/month change is an authorization and reporting
    // boundary even if the caller forgot to explicitly clear its popup.
    // A late response can resolve to its original caller, never to this key.
    if (activeKey !== key) {
      generation++;
      activeKey = key;
      saved = null;
      pending = null;
    }
    const started = now();
    // A backwards wall-clock jump cannot make an old result fresh forever.
    if (saved?.key === key && started >= saved.at &&
        started - saved.at < ttlMs) return saved.value;
    if (pending?.key === key) return pending.promise;
    const current = generation;
    const promise = collectBillingUsage({ get, organization: scope,
      now: new Date(started) }).then(value => {
      if (current === generation) saved = { key, at: started, value };
      return value;
    }, () => {
      const fallback = null;
      if (current === generation) saved = { key, at: started, value: fallback };
      return fallback;
    }).finally(() => {
      if (pending?.promise === promise) pending = null;
    });
    pending = { key, promise };
    return promise;
  }
  return { load, clear };
}
