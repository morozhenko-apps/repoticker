/** Strict projection for the compact strip. An unknown source is never zero. */
export const shown = n => Number.isSafeInteger(n) && n >= 0 ? String(n) : "—";

export function compactStatus(state) {
  const counts = state?.counts;
  const coveredRunners = state?.coverage?.runners === true;
  const coveredJobs = state?.coverage?.jobs === true;
  const valid = n => Number.isSafeInteger(n) && n >= 0;
  const total = coveredRunners && [counts?.busy, counts?.idle, counts?.offline].every(valid)
    ? counts.busy + counts.idle + counts.offline : null;
  const online = coveredRunners && valid(counts?.busy) && valid(counts?.idle)
    ? counts.busy + counts.idle : null;
  const offline = coveredRunners && valid(counts?.offline) ? counts.offline : null;
  return {
    total: shown(total),
    online: shown(online),
    offline: shown(offline),
    running: shown(coveredJobs ? counts?.running : null),
    queued: shown(coveredJobs ? counts?.queued : null),
  };
}
