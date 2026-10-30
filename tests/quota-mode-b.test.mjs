import test from "node:test";
import assert from "node:assert/strict";

// Execute the shipped detached WebView controller with controlled native IPC.
// None of these tests needs a compositor, GitHub access, or timers.
const tick = () => new Promise(resolve => setImmediate(resolve));

function node(tag) {
  return {
    tag, children: [], style: {}, textContent: "", className: "",
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    remove() {},
    removeAttribute() {},
    setAttribute(name, value) { this[name] = value; },
    getBoundingClientRect() { return { width: 304, height: 45 }; },
    cloneNode(deep = false) {
      const result = node(tag);
      if (deep) result.children = this.children.map(child => child.cloneNode(true));
      result.textContent = this.textContent;
      return result;
    }
  };
}

const textOf = root =>
  [root.textContent, ...root.children.flatMap(child => textOf(child))].join(" ");

function state(organization, running, queued = 0) {
  return {
    connected: true, monitor_message: null,
    runner_state: {
      scope: { organization },
      coverage: { runners: true, jobs: true },
      counts: {
        busy: 0, idle: 1, offline: 0, running, queued,
        runningGitHubHosted: running, runningSelfHosted: 0
      },
      runners: [], runningJobs: [], queuedJobs: []
    }
  };
}

async function popupFixture(id, options = {}) {
  const previous = { window: globalThis.window, document: globalThis.document };
  const content = node("main");
  const title = node("div");
  const bubble = node("main");
  const handlers = new Map();
  const calls = [];
  let snapshot = options.snapshot ?? {
    connected: false, runner_state: null, monitor_message: null
  };
  let scope = options.scope ?? null;
  let kind = options.kind ?? "tasks";
  let language = "en";
  let failMonitor = false;
  const snapshotReplies = options.firstSnapshot
    ? [options.firstSnapshot] : [];
  const document = {
    body: node("body"),
    documentElement: { lang: "en" },
    addEventListener() {},
    getElementById(key) {
      return key === "quota-content" ? content :
        key === "quota-title" ? title : null;
    },
    createElement: node,
    querySelector(selector) {
      if (selector === ".usage-bubble") return bubble;
      if (selector === ".quota-header")
        return { getBoundingClientRect: () => ({ height: 18 }) };
      return null;
    }
  };
  const window = {
    __TAURI__: {
      core: {
        async invoke(name, args = {}) {
          calls.push([name, args]);
          switch (name) {
            case "github_monitor_snapshot":
              if (snapshotReplies.length) return await snapshotReplies.shift();
              if (failMonitor) throw Error("NATIVE_SNAPSHOT_UNAVAILABLE");
              return snapshot;
            case "get_monitor_scope": return scope;
            case "get_settings_config": return { language };
            case "get_usage_popup_kind": return kind;
            case "resize_usage_popup": return undefined;
            case "github_api_get":
              if (options.githubGet) return options.githubGet(args.path);
              throw Error("PRIVATE_GITHUB_ERROR_DO_NOT_RENDER");
            default: throw Error("Unexpected native command: " + name);
          }
        }
      },
      event: {
        async listen(name, callback) { handlers.set(name, callback); }
      }
    }
  };
  globalThis.window = window;
  globalThis.document = document;
  try {
    const module = await import("../apps/desktop/ui/quota.mjs?mode-b-" + id);
    await tick();
    await tick();
    return {
      module, content, title, calls,
      text: () => textOf(content),
      setScope(next) { scope = next; },
      setSnapshot(next) { snapshot = next; },
      setKind(next) { kind = next; },
      setFailMonitor(value) { failMonitor = value; },
      async emit(name) {
        const callback = handlers.get(name);
        assert.equal(typeof callback, "function", "missing subscription " + name);
        await callback();
        await tick();
        await tick();
      },
      restore() {
        if (previous.window === undefined) delete globalThis.window;
        else globalThis.window = previous.window;
        if (previous.document === undefined) delete globalThis.document;
        else globalThis.document = previous.document;
      }
    };
  } catch (error) {
    if (previous.window === undefined) delete globalThis.window;
    else globalThis.window = previous.window;
    if (previous.document === undefined) delete globalThis.document;
    else globalThis.document = previous.document;
    throw error;
  }
}

test("Mode B: popup billing scope fails closed on conflicting owner provenance", async () => {
  const ui = await popupFixture("scope-conflict", {
    kind: "billing", scope: "team-old", snapshot: state("team-new", 3)
  });
  try {
    assert.equal(ui.module.selectedOrganization({
      github_monitor_org: "Team",
      runner_state: { scope: { organization: "team" } }
    }), "Team", "identity comparison must be case insensitive");
    assert.equal(ui.module.selectedOrganization({
      github_monitor_org: "team-old",
      runner_state: { scope: { organization: "team-new" } }
    }), "", "disagreeing account evidence must not select either one");
    assert.equal(ui.module.selectedOrganization({
      github_monitor_org: null,
      runner_state: { scope: { organization: "team-new" } }
    }), "team-new");
    assert.equal(ui.module.selectedOrganization({
      github_monitor_org: "team-old", runner_state: null
    }), "team-old");
    assert.equal(ui.calls.some(([name, args]) => name === "github_api_get" &&
      args.path.startsWith("/organizations/team-old/")), false);
    assert.match(ui.text(), /Choose a monitored organization|Organization/);
    assert.equal(ui.calls.some(([name]) => name === "get_snapshot"), false);
  } finally { ui.restore(); }
});

test("Mode B: old initial monitor IPC reply never overwrites newer event metrics", async () => {
  let releaseOld;
  const first = new Promise(resolve => { releaseOld = resolve; });
  const ui = await popupFixture("stale-initial", {
    firstSnapshot: first, kind: "tasks", scope: "team"
  });
  try {
    ui.setSnapshot(state("team", 5, 2));
    await ui.emit("repoticker-monitor-updated");
    assert.equal(ui.title.textContent, "Tasks · Running 5 / Queued 2");
    releaseOld(state("team", 1, 0));
    await tick();
    await tick();
    assert.equal(ui.title.textContent, "Tasks · Running 5 / Queued 2");
    assert.equal(ui.calls.some(([name]) => name === "get_snapshot"), false,
      "popup updates must never scan local repositories");
  } finally { ui.restore(); }
});

test("Mode B: failed monitor-only IPC reports unavailable, not old confident counts", async () => {
  const ui = await popupFixture("monitor-err", {
    kind: "tasks", scope: "team", snapshot: state("team", 5, 2)
  });
  try {
    assert.equal(ui.title.textContent, "Tasks · Running 5 / Queued 2");
    ui.setFailMonitor(true);
    await ui.emit("repoticker-monitor-updated");
    assert.equal(ui.title.textContent, "Status unavailable");
    assert.match(ui.text(), /Cannot read refreshed GitHub status/);
    assert.doesNotMatch(ui.text(), /NATIVE_SNAPSHOT_UNAVAILABLE/);
    assert.equal(ui.calls.some(([name]) => name === "get_snapshot"), false);
  } finally { ui.restore(); }
});

test("Mode B: prior-account billing arriving late cannot replace newer scope billing", async () => {
  let releaseOldUsage;
  const oldUsage = new Promise(resolve => { releaseOldUsage = resolve; });
  const githubGet = async path => {
    if (path === "/user") return { login: "person", plan: { name: "free" } };
    if (path.startsWith("/users/person/")) return { usageItems: [] };
    if (path === "/orgs/team-old") return {
      login: "team-old", plan: { name: "free" }
    };
    if (path.startsWith("/organizations/team-old/")) return oldUsage;
    if (path === "/orgs/team-new") return {
      login: "team-new", plan: { name: "team" }
    };
    if (path.startsWith("/organizations/team-new/"))
      return { usageItems: [{ sku: "actions_linux", grossQuantity: 222 }] };
    throw Error("Unexpected billing path");
  };
  const ui = await popupFixture("billing-switch", {
    kind: "billing", scope: "team-old",
    snapshot: state("team-old", 1), githubGet
  });
  try {
    assert.ok(ui.calls.some(([name, args]) =>
      name === "github_api_get" && args.path.startsWith("/organizations/team-old/")));
    ui.setScope("team-new");
    ui.setSnapshot(state("team-new", 2));
    await ui.emit("repoticker-github-scope-changed");
    assert.match(ui.text(), /222/);
    releaseOldUsage({ usageItems: [{ sku: "actions_linux", grossQuantity: 111 }] });
    await tick();
    await tick();
    assert.match(ui.text(), /222/);
    assert.doesNotMatch(ui.text(), /111/);
    assert.equal(ui.calls.some(([name]) => name === "get_snapshot"), false);
  } finally { ui.restore(); }
});

test("Mode B: raw billing transport exception never appears in detached popup", async () => {
  const ui = await popupFixture("billing-private-error", {
    kind: "billing", scope: "team",
    snapshot: state("team", 1),
    githubGet: async () => { throw Error("SECRET_PROVIDER_BODY_NOT_FOR_WEBVIEW"); }
  });
  try {
    await tick();
    await tick();
    assert.match(ui.title.textContent, /Actions/);
    assert.doesNotMatch(ui.text(), /SECRET_PROVIDER_BODY_NOT_FOR_WEBVIEW/);
    assert.match(ui.text(), /unavailable|not available/i);
    assert.equal(ui.calls.some(([name]) => name === "get_snapshot"), false);
  } finally { ui.restore(); }
});
