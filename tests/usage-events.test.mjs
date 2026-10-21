import test from "node:test";
import assert from "node:assert/strict";

/** Minimal DOM fixture exercises the *real* quota.mjs WebView controller.
 * This catches regressions that source-pattern tests cannot detect.
 */
function element(tag) {
  return {
    tag, children: [], style: {}, textContent: "", className: "",
    replaceChildren() { this.children = []; },
    append(child) { this.children.push(child); },
    remove() {},
    removeAttribute() {},
    addEventListener() {},
    getBoundingClientRect() { return { width: 304, height: 45 }; },
    cloneNode(deep = false) {
      const copy = element(tag);
      if (deep) copy.children = this.children.map(item => item.cloneNode(true));
      copy.textContent = this.textContent;
      return copy;
    },
  };
}

function allText(node) {
  return [node.textContent, ...node.children.flatMap(child => allText(child))].join(" ");
}

test("usage balloon refreshes after native monitor event, without Git re-scan", async () => {
  const prior = { window: globalThis.window, document: globalThis.document };
  const root = element("main");
  const calls = [];
  const listeners = new Map();
  let snapshot = {
    connected: false, runner_state: null, monitor_message: null
  };
  const document = {
    body: element("body"),
    getElementById(id) { return id === "quota-content" ? root : null; },
    createElement: element,
    querySelector(selector) {
      return selector === ".quota-header"
        ? { getBoundingClientRect: () => ({ height: 18 }) } : null;
    },
  };
  const window = {
    __TAURI__: {
      core: {
        async invoke(command) {
          calls.push(command);
          if (command === "get_snapshot") return snapshot;
          if (command === "resize_usage_popup") return undefined;
          throw Error("Unexpected command " + command);
        },
      },
      event: {
        async listen(eventName, handler) { listeners.set(eventName, handler); },
      },
    },
  };
  globalThis.window = window;
  globalThis.document = document;
  try {
    await import("../apps/desktop/ui/quota.mjs?usage-event-smoke");
    // Resolve the initial native getter and asynchronous event subscriptions.
    await new Promise(resolve => setImmediate(resolve));
    assert.match(allText(root), /Not connected/);
    assert.ok(listeners.has("repoticker-usage-shown"));
    assert.ok(listeners.has("repoticker-monitor-updated"));

    snapshot = {
      connected: true, monitor_message: null,
      runner_state: {
        counts: {
          busy: 1, idle: 1, offline: 0, running: 2,
          queued: 1, runningSelfHosted: 1, runningGitHubHosted: 1,
          runningUnclassified: 0, queuedSelfHosted: 1,
          queuedGitHubHosted: 0, queuedUnclassified: 0
        },
        coverage: { runners: true, jobs: true, runningLanes: true, queuedLanes: true },
        checkedAt: "2026-10-21T07:00:00Z", runners: [],
      }
    };
    await listeners.get("repoticker-monitor-updated")();
    assert.match(allText(root), /Available/);
    assert.match(allText(root), /Running · 2/);
    assert.match(allText(root), /Queued · 1/);
    assert.doesNotMatch(allText(root), /Connect GitHub/);
    await listeners.get("repoticker-usage-shown")();
    assert.ok(calls.filter(command => command === "get_snapshot").length >= 3);
  } finally {
    if (prior.window === undefined) delete globalThis.window;
    else globalThis.window = prior.window;
    if (prior.document === undefined) delete globalThis.document;
    else globalThis.document = prior.document;
  }
});
