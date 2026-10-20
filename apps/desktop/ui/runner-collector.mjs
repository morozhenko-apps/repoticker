import { summarizeRunnerState } from "./runner-state.mjs";

/** Read-only GitHub REST collection. Auth stays inside the injected native
 * transport get(path); this module never receives a token or makes a fetch.
 */
const PAGE_SIZE = 100;
const NAME = /^[a-zA-Z0-9_.-]+$/;

async function getPages(get, pathForPage, key, maxPages) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const payload = await get(pathForPage(page));
    if (!payload || !Array.isArray(payload[key])) throw Error("Unexpected GitHub API response");
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

/** Queued jobs may exist in in_progress workflow runs. Jobs are the
 * counting unit, not workflow runs. Truncation and errors mean unknown.
 */
export async function collectRunnerState({
  org, repositories, get, now = () => new Date().toISOString(),
  maxRunnerPages = 10, maxRunPages = 2, maxJobPages = 2,
  maxActiveRunsPerRepo = 30, concurrency = 4,
}) {
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

  const errors = [];
  let runnerPage = { items: [], complete: false };
  try {
    runnerPage = await getPages(
      get,
      page => "/orgs/" + encodeURIComponent(org) + "/actions/runners?per_page=100&page=" + page,
      "runners", maxRunnerPages
    );
  } catch {
    errors.push({ scope: "runners", reason: "unavailable" });
  }
  if (!runnerPage.complete) errors.push({ scope: "runners", reason: "incomplete" });

  const results = await boundedMap(selectedRepos, concurrency, async repository => {
    const jobs = [];
    let complete = true;
    let reason = null;
    try {
      const runIds = new Set();
      for (const status of ["queued", "in_progress"]) {
        const page = await getPages(
          get,
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
        get,
        number => "/repos/" + repository + "/actions/runs/" + runId +
          "/jobs?filter=latest&per_page=100&page=" + number,
        "jobs", maxJobPages
      ));
      for (const page of pages) {
        if (!page.complete) complete = false;
        jobs.push(...page.items);
      }
    } catch {
      complete = false;
      reason = "unavailable";
    }
    return { repository, jobs, complete, reason };
  });
  for (const result of results) {
    if (!result.complete) errors.push({
      scope: result.repository, reason: result.reason ?? "incomplete",
    });
  }
  const summary = summarizeRunnerState({
    runners: runnerPage.items,
    jobs: results.flatMap(item => item.jobs),
    runnerCoverage: runnerPage.complete,
    jobCoverage: results.every(item => item.complete),
    checkedAt: now(),
  });
  return {
    ...summary,
    scope: { organization: org, repositories: selectedRepos },
    errors,
  };
}
