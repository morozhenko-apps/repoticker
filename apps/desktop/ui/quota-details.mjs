import { shown, compactStatus } from "./status-metrics.mjs";

const safeName = value => typeof value === "string" && value.trim()
  ? value.trim().slice(0, 38) : "Unnamed runner";
const timestamp = value => typeof value === "string" && Number.isFinite(Date.parse(value))
  ? new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC"
  : "Unknown";
const view = (status, sections, message = "") => ({
  connected: true, status, sections, message,
});
const notReady = (authorized, topic, reason) => ({
  connected: false,
  status: authorized ? topic + " unavailable" : "Not connected",
  message: authorized
    ? reason || "Monitoring data unavailable. — means unknown."
    : "Connect GitHub in Settings to read this status.",
  sections: [],
});

export const HOVER_KINDS = Object.freeze(["runners", "tasks", "billing"]);
export function isHoverKind(kind) {
  return HOVER_KINDS.includes(kind);
}

function runnerDetails(state) {
  const { total, online, offline } = compactStatus(state);
  const counts = state.counts;
  return view("", [{
    title: "",
    rows: [["Total", total], ["Online", online],
      ["Busy", shown(state.coverage.runners ? counts.busy : null)],
      ["Idle", shown(state.coverage.runners ? counts.idle : null)],
      ["Offline", offline]],
  }]);
}

function tasksDetails(state) {
  const counts = state.counts;
  const jobsCovered = state.coverage.jobs === true;
  const runnersCovered = state.coverage.runners === true;
  const runners = runnersCovered && Array.isArray(state.runners) ? state.runners : [];
  const active = jobsCovered && Array.isArray(state.runningJobs) ? state.runningJobs : [];
  const rows = [];
  for (const runner of runners.slice(0, 4)) {
    const running = jobsCovered
      ? active.filter(job => job.runner_id === runner.id).length : null;
    rows.push([safeName(runner.name), shown(running)]);
  }
  if (runners.length > 4) rows.push(["More self-hosted", "+" + (runners.length - 4)]);
  if (!runnersCovered) rows.push(["Self-hosted", "—"]);
  rows.push(["GitHub-hosted", shown(jobsCovered ? counts.runningGitHubHosted : null)]);
  return view("Tasks · Running " + shown(jobsCovered ? counts.running : null) +
    " / Queued " + shown(jobsCovered ? counts.queued : null),
    [{ title: "", rows }]);
}

function billingDetails(billing = null) {
  const fmt = value => Number.isFinite(value) && value >= 0
    ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";
  const sections = [
    ["Organization", billing?.organization],
    ["Personal account", billing?.personal],
  ].map(([title, account]) => {
    const rows = [
      ["Plan", account?.plan || "—"],
      ["Included min", fmt(account?.included)],
      ["Used min (gross)", fmt(account?.reported)],
    ];
    // One concise diagnostic only if consumption is unavailable.
    const message = account?.reported == null
      ? account?.reason || "Usage not available" : null;
    return { title, rows, message };
  });
  const period = /^\d{4}-(?:0[1-9]|1[0-2])$/.test(billing?.month || "")
    ? billing.month : "—";
  return view("Actions · " + period, sections);
}

/** The pointer-pass-through popup cannot scroll, click links or pin.
 * Only safe projected values and at most six runner rows are displayed.
 */
export function buildHoverDetails(state, kind = "billing", authorized = false, statusMessage = null, billing = null) {
  if (!isHoverKind(kind)) return notReady(authorized, "Status", "Unknown tooltip type.");
  if (kind === "billing") return authorized ? billingDetails(billing) : notReady(false, "Billing");
  if (!state || !state.counts || !state.coverage)
    return notReady(authorized, kind === "runners" ? "Runners" : "Tasks", statusMessage);
  const result = kind === "runners" ? runnerDetails(state) : tasksDetails(state);
  result.message = "Checked: " + timestamp(state.checkedAt);
  return result;
}

// Existing entrypoint remains for consumers testing billing-only presentation.
export function buildQuotaDetails(state, authorized = false, statusMessage = null, billing = null) {
  return buildHoverDetails(state, "billing", authorized, statusMessage, billing);
}
