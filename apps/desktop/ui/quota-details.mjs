const shown = n => Number.isSafeInteger(n) && n >= 0 ? String(n) : "—";
const laneRows = (counts, prefix) => [
  ["Self-hosted", shown(counts?.[prefix + "SelfHosted"])],
  ["GitHub-hosted", shown(counts?.[prefix + "GitHubHosted"])],
  ["Unclassified", shown(counts?.[prefix + "Unclassified"])],
];

function runnerPreview(state) {
  if (state.coverage?.runners !== true || !Array.isArray(state.runners)) return null;
  const runners = state.runners;
  const preview = runners.slice(0, 2).map(runner => {
    const name = typeof runner.name === "string" ? runner.name.trim().slice(0, 32) : "Unknown";
    const status = runner.status === "offline" ? "Offline" :
      runner.busy === true ? "Busy" : runner.ready === true ? "Idle" : "Unknown";
    return name + ": " + status;
  });
  if (runners.length > 2) preview.push("+" + (runners.length - 2) + " more");
  return preview.length ? preview.join(" · ") : null;
}

/** A pointer-pass-through hover balloon cannot scroll or activate links.
 * Keep the four critical data cards visible within the 320px window.
 * Actions job links stay in the native provider snapshot for a future
 * interactive surface; they are not falsely rendered as clickable here.
 */
export function buildQuotaDetails(state, authorized = false, statusMessage = null) {
  if (!state || !state.counts || !state.coverage) {
    return authorized
      ? { connected: false, status: "GitHub authorized",
          message: statusMessage || "Fetching job and runner counts. — means unknown.",
          sections: [] }
      : { connected: false, status: "Not connected",
          message: "Connect GitHub to view runners and jobs. Hosted billing quotas require separate permissions.",
          sections: [] };
  }

  const c = state.counts;
  const online = Number.isSafeInteger(c.busy) && Number.isSafeInteger(c.idle)
    ? String(c.busy + c.idle) : "—";
  const sections = [
    { title: "Online self-hosted · " + online, rows: [
      ["Busy", shown(c.busy)], ["Idle", shown(c.idle)], ["Offline", shown(c.offline)]
    ], message: runnerPreview(state) },
    { title: "Running · " + shown(c.running), rows: laneRows(c, "running") },
    { title: "Queued · " + shown(c.queued), rows: laneRows(c, "queued") },
    { title: "Hosted usage (unknown)", rows: [
      ["Minutes left", "—"], ["Concurrency", "—"]
    ], message: "No billing access; may be exhausted." },
  ];
  const partial = state.coverage.runners !== true || state.coverage.jobs !== true ||
    state.coverage.runningLanes !== true || state.coverage.queuedLanes !== true;
  const checked = typeof state.checkedAt === "string" &&
    Number.isFinite(Date.parse(state.checkedAt))
    ? new Date(state.checkedAt).toISOString().replace("T", " ").slice(0, 16) + " UTC"
    : "Unknown";
  const note = typeof statusMessage === "string" && statusMessage.trim()
    ? " " + statusMessage.trim().slice(0, 100) : "";
  return {
    connected: true,
    status: partial ? "Partial monitoring data" : "Job counts collected",
    message: "Checked: " + checked + (partial ? ". Some data unknown." : "") + note,
    sections,
  };
}
