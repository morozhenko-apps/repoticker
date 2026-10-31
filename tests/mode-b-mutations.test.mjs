// Executable Mode B mutation review for pure production modules.
// These tests do not mock the subject: source mutants are imported as
// real ESM modules. Only external GitHub I/O and the clock are injected.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function mustKill(file, originalText, mutantText, verify) {
  const url = new URL("../apps/desktop/ui/" + file, import.meta.url);
  const source = readFileSync(url, "utf8");
  assert.equal(source.split(originalText).length - 1, 1,
    "mutation anchor must match one exact production branch: " + file);
  const normal = await import(url.href);
  await verify(normal);
  const mutated = source.replace(originalText, mutantText);
  const mutantURL = "data:text/javascript;base64," +
    Buffer.from(mutated, "utf8").toString("base64");
  // Import separately from verify: a syntax/import error is NOT a killed
  // behavioral mutant and must fail the mutation review.
  const mutant = await import(mutantURL);
  let killed = false;
  try {
    await verify(mutant);
  } catch (error) {
    if (!(error instanceof assert.AssertionError))
      throw error;
    killed = true;
  }
  assert.equal(killed, true, "survived mutation in " + file);
}

const installation = (id, name) => ({ id, account: { login: name } });

test("mutation M01: malformed installation must reject, never silently disappear", () =>
  mustKill("github-installations.mjs",
    '        throw Error("Invalid installations response");',
    "          continue;",
    async m => {
      await assert.rejects(m.listAvailableInstallations(async () => ({
        installations: [installation(1, "good"), installation(2, "../bad")]
      })), /Invalid installations response/);
    }));

test("mutation M02: contradictory GitHub installation identity must fail closed", () =>
  mustKill("github-installations.mjs",
    "if (seenIds.get(item.id) !== identity ||\n            seenOwners.get(identity) !== item.id)",
    "if (false)",
    async m => {
      await assert.rejects(m.listAvailableInstallations(async () => ({
        installations: [installation(1, "good"), installation(1, "other")]
      })), /Conflicting installations response/);
    }));

test("mutation M03: bounded installation response rejects 101 rows", () =>
  mustKill("github-installations.mjs",
    "response.installations.length > 100",
    "response.installations.length > 101",
    async m => {
      await assert.rejects(m.listAvailableInstallations(async () => ({
        installations: Array.from({ length: 101 },
          (_, i) => installation(i + 1, "team" + i))
      })), /Invalid installations response/);
    }));

test("mutation M04: invalid runner inventory never reports confident zero", () =>
  mustKill("runner-state.mjs",
    "runnerCoverage === true && Array.isArray(runners) && !malformedRunner",
    "runnerCoverage === true && Array.isArray(runners)",
    async m => {
      const result = m.summarizeRunnerState({
        runners: [{ id: 1, name: "runner", status: "bad", busy: false, labels: [] }],
        jobs: [], runnerCoverage: true, jobCoverage: true
      });
      assert.equal(result.counts.busy, null);
      assert.equal(result.coverage.runners, false);
    }));

test("mutation M05: malformed jobs cannot become authoritative zero", () =>
  mustKill("runner-state.mjs",
    "jobCoverage === true && Array.isArray(jobs) && !malformedJob",
    "jobCoverage === true && Array.isArray(jobs)",
    async m => {
      const result = m.summarizeRunnerState({
        runners: [], jobs: [{ id: 3, status: "wrong" }],
        runnerCoverage: true, jobCoverage: true
      });
      assert.equal(result.counts.queued, null);
      assert.equal(result.coverage.jobs, false);
    }));

test("mutation M06: self-hosted label wins over hosted OS labels", () =>
  mustKill("runner-state.mjs",
    'if (labels.includes("self-hosted")) return "selfHosted";',
    'if (false) return "selfHosted";',
    async m => {
      assert.equal(m.classifyJobLane({ labels: ["ubuntu-latest", "self-hosted"] }),
        "selfHosted");
    }));

test("mutation M07: runner compatibility requires every requested label", () =>
  mustKill("runner-state.mjs",
    "requested.every(item => available.includes(item))",
    "requested.some(item => available.includes(item))",
    async m => {
      assert.equal(m.runnerLabelCompatible(
        ["self-hosted", "linux", "windows"], ["self-hosted", "linux"]), false);
    }));

test("mutation M08: billing rejects 501 usage items, not just 502", () =>
  mustKill("github-billing.mjs",
    "payload.usageItems.length > 500",
    "payload.usageItems.length > 501",
    async m => {
      assert.throws(() => m.reportedActionsMinutes({
        usageItems: Array.from({ length: 501 }, () => ({
          sku: "actions_linux", grossQuantity: 1
        }))
      }), /Invalid GitHub billing projection/);
    }));

test("mutation M09: reported billing totals must be safe integers", () =>
  mustKill("github-billing.mjs",
    "if (!Number.isSafeInteger(Math.ceil(total)))",
    "if (!Number.isFinite(total))",
    async m => {
      assert.throws(() => m.reportedActionsMinutes({
        usageItems: [
          { sku: "actions_linux", grossQuantity: Number.MAX_SAFE_INTEGER },
          { sku: "actions_windows", grossQuantity: 1 }
        ]
      }), /safe numeric range/);
    }));

test("mutation M10: billing cache expires exactly at TTL", () =>
  mustKill("github-billing.mjs",
    "started - saved.at < ttlMs",
    "started - saved.at <= ttlMs",
    async m => {
      let clock = Date.parse("2026-10-21T17:00:00Z");
      let count = 0;
      const cache = m.createBillingCache({
        now: () => clock, ttlMs: 60_000,
        get: async path => {
          count++;
          if (path === "/user") return { login: "user", plan: { name: "free" } };
          if (path === "/orgs/team") return { login: "team", plan: { name: "team" } };
          return { usageItems: [] };
        }
      });
      await cache.load("team", true);
      assert.equal(count, 4);
      clock += 60_000;
      await cache.load("team", true);
      assert.equal(count, 8);
    }));

test("mutation M11: impossible Gregorian UTC dates must not alert as valid runs", () =>
  mustKill("ci-failure-events.mjs",
    'new Date(millis).toISOString().slice(0, 19) + "Z" === value',
    "true",
    async m => {
      const tracker = m.createCiFailureTracker();
      const scope = { account: "team", repositories: ["team/app"] };
      tracker.observe({
        ...scope, results: [{ repository: "team/app", runs: [] }]
      });
      await assert.rejects(async () => tracker.observe({
        ...scope,
        results: [{ repository: "team/app", runs: [{
          id: 42, run_attempt: 1, conclusion: "failure",
          updated_at: "2026-02-31T12:00:00Z"
        }] }]
      }), /Invalid notification run facts/);
    }));

test("mutation M12: provider account names above native bound cannot enter UI scope", () =>
  mustKill("github-installations.mjs",
    "const ACCOUNT_NAME = /^[a-zA-Z0-9_.-]{1,100}$/;",
    "const ACCOUNT_NAME = /^[a-zA-Z0-9_.-]+$/;",
    async m => {
      await assert.rejects(m.listAvailableInstallations(async () => ({
        installations: [installation(7, "a".repeat(101))]
      })), /Invalid installations response/);
    }));
