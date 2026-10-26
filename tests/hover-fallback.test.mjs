import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hoverFallbackText } from "../apps/desktop/ui/hover-fallback.mjs";

const card = readFileSync(
  new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");

const state = {
  connected: true,
  monitor_message: null,
  runner_state: {
    counts: { total: 4, online: 3, offline: 1, busy: 2, idle: 1,
      running: 2, queued: 1, runningGitHubHosted: 0 },
    coverage: { runners: true, jobs: true },
    runners: [{ id: 1, name: "Local runner" }],
    runningJobs: [{ runner_id: 1 }],
    checkedAt: "2026-10-26T20:00:00Z"
  }
};

test("browser fallback exposes useful runner and task details, not refresh only", () => {
  const runners = hoverFallbackText("runners", state, "en");
  const tasks = hoverFallbackText("tasks", state, "en");
  assert.match(runners, /Runners · 4/);
  assert.match(runners, /Online: 3/);
  assert.match(runners, /Busy: 2/);
  assert.match(tasks, /Tasks · Running 2 \/ Queued 1/);
  assert.match(tasks, /Local runner: 1/);
  assert.doesNotMatch(runners + tasks, /Click to update/);
});

test("unknown coverage stays unknown; fallback never fabricates zero", () => {
  const unknown = hoverFallbackText("runners", {
    connected: true, runner_state: null, monitor_message: "Monitoring unavailable"
  }, "en");
  assert.match(unknown, /Runners unavailable/);
  assert.match(unknown, /Monitoring unavailable/);
  assert.doesNotMatch(unknown, /: 0/);
});

test("billing fallback does not invent provider usage or current quota", () => {
  const billing = hoverFallbackText("billing", state, "ru");
  assert.match(billing, /Организация/);
  assert.match(billing, /—/);
  assert.match(billing, /Подробные данные/);
  assert.doesNotMatch(billing, /remaining|2,000|2000/);
});

test("native hover routing recovers from a lost show event", () => {
  const onEnter = card.match(/const enter = \(\) => \{[\s\S]*?\};/)?.[0];
  assert.ok(onEnter);
  assert.match(onEnter, /cardVisible = true;/);
  assert.match(onEnter, /setQuotaOpen\(kind\)/);
  assert.match(card, /anchor\.addEventListener\("mouseenter", enter\)/);
  assert.match(card, /anchor\.addEventListener\("focusin", enter\)/);
});

test("WebView2 title fallback stays read-only and uses all three anchors", () => {
  assert.match(card, /function updateHoverFallbacks\(\)/);
  assert.match(card, /for \(const \[kind, node\] of Object\.entries\(hoverTargets\)\)/);
  assert.match(card, /node\.title = hoverFallbackText\(kind, snapshot, cardLanguage\)/);
  assert.match(card, /updateHoverFallbacks\(\)/);
});
