/** Pure projection of GitHub Actions runner capacity and visible job backlog.
 * No GitHub tokens, network activity or WebView credentials live here.
 * Raw source completeness is explicit; partial results are never presented as zero.
 */
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const label = value => typeof value === "string" ? value.trim().toLowerCase() : "";

export function normalizeLabels(values) {
  if (!Array.isArray(values)) return null;
  const result = [];
  for (const value of values) {
    const name = typeof value === "string" ? value : isObject(value) ? value.name : null;
    if (typeof name !== "string" || !name.trim()) return null;
    const normalized = label(name);
    if (!result.includes(normalized)) result.push(normalized);
  }
  return result;
}

export function runnerLabelCompatible(jobLabels, runnerLabels) {
  const requested = normalizeLabels(jobLabels);
  const available = normalizeLabels(runnerLabels);
  return Boolean(requested?.includes("self-hosted") && available &&
    requested.every(item => available.includes(item)));
}

/** Coverage contains explicit booleans from the collection layer, not guesses. */
export function summarizeRunnerState({
  runners, jobs, runnerCoverage = false, jobCoverage = false, checkedAt = null
}) {
  const inventory = Array.isArray(runners) ? runners : [];
  const seenRunnerIds = new Set();
  const normalizedRunners = [];
  let malformedRunner = false;
  for (const runner of inventory) {
    if (!isObject(runner) || !Number.isSafeInteger(runner.id) || runner.id <= 0 ||
      typeof runner.name !== "string" || !["online", "offline"].includes(runner.status) ||
      typeof runner.busy !== "boolean" || !normalizeLabels(runner.labels) ||
      seenRunnerIds.has(runner.id)) {
      malformedRunner = true;
      continue;
    }
    seenRunnerIds.add(runner.id);
    normalizedRunners.push({
      id: runner.id, name: runner.name, status: runner.status, busy: runner.busy,
      labels: normalizeLabels(runner.labels),
      ready: runner.status === "online" && !runner.busy,
    });
  }
  normalizedRunners.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
  const inventoryComplete = runnerCoverage === true && Array.isArray(runners) && !malformedRunner;

  const items = Array.isArray(jobs) ? jobs : [];
  const uniqueJobs = new Map();
  let malformedJob = false;
  for (const job of items) {
    if (!isObject(job) || !Number.isSafeInteger(job.id) || job.id <= 0 ||
      !["queued", "in_progress", "completed", "waiting", "pending", "requested"].includes(job.status)) {
      malformedJob = true;
      continue;
    }
    const existing = uniqueJobs.get(job.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(job)) {
      malformedJob = true;
    } else if (!existing) uniqueJobs.set(job.id, job);
  }
  const jobsComplete = jobCoverage === true && Array.isArray(jobs) && !malformedJob;
  const running = [];
  const queued = [];
  const unclassified = [];
  const unmatched = [];
  for (const job of uniqueJobs.values()) {
    if (job.status === "in_progress") {
      if (Number.isSafeInteger(job.runner_id) && seenRunnerIds.has(job.runner_id)) running.push(job);
      continue;
    }
    if (job.status !== "queued") continue;
    const labels = normalizeLabels(job.labels);
    if (!labels) { unclassified.push(job); continue; }
    if (!labels.includes("self-hosted")) continue;
    if (normalizedRunners.some(runner => runnerLabelCompatible(labels, runner.labels))) queued.push(job);
    else unmatched.push(job);
  }
  const busy = normalizedRunners.filter(runner => runner.status === "online" && runner.busy).length;
  const idle = normalizedRunners.filter(runner => runner.ready).length;
  const offline = normalizedRunners.filter(runner => runner.status === "offline").length;
  const queueComplete = inventoryComplete && jobsComplete && unclassified.length === 0;
  const runningComplete = inventoryComplete && jobsComplete;
  return {
    runners: normalizedRunners,
    runningJobs: running,
    queuedJobs: queued,
    coverage: {
      runners: inventoryComplete, jobs: jobsComplete, queue: queueComplete,
      running: runningComplete,
      queuedUnclassified: unclassified.length,
      unmatchedSelfHosted: unmatched.length,
    },
    counts: {
      busy: inventoryComplete ? busy : null,
      idle: inventoryComplete ? idle : null,
      offline: inventoryComplete ? offline : null,
      running: runningComplete ? running.length : null,
      queued: queueComplete ? queued.length : null,
      runningObserved: running.length,
      queuedObserved: queued.length,
    },
    checkedAt: typeof checkedAt === "string" && Number.isFinite(Date.parse(checkedAt))
      ? checkedAt : null,
  };
}
