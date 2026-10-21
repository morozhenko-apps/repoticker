import test from "node:test";
import assert from "node:assert/strict";
import { buildQuotaDetails } from "../apps/desktop/ui/quota-details.mjs";
import { safeActionsJobUrl } from "../apps/desktop/ui/model.mjs";

test("disconnected hover balloon does not invent GitHub job or usage data", () => {
  const result = buildQuotaDetails(null);
  assert.equal(result.connected, false);
  assert.equal(result.sections.length, 0);
  assert.match(result.message, /Connect GitHub/);
  assert.match(result.message, /billing quotas require separate permissions/i);
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

test("compact grid preserves runner, running, queued and hosted quota semantics", () => {
  const result = buildQuotaDetails(state);
  assert.equal(result.connected, true);
  assert.equal(result.status, "Partial monitoring data");
  assert.deepEqual(result.sections.map(section => section.title),
    ["Online self-hosted · 2", "Running · 5", "Queued · 3",
      "Hosted usage (unknown)"]);
  assert.deepEqual(result.sections[0].rows, [
    ["Busy", "1"], ["Idle", "1"], ["Offline", "1"],
  ]);
  assert.match(result.sections[0].message, /Alcotester: Busy/);
  assert.match(result.sections[0].message, /Alcotester-2: Idle/);
  assert.match(result.sections[0].message, /\+1 more/);
  assert.deepEqual(result.sections[1].rows, [
    ["Self-hosted", "1"], ["GitHub-hosted", "3"], ["Unclassified", "1"],
  ]);
  assert.deepEqual(result.sections[2].rows, [
    ["Self-hosted", "2"], ["GitHub-hosted", "1"], ["Unclassified", "0"],
  ]);
  assert.deepEqual(result.sections[3].rows, [
    ["Minutes left", "—"], ["Concurrency", "—"],
  ]);
  assert.match(result.sections[3].message, /may be exhausted/i);
  assert.match(result.message, /2026-10-20 12:11 UTC/);
  assert.equal(result.sections.some(section => "links" in section), false);
});

test("known complete job counts never imply that private repository minutes remain", () => {
  const result = buildQuotaDetails({
    ...state,
    coverage: { runners: true, jobs: true, runningLanes: true, queuedLanes: true },
    counts: { ...state.counts, running: 1, queued: 0, busy: 0, idle: 2, offline: 0 },
    runners: state.runners.slice(0, 2).map(r => ({ ...r, busy: false, ready: true })),
  });
  assert.equal(result.status, "Job counts collected");
  assert.equal(result.sections[0].title, "Online self-hosted · 2");
  assert.equal(result.sections[1].title, "Running · 1");
  assert.equal(result.sections[2].title, "Queued · 0");
  assert.equal(result.sections[3].rows[0][1], "—");
  assert.doesNotMatch(JSON.stringify(result), /"Available"/);
});

test("permission errors and unknown counts never become zero", () => {
  const result = buildQuotaDetails({
    counts: { busy: null, idle: null, running: null, queued: null },
    coverage: { runners: false, jobs: false },
  });
  assert.equal(result.sections[0].title, "Online self-hosted · —");
  assert.equal(result.sections[0].rows[0][1], "—");
  assert.equal(result.sections[1].title, "Running · —");
  assert.equal(result.sections[2].title, "Queued · —");
});

test("hundreds of runners and jobs cannot add unscrollable sections or dead links", () => {
  const many = Array.from({ length: 120 }, (_, i) => ({
    id: i + 1, name: "Runner-" + i, status: "online", busy: false, ready: true,
  }));
  const jobs = Array.from({ length: 400 }, (_, i) => ({
    id: i + 1, name: "job-" + i,
    html_url: "https://github.com/example/example/actions/runs/123/job/" + (i + 1),
  }));
  const result = buildQuotaDetails({ ...state, runners: many, runningJobs: jobs, queuedJobs: jobs });
  assert.equal(result.sections.length, 4);
  assert.match(result.sections[0].message, /\+118 more/);
  assert.ok(result.sections.every(section => section.rows.length <= 3));
  assert.equal(result.sections.some(section => section.links?.length), false);
  assert.equal(JSON.stringify(result).includes("job-399"), false);
});

test("canonical GitHub job URLs remain protected at provider contract boundary", () => {
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

test("authorized connection awaiting runner data is not reported as disconnected", () => {
  const result = buildQuotaDetails(null, true, "Choose account to monitor");
  assert.equal(result.status, "GitHub authorized");
  assert.match(result.message, /Choose account/);
  assert.deepEqual(result.sections, []);
});
