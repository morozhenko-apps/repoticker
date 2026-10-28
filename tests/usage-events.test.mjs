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
    setAttribute(name, value) { this[name] = value; },
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
  let configuredOrg = null;
  let savedLanguage = "en";
  const usageBubble = element("main");
  let snapshot = { connected: false, runner_state: null, monitor_message: null };
  const documentHandlers = new Map();
  const document = {
    body: element("body"),
    documentElement: { lang: "en" },
    addEventListener(type, handler) { documentHandlers.set(type, handler); },
    getElementById(id) {
      return id === "quota-content" ? root : id === "quota-title" ? title : null;
    },
    createElement: element,
    querySelector(selector) {
      return selector === ".quota-header"
        ? { getBoundingClientRect: () => ({ height: 18 }) }
        : selector === ".usage-bubble" ? usageBubble : null;
    },
  };
  const window = {
    __TAURI__: {
      core: {
        async invoke(command, args) {
          calls.push([command, args]);
          if (command === "get_monitor_scope") return configuredOrg;
          if (command === "get_settings_config") return { language: savedLanguage };
          if (command === "github_monitor_snapshot") return {
            connected: snapshot.connected, runner_state: snapshot.runner_state,
            monitor_message: snapshot.monitor_message
          };
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
    assert.equal(typeof documentHandlers.get("contextmenu"), "function");
    const rightClick = { prevented: false, preventDefault() { this.prevented = true; } };
    documentHandlers.get("contextmenu")(rightClick);
    assert.equal(rightClick.prevented, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.match(allText(root), /Connect GitHub/);
    assert.ok(listeners.has("repoticker-usage-shown"));
    assert.ok(listeners.has("repoticker-config-changed"));
    assert.equal(document.documentElement.lang, "en");
    assert.equal(calls.filter(([command]) => command === "get_snapshot").length, 0,
      "opening the detached tooltip must never inspect local Git repositories");
    assert.ok(calls.some(([command]) => command === "get_monitor_scope"));

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
    // A language preference update repaints the validated cached model;
    // it does not trigger a new GitHub REST request or full Git scan.
    savedLanguage = "ru";
    const readsBeforeLocale = calls.filter(([name]) => name === "github_api_get").length;
    await listeners.get("repoticker-config-changed")();
    assert.equal(document.documentElement.lang, "ru");
    assert.match(title.textContent, /Задачи/);
    assert.match(allText(root), /Раннеры GitHub/);
    assert.equal(calls.filter(([name]) => name === "github_api_get").length,
      readsBeforeLocale);
    savedLanguage = "en";
    await listeners.get("repoticker-config-changed")();
    assert.equal(document.documentElement.lang, "en");
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
    // Auth and account-scope change events must use the same lightweight
    // monitor/config IPC as initial popup startup. The configured account
    // (not a stale cached scope) must be read afresh.
    configuredOrg = "morozhenko-apps";
    await listeners.get("repoticker-github-auth")();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.filter(([command]) => command === "get_snapshot").length, 0);
    assert.match(title.textContent, /Actions/);
    configuredOrg = null;
    nativeKind = "tasks";
    await listeners.get("repoticker-github-scope-changed")();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.filter(([command]) => command === "get_snapshot").length, 0);
    assert.match(title.textContent, /Tasks/);
    assert.ok(calls.filter(([command]) => command === "get_monitor_scope").length >= 3);
  } finally {
    if (prior.window === undefined) delete globalThis.window;
    else globalThis.window = prior.window;
    if (prior.document === undefined) delete globalThis.document;
    else globalThis.document = prior.document;
  }
});
