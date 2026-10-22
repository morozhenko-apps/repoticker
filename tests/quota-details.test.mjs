import test from "node:test";
import assert from "node:assert/strict";
import { buildQuotaDetails, buildHoverDetails } from "../apps/desktop/ui/quota-details.mjs";
import { safeActionsJobUrl } from "../apps/desktop/ui/model.mjs";

test("legacy billing-only entrypoint shows only account types and unknown quotas", () => {
  const result = buildQuotaDetails({ counts: { running: 3, queued: 1 }, coverage: {} }, true);
  assert.deepEqual(result.sections.map(section => section.title),
    ["Organization", "Personal account"]);
  for (const section of result.sections) {
    assert.deepEqual(section.rows.map(row => row[1]), ["—", "—", "—"]);
  }
  assert.doesNotMatch(JSON.stringify(result), /Running ·|Queued ·|Runner availability|remaining/i);
});
test("unavailable runner statistics do not erase authorization", () => {
  const result = buildHoverDetails(null, "runners", true, "GitHub data unavailable");
  assert.equal(result.connected, false);
  assert.equal(result.status, "Runners unavailable");
  assert.match(result.message, /GitHub data unavailable/);
});
test("job URL validator remains restricted even though hover window is pointer-pass-through", () => {
  const bad = [
    "javascript:alert(1)", "https://github.com.evil.test/a/b/actions/runs/1/job/2",
    "https://attacker@github.com/a/b/actions/runs/1/job/2",
    "https://github.com/a/b/settings/tokens",
    "https://github.com/a/b/actions/runs/1/job/2?token=secret",
    "https://github.com/a/b/actions/runs/1/job/2#secret",
  ];
  for (const value of bad) assert.equal(safeActionsJobUrl(value), null, value);
  assert.equal(safeActionsJobUrl("https://github.com/a/b/actions/runs/1/job/2"),
    "https://github.com/a/b/actions/runs/1/job/2");
});

test("billing hover stacks only compact verified owner fields", () => {
  const details = buildQuotaDetails(null, true, null, {
    month: "2026-10",
    organization: { state: "ready", plan: "free", included: 2000,
      reported: 2791.5, remaining: null, reason: "" },
    personal: { state: "ready", plan: "pro", included: 3000,
      reported: 0, remaining: null, reason: "" },
  });
  assert.equal(details.status, "Actions · 2026-10");
  assert.deepEqual(details.sections.map(x => x.title), ["Organization", "Personal account"]);
  assert.deepEqual(details.sections[0].rows, [
    ["Plan", "free"], ["Included min", "2,000"], ["Used min (gross)", "2,791.5"]
  ]);
  assert.deepEqual(details.sections[1].rows, [
    ["Plan", "pro"], ["Included min", "3,000"], ["Used min (gross)", "0"]
  ]);
  assert.equal(details.message, "");
  assert.ok(details.sections.every(x => x.message === null));
});

test("initial credential check and data loading say Connecting, not Connect GitHub", () => {
  for (const kind of ["runners", "tasks", "billing"]) {
    const unverified = buildHoverDetails(null, kind, false, "Checking GitHub connection...");
    assert.equal(unverified.status, "Connecting");
    assert.equal(unverified.connected, false);
    assert.match(unverified.message, /Checking GitHub connection/);
    assert.doesNotMatch(unverified.message, /Connect GitHub in Settings/);
    const authorized = buildHoverDetails(null, kind, true, "Connecting to GitHub...");
    assert.equal(authorized.status, "Connecting");
    assert.match(authorized.message, /Connecting to GitHub/);
    assert.equal(authorized.sections.length, 0);
  }
  const disconnected = buildHoverDetails(null, "runners", false, null);
  assert.equal(disconnected.status, "Not connected");
  assert.match(disconnected.message, /Connect GitHub in Settings/);
  const failed = buildHoverDetails(null, "tasks", true, "GitHub API rate limited.");
  assert.equal(failed.status, "Tasks unavailable");
  assert.match(failed.message, /rate limited/);
});
