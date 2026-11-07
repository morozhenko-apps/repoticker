/** Read-only completed CI inputs. Does not send notifications or hold credentials.
 * Native GitHub REST transport projects the exact fields accepted here.
 */
const NAME = /^[A-Za-z0-9_.-]{1,100}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const canonicalUtc = value => {
  if (typeof value !== "string" || !UTC.test(value)) return false;
  const millis = Date.parse(value);
  return Number.isFinite(millis) &&
    new Date(millis).toISOString().slice(0, 19) + "Z" === value;
};
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
    canonicalUtc(run.updated_at);
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

/** Process-local outcome tracking, silent on the first observation.
 * Each explicit failure/success for a run attempt is emitted at most once.
 * A mode or repository scope change creates a new silent baseline. Partial
 * provider errors and missing runs cannot fabricate completion events.
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
    observe({ account, repositories, results, mode = "off" }) {
      if (!["off", "failures", "successes", "both"].includes(mode))
        throw Error("Invalid notification mode");
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
            !result.runs.every(validRun) ||
            new Set(result.runs.map(run => run.id + "/" + run.run_attempt)).size !==
              result.runs.length) {
          throw Error("Invalid notification run facts");
        }
      }
      const nextScope = mode + ":" + account.toLowerCase() + ":" +
        [...allowed].sort().join(",");
      if (scope !== nextScope) {
        scope = nextScope;
        history.clear();
      }
      const alerts = [];
      for (const result of results) {
        const repo = result.repository.toLowerCase();
        if (result.error) {
          // A missing observation cannot prove when the unseen runs ended.
          // Silently rebaseline this repository after its next valid read.
          history.delete(repo);
          continue;
        }
        const previous = history.get(repo);
        const seen = previous || new Map();
        for (const run of result.runs) {
          const key = run.id + "/" + run.run_attempt;
          // Two monotonic conclusion bits prevent stale alternating API reads
          // from re-alerting an already seen run/attempt/outcome.
          const prior = seen.get(key) || 0;
          const bit = run.conclusion === "failure" ? 1 :
            run.conclusion === "success" ? 2 : 0;
          const enabled = mode === "both" ||
            (mode === "failures" && bit === 1) ||
            (mode === "successes" && bit === 2);
          if (previous && bit !== 0 && enabled && !(prior & bit)) {
            alerts.push({
              repository: result.repository, id: run.id,
              run_attempt: run.run_attempt, conclusion: run.conclusion,
              updated_at: run.updated_at
            });
          }
          // Preserve distinct failure/success facts across stale responses.
          // Do not retain titles, actors, URLs or other provider metadata.
          seen.delete(key);
          seen.set(key, prior | bit);
        }
        while (seen.size > maxRemembered) seen.delete(seen.keys().next().value);
        history.set(repo, seen);
      }
      return alerts;
    }
  };
}
