import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildHoverDetails } from "../apps/desktop/ui/quota-details.mjs";

const card = readFileSync(
  new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");

test("rich panel projects runner and task information", () => {
  const state = {
    counts: { total: 4, online: 3, offline: 1, busy: 2, idle: 1,
      running: 2, queued: 1, runningGitHubHosted: 0 },
    coverage: { runners: true, jobs: true },
    runners: [{ id: 1, name: "Local runner" }],
    runningJobs: [{ runner_id: 1 }],
    checkedAt: "2026-10-26T20:00:00Z"
  };
  const runners = buildHoverDetails(state, "runners", true);
  const tasks = buildHoverDetails(state, "tasks", true);
  assert.match(runners.status, /Runners · 4/);
  assert.deepEqual(runners.sections[0].rows[0], ["Online", "3"]);
  assert.match(tasks.status, /Tasks · Running 2 \/ Queued 1/);
  assert.deepEqual(tasks.sections[0].rows[0], ["Local runner", "1"]);
});
test("unknown billing data is unknown, never zero", () => {
  const unavailable = buildHoverDetails(null, "billing", true);
  assert.equal(unavailable.sections[0].rows[1][1], "—");
  assert.equal(unavailable.sections[0].rows[2][1], "—");
});
test("actual mouse entry recovers missing shown event and uses native balloon", () => {
  const enter = card.match(/const enter = \(\) => \{[\s\S]*?\};/)?.[0];
  assert.ok(enter);
  assert.match(enter, /cardVisible = true;/);
  assert.match(enter, /setQuotaOpen\(kind\)/);
  assert.match(card, /anchor\.addEventListener\("mouseenter", enter\)/);
  assert.match(card, /show_usage_popup/);
});
test("WebView2 browser tooltip fallback is gone", () => {
  assert.match(card, /function clearBrowserTooltips\(\)/);
  assert.match(card, /node\.removeAttribute\("title"\)/);
  assert.doesNotMatch(card, /hoverFallbackText|node\.title =/);
});
