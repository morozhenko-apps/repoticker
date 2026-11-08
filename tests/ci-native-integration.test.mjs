import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startGithubMonitoring } from "../apps/desktop/ui/github-monitor.mjs";

const tick = async () => {
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
};
const run = id => ({
  id, run_attempt: 1, conclusion: "failure", updated_at: "2026-10-24T19:00:00Z"
});
function fixture(mode, { showCiStatus = false, clock = null } = {}) {
  let authorized = true;
  const ciStatuses = [];
  const calls = [];
  const listeners = new Map();
  let runs = [run(10)];
  let setting = mode;
  let collectionFailure = null;
  let readFailure = false;
  const state = {
    coverage: { jobs: true, runners: true },
    scope: { organization: "team", repositories: ["team/repo"] },
    counts: { running: 0, queued: 0 }, errors: []
  };
  const invoke = async (command, args = {}) => {
    calls.push({ command, args });
    if (command === "github_auth_status") return { connected: authorized };
    if (command === "get_monitor_selection") return {
      github_monitor_org: "team", github_monitor_repositories: ["team/repo"],
      ci_notification_mode: setting
    };
    if (command === "github_monitor_publish") return undefined;
    if (command === "github_api_get") {
      if (readFailure) throw Error("Provider unavailable");
      return { workflow_runs: runs };
    }
    if (command === "ci_run_notify") return true;
    throw Error("Unexpected command " + command);
  };
  const refresh = startGithubMonitoring({
    invoke,
    event: { listen(name, callback) { listeners.set(name, callback); } },
    schedule() {},
    onCiStatus: showCiStatus ? value => ciStatuses.push(value) : null,
    now: clock ? () => clock.value : () => Date.now(),
    collect: async () => ({ state: structuredClone(state), repositoryCount: 1,
      failure: collectionFailure, reason: null })
  });
  return {
    calls, refresh, ciStatuses,
    relay(kind) {
      listeners.get("repoticker-relay-reconcile")?.({ payload: { kind } });
    },
    async ready() { await tick(); },
    setRuns(values) { runs = values; },
    setReadFailure(value) { readFailure = value; },
    setSetting(value) { setting = value; },
    setCollectorFailure(reason, errors, jobsCovered = true) {
      collectionFailure = reason;
      state.errors = errors;
      state.coverage.jobs = jobsCovered;
      state.coverage.runners = !errors.some(e => e.scope === "runners");
    },
    setAuthorized(value) { authorized = value; },
    disconnect() {
      authorized = false;
      listeners.get("repoticker-github-auth")?.({ payload: { status: "disconnected" } });
    },
    configChanged() {
      listeners.get("repoticker-config-changed")?.({});
    }
  };
}

test("Given notifications disabled without a CI status consumer When monitoring Then no completed runs are read", async () => {
  const app = fixture("off");
  await app.ready();
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length, 0);
  app.setRuns([run(11)]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length, 0);
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0);
});

test("Given enabled notifications When failure appears after silent baseline Then native alert is sent once", async () => {
  const app = fixture("failures");
  await app.ready();
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0);
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length, 1);
  app.setRuns([run(12), run(10)]);
  await app.refresh(true, "tasks");
  const alerts = app.calls.filter(x => x.command === "ci_run_notify");
  assert.deepEqual(alerts.map(x => x.args), [{
    repository: "team/repo", runId: 12, runAttempt: 1, conclusion: "failure"
  }]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 1);
  await app.refresh(true, "runners");
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length, 3,
    "Runner-only refresh must not poll completed runs");
});

test("Given user disables notifications When configuration changes Then new historical failure is silent", async () => {
  const app = fixture("failures");
  await app.ready();
  app.setSetting("off");
  app.configChanged();
  await app.ready();
  app.setRuns([run(13), run(10)]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0);
  app.setSetting("failures");
  app.configChanged();
  await app.ready();
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0,
    "Re-enabling must establish a new silent baseline");
  app.setRuns([run(14), run(13), run(10)]);
  await app.refresh(true, "tasks");
  assert.deepEqual(app.calls.filter(x => x.command === "ci_run_notify")
    .map(x => x.args.runId), [14]);
  app.disconnect();
  await app.ready();
  app.setRuns([run(15)]);
  await app.refresh(true);
  assert.deepEqual(app.calls.filter(x => x.command === "ci_run_notify")
    .map(x => x.args.runId), [14],
    "No alerts while authorization is disconnected");
});

test("Given WebView alert data When native delivery runs Then permissions and config gate OS plugin", () => {
  const native = readFileSync(new URL(
    "../apps/desktop/src-tauri/src/ci_notifications.rs", import.meta.url), "utf8");
  const main = readFileSync(new URL(
    "../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  const html = readFileSync(new URL(
    "../apps/desktop/ui/settings.html", import.meta.url), "utf8");
  const settings = readFileSync(new URL(
    "../apps/desktop/ui/settings.mjs", import.meta.url), "utf8");
  assert.match(native, /if !config\.ci_notification_mode\.allows\(conclusion\)/);
  assert.match(native, /github_monitor_repositories/);
  assert.match(native, /permission_state\(\)/);
  const titles = JSON.parse(readFileSync(new URL(
    "../apps/desktop/ui/locales/notifications.json", import.meta.url), "utf8"));
  assert.equal(titles.en.title, "RepoTicker: CI failure");
  assert.match(native,
    /let \(title, body\)\s*=\s*notification_text\(\s*&config\.language,\s*&repository,\s*run_id,\s*run_attempt,\s*&conclusion,?\s*\)/);
  assert.match(native, /\.title\(title\)/);
  assert.match(native, /\.show\(\)/);
  assert.doesNotMatch(native, /bearer_auth|access_token|shell|spawn\(/);
  assert.match(main, /tauri_plugin_notification::init\(\)/);
  assert.match(main, /ci_notifications::ci_run_notify/);
  assert.match(main, /#\[serde\(default\)\]\s*ci_notification_mode: CiNotificationMode/);
  assert.match(html, /<select id="ci-notification-mode">/);
  assert.match(settings, /draft\.ciNotificationMode/);
  assert.match(settings, /configChanges\.ciNotificationMode = draft\.ciNotificationMode/);
});

test("Given credential silently expires When authorization returns Then first recovered read is a silent baseline", async () => {
  const app = fixture("failures");
  await app.ready();
  app.setAuthorized(false);
  await app.refresh(true);
  app.setRuns([run(22), run(10)]);
  app.setAuthorized(true);
  await app.refresh(true);
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0,
    "An expired native session must not retain previous notification history");
  app.setRuns([run(23), run(22), run(10)]);
  await app.refresh(true);
  assert.deepEqual(app.calls.filter(x => x.command === "ci_run_notify")
    .map(x => x.args.runId), [23]);
});

test("Given successful workflows When runs complete after opt-in Then no alert is delivered", async () => {
  const app = fixture("failures");
  await app.ready();
  app.setRuns([{ ...run(30), conclusion: "success" }, run(10)]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0,
    "Finishing a successful runner job is never a CI failure");
});

test("Given runner inventory permission denied When tasks remain covered Then new CI failures still notify", async () => {
  const app = fixture("failures");
  await app.ready();
  app.setCollectorFailure("permission_denied",
    [{ scope: "runners", reason: "permission_denied" }]);
  app.setRuns([run(31), run(10)]);
  await app.refresh(true, "tasks");
  assert.deepEqual(app.calls.filter(x => x.command === "ci_run_notify")
    .map(x => x.args.runId), [31],
    "Read-only Actions failures are independent of org runner inventory");
});

test("Given jobs are incomplete or globally rate-limited When runs change Then no CI alert is fabricated", async () => {
  const app = fixture("failures");
  await app.ready();
  const baselineReads = app.calls.filter(x => x.command === "github_api_get").length;
  app.setRuns([run(40), run(10)]);
  app.setCollectorFailure("permission_denied", [
    { scope: "runners", reason: "permission_denied" },
    { scope: "team/repo", reason: "permission_denied" }
  ], false);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length,
    baselineReads, "Missing job coverage blocks the completed-run read");
  app.setCollectorFailure("rate_limited",
    [{ scope: "runners", reason: "rate_limited" }], true);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0);
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length,
    baselineReads, "Rate limiting blocks independent completed-run reads");
});

test("Successes mode notifies only new successes; both mode baselines before dual alerts", async () => {
  const app = fixture("successes");
  await app.ready();
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0);
  app.setRuns([{ ...run(52), conclusion: "success" }, run(51), run(10)]);
  await app.refresh(true, "tasks");
  assert.deepEqual(app.calls.filter(x => x.command === "ci_run_notify")
    .map(x => [x.args.runId, x.args.conclusion]), [[52, "success"]]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 1);
  app.setSetting("both");
  app.configChanged();
  await app.ready();
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 1,
    "Changing notification mode must not replay old runs");
  app.setRuns([{ ...run(54), conclusion: "success" }, run(53),
    { ...run(52), conclusion: "success" }, run(51)]);
  await app.refresh(true, "tasks");
  assert.deepEqual(app.calls.filter(x => x.command === "ci_run_notify")
    .map(x => [x.args.runId, x.args.conclusion]),
  [[52, "success"], [54, "success"], [53, "failure"]]);
});

test("Given a completed-run API outage When it recovers Then old completions stay silent", async () => {
  const app = fixture("both");
  await app.ready();
  app.setReadFailure(true);
  await app.refresh(true, "tasks");
  app.setRuns([{ ...run(60), conclusion: "success" }, run(59)]);
  app.setReadFailure(false);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0);
  app.setRuns([{ ...run(61), conclusion: "success" },
    { ...run(60), conclusion: "success" }, run(59)]);
  await app.refresh(true, "tasks");
  assert.deepEqual(app.calls.filter(x => x.command === "ci_run_notify")
    .map(x => [x.args.runId, x.args.conclusion]), [[61, "success"]]);
});

test("Given a failed task collection When monitoring recovers Then history is rebaselined", async () => {
  const app = fixture("failures");
  await app.ready();
  app.setCollectorFailure("rate_limited",
    [{ scope: "team/repo", reason: "rate_limited" }], false);
  await app.refresh(true, "tasks");
  app.setRuns([run(71), run(10)]);
  app.setCollectorFailure(null, [], true);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0,
    "Unknown provider interval is not historical catch-up");
  app.setRuns([run(72), run(71), run(10)]);
  await app.refresh(true, "tasks");
  assert.deepEqual(app.calls.filter(x => x.command === "ci_run_notify")
    .map(x => x.args.runId), [72]);
});

test("Given CI status enabled with notifications off When tasks refresh Then last run is shown without alerts", async () => {
  const app = fixture("off", { showCiStatus: true });
  await app.ready();
  assert.equal(app.calls.filter(call => call.command === "github_api_get").length, 1);
  assert.equal(app.calls.filter(call => call.command === "ci_run_notify").length, 0);
  assert.equal(app.ciStatuses.at(-1).outcomes.get("team/repo"), "failure");
  app.setRuns([{ ...run(77), conclusion: "success" }, run(10)]);
  await app.refresh(true, "tasks");
  assert.equal(app.ciStatuses.at(-1).outcomes.get("team/repo"), "success");
  assert.equal(app.calls.filter(call => call.command === "ci_run_notify").length, 0);
  const reads = app.calls.filter(call => call.command === "github_api_get").length;
  await app.refresh(true, "runners");
  assert.equal(app.calls.filter(call => call.command === "github_api_get").length, reads,
    "Runner-only refresh never spends extra CI status requests");
});

test("Given CI status presented When provider data fails or user disconnects Then prior green is cleared", async () => {
  const app = fixture("both", { showCiStatus: true });
  app.setRuns([{ ...run(92), conclusion: "success" }]);
  await app.ready();
  assert.equal(app.ciStatuses.at(-1).outcomes.get("team/repo"), "success");
  app.setReadFailure(true);
  await app.refresh(true, "tasks");
  assert.equal(app.ciStatuses.at(-1).outcomes.get("team/repo"), null);
  app.setReadFailure(false);
  app.setRuns([run(93)]);
  await app.refresh(true, "tasks");
  assert.equal(app.ciStatuses.at(-1).outcomes.get("team/repo"), "failure");
  app.disconnect();
  await app.ready();
  assert.equal(app.ciStatuses.at(-1), null,
    "Disconnected status must not retain the previous account's CI result");
});

test("Given incomplete job coverage When CI status would otherwise be present Then do not read untrusted runs", async () => {
  const app = fixture("off", { showCiStatus: true });
  await app.ready();
  app.setCollectorFailure("rate_limited",
    [{ scope: "team/repo", reason: "rate_limited" }], false);
  const previous = app.calls.filter(call => call.command === "github_api_get").length;
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(call => call.command === "github_api_get").length, previous);
  assert.equal(app.ciStatuses.at(-1), null);
  assert.equal(app.calls.filter(call => call.command === "ci_run_notify").length, 0);
});

test("Given native Hybrid hint When received Then only read-only tasks reconcile and bursts coalesce", async () => {
  const clock = { value: 100_000 };
  const app = fixture("off", { showCiStatus: true, clock });
  await app.ready();
  const readCount = () => app.calls.filter(x => x.command === "github_api_get").length;
  const base = readCount();
  app.relay("tasks");
  await app.ready();
  assert.equal(readCount(), base + 1);
  app.relay("tasks");
  await app.ready();
  assert.equal(readCount(), base + 1, "duplicate burst must not spend more REST calls");
  app.relay("invalid");
  await app.ready();
  assert.equal(readCount(), base + 1);
  app.relay("all");
  await app.ready();
  assert.equal(readCount(), base + 2, "reset escalation is independent of task cooldown");
  clock.value += 15_000;
  app.relay("tasks");
  await app.ready();
  assert.equal(readCount(), base + 3);
  assert.equal(app.calls.filter(x => x.command === "ci_run_notify").length, 0);
  assert.ok(app.calls.every(x => !["run_git_operation", "safe_pull", "safe_push", "fetch_all"].includes(x.command)));
});
