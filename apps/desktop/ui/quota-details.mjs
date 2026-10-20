import { safeActionsJobUrl } from "./model.mjs";

const shown = n => Number.isSafeInteger(n) && n >= 0 ? String(n) : "—";
const lanes = (s, prefix) => [
  ["Self-hosted", shown(s?.counts?.[prefix + "SelfHosted"])],
  ["GitHub-hosted", shown(s?.counts?.[prefix + "GitHubHosted"])],
  ["Unclassified", shown(s?.counts?.[prefix + "Unclassified"])],
];

/** No fake quota values; returns only safe strings and allowlisted job links. */
export function buildQuotaDetails(state) {
  if (!state || !state.counts || !state.coverage) {
    return { connected: false, status: "Not connected",
      message: "Connect GitHub to view runners, active jobs and queue. Usage limits require separate permissions.",
      sections: [] };
  }
  const c = state.counts;
  const online = Number.isSafeInteger(c.busy) && Number.isSafeInteger(c.idle)
    ? String(c.busy + c.idle) : "—";
  const sections = [
    { title: "Runner availability", rows: [
      ["Online", online], ["Busy", shown(c.busy)],
      ["Idle", shown(c.idle)], ["Offline", shown(c.offline)],
    ] },
    { title: "Running · " + shown(c.running), rows: lanes(state, "running") },
    { title: "Queued · " + shown(c.queued), rows: lanes(state, "queued") },
  ];
  const runners = (Array.isArray(state.runners) ? state.runners : []).slice(0, 10)
    .map(r => ({
      label: typeof r.name === "string" ? r.name.slice(0, 100) : "Unknown runner",
      value: r.status === "offline" ? "Offline" :
        r.busy === true ? "Busy" : r.ready === true ? "Idle" : "Unknown",
    }));
  if (runners.length) sections.push({ title: "Self-hosted runners",
    rows: runners.map(r => [r.label, r.value]) });
  const jobs = [
    ...(Array.isArray(state.runningJobs) ? state.runningJobs : []),
    ...(Array.isArray(state.queuedJobs) ? state.queuedJobs : []),
  ];
  const links = jobs.flatMap(job => {
    const url = safeActionsJobUrl(job.html_url);
    const title = typeof job.name === "string" && job.name.trim()
      ? job.name.trim().slice(0, 120) : "GitHub Actions job";
    return url ? [{ label: title, url }] : [];
  }).slice(0, 8);
  if (links.length) sections.push({ title: "Active jobs", links });
  sections.push({ title: "GitHub Actions limits",
    message: "Billing minutes and hosted concurrency quota: unavailable without authorized billing data. Busy is not CPU/RAM usage." });
  const partial = state.coverage.runners !== true || state.coverage.jobs !== true ||
    state.coverage.runningLanes !== true || state.coverage.queuedLanes !== true;
  const checked = typeof state.checkedAt === "string" &&
    Number.isFinite(Date.parse(state.checkedAt))
    ? new Date(state.checkedAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "Unknown";
  return { connected: true,
    status: partial ? "Partial / unclassified data" : "Available",
    message: (partial ? "Some sources are incomplete; — means unknown, not zero. " : "") +
      "Last checked: " + checked,
    sections };
}
