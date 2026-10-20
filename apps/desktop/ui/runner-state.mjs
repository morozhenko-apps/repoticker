/** Pure, credential-free projection of GitHub Actions jobs across repositories.
 * Job totals and self-hosted runner occupancy have independent coverage.
 * Missing runner inventory must never erase known hosted/total jobs.
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

// Only standard GitHub-hosted labels. Arbitrary custom labels and runner
// group names cannot safely prove a job is GitHub-hosted.
export function isStandardGitHubHostedLabel(value) {
  return /^(?:ubuntu|windows|macos)-(?:latest|slim|[\da-z][\da-z.]*)(?:-[\w.-]+)?$/.test(label(value));
}

/** GitHub-hosted runner instances are ephemeral; the org runner inventory
 * endpoint lists only self-hosted registrations. Keep an unknown lane.
 */
export function classifyJobLane(job, knownRunnerIds = new Set()) {
  if (!isObject(job)) return "unknown";
  if (Number.isSafeInteger(job.runner_id) && knownRunnerIds.has(job.runner_id)) {
    return "selfHosted";
  }
  const labels = normalizeLabels(job.labels);
  if (!labels?.length) return "unknown";
  if (labels.includes("self-hosted")) return "selfHosted";
  if (labels.some(isStandardGitHubHostedLabel)) return "githubHosted";
  return "unknown";
}

function laneCounts(jobs, ids) {
  const counts = { selfHosted: 0, githubHosted: 0, unclassified: 0 };
  const details = { selfHosted: [], githubHosted: [], unclassified: [] };
  for (const job of jobs) {
    const lane = classifyJobLane(job, ids);
    const target = lane === "unknown" ? "unclassified" : lane;
    counts[target]++;
    details[target].push(job);
  }
  return { counts, details };
}

/** Coverage booleans are explicit collection evidence, never inferred
 * from the presence of an empty array.
 */
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
  const waiting = [];
  const unmatched = [];
  for (const job of uniqueJobs.values()) {
    if (job.status === "in_progress") running.push(job);
    else if (job.status === "queued") {
      queued.push(job);
      if (inventoryComplete && classifyJobLane(job, seenRunnerIds) === "selfHosted" &&
        !normalizedRunners.some(runner => runnerLabelCompatible(job.labels, runner.labels))) {
        unmatched.push(job);
      }
    } else if (["waiting", "pending", "requested"].includes(job.status)) {
      waiting.push(job);
    }
  }
  const runningSplit = laneCounts(running, seenRunnerIds);
  const queuedSplit = laneCounts(queued, seenRunnerIds);
  const busy = normalizedRunners.filter(runner => runner.status === "online" && runner.busy).length;
  const idle = normalizedRunners.filter(runner => runner.ready).length;
  const offline = normalizedRunners.filter(runner => runner.status === "offline").length;
  const exact = value => jobsComplete ? value : null;
  return {
    runners: normalizedRunners,
    runningJobs: running,
    queuedJobs: queued,
    waitingJobs: waiting,
    runningByLane: runningSplit.details,
    queuedByLane: queuedSplit.details,
    coverage: {
      runners: inventoryComplete, jobs: jobsComplete,
      queue: jobsComplete, running: jobsComplete,
      runningLanes: jobsComplete && runningSplit.counts.unclassified === 0,
      queuedLanes: jobsComplete && queuedSplit.counts.unclassified === 0,
      queuedUnclassified: queuedSplit.counts.unclassified,
      unmatchedSelfHosted: inventoryComplete ? unmatched.length : null,
    },
    counts: {
      busy: inventoryComplete ? busy : null,
      idle: inventoryComplete ? idle : null,
      offline: inventoryComplete ? offline : null,
      running: exact(running.length),
      queued: exact(queued.length),
      waiting: exact(waiting.length),
      runningSelfHosted: exact(runningSplit.counts.selfHosted),
      runningGitHubHosted: exact(runningSplit.counts.githubHosted),
      runningUnclassified: exact(runningSplit.counts.unclassified),
      queuedSelfHosted: exact(queuedSplit.counts.selfHosted),
      queuedGitHubHosted: exact(queuedSplit.counts.githubHosted),
      queuedUnclassified: exact(queuedSplit.counts.unclassified),
      runningObserved: running.length,
      queuedObserved: queued.length,
    },
    checkedAt: typeof checkedAt === "string" && Number.isFinite(Date.parse(checkedAt))
      ? checkedAt : null,
  };
}
