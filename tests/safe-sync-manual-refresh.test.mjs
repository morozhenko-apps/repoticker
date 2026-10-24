import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { syncReadyCommitCount, pullReadyCommitCount } from "../apps/desktop/ui/view.mjs";
const source = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("Safe sync eligibility accepts strictly ahead or behind but rejects unsafe repos", () => {
  const base = { upstream: "origin/dev", dirty: false, behind: 0, ahead: 0, sync_state: "current" };
  assert.equal(syncReadyCommitCount([{ ...base, behind: 2, sync_state: "behind 2" }]), 2);
  assert.equal(syncReadyCommitCount([{ ...base, ahead: 4, sync_state: "ahead" }]), 4);
  for (const state of [
    { dirty: true, ahead: 2, sync_state: "local changes" },
    { upstream: null, ahead: 3, sync_state: "ahead" },
    { ahead: 2, behind: 1, sync_state: "diverged" },
    { ahead: 2, sync_state: "operation in progress" },
    { ahead: 0, behind: 0, sync_state: "current" },
  ]) assert.equal(syncReadyCommitCount([{ ...base, ...state }]), 0);
  assert.equal(pullReadyCommitCount([{ ...base, ahead: 4, sync_state: "ahead" }]), 0,
    "legacy pull-only helper remains narrowly defined");
});

test("native safe sync action is sequential, non-force and rechecked", () => {
  const native = source("../apps/desktop/src-tauri/src/main.rs");
  const git = source("../crates/repoticker-core/src/git.rs");
  const app = source("../apps/desktop/ui/app.mjs");
  const html = source("../apps/desktop/ui/index.html");
  assert.match(native, /operation == "safe_sync" && status\.decision == SyncDecision::LocalAhead/);
  assert.match(native, /git::safe_sync\(&path\)/);
  assert.match(git, /pub fn safe_sync\(/);
  assert.match(git, /pub fn safe_push\(/);
  assert.match(git, /safe_push_with_checkpoint\(repo, \|\| \{\}\)/);
  const pushBody = git.match(/fn safe_push_with_checkpoint\([\s\S]*?\n\}/)?.[0] ?? "";
  const checks = [...pushBody.matchAll(/safe_push_source_unchanged\(repo, &first, &pin\)/g)]
    .map(match => match.index);
  const probe = pushBody.indexOf('"ls-remote"');
  assert.equal(checks.length, 2, "two local source revalidations required");
  assert.ok(checks[0] < probe && probe < checks[1], "live remote probe must lie between checks");
  const guard = git.match(/fn safe_push_source_unchanged\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(guard, /let current = inspect\(repo\)\?/);
  assert.match(guard, /current\.decision == SyncDecision::LocalAhead/);
  assert.match(pushBody, /remote_tip != pin\.upstream_tip/);

  assert.match(pushBody, /"push",\s*"--porcelain",\s*"--no-follow-tags"/);
  const pushCall = pushBody.match(/required\(\s*repo,\s*&\[\s*"push",[\s\S]*?\],\s*\)\?/);
  assert.ok(pushCall, "Safe push must invoke an explicit argv-only Git push");
  assert.doesNotMatch(pushCall[0], /--force|--mirror|--all/);
  assert.match(html, /<span class="action-label">Safe sync<\/span>/);
  assert.match(app, /runGitAction\("safe_sync"\)/);
  assert.match(app, /\["Safe sync", "safe_sync"\]/);
  assert.match(app, /"safe_sync"\]\.includes\(payload\.operation\)/);
});

test("Runners and Tasks are two independent accessible manual refresh targets", () => {
  const html = source("../apps/desktop/ui/index.html");
  const app = source("../apps/desktop/ui/app.mjs");
  const monitor = source("../apps/desktop/ui/github-monitor.mjs");
  for (const id of ["runner-status", "ci-tasks"]) {
    assert.match(html, new RegExp('<button id="' + id + '" type="button"'));
  }
  assert.match(html, /aria-busy="false"/);
  assert.match(app, /triggerMonitorRefresh\?\.\(true, kind\)/);
  assert.match(app, /onRefreshState: monitorRefreshState/);
  assert.match(monitor, /kind, previousState: lastState/);
  assert.match(monitor, /export function mergeMetricGroup/);
  assert.match(monitor, /export function invalidateMetricGroup/);
  assert.doesNotMatch(app.match(/const manualIndicator[\s\S]*?function renderMonitorMetrics/)?.[0] ?? "",
    /get_snapshot/);
});

test("open status balloon reuses native monitor cache without scanning local Git", () => {
  const quota = source("../apps/desktop/ui/quota.mjs");
  const monitor = quota.match(/async function refreshMonitorOnly\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(monitor, /invoke\("github_monitor_snapshot"\)/);
  assert.match(monitor, /mergeMonitorPresentation\(/);
  assert.doesNotMatch(monitor, /get_snapshot|git::inspect|perform_git_action/);
  assert.match(quota, /subscribe\("repoticker-monitor-updated", refreshMonitorOnly\)/);
});
