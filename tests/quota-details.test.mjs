import test from "node:test";
import assert from "node:assert/strict";
import { buildQuotaDetails } from "../apps/desktop/ui/quota-details.mjs";
import { safeActionsJobUrl } from "../apps/desktop/ui/model.mjs";

test("quota tooltip does not invent data before GitHub connection", () => {
  const result = buildQuotaDetails(null);
  assert.equal(result.connected, false);
  assert.equal(result.sections.length, 0);
  assert.match(result.message, /Connect GitHub/);
});

const state = {
  counts: {
    busy: 1, idle: 1, offline: 1,
    running: 5, runningSelfHosted: 1, runningGitHubHosted: 3, runningUnclassified: 1,
    queued: 3, queuedSelfHosted: 2, queuedGitHubHosted: 1, queuedUnclassified: 0,
  },
  coverage: { runners: true, jobs: true, runningLanes: false, queuedLanes: true },
  runners: [
    { id: 1, name: "Alcotester", status: "online", busy: true },
    { id: 2, name: "Alcotester-2", status: "online", busy: false, ready: true },
    { id: 3, name: "Offline", status: "offline", busy: false },
  ],
  runningJobs: [
    { id: 101, name: "Build AppImage",
      html_url: "https://github.com/example/example/actions/runs/123/job/101" },
    { id: 102, name: "malicious",
      html_url: "https://github.com.attacker.test/org/repo/actions/runs/1/job/2" },
  ],
  queuedJobs: [{ id: 103, name: "Smoke test",
    html_url: "https://github.com/example/example/actions/runs/123/job/103" }],
  checkedAt: "2026-10-20T12:11:00Z",
};

test("breakdown and runner status appear in existing tooltip view-model", () => {
  const result = buildQuotaDetails(state);
  assert.equal(result.connected, true);
  assert.equal(result.status, "Partial / unclassified data");
  assert.deepEqual(result.sections.map(section => section.title),
    ["Runner availability", "Running · 5", "Queued · 3",
      "Self-hosted runners", "Active jobs", "GitHub Actions limits"]);
  assert.deepEqual(result.sections[1].rows,
    [["Self-hosted", "1"], ["GitHub-hosted", "3"], ["Unclassified", "1"]]);
  assert.equal(result.sections[2].rows[1][1], "1");
  assert.deepEqual(result.sections[3].rows.slice(0, 2),
    [["Alcotester", "Busy"], ["Alcotester-2", "Idle"]]);
  assert.equal(result.sections[4].links.length, 2);
  assert.match(result.message, /2026-10-20 12:11 UTC/);
  assert.match(result.sections[5].message, /unavailable/);
});

test("permission errors and unknown counts never become zero", () => {
  const result = buildQuotaDetails({
    counts: { busy: null, idle: null, running: null, queued: null },
    coverage: { runners: false, jobs: false },
  });
  assert.equal(result.sections[0].rows[0][1], "—");
  assert.equal(result.sections[1].title, "Running · —");
  assert.equal(result.sections[2].title, "Queued · —");
});

test("external links allow canonical GitHub job URL only", () => {
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
