import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  mergeMonitorPresentation, reconcileScanPresentation
} from "../apps/desktop/ui/monitor-presentation.mjs";

const native = readFileSync(new URL(
  "../apps/desktop/src-tauri/src/monitor_cache.rs", import.meta.url), "utf8");
const main = readFileSync(new URL(
  "../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const card = readFileSync(new URL(
  "../apps/desktop/ui/app.mjs", import.meta.url), "utf8");

const local = {
  roots: ["/repos"], repositories: [{ name: "product", dirty: false }],
  errors: [], runner_state: null, connected: false,
  monitor_message: "Checking GitHub connection..."
};
const remote = {
  connected: true, runner_state: {
    counts: { running: 1, queued: 0 },
    coverage: { jobs: true }
  }, monitor_message: null
};

test("monitor cache presentation replaces only remote metrics, preserves local Git rows", () => {
  const merged = mergeMonitorPresentation(local, remote);
  assert.strictEqual(merged.repositories, local.repositories);
  assert.strictEqual(merged.roots, local.roots);
  assert.strictEqual(merged.errors, local.errors);
  assert.strictEqual(merged.runner_state, remote.runner_state);
  assert.equal(merged.connected, true);
  assert.equal(merged.monitor_message, null);
  assert.equal(local.runner_state, null, "input snapshot stays immutable");
});

test("late local snapshot cannot erase newer authoritative remote state", () => {
  const current = mergeMonitorPresentation(local, remote);
  const staleScan = { ...local, repositories: [{ name: "product", dirty: true }] };
  const reconciled = reconcileScanPresentation(staleScan, current, 0, 1);
  assert.strictEqual(reconciled.repositories, staleScan.repositories);
  assert.strictEqual(reconciled.runner_state, remote.runner_state);
  assert.equal(reconciled.connected, true);
  assert.strictEqual(reconcileScanPresentation(staleScan, current, 0, 0), staleScan);
});

test("invalid native monitor presentation cannot modify local state", () => {
  for (const invalid of [null, {}, { connected: null, runner_state: null,
    monitor_message: null }, { connected: true, runner_state: null }]) {
    assert.throws(() => mergeMonitorPresentation(local, invalid));
  }
});

test("native cache snapshot is read-only and registered for card IPC", () => {
  const getter = native.match(/pub fn github_monitor_snapshot\([\s\S]*?\n\}/)?.[0];
  assert.ok(getter, "native cached monitor snapshot must exist");
  assert.match(getter, /MonitorCache>\(\)\.read\(\)/);
  assert.doesNotMatch(getter, /git::|scan\(|read_config|read_credential/);
  assert.match(main, /generate_handler!\[[\s\S]*?monitor_cache::github_monitor_snapshot,/);
});

test("monitor events only refresh metrics; real Git events still rescan local repos", () => {
  for (const event of ["repoticker-monitor-updated", "repoticker-github-auth",
    "repoticker-github-scope-changed"]) {
    assert.ok(card.includes('listen?.("' + event + '", refreshMonitor)'));
    assert.ok(!card.includes('listen?.("' + event + '", refresh)'));
  }
  assert.match(card, /"repoticker-config-changed", refreshCardConfiguration\)/);
  assert.match(card, /"repoticker-git-action-finished"[\s\S]*?await refresh\(\)/);
  const partial = card.match(/async function refreshMonitor\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(partial);
  assert.match(partial, /"github_monitor_snapshot"/);
  assert.match(partial, /renderMonitorMetrics\(snapshot\.runner_state\)/);
  assert.doesNotMatch(partial, /"get_snapshot"|replaceChildren|render\(/);
});
