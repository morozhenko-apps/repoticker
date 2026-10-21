import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compactStatus } from "../apps/desktop/ui/status-metrics.mjs";
import { buildHoverDetails, isHoverKind } from "../apps/desktop/ui/quota-details.mjs";

const source = path => readFileSync(new URL(path, import.meta.url), "utf8");
const runner = (id, name, busy = false) => ({
  id, name, status: "online", busy, ready: !busy,
  labels: ["self-hosted", "linux", "x64"]
});
const job = (id, status, labels, runner_id = null) =>
  ({ id, status, labels, runner_id });
const complete = {
  coverage: { runners: true, jobs: true },
  counts: {
    busy: 1, idle: 1, offline: 1,
    running: 2, queued: 2,
    runningSelfHosted: 1, queuedSelfHosted: 1,
    runningGitHubHosted: 1, queuedGitHubHosted: 1,
    runningUnclassified: 0, queuedUnclassified: 0
  },
  runners: [runner(10, "Alcotester", true), runner(11, "Alcotester-2"), {
    id: 12, name: "Offline", status: "offline", busy: false, ready: false,
    labels: ["self-hosted", "windows"]
  }],
  runningJobs: [
    job(101, "in_progress", ["self-hosted", "linux", "x64"], 10),
    job(102, "in_progress", ["ubuntu-24.04"])
  ],
  queuedJobs: [
    job(103, "queued", ["self-hosted", "linux", "x64"]),
    job(104, "queued", ["ubuntu-24.04"])
  ],
  checkedAt: "2026-10-21T17:00:00Z"
};
test("compact counters do not mix hosted jobs with registered runner population", () => {
  assert.deepEqual(compactStatus(complete), {
    total: "3", online: "2", offline: "1", running: "2", queued: "2"
  });
  assert.deepEqual(compactStatus(null), {
    total: "—", online: "—", offline: "—", running: "—", queued: "—"
  });
  assert.equal(compactStatus({ ...complete, coverage: { runners: false, jobs: true } }).total, "—");
  assert.equal(compactStatus({ ...complete, coverage: { runners: true, jobs: false } }).running, "—");
  assert.equal(compactStatus({ ...complete, counts: { ...complete.counts, busy: -1 } }).online, "—");
});

test("runner hover lists total online busy idle offline without task or billing fields", () => {
  const view = buildHoverDetails(complete, "runners", true);
  assert.equal(view.status, "");
  assert.equal(view.sections[0].title, "");
  assert.equal(view.message, "Checked: 2026-10-21 17:00 UTC");
  assert.deepEqual(view.sections[0].rows, [
    ["Total", "3"], ["Online", "2"], ["Busy", "1"],
    ["Idle", "1"], ["Offline", "1"]
  ]);
  assert.doesNotMatch(JSON.stringify(view), /Minutes left|eligible queue/);
});

test("task hover shows only running jobs by runner, then GitHub-hosted", () => {
  const result = buildHoverDetails(complete, "tasks", true);
  assert.match(result.status, /Running 2 \/ Queued 2/);
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].title, "");
  assert.deepEqual(result.sections[0].rows, [
    ["Alcotester", "1"],
    ["Alcotester-2", "0"],
    ["Offline", "0"],
    ["GitHub-hosted", "1"]
  ]);
  assert.equal(result.message, "Checked: 2026-10-21 17:00 UTC");
  assert.doesNotMatch(JSON.stringify(result), /eligible queue|Other jobs|Unclassified jobs|compatible/);

  const partial = buildHoverDetails({ ...complete,
    coverage: { runners: true, jobs: false } }, "tasks", true);
  assert.deepEqual(partial.sections[0].rows.map(row => row[1]), ["—", "—", "—", "—"]);
  assert.match(partial.status, /Running — \/ Queued —/);
});

test("large inventories keep tooltip bounded and declare omitted runners", () => {
  const many = Array.from({ length: 30 }, (_, i) => runner(i + 1, "r-" + i));
  const details = buildHoverDetails({ ...complete, runners: many }, "tasks", true);
  assert.equal(details.sections[0].rows.length, 6);
  assert.deepEqual(details.sections[0].rows.at(-2), ["More self-hosted", "+26"]);
  assert.deepEqual(details.sections[0].rows.at(-1), ["GitHub-hosted", "1"]);
  assert.equal(isHoverKind("unknown"), false);
  for (const kind of ["runners", "tasks", "billing"]) assert.equal(isHoverKind(kind), true);
});

test("billing tooltip never invents free allowance or remaining minutes before permission", () => {
  const billing = buildHoverDetails(complete, "billing", true);
  assert.deepEqual(billing.sections.map(s => s.title), ["Organization", "Personal account"]);
  assert.ok(billing.sections.every(s => s.rows.every(r => r[1] === "—")));
  assert.match(billing.sections[0].message, /Usage not available/);
  assert.match(billing.sections[1].message, /Usage not available/);
  assert.equal(billing.message, "");
  assert.doesNotMatch(JSON.stringify(billing), /2,000|3,000|Available/);
});

test("UI uses distinct hover targets, native event validation, no extra queued strip field", () => {
  const html = source("../apps/desktop/ui/index.html");
  const app = source("../apps/desktop/ui/app.mjs");
  const native = source("../apps/desktop/src-tauri/src/main.rs");
  const overlay = source("../apps/desktop/ui/quota.mjs");
  assert.match(html, /id="runner-status"/);
  assert.match(html, /id="ci-tasks"/);
  assert.doesNotMatch(html, /id="ci-queued"/);
  assert.match(html, /id="tasks-queued"/);
  assert.match(app, /hoverTargets/);
  assert.match(app, /show_usage_popup", \{ kind: wanted \}/);
  assert.match(app, /status-hover,\[role=button\]/);
  assert.match(native, /Unsupported status tooltip/);
  assert.match(native, /static USAGE_KIND: AtomicU8/);
  assert.match(native, /fn get_usage_popup_kind/);
  assert.match(native, /__repotickerSetHoverKind/);
  assert.match(overlay, /repoticker-usage-shown", onUsageShown/);
  assert.match(overlay, /get_usage_popup_kind/);
  assert.ok(overlay.includes("runner_state?.scope?.organization"));
  const css = source("../apps/desktop/ui/quota.css");
  assert.ok(css.includes("kind-billing { grid-template-columns:minmax(0,1fr)"));
});
