import { shown, compactStatus } from "./status-metrics.mjs";
import { runnerLabelCompatible } from "./runner-state.mjs";

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
  const c = state.counts;
  return view("Self-hosted runners", [{
    title: "Organization runner inventory",
    rows: [["Total", total], ["Online", online],
      ["Busy", shown(state.coverage.runners ? c.busy : null)],
      ["Idle", shown(state.coverage.runners ? c.idle : null)],
      ["Offline", offline]],
  }], "GitHub-hosted runners are not registered here.");
}

function tasksDetails(state) {
  const c = state.counts;
  const complete = state.coverage.jobs === true;
  const inventory = state.coverage.runners === true;
  const running = complete ? c.running : null;
  const queued = complete ? c.queued : null;
  const rows = [];
  const runners = inventory && Array.isArray(state.runners) ? state.runners : [];
  const active = complete && Array.isArray(state.runningJobs) ? state.runningJobs : [];
  const pending = complete && Array.isArray(state.queuedJobs) ? state.queuedJobs : [];
  for (const runner of runners.slice(0, 4)) {
    const runningCount = complete
      ? active.filter(job => job.runner_id === runner.id).length : null;
    const candidateCount = complete
      ? pending.filter(job => runnerLabelCompatible(job.labels, runner.labels)).length : null;
    rows.push([safeName(runner.name), shown(runningCount) + " / " + shown(candidateCount)]);
  }
  if (runners.length > 4) rows.push(["Other runners", "+" + (runners.length - 4) + " not listed"]);
  if (!inventory) rows.push(["Self-hosted runners", "—"]);
  const split = [
    ["Self-hosted jobs", shown(complete ? c.runningSelfHosted : null) +
      " / " + shown(complete ? c.queuedSelfHosted : null)],
    ["GitHub-hosted jobs", shown(complete ? c.runningGitHubHosted : null) +
      " / " + shown(complete ? c.queuedGitHubHosted : null)],
    ["Unclassified jobs", shown(complete ? c.runningUnclassified : null) +
      " / " + shown(complete ? c.queuedUnclassified : null)],
  ];
  return view("Tasks · Running " + shown(running) + " / Queued " + shown(queued), [
    { title: "Runner · Running / eligible queue", rows },
    { title: "Other jobs · Running / Queued", rows: split },
  ], "Queued jobs are not assigned to a runner until GitHub schedules them. " +
      "A job may be compatible with multiple runners.");
}

function billingDetails(billing = null) {
  const formatMinutes = value => Number.isFinite(value) && value >= 0
    ? (Number.isInteger(value) ? value.toLocaleString("en-US") :
      value.toLocaleString("en-US", { maximumFractionDigits: 2 })) : "—";
  const accounts = [
    ["Organization", billing?.organization],
    ["Personal account", billing?.personal],
  ];
  const sections = accounts.map(([title, account]) => ({
    title,
    rows: [
      ["Included min", formatMinutes(account?.included)],
      ["Reported SKU min", formatMinutes(account?.reported)],
      ["Free remaining", "—"],
    ],
    message: account?.reason || (title === "Organization"
      ? "Requires Administration: read." : "Requires Plan: read."),
  }));
  const period = /^\d{4}-(?:0[1-9]|1[0-2])$/.test(billing?.month || "")
    ? billing.month : "unknown month";
  return view("Actions billing · " + period, sections,
    "Reported SKU minutes are not free-minute consumption. " +
    "Free remaining requires authoritative allowance accounting.");
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
  result.message += " Checked: " + timestamp(state.checkedAt) + ".";
  if (statusMessage) result.message += " " + String(statusMessage).slice(0, 80);
  return result;
}

// Existing entrypoint remains for consumers testing billing-only presentation.
export function buildQuotaDetails(state, authorized = false, statusMessage = null, billing = null) {
  return buildHoverDetails(state, "billing", authorized, statusMessage, billing);
}
