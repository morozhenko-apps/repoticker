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
function fixture(enabled) {
  let authorized = true;
  const calls = [];
  const listeners = new Map();
  let runs = [run(10)];
  let setting = enabled;
  let collectionFailure = null;
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
      ci_failure_notifications: setting
    };
    if (command === "github_monitor_publish") return undefined;
    if (command === "github_api_get") return { workflow_runs: runs };
    if (command === "ci_failure_notify") return true;
    throw Error("Unexpected command " + command);
  };
  const refresh = startGithubMonitoring({
    invoke,
    event: { listen(name, callback) { listeners.set(name, callback); } },
    schedule() {},
    collect: async () => ({ state: structuredClone(state), repositoryCount: 1,
      failure: collectionFailure, reason: null })
  });
  return {
    calls, refresh,
    async ready() { await tick(); },
    setRuns(values) { runs = values; },
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

test("Given notifications disabled When the regular monitor refreshes Then completed runs are not read", async () => {
  const app = fixture(false);
  await app.ready();
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length, 0);
  app.setRuns([run(11)]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length, 0);
  assert.equal(app.calls.filter(x => x.command === "ci_failure_notify").length, 0);
});

test("Given enabled notifications When failure appears after silent baseline Then native alert is sent once", async () => {
  const app = fixture(true);
  await app.ready();
  assert.equal(app.calls.filter(x => x.command === "ci_failure_notify").length, 0);
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length, 1);
  app.setRuns([run(12), run(10)]);
  await app.refresh(true, "tasks");
  const alerts = app.calls.filter(x => x.command === "ci_failure_notify");
  assert.deepEqual(alerts.map(x => x.args), [{
    repository: "team/repo", runId: 12, runAttempt: 1
  }]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_failure_notify").length, 1);
  await app.refresh(true, "runners");
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length, 3,
    "Runner-only refresh must not poll completed runs");
});

test("Given user disables notifications When configuration changes Then new historical failure is silent", async () => {
  const app = fixture(true);
  await app.ready();
  app.setSetting(false);
  app.configChanged();
  await app.ready();
  app.setRuns([run(13), run(10)]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_failure_notify").length, 0);
  app.setSetting(true);
  app.configChanged();
  await app.ready();
  assert.equal(app.calls.filter(x => x.command === "ci_failure_notify").length, 0,
    "Re-enabling must establish a new silent baseline");
  app.setRuns([run(14), run(13), run(10)]);
  await app.refresh(true, "tasks");
  assert.deepEqual(app.calls.filter(x => x.command === "ci_failure_notify")
    .map(x => x.args.runId), [14]);
  app.disconnect();
  await app.ready();
  app.setRuns([run(15)]);
  await app.refresh(true);
  assert.deepEqual(app.calls.filter(x => x.command === "ci_failure_notify")
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
  assert.match(native, /if !config\.ci_failure_notifications/);
  assert.match(native, /github_monitor_repositories/);
  assert.match(native, /permission_state\(\)/);
  assert.match(native, /\.title\("RepoTicker: CI failure"\)/);
  assert.match(native, /\.show\(\)/);
  assert.doesNotMatch(native, /bearer_auth|access_token|shell|spawn\(/);
  assert.match(main, /tauri_plugin_notification::init\(\)/);
  assert.match(main, /ci_notifications::ci_failure_notify/);
  assert.match(main, /#\[serde\(default\)\]\s*ci_failure_notifications: bool/);
  assert.match(html, /id="ci-failure-notifications" type="checkbox"/);
  assert.match(settings, /draft\.ciFailureNotifications/);
  assert.match(settings, /ciFailureNotifications: draft\.ciFailureNotifications/);
  assert.match(settings, /ci_notification_permission/);
});

test("Given credential silently expires When authorization returns Then first recovered read is a silent baseline", async () => {
  const app = fixture(true);
  await app.ready();
  app.setAuthorized(false);
  await app.refresh(true);
  app.setRuns([run(22), run(10)]);
  app.setAuthorized(true);
  await app.refresh(true);
  assert.equal(app.calls.filter(x => x.command === "ci_failure_notify").length, 0,
    "An expired native session must not retain previous notification history");
  app.setRuns([run(23), run(22), run(10)]);
  await app.refresh(true);
  assert.deepEqual(app.calls.filter(x => x.command === "ci_failure_notify")
    .map(x => x.args.runId), [23]);
});

test("Given successful workflows When runs complete after opt-in Then no alert is delivered", async () => {
  const app = fixture(true);
  await app.ready();
  app.setRuns([{ ...run(30), conclusion: "success" }, run(10)]);
  await app.refresh(true, "tasks");
  assert.equal(app.calls.filter(x => x.command === "ci_failure_notify").length, 0,
    "Finishing a successful runner job is never a CI failure");
});

test("Given runner inventory permission denied When tasks remain covered Then new CI failures still notify", async () => {
  const app = fixture(true);
  await app.ready();
  app.setCollectorFailure("permission_denied",
    [{ scope: "runners", reason: "permission_denied" }]);
  app.setRuns([run(31), run(10)]);
  await app.refresh(true, "tasks");
  assert.deepEqual(app.calls.filter(x => x.command === "ci_failure_notify")
    .map(x => x.args.runId), [31],
    "Read-only Actions failures are independent of org runner inventory");
});

test("Given jobs are incomplete or globally rate-limited When runs change Then no CI alert is fabricated", async () => {
  const app = fixture(true);
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
  assert.equal(app.calls.filter(x => x.command === "ci_failure_notify").length, 0);
  assert.equal(app.calls.filter(x => x.command === "github_api_get").length,
    baselineReads, "Rate limiting blocks independent completed-run reads");
});

test("native diagnostic is a fixed opt-in OS delivery, not a fabricated CI workflow", () => {
  const rust = readFileSync(new URL(
    "../apps/desktop/src-tauri/src/ci_notifications.rs", import.meta.url), "utf8");
  const main = readFileSync(new URL(
    "../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  const source = rust.match(/pub\(crate\) fn ci_notification_test\([\s\S]*?\n\}/)?.[0];
  assert.ok(source, "The native test IPC must exist");
  assert.match(source, /read_config\(&app\)/);
  assert.match(source, /notification_test_enabled\(&config\)/);
  assert.match(source, /permission_state\(\)/);
  assert.match(source, /\.title\("RepoTicker: test notification"\)/);
  assert.match(source, /\.body\("Native notification test\. No CI workflow failed\."\)/);
  assert.match(source, /\.show\(\)/);
  assert.doesNotMatch(source, /repository|run_id|run_attempt|token|github_api_get|emit\(/);
  assert.match(main, /ci_notifications::ci_notification_test,/);
});
