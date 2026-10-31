import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLabels, runnerLabelCompatible, summarizeRunnerState,
  classifyJobLane, isStandardGitHubHostedLabel
} from "../apps/desktop/ui/runner-state.mjs";

const runners = [
  { id: 10, name: "Alcotester", status: "online", busy: true, labels: [
    { name: "self-hosted" }, { name: "linux" }, { name: "x64" }, { name: "docker-builder" },
  ] },
  { id: 11, name: "Alcotester-2", status: "online", busy: false,
    labels: ["self-hosted", "linux", "x64", "docker-builder"] },
  { id: 12, name: "Offline", status: "offline", busy: false,
    labels: ["self-hosted", "linux", "x64"] },
];
const job = (id, status, labels, runner_id = null) => ({ id, status, labels, runner_id });
const complete = (jobs, more = {}) => summarizeRunnerState({
  runners, jobs, runnerCoverage: true, jobCoverage: true,
  checkedAt: "2026-10-20T12:00:00Z", ...more,
});

test("runner labels accept GitHub string and object representations", () => {
  assert.deepEqual(normalizeLabels(["SELF-HOSTED", { name: " Linux " }, "linux"]),
    ["self-hosted", "linux"]);
  assert.equal(normalizeLabels([{ something: "bad" }]), null);
  assert.equal(runnerLabelCompatible(["self-hosted", "linux"], runners[0].labels), true);
  assert.equal(runnerLabelCompatible(["ubuntu-latest"], runners[0].labels), false);
});

test("GitHub-hosted labels are recognized without inventing plan capacity", () => {
  for (const value of ["ubuntu-latest", "ubuntu-24.04", "windows-2025",
    "macos-latest", "macos-15-intel", "ubuntu-slim"]) {
    assert.equal(isStandardGitHubHostedLabel(value), true, value);
  }
  assert.equal(isStandardGitHubHostedLabel("custom-linux"), false);
  assert.equal(classifyJobLane(job(1, "queued", ["custom-linux"])), "unknown");
  assert.equal(classifyJobLane(job(2, "queued", ["ubuntu-latest"])), "githubHosted");
  assert.equal(classifyJobLane(job(3, "queued", ["self-hosted", "ubuntu-latest"])), "selfHosted");
  assert.equal(classifyJobLane(job(4, "in_progress", null, 10), new Set([10])), "selfHosted");
});

test("capacity counts busy, idle and offline independently of all jobs", () => {
  const result = complete([]);
  assert.deepEqual([result.counts.busy, result.counts.idle, result.counts.offline], [1, 1, 1]);
  assert.equal(result.runners[0].ready, false);
  assert.equal(result.runners[1].ready, true);
});

test("primary running/queued counters include hosted and self-hosted jobs", () => {
  const result = complete([
    job(101, "in_progress", ["self-hosted", "linux", "x64", "docker-builder"], 10),
    job(102, "in_progress", ["ubuntu-24.04"], null),
    job(103, "in_progress", ["windows-2025"], null),
    job(104, "queued", ["self-hosted", "linux", "x64", "docker-builder"]),
    job(105, "queued", ["ubuntu-latest"]),
    job(106, "queued", ["self-hosted", "linux", "x64", "docker-builder"]),
    job(107, "completed", ["ubuntu-latest"]),
    job(104, "queued", ["self-hosted", "linux", "x64", "docker-builder"]),
  ]);
  assert.deepEqual([result.counts.running, result.counts.queued], [3, 3]);
  assert.deepEqual([result.counts.runningSelfHosted, result.counts.runningGitHubHosted], [1, 2]);
  assert.deepEqual([result.counts.queuedSelfHosted, result.counts.queuedGitHubHosted], [2, 1]);
  assert.equal(result.counts.runningUnclassified, 0);
  assert.equal(result.counts.queuedUnclassified, 0);
  assert.equal(result.runningByLane.githubHosted.length, 2);
});

test("queue for unsupported self-hosted labels is still counted in totals", () => {
  const result = complete([
    job(201, "queued", ["self-hosted", "windows"]),
    job(202, "queued", ["self-hosted", "linux", "x64"]),
  ]);
  assert.equal(result.counts.queued, 2);
  assert.equal(result.counts.queuedSelfHosted, 2);
  assert.equal(result.coverage.unmatchedSelfHosted, 1);
});

test("missing job labels affect lane confidence but not primary counts", () => {
  const result = complete([
    job(301, "queued", null),
    job(302, "in_progress", null),
    job(303, "queued", ["custom-runner"]),
  ]);
  assert.equal(result.counts.queued, 2);
  assert.equal(result.counts.running, 1);
  assert.equal(result.counts.queuedUnclassified, 2);
  assert.equal(result.counts.runningUnclassified, 1);
  assert.equal(result.coverage.queuedLanes, false);
});

test("waiting environment approval does not inflate queued jobs", () => {
  const result = complete([
    job(401, "waiting", ["ubuntu-latest"]),
    job(402, "pending", null),
    job(403, "requested", null),
  ]);
  assert.equal(result.counts.queued, 0);
  assert.equal(result.counts.waiting, 3);
});

test("incomplete jobs pagination makes totals unknown, runner occupancy remains valid", () => {
  const result = complete([job(1, "queued", ["ubuntu-latest"])], { jobCoverage: false });
  assert.equal(result.counts.queued, null);
  assert.equal(result.counts.running, null);
  assert.equal(result.counts.queuedObserved, 1);
  assert.equal(result.counts.busy, 1);
});

test("inaccessible runner inventory cannot erase complete hosted/job totals", () => {
  const result = complete([
    job(1, "in_progress", ["ubuntu-latest"]),
    job(2, "in_progress", ["self-hosted", "linux"], 10),
    job(3, "queued", ["ubuntu-latest"]),
  ], { runnerCoverage: false });
  assert.equal(result.counts.busy, null);
  assert.equal(result.counts.running, 2);
  assert.equal(result.counts.queued, 1);
  assert.equal(result.counts.runningGitHubHosted, 1);
});

test("conflicting jobs and duplicate runner inventory fail closed", () => {
  const conflict = complete([
    job(1, "queued", ["self-hosted"]),
    job(1, "in_progress", ["self-hosted"], 10),
  ]);
  assert.equal(conflict.counts.running, null);
  const duplicate = complete([], {
    runners: [...runners, { id: 10, name: "duplicate",
      status: "online", busy: false, labels: [] }],
  });
  assert.equal(duplicate.counts.busy, null);
  assert.equal(duplicate.counts.queued, 0);
});

test("all lane counts sum to the corresponding total", () => {
  const result = complete([
    job(1, "in_progress", ["ubuntu-latest"]),
    job(2, "in_progress", ["self-hosted", "linux"], 10),
    job(3, "in_progress", null),
    job(4, "queued", ["ubuntu-latest"]),
    job(5, "queued", ["self-hosted"]),
    job(6, "queued", null),
  ]);
  assert.equal(result.counts.running,
    result.counts.runningSelfHosted + result.counts.runningGitHubHosted +
      result.counts.runningUnclassified);
  assert.equal(result.counts.queued,
    result.counts.queuedSelfHosted + result.counts.queuedGitHubHosted +
      result.counts.queuedUnclassified);
});


test("Mode B: malformed runner rows must not report confident capacity", () => {
  for (const invalid of [
    null, {}, { ...runners[0], id: 0 },
    { ...runners[0], id: Number.MAX_SAFE_INTEGER + 1 },
    { ...runners[0], status: "unknown" },
    { ...runners[0], busy: "false" },
    { ...runners[0], labels: [{}] },
    { ...runners[0], labels: null },
  ]) {
    const result = complete([], { runners: [invalid] });
    assert.equal(result.coverage.runners, false);
    assert.equal(result.counts.busy, null);
    assert.equal(result.counts.idle, null);
    assert.equal(result.counts.offline, null);
    assert.equal(result.coverage.jobs, true, "independent jobs remain complete");
    assert.equal(result.counts.queued, 0);
  }
});

test("Mode B: malformed jobs fail all task totals without erasing known runner availability", () => {
  for (const invalid of [
    null, {}, { id: 0, status: "queued" },
    { id: Number.MAX_SAFE_INTEGER + 1, status: "in_progress" },
    { id: 30, status: "unknown" },
    { id: 30, status: null },
  ]) {
    const result = complete([invalid]);
    assert.equal(result.coverage.jobs, false);
    assert.equal(result.counts.queued, null);
    assert.equal(result.counts.running, null);
    assert.equal(result.counts.waiting, null);
    assert.equal(result.counts.queuedObserved, 0);
    assert.equal(result.coverage.runners, true);
    assert.equal(result.counts.busy, 1);
  }
});

test("Mode B: hosted labels are strict and self-hosted priority wins mixed labels", () => {
  for (const label of [
    "ubuntu-24.04", "ubuntu-latest", "windows-2025",
    "macos-15", "macos-15-intel",
  ]) assert.equal(classifyJobLane(job(10, "queued", [label])), "githubHosted");
  for (const label of [
    "", "ubuntu", "custom-ubuntu-latest", "ubuntu/", "WIN"
  ]) assert.equal(classifyJobLane(job(10, "queued", [label])), "unknown");
  assert.equal(classifyJobLane(job(10, "queued", ["ubuntu-latest", "self-hosted"])),
    "selfHosted");
  assert.equal(classifyJobLane(job(10, "queued", null, 10), new Set([10])),
    "selfHosted");
});

test("Mode B: valid identical job duplicates are idempotent across pages", () => {
  const first = job(17, "queued", ["self-hosted", "linux"]);
  const result = complete([first, { ...first }, job(18, "in_progress", ["ubuntu-latest"])]);
  assert.equal(result.coverage.jobs, true);
  assert.equal(result.counts.queued, 1);
  assert.equal(result.counts.running, 1);
  assert.equal(result.counts.queuedSelfHosted, 1);
  assert.equal(result.counts.runningGitHubHosted, 1);
});
