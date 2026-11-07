import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createScanRefreshQueue, shouldSpinForRepos } from "../apps/desktop/ui/scan-refresh.mjs";

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
async function flush() {
  // Promise continuations run as microtasks; never sleep or poll.
  await Promise.resolve();
  await Promise.resolve();
}

test("overlapping full scans coalesce and never publish a superseded result", async () => {
  const requests = [], published = [], errors = [];
  const refresh = createScanRefreshQueue({
    scan: () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    },
    publish: next => published.push(next),
    onError: error => errors.push(error),
  });
  const first = refresh();
  const same = refresh();
  const alsoSame = refresh();
  assert.equal(same, first);
  assert.equal(alsoSame, first);
  assert.equal(requests.length, 1, "at most one expensive scan at a time");
  requests[0].resolve({ roots: ["old"] });
  await flush();
  assert.equal(requests.length, 2, "one trailing scan for all repeated requests");
  assert.deepEqual(published, [], "stale result must never rewind the card");
  const pending = refresh();
  assert.equal(pending, first);
  requests[1].resolve({ roots: ["still-stale"] });
  await flush();
  assert.equal(requests.length, 3, "another invalidation during trailing scan must be honored");
  assert.deepEqual(published, []);
  requests[2].resolve({ roots: ["latest"] });
  await first;
  assert.deepEqual(published, [{ roots: ["latest"] }]);
  assert.deepEqual(errors, []);
  const next = refresh();
  assert.notEqual(next, first, "fresh explicit request is never TTL-cached");
  assert.equal(requests.length, 4);
  requests[3].resolve({ roots: ["later"] });
  await next;
  assert.deepEqual(published, [{ roots: ["latest"] }, { roots: ["later"] }]);
});

test("superseded read failures do not hide later success; terminal failures are visible", async () => {
  const requests = [], published = [], errors = [];
  const refresh = createScanRefreshQueue({
    scan: () => {
      const request = deferred();
      requests.push(request);
      return request.promise;
    },
    publish: value => published.push(value),
    onError: error => errors.push(error.message),
  });
  const initial = refresh();
  refresh(); // A newer config/action state now needs reading.
  requests[0].reject(Error("old-scan-failed"));
  await flush();
  assert.equal(requests.length, 2);
  assert.deepEqual(errors, []);
  requests[1].resolve("new-status");
  await initial;
  assert.deepEqual(published, ["new-status"]);
  const subsequent = refresh();
  requests[2].reject(Error("disk-unavailable"));
  await subsequent;
  assert.deepEqual(errors, ["disk-unavailable"]);
  assert.deepEqual(published, ["new-status"]);
  const retry = refresh();
  requests[3].resolve("recovered");
  await retry;
  assert.deepEqual(published, ["new-status", "recovered"]);
});

test("scan queue rejects absent callbacks without invoking any Git operation", () => {
  for (const parameter of [
    { scan: null, publish() {}, onError() {} },
    { scan() {}, publish: null, onError() {} },
    { scan() {}, publish() {}, onError: null },
  ]) assert.throws(() => createScanRefreshQueue(parameter), TypeError);
});

test("desktop routes only full local snapshots through single-flight queue", () => {
  const app = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
  const start = app.indexOf("const refreshSnapshot = createScanRefreshQueue(");
  assert.ok(start > 0);
  const end = app.indexOf("function refreshMonitor()", start);
  assert.ok(end > start);
  const section = app.slice(start, end);
  assert.match(section, /scan: async \(\) => \{[\s\S]*invoke\("get_snapshot"\)/);
  assert.match(section, /const revision = monitorRevision;[\s\S]*return \{ revision, next \}/);
  assert.match(section, /reconcileScanPresentation\(next, snapshot, revision, monitorRevision\)/);
  assert.match(section, /function refresh\(\) \{\s*return refreshSnapshot\(\)/);
  assert.match(app, /await refresh\(\)/, "manual operations retain an authoritative post-action rescan");
  assert.match(app, /listen\?\.\("repoticker-config-changed", refreshCardConfiguration\)/);
  assert.match(app, /listen\?\.\("repoticker-reset-view", \(\) => \{[\s\S]*?refresh\(\)/);
  assert.match(app, /refreshMonitor\(\) \{[\s\S]*invoke\("github_monitor_snapshot"\)/);
  assert.equal([...app.matchAll(/invoke\("get_snapshot"\)/g)].length, 1,
    "the UI must not keep alternative bypass paths around scan single-flight");
});


test("busy indicator tracks the entire coalesced local scan, including failure", async () => {
  const pending = [], states = [], errors = [];
  const refresh = createScanRefreshQueue({
    scan: () => {
      const value = deferred();
      pending.push(value);
      return value.promise;
    },
    publish: () => {},
    onError: error => errors.push(error.message),
    onBusyChange: busy => states.push(busy),
  });
  const first = refresh();
  refresh();
  assert.deepEqual(states, [true]);
  pending[0].resolve("stale");
  await flush();
  assert.equal(pending.length, 2);
  assert.deepEqual(states, [true], "cannot turn off between invalidated scans");
  pending[1].resolve("current");
  await first;
  assert.deepEqual(states, [true, false]);

  const failed = refresh();
  pending[2].reject(Error("unavailable"));
  await failed;
  assert.deepEqual(errors, ["unavailable"]);
  assert.deepEqual(states, [true, false, true, false]);
});

test("Repos spinner is reserved for uncached first snapshot", () => {
  for (const [active, cached, expected] of [
    [false, false, false], [true, false, true],
    [false, true, false], [true, true, false],
  ]) assert.equal(shouldSpinForRepos(active, cached), expected);
});

test("Repos spinner follows uncached source work while list shows subsequent refresh", () => {
  const app = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
  const css = readFileSync(new URL("../apps/desktop/ui/style.css", import.meta.url), "utf8");
  assert.match(app, /onBusyChange: active => \{\s*localScanActive = active;\s*updateReposActivity\(\)/);
  assert.doesNotMatch(app, /fullMonitorActive/, "remote monitoring must not own the Repos busy state");
  assert.match(app, /const loading = shouldSpinForRepos\(localScanActive, firstSnapshotReady\);/);
  assert.match(app, /if \(kind === "all"\) \{\s*for \(const node/,
    "full GitHub refresh keeps independent metric busy states");
  assert.match(app, /byId\("show-repos"\)\.setAttribute\("aria-busy", String\(loading\)\)/);
  assert.match(app, /if \(localScanActive\) cancelAutoHide\(\)/);
  assert.doesNotMatch(app, /byId\("show-repos"\)\.disabled/);
  assert.match(css, /#show-repos\[aria-busy="true"\] \.repo-spinner/);
  assert.doesNotMatch(css, /#show-repos\[aria-busy="true"\] \.action-icon::after/);
  const html = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");
  assert.match(html, /id="repo-scan-status"[^>]*role="status"[^>]*hidden/);
  assert.match(app, /status\.hidden = !localScanActive/);
  assert.match(app, /status\.textContent = localScanActive \? cardText\(cardLanguage, "refreshing"\)/);
  assert.match(app, /firstSnapshotReady = true/);
  assert.match(css, /\.repo-scan-status \{[^}]*min-height: 24px/);
  assert.match(html, /class="action-icon repo-glyph"[^>]*><span class="repo-symbol">▤<\/span><svg class="repo-spinner"/);
  assert.match(css, /\.repo-glyph \{ display:grid; place-items:center; width:28px; height:28px/);
  assert.match(css, /\.repo-glyph \.repo-symbol, \.repo-glyph \.repo-spinner \{ grid-area:1\/1; \}/);
  assert.match(css, /#show-repos\[aria-busy="true"\] \.repo-symbol \{ visibility:hidden; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
