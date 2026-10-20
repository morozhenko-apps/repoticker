import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLabels, runnerLabelCompatible, summarizeRunnerState
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

test("normalizes GitHub job label strings and runner label objects", () => {
  assert.deepEqual(normalizeLabels(["SELF-HOSTED", { name: " Linux " }, "linux"]),
    ["self-hosted", "linux"]);
  assert.equal(normalizeLabels([{ something: "bad" }]), null);
  assert.equal(runnerLabelCompatible(["self-hosted", "linux"], runners[0].labels), true);
  assert.equal(runnerLabelCompatible(["ubuntu-latest"], runners[0].labels), false);
});

test("capacity counts busy, idle and offline independently of jobs", () => {
  const result = complete([]);
  assert.deepEqual([result.counts.busy, result.counts.idle, result.counts.offline], [1, 1, 1]);
  assert.equal(result.runners[0].ready, false);
  assert.equal(result.runners[1].ready, true);
});

test("counts eligible queued JOBS behind running workflow, never hosted jobs or duplicates", () => {
  const result = complete([
    job(101, "in_progress", ["self-hosted", "linux", "x64", "docker-builder"], 10),
    job(102, "queued", ["self-hosted", "linux", "x64", "docker-builder"]),
    job(103, "queued", ["ubuntu-24.04"]),
    job(104, "completed", ["self-hosted", "linux", "x64", "docker-builder"]),
    job(102, "queued", ["self-hosted", "linux", "x64", "docker-builder"]),
  ]);
  assert.deepEqual([result.counts.running, result.counts.queued], [1, 1]);
  assert.equal(result.coverage.queue, true);
});

test("self-hosted queue without compatible runner is reported separately", () => {
  const result = complete([
    job(201, "queued", ["self-hosted", "windows"]),
    job(202, "queued", ["self-hosted", "linux", "x64"]),
  ]);
  assert.equal(result.counts.queued, 1);
  assert.equal(result.coverage.unmatchedSelfHosted, 1);
});

test("missing job labels, permissions or pagination never become an authoritative zero", () => {
  const unknown = complete([job(301, "queued", null)]);
  assert.equal(unknown.counts.queued, null);
  assert.equal(unknown.coverage.queuedUnclassified, 1);
  const jobsDenied = complete([], { jobCoverage: false });
  assert.equal(jobsDenied.counts.queued, null);
  assert.equal(jobsDenied.counts.running, null);
  assert.equal(jobsDenied.counts.busy, 1);
  const runnersDenied = complete([], { runnerCoverage: false });
  assert.equal(runnersDenied.counts.busy, null);
  assert.equal(runnersDenied.counts.queued, null);
});

test("malformed or conflicting input fails closed", () => {
  const conflict = complete([
    job(1, "queued", ["self-hosted"]),
    job(1, "in_progress", ["self-hosted"], 10),
  ]);
  assert.equal(conflict.counts.running, null);
  const duplicates = complete([], {
    runners: [...runners, { id: 10, name: "duplicate",
      status: "online", busy: false, labels: [] }],
  });
  assert.equal(duplicates.counts.busy, null);
});

test("does not count unassigned or hosted running jobs against organization runners", () => {
  const result = complete([
    job(1, "in_progress", ["ubuntu-latest"]),
    job(2, "in_progress", ["self-hosted"], 10),
  ]);
  assert.equal(result.counts.running, 1);
});
