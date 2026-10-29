import { summarizeRunnerState } from "./runner-state.mjs";
import { githubFailureReason } from "./github-errors.mjs";

/** Read-only GitHub REST collection. Auth stays inside the injected native
 * transport get(path); this module never receives a token or makes a fetch.
 */
const PAGE_SIZE = 100;
const NAME = /^[a-zA-Z0-9_.-]+$/;

async function getPages(get, pathForPage, key, maxPages) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const payload = await get(pathForPage(page));
    if (!payload || !Array.isArray(payload[key]) ||
        payload[key].length > PAGE_SIZE) throw Error("Unexpected GitHub API response");
    all.push(...payload[key]);
    if (payload[key].length < PAGE_SIZE) return { items: all, complete: true };
  }
  return { items: all, complete: false };
}

async function boundedMap(items, parallel, process) {
  const result = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from(
    { length: Math.min(parallel, items.length) },
    async () => {
      while (index < items.length) {
        const current = index++;
        result[current] = await process(items[current]);
      }
    }
  ));
  return result;
}

/** One FIFO budget for every REST request in a collector invocation.
 * Nested repository and job workers must not multiply the request cap.
 * A slot is released whether the native transport resolves or rejects.
 */
function limitRequests(get, limit) {
  let active = 0;
  const pending = [];
  function dispatch() {
    while (active < limit && pending.length) {
      const { path, resolve, reject } = pending.shift();
      active++;
      Promise.resolve().then(() => get(path))
        .then(resolve, reject)
        .finally(() => {
          active--;
          dispatch();
        });
    }
  }
  return path => new Promise((resolve, reject) => {
    pending.push({ path, resolve, reject });
    dispatch();
  });
}

/** Queued jobs may exist in in_progress workflow runs. Jobs are the
 * counting unit, not workflow runs. Truncation and errors mean unknown.
 */
export async function collectRunnerState({
  org, repositories, get, now = () => new Date().toISOString(),
  maxRunnerPages = 10, maxRunPages = 2, maxJobPages = 2,
  maxActiveRunsPerRepo = 30, concurrency = 4,
  kind = "all", previousState = null,
}) {
  if (!["all", "runners", "tasks"].includes(kind)) throw Error("Invalid collection kind");
  const needRunners = kind !== "tasks";
  const needTasks = kind !== "runners";
  if (!NAME.test(org ?? "") || org === "." || org === "..") throw Error("Invalid organization");
  if (!Array.isArray(repositories) || !repositories.length) {
    throw Error("Select repositories to monitor");
  }
  if (typeof get !== "function" || !Number.isInteger(concurrency) ||
    concurrency < 1 || concurrency > 8 ||
    ![maxRunnerPages, maxRunPages, maxJobPages, maxActiveRunsPerRepo].every(
      number => Number.isInteger(number) && number >= 1 && number <= 100
    )) throw Error("Invalid collector parameters");

  const selectedRepos = [...new Set(repositories)];
  if (selectedRepos.length > 100 || selectedRepos.some(repo => {
    if (typeof repo !== "string") return true;
    const components = repo.split("/");
    return components.length !== 2 || components[0].toLowerCase() !== org.toLowerCase() ||
      !NAME.test(components[1]) || components[1] === "." || components[1] === "..";
  })) throw Error("Invalid selected repositories");

  // Scope provenance is required for every retained partial refresh lane.
  const sameOrg = typeof previousState?.scope?.organization === "string" &&
    previousState.scope.organization.toLowerCase() === org.toLowerCase();
  const earlierNames = previousState?.scope?.repositories;
  const earlier = Array.isArray(earlierNames) &&
    earlierNames.every(name => typeof name === "string")
    ? new Set(earlierNames.map(name => name.toLowerCase())) : null;
  const requested = new Set(selectedRepos.map(name => name.toLowerCase()));
  const sameRepoSet = sameOrg && earlier &&
    earlier.size === requested.size && earlierNames.length === selectedRepos.length &&
    [...requested].every(name => earlier.has(name));
  const priorRunnerState = sameOrg ? previousState : null;
  const priorTaskState = sameRepoSet ? previousState : null;

  // The cap applies across every repo and nested jobs page, not per worker.
  const limitedGet = limitRequests(get, concurrency);
  const errors = [];
  let runnerPage = {
    items: Array.isArray(priorRunnerState?.runners) ? priorRunnerState.runners : [],
    complete: priorRunnerState?.coverage?.runners === true
  };
  if (needRunners) {
    runnerPage = { items: [], complete: false };
    try {
      runnerPage = await getPages(
        limitedGet,
        page => "/orgs/" + encodeURIComponent(org) + "/actions/runners?per_page=100&page=" + page,
        "runners", maxRunnerPages
      );
    } catch (error) {
      errors.push({ scope: "runners", reason: githubFailureReason(error) });
    }
    if (!runnerPage.complete && !errors.some(error => error.scope === "runners")) {
      errors.push({ scope: "runners", reason: "incomplete" });
    }
  }

  const results = needTasks ? await boundedMap(selectedRepos, concurrency, async repository => {
    const jobs = [];
    let complete = true;
    let reason = null;
    try {
      const runIds = new Set();
      for (const status of ["queued", "in_progress"]) {
        const page = await getPages(
          limitedGet,
          number => "/repos/" + repository + "/actions/runs?status=" + status +
            "&per_page=100&page=" + number,
          "workflow_runs", maxRunPages
        );
        if (!page.complete) complete = false;
        for (const run of page.items) {
          if (Number.isSafeInteger(run?.id) && run.id > 0) runIds.add(run.id);
          else complete = false;
        }
      }
      const selectedIds = [...runIds].slice(0, maxActiveRunsPerRepo);
      if (runIds.size > maxActiveRunsPerRepo) complete = false;
      const pages = await boundedMap(selectedIds, concurrency, runId => getPages(
        limitedGet,
        number => "/repos/" + repository + "/actions/runs/" + runId +
          "/jobs?filter=latest&per_page=100&page=" + number,
        "jobs", maxJobPages
      ));
      for (const page of pages) {
        if (!page.complete) complete = false;
        jobs.push(...page.items);
      }
    } catch (error) {
      complete = false;
      reason = githubFailureReason(error);
    }
    return { repository, jobs, complete, reason };
  }) : [];
  for (const result of results) {
    if (!result.complete) errors.push({
      scope: result.repository, reason: result.reason ?? "incomplete",
    });
  }
  const previousJobs = priorTaskState
    ? [...(priorTaskState.runningJobs || []),
      ...(priorTaskState.queuedJobs || []), ...(priorTaskState.waitingJobs || [])]
    : [];
  const checkedAt = now();
  const priorClock = (state, field) => state && Object.hasOwn(state, field)
    ? state[field] : state?.checkedAt ?? null;
  const summary = summarizeRunnerState({
    runners: runnerPage.items,
    jobs: needTasks ? results.flatMap(item => item.jobs) : previousJobs,
    runnerCoverage: runnerPage.complete,
    jobCoverage: needTasks ? results.every(item => item.complete)
      : priorTaskState?.coverage?.jobs === true,
    checkedAt,
  });
  return {
    ...summary,
    scope: { organization: org, repositories: selectedRepos },
    errors,
    checkedAtRunners: needRunners
      ? (summary.coverage.runners ? checkedAt : null)
      : priorClock(priorRunnerState, "checkedAtRunners"),
    checkedAtTasks: needTasks
      ? (summary.coverage.jobs ? checkedAt : null)
      : priorClock(priorTaskState, "checkedAtTasks"),
  };
}
