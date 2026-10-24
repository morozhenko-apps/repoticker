import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function mockNode(id = "") {
  const events = new Map();
  const attrs = new Map();
  const node = {
    id, events, children: [], hidden: false, disabled: false, value: "",
    textContent: "", dataset: {}, style: {},
    classList: { toggle() {} },
    firstChild: { textContent: "" },
    addEventListener(type, handler) { events.set(type, handler); },
    replaceChildren() { this.children = []; },
    append(...items) { this.children.push(...items); },
    setAttribute(name, value) { attrs.set(name, value); },
    querySelectorAll() { return []; },
    focus() {},
    getBoundingClientRect() { return { width: 200, height: 20 }; },
  };
  node.fire = async (type, event = {}) => {
    const fn = events.get(type);
    if (!fn) throw Error("No handler for " + id + "." + type);
    return fn({ target: node, preventDefault() {}, ...event });
  };
  return node;
}
const tick = () => new Promise(resolve => setImmediate(resolve));

/** Execute real settings controller with a deterministic WebView/IPC fixture. */
async function fixture(suffix, initiallyConnected, initialRepositories = [], options = {}) {
  const before = { window: globalThis.window, document: globalThis.document };
  // Mirror the real Settings DOM IDs so harmless form additions do not
  // cause unrelated authorization lifecycle scenarios to fail on missing mocks.
  const html = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");
  const ids = [...new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]))];
  const elements = new Map(ids.map(id => [id, mockNode(id)]));
  const listeners = new Map();
  const calls = [];
  let connected = initiallyConnected;
  let phase = connected ? "connected" : "idle";
  let monitorOrg = connected ? "one" : null;
  let monitorRepositories = [...initialRepositories];
  const persistedIgnored = [...(options.ignoredChildNames || [])];
  let closed = false;
  let tokenRemoved = false;
  let releaseInstallations = null;
  const delayedInstallations = options.deferInstallations
    ? new Promise(resolve => { releaseInstallations = resolve; }) : null;
  const document = {
    documentElement: { lang: "en" },
    getElementById(id) {
      if (!elements.has(id)) throw Error("Unknown Settings element " + id);
      return elements.get(id);
    },
    createElement(tag) { return mockNode(tag); },
    addEventListener() {},
  };
  const window = {
    addEventListener() {},
    __TAURI__: {
      core: {
        async invoke(command, args) {
          calls.push([command, args]);
          switch (command) {
            case "get_settings_config": return {
              roots: ["/repos"], language: "en", github_monitor_org: monitorOrg,
              github_monitor_repositories: monitorRepositories,
              ignored_child_names: persistedIgnored,
              ci_failure_notifications: options.ciFailureNotifications === true
            };
            case "get_monitor_scope": return monitorOrg;
            case "github_auth_status": return { connected, phase };
            case "github_api_get":
              if (args.path.includes("/repositories?"))
                return { repositories: [
                  { full_name: "one/core" }, { full_name: "one/docs" },
                  { full_name: "two/api" }, { full_name: "two/web" }
                ].filter(item => item.full_name.startsWith(
                  monitorOrg === "two" || args.path.includes("/2/") ? "two/" : "one/")) };
              if (delayedInstallations) return delayedInstallations;
              if (options.installationPages) {
                const page = Number(args.path.match(/[?&]page=(\d+)/)?.[1] ?? 1);
                return { installations: options.installationPages[page - 1] ?? [] };
              }
              return { installations: [
                { id: 1, account: { login: "one" } },
                { id: 2, account: { login: "two" } }
              ] };
            case "github_begin":
              phase = "pending";
              return { userCode: "ABCD-1234" };
            case "github_cancel":
              if (!connected) phase = "cancelled";
              return undefined;
            case "github_disconnect":
              connected = false;
              tokenRemoved = true;
              phase = "disconnected";
              return undefined;
            case "github_set_monitor_org":
              monitorOrg = args.org;
              monitorRepositories = args.repositories ?? monitorRepositories;
              return undefined;
            case "save_settings": return undefined;
            case "close_settings": closed = true; return undefined;
            default: throw Error("Unexpected IPC " + command);
          }
        },
      },
      event: {
        async listen(name, handler) { listeners.set(name, handler); }
      }
    }
  };
  globalThis.window = window;
  globalThis.document = document;
  try {
    await import("../apps/desktop/ui/settings.mjs?session-" + suffix);
    await tick();
    await tick();
  } catch (error) {
    globalThis.window = before.window;
    globalThis.document = before.document;
    throw error;
  }
  return {
    ids: elements, calls, listeners,
    node: id => elements.get(id),
    authConnected() { connected = true; phase = "connected"; },
    get closed() { return closed; },
    get tokenRemoved() { return tokenRemoved; },
    get monitorOrg() { return monitorOrg; },
    get monitorRepositories() { return monitorRepositories; },
    releaseInstallations: payload => releaseInstallations?.(payload),
    async dispatchAuth() {
      await listeners.get("repoticker-github-auth")?.({});
      await tick();
    },
    restore() {
      if (before.window === undefined) delete globalThis.window;
      else globalThis.window = before.window;
      if (before.document === undefined) delete globalThis.document;
      else globalThis.document = before.document;
    }
  };
}

test("new authorization enables OK, confirms selected Monitor account and refreshes without hiding card", async () => {
  const ui = await fixture("connect", false);
  try {
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.ok(!ui.calls.some(([command]) => command === "get_snapshot"),
      "Settings must not invoke local Git inspection");
    assert.equal(ui.calls.filter(([command]) => command === "github_auth_status").length, 1,
      "Cold Settings initialization reads KWallet only once");
    await ui.node("github-connect").fire("click");
    ui.authConnected();
    await ui.dispatchAuth();
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.node("github-monitor-scope").value, "");
    // Explicit selection stays local until confirmation.
    ui.node("github-monitor-scope").value = "two";
    await ui.node("github-monitor-scope").fire("change");
    assert.equal(ui.monitorOrg, null);
    assert.ok(!ui.calls.some(([name]) => name === "github_set_monitor_org"));
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.monitorOrg, "two");
    assert.equal(ui.node("github-monitor-scope").value, "two");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.calls.filter(([name]) => name === "github_set_monitor_org").length, 1);
  } finally { ui.restore(); }
});

test("Settings Cancel revokes unconfirmed new wallet session", async () => {
  const ui = await fixture("cancel-after-auth", false);
  try {
    await ui.node("github-connect").fire("click");
    ui.authConnected();
    await ui.dispatchAuth();
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, true);
    assert.ok(ui.calls.some(([name]) => name === "github_cancel"));
    assert.ok(ui.calls.some(([name]) => name === "github_disconnect"));
    assert.ok(!ui.calls.some(([name]) => name === "github_set_monitor_org"));
  } finally { ui.restore(); }
});

test("cancel with previously authorized account does not delete existing credentials", async () => {
  const ui = await fixture("pre-existing", true);
  try {
    assert.equal(ui.node("apply-settings").disabled, true);
    ui.node("github-monitor-scope").value = "two";
    await ui.node("github-monitor-scope").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.monitorOrg, "one");
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.monitorOrg, "one");
    assert.ok(!ui.calls.some(([name]) => name === "github_set_monitor_org"));
  } finally { ui.restore(); }
});

test("cancel pending Device Flow invalidates polling without claiming connection", async () => {
  const ui = await fixture("cancel-pending", false);
  try {
    await ui.node("github-connect").fire("click");
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
    assert.ok(ui.calls.some(([name]) => name === "github_cancel"));
  } finally { ui.restore(); }
});

test("selected GitHub repositories remain drafts until OK and Cancel never writes them", async () => {
  const ui = await fixture("repo-subset-cancel", true);
  try {
    assert.equal(ui.node("github-repo-mode").value, "all");
    ui.node("github-repo-mode").value = "selected";
    await ui.node("github-repo-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, true,
      "selected mode requires at least one repository");
    const list = ui.node("github-repo-list");
    const choice = list.children.find(item => item.children[1]?.textContent === "one/core");
    assert.ok(choice, "available GitHub repository must be selectable");
    const checkbox = choice.children[0];
    checkbox.checked = true;
    await checkbox.fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.monitorRepositories.length, 0, "draft not yet persisted");
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, []);
    assert.ok(!ui.calls.some(([cmd]) => cmd === "github_set_monitor_org"));
  } finally { ui.restore(); }
});

test("OK persists a repository subset together with its account selection", async () => {
  const ui = await fixture("repo-subset-save", true);
  try {
    ui.node("github-repo-mode").value = "selected";
    await ui.node("github-repo-mode").fire("change");
    const item = ui.node("github-repo-list").children.find(row =>
      row.children[1]?.textContent === "one/core");
    assert.ok(item);
    item.children[0].checked = true;
    await item.children[0].fire("change");
    await ui.node("apply-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    const saved = ui.calls.filter(([name]) => name === "github_set_monitor_org");
    assert.deepEqual(saved.at(-1)[1], {
      org: "one", repositories: ["one/core"]
    });
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("previously saved subset reopens in Selected mode, then account change resets to All", async () => {
  const ui = await fixture("repo-account-switch", true, ["one/core"]);
  try {
    assert.equal(ui.node("github-repo-mode").value, "selected");
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    ui.node("github-monitor-scope").value = "two";
    await ui.node("github-monitor-scope").fire("change");
    await tick();
    assert.equal(ui.node("github-repo-mode").value, "all");
    assert.deepEqual(ui.monitorRepositories, ["one/core"],
      "selection is transactional until explicit OK");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.monitorOrg, "two");
    assert.deepEqual(ui.monitorRepositories, [],
      "new account must never inherit previous account repository names");
  } finally { ui.restore(); }
});

test("Settings enumerates authorized GitHub App installations beyond the first page", async () => {
  const first = Array.from({ length: 100 }, (_, index) =>
    ({ id: index + 10, account: { login: "account" + index } }));
  const ui = await fixture("installations-page-two", true, [], {
    installationPages: [first, [{ id: 999, account: { login: "one" } }]]
  });
  try {
    const pages = ui.calls.filter(([name, args]) => name === "github_api_get" &&
      args.path.startsWith("/user/installations?"));
    assert.deepEqual(pages.map(([, args]) => Number(
      args.path.match(/[?&]page=(\d+)/)?.[1])), [1, 2]);
    assert.equal(ui.node("github-monitor-scope").value, "one");
    assert.ok(ui.node("github-monitor-scope").children.some(option =>
      option.value === "one"));
    assert.equal(ui.node("github-repo-controls").hidden, false,
      "saved page-two account must load its authorized repositories");
    assert.equal(ui.node("apply-settings").disabled, true,
      "inventory refresh must not commit an unchanged account");
  } finally { ui.restore(); }
});

test("Settings reports bounded installation-list truncation without inventing an account", async () => {
  const pages = Array.from({ length: 10 }, (_, page) =>
    Array.from({ length: 100 }, (_, index) => ({
      id: 100 + page * 100 + index,
      account: { login: "account" + (page * 100 + index) }
    })));
  const ui = await fixture("installations-truncated", true, [], {
    installationPages: pages
  });
  try {
    const requests = ui.calls.filter(([name, args]) => name === "github_api_get" &&
      args.path.startsWith("/user/installations?"));
    assert.equal(requests.length, 10);
    assert.match(ui.node("github-auth-message").textContent,
      /installation list incomplete/i);
    assert.equal(ui.node("github-monitor-scope").value, "");
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.monitorOrg, "one",
      "partial inventory must never erase persisted account selection");
  } finally { ui.restore(); }
});

test("late installation API response cannot resurrect Settings account controls after disconnect", async () => {
  const ui = await fixture("installations-after-disconnect", true, [], {
    deferInstallations: true
  });
  try {
    assert.equal(ui.node("github-monitor-scope-row").hidden, false);
    await ui.node("github-disconnect").fire("click");
    assert.equal(ui.node("github-monitor-scope-row").hidden, true);
    assert.equal(ui.node("github-repo-controls").hidden, true);
    ui.releaseInstallations({ installations: [
      { id: 1, account: { login: "one" } }
    ] });
    await tick();
    await tick();
    assert.equal(ui.node("github-monitor-scope-row").hidden, true);
    assert.equal(ui.node("github-repo-controls").hidden, true);
    assert.equal(ui.node("github-connection-indicator").textContent, "Not connected");
    assert.equal(ui.monitorOrg, "one", "native disconnection is not account selection");
  } finally { ui.restore(); }
});


test("ignored child folder edits are draft-only and Cancel never persists them", async () => {
  const ui = await fixture("ignored-cancel", false, [], {
    ignoredChildNames: ["Old"]
  });
  try {
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.node("ignored-child-list").children[0].children[0].textContent, "Old");
    ui.node("ignored-child-name").value = "Archive";
    await ui.node("ignore-child-form").fire("submit");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 0);
    assert.deepEqual(ui.node("ignored-child-list").children.map(row => row.children[0].textContent),
      ["Archive", "Old"]);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 0);
  } finally { ui.restore(); }
});

test("OK commits normalized ignored names alongside roots and language", async () => {
  const ui = await fixture("ignored-save", false, [], {
    ignoredChildNames: ["Old"]
  });
  try {
    ui.node("ignored-child-name").value = " Archive ";
    await ui.node("ignore-child-form").fire("submit");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    const saved = ui.calls.find(([name]) => name === "save_settings");
    assert.ok(saved);
    assert.deepEqual(saved[1], {
      roots: ["/repos"],
      language: "en",
      ignoredChildNames: ["Archive", "Old"],
      ciFailureNotifications: false
    });
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("removing an ignored name re-enables OK without changing enrolled roots", async () => {
  const ui = await fixture("ignored-remove", false, [], {
    ignoredChildNames: ["Old"]
  });
  try {
    await ui.node("ignored-child-list").children[0].children[1].fire("click");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    const saved = ui.calls.find(([name]) => name === "save_settings");
    assert.deepEqual(saved[1].ignoredChildNames, []);
    assert.deepEqual(saved[1].roots, ["/repos"]);
  } finally { ui.restore(); }
});

test("CI failure notifications stay OFF by default and Cancel does not persist opt-in", async () => {
  const ui = await fixture("notify-cancel", false);
  try {
    assert.equal(ui.node("ci-failure-notifications").checked, false);
    assert.equal(ui.node("apply-settings").disabled, true);
    ui.node("ci-failure-notifications").checked = true;
    await ui.node("ci-failure-notifications").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 0);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 0);
  } finally { ui.restore(); }
});

test("CI failure notification opt-in persists only on OK with existing GitHub scope", async () => {
  const ui = await fixture("notify-save", true);
  try {
    assert.equal(ui.node("ci-failure-notifications").checked, false);
    ui.node("ci-failure-notifications").checked = true;
    await ui.node("ci-failure-notifications").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.calls.find(([command]) => command === "save_settings")?.[1]
      ?.ciFailureNotifications, true);
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});
