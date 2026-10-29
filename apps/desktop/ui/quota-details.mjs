import { shown, compactStatus } from "./status-metrics.mjs";
import { normalizeLocale } from "./locale-catalog.mjs";

// Canonical IDs remain persisted unchanged; presentation maps only those
// locale variants whose Intl locale data expects a regional identifier.
function displayLocale(language) {
  const code = normalizeLocale(language);
  return ({ pt: "pt-PT", "zh-Hant": "zh-TW", fil: "fil-PH" })[code] ?? code;
}
// Bound only the displayed runner label, never the GitHub model identity.
 // Intl.Segmenter keeps emoji ZWJ sequences and combining marks intact;
 // legacy WebKit engines still retain complete Unicode code points.
const runnerSegmenter = typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
export function displayRunnerName(value) {
  if (typeof value !== "string" || !value.trim()) return "Unnamed runner";
  const raw = value.trim();
  const units = runnerSegmenter ? runnerSegmenter.segment(raw) : raw;
  let result = "";
  let count = 0;
  for (const unit of units) {
    if (count === 38) break;
    result += typeof unit === "string" ? unit : unit.segment;
    count++;
  }
  return result;
}
export function localCheckedTime(value, timeZone, language = "en") {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "Unknown";
  const options = { year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
  if (timeZone) options.timeZone = timeZone;
  return new Intl.DateTimeFormat(displayLocale(language), options).format(new Date(value));
}
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
  return view("Runners · " + total, [{
    title: "",
    rows: [["Online", online],
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
    rows.push([displayRunnerName(runner.name), shown(running)]);
  }
  if (runners.length > 4) rows.push(["More self-hosted", "+" + (runners.length - 4)]);
  if (!runnersCovered) rows.push(["Self-hosted", "—"]);
  rows.push(["GitHub-hosted", shown(jobsCovered ? counts.runningGitHubHosted : null)]);
  return view("Tasks · Running " + shown(jobsCovered ? counts.running : null) +
    " / Queued " + shown(jobsCovered ? counts.queued : null),
    [{ title: "", rows }]);
}

function billingDetails(billing = null, language = "en") {
  const fmt = value => Number.isFinite(value) && value >= 0
    ? new Intl.NumberFormat(displayLocale(language), { maximumFractionDigits: 2 }).format(value) : "—";
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
export function buildHoverDetails(state, kind = "billing", authorized = false, statusMessage = null, billing = null, language = "en") {
  if (!isHoverKind(kind)) return notReady(authorized, "Status", "Unknown tooltip type.");
  // Distinguish checking the OS keyring / loading data from an actually
  // disconnected account. Neither phase asserts that counts are known.
  if (!state && ["Checking GitHub connection...", "Connecting to GitHub..."].includes(statusMessage))
    return { connected: false, status: "Connecting", message: statusMessage, sections: [] };
  if (kind === "billing") return authorized ? billingDetails(billing, language) : notReady(false, "Billing");
  if (!state || !state.counts || !state.coverage)
    return notReady(authorized, kind === "runners" ? "Runners" : "Tasks", statusMessage);
  const result = kind === "runners" ? runnerDetails(state) : tasksDetails(state);
  const hasSeparateTimes = Object.hasOwn(state, "checkedAtRunners") ||
    Object.hasOwn(state, "checkedAtTasks");
  const checkedAt = kind === "runners"
    ? (hasSeparateTimes ? state.checkedAtRunners : state.checkedAt)
    : (hasSeparateTimes ? state.checkedAtTasks : state.checkedAt);
  result.message = "Checked: " + localCheckedTime(checkedAt, undefined, language);
  return result;
}

// Existing entrypoint remains for consumers testing billing-only presentation.
export function buildQuotaDetails(state, authorized = false, statusMessage = null, billing = null) {
  return buildHoverDetails(state, "billing", authorized, statusMessage, billing);
}
