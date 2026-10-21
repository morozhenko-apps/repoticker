import test from "node:test";
import assert from "node:assert/strict";

/** Test the real detached popup controller without a GTK compositor.
 * The authoritative hover kind comes from native state; a missed event
 * must not require a second Git scan or a GitHub billing request.
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

test("native-selected tooltip switches reliably and auto-selected organization provides billing", async () => {
  const prior = { window: globalThis.window, document: globalThis.document };
  const root = element("main");
  const title = element("div");
  const calls = [];
  const listeners = new Map();
  let nativeKind = "billing";
  let snapshot = { connected: false, runner_state: null, monitor_message: null };
  const document = {
    body: element("body"),
    getElementById(id) {
      return id === "quota-content" ? root : id === "quota-title" ? title : null;
    },
    createElement: element,
    querySelector(selector) {
      return selector === ".quota-header"
        ? { getBoundingClientRect: () => ({ height: 18 }) } : null;
    },
  };
  const window = {
    __TAURI__: {
      core: {
        async invoke(command, args) {
          calls.push([command, args]);
          if (command === "get_snapshot") return snapshot;
          if (command === "get_usage_popup_kind") return nativeKind;
          if (command === "resize_usage_popup") return undefined;
          if (command === "github_api_get") {
            const path = args.path;
            if (path === "/orgs/morozhenko-apps")
              return { login: "morozhenko-apps", plan: { name: "free" } };
            if (path === "/user") return { login: "user", plan: { name: "free" } };
            if (path.startsWith("/organizations/morozhenko-apps/"))
              return { usageItems: [{ sku: "actions_linux", grossQuantity: 2000 }] };
            if (path.startsWith("/users/user/")) return { usageItems: [] };
            throw Error("Unrecognized GitHub path " + path);
          }
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
    await import("../apps/desktop/ui/quota.mjs?usage-kind-regression");
    await new Promise(resolve => setImmediate(resolve));
    assert.match(allText(root), /Connect GitHub/);
    assert.ok(listeners.has("repoticker-usage-shown"));

    snapshot = {
      connected: true, github_monitor_org: null, monitor_message: null,
      runner_state: {
        scope: { organization: "morozhenko-apps" },
        counts: {
          busy: 1, idle: 1, offline: 2, running: 2, queued: 0,
          runningSelfHosted: 1, runningGitHubHosted: 1, runningUnclassified: 0,
          queuedSelfHosted: 0, queuedGitHubHosted: 0, queuedUnclassified: 0
        },
        coverage: { runners: true, jobs: true },
        runners: [], runningJobs: [], queuedJobs: []
      }
    };
    nativeKind = "tasks";
    await listeners.get("repoticker-monitor-updated")();
    assert.match(title.textContent, /Tasks/);
    assert.match(allText(root), /GitHub-hosted/);
    const scansBeforeHover = calls.filter(([x]) => x === "get_snapshot").length;

    // The typed shown event was lost. Direct native WebView notification works.
    nativeKind = "runners";
    window.__repotickerSetHoverKind("runners");
    assert.equal(title.textContent, "Runners · 4");
    assert.match(allText(root), /Offline/);
    assert.doesNotMatch(allText(root), /GitHub-hosted/);

    nativeKind = "billing";
    window.__repotickerSetHoverKind("billing");
    // Delayed 'tasks' event from the previous hover must not restore it.
    await listeners.get("repoticker-usage-shown")({ payload: "tasks" });
    await new Promise(resolve => setImmediate(resolve));
    assert.match(title.textContent, /Actions/);
    assert.match(allText(root), /Organization/);
    assert.match(allText(root), /Personal account/);
    assert.match(allText(root), /2,000/);
    assert.doesNotMatch(allText(root), /Choose a monitored organization/);
    assert.doesNotMatch(allText(root), /free-minute consumption|authoritative allowance/);

    assert.equal(calls.filter(([x]) => x === "get_snapshot").length, scansBeforeHover);
    assert.ok(calls.some(([command, args]) => command === "github_api_get" &&
      args.path.startsWith("/organizations/morozhenko-apps/")));
    assert.ok(calls.some(([command, args]) => command === "github_api_get" &&
      args.path === "/orgs/morozhenko-apps"));
  } finally {
    if (prior.window === undefined) delete globalThis.window;
    else globalThis.window = prior.window;
    if (prior.document === undefined) delete globalThis.document;
    else globalThis.document = prior.document;
  }
});
