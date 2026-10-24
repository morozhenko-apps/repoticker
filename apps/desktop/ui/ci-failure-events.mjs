/** Read-only CI failure inputs. Does not send notifications or hold credentials.
 * Native GitHub REST transport projects the exact fields accepted here.
 */
const NAME = /^[A-Za-z0-9_.-]{1,100}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const CONCLUSIONS = new Set([
  "success", "failure", "cancelled", "skipped", "timed_out",
  "action_required", "neutral", "stale", "startup_failure"
]);
const PAGE_SIZE = 100;

function validateSelection(account, repositories) {
  if (!NAME.test(account) || account === "." || account === ".." ||
      !Array.isArray(repositories) || repositories.length < 1 ||
      repositories.length > 100) throw Error("Invalid notification scope");
  const normalized = [];
  for (const repo of repositories) {
    if (typeof repo !== "string") throw Error("Invalid notification repository");
    const names = repo.split("/");
    if (names.length !== 2 || !names.every(name =>
      NAME.test(name) && name !== "." && name !== "..") ||
      names[0].toLowerCase() !== account.toLowerCase()) {
      throw Error("Invalid notification repository");
    }
    normalized.push(repo);
  }
  if (new Set(normalized.map(name => name.toLowerCase())).size !== normalized.length) {
    throw Error("Duplicate notification repository");
  }
  return normalized;
}

function validRun(run) {
  return run && Number.isSafeInteger(run.id) && run.id > 0 &&
    Number.isInteger(run.run_attempt) && run.run_attempt >= 1 &&
    run.run_attempt <= 1_000_000 &&
    CONCLUSIONS.has(run.conclusion) &&
    typeof run.updated_at === "string" && UTC.test(run.updated_at) &&
    !Number.isNaN(Date.parse(run.updated_at));
}

/** Poll a bounded recent *window*, not every historical workflow run.
 * A failed repository read is independent of other repositories.
 * Only explicit completed conclusions can create an alert candidate.
 */
export async function collectRecentCompleted({
  get, account, repositories, maxPages = 2, concurrency = 4
}) {
  const names = validateSelection(account, repositories);
  if (typeof get !== "function" || !Number.isInteger(maxPages) ||
      maxPages < 1 || maxPages > 2 || !Number.isInteger(concurrency) ||
      concurrency < 1 || concurrency > 4) throw Error("Invalid notification collector");
  const results = new Array(names.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, async () => {
    while (index < names.length) {
      const slot = index++;
      const repository = names[slot];
      try {
        const runs = [];
        for (let page = 1; page <= maxPages; page++) {
          const payload = await get("/repos/" + repository +
            "/actions/runs?status=completed&per_page=100&page=" + page);
          if (!Array.isArray(payload?.workflow_runs) ||
              payload.workflow_runs.length > PAGE_SIZE ||
              !payload.workflow_runs.every(validRun)) {
            throw Error("Invalid completed-run response");
          }
          runs.push(...payload.workflow_runs);
          if (payload.workflow_runs.length < PAGE_SIZE) break;
        }
        results[slot] = { repository, runs };
      } catch (_) {
        // A partial/failed read must not establish a baseline or emit alerts.
        results[slot] = { repository, error: "unavailable" };
      }
    }
  }));
  return results;
}

/** Process-local transition tracking, intentionally silent on first observation.
 * An explicit new failure for a distinct run attempt is the only alert trigger.
 * A scope change always creates a new silent baseline; cached provider errors
 * and missing run IDs cannot be interpreted as CI failures.
 */
export function createCiFailureTracker({ maxRemembered = 500 } = {}) {
  if (!Number.isInteger(maxRemembered) || maxRemembered < 200 ||
      maxRemembered > 1000) throw Error("Invalid notification history limit");
  let scope = null;
  const history = new Map();

  return {
    reset() {
      scope = null;
      history.clear();
    },
    observe({ account, repositories, results }) {
      const names = validateSelection(account, repositories);
      if (!Array.isArray(results)) throw Error("Invalid notification observations");
      const allowed = new Set(names.map(name => name.toLowerCase()));
      const checked = new Set();
      // Validate every successful snapshot before altering any history.
      for (const result of results) {
        if (!result || typeof result.repository !== "string" ||
            !allowed.has(result.repository.toLowerCase()) ||
            checked.has(result.repository.toLowerCase())) {
          throw Error("Invalid notification observation scope");
        }
        checked.add(result.repository.toLowerCase());
        if (result.error !== undefined) {
          if (result.error !== "unavailable" || result.runs !== undefined) {
            throw Error("Invalid notification error");
          }
          continue;
        }
        if (!Array.isArray(result.runs) || result.runs.length > 200 ||
            !result.runs.every(validRun)) {
          throw Error("Invalid notification run facts");
        }
      }
      const nextScope = account.toLowerCase() + ":" +
        [...allowed].sort().join(",");
      if (scope !== nextScope) {
        scope = nextScope;
        history.clear();
      }
      const alerts = [];
      for (const result of results) {
        if (result.error) continue;
        const repo = result.repository.toLowerCase();
        const previous = history.get(repo);
        const seen = previous || new Map();
        for (const run of result.runs) {
          const key = run.id + "/" + run.run_attempt;
          if (previous && !seen.has(key) && run.conclusion === "failure") {
            alerts.push({
              repository: result.repository, id: run.id,
              run_attempt: run.run_attempt, updated_at: run.updated_at
            });
          }
          // Refresh LRU order only for valid conclusions; never include raw
          // run titles, actor identities, URLs or response fields.
          seen.delete(key);
          seen.set(key, true);
        }
        while (seen.size > maxRemembered) seen.delete(seen.keys().next().value);
        history.set(repo, seen);
      }
      return alerts;
    }
  };
}
