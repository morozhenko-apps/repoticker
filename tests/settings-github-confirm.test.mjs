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
async function fixture(suffix, initiallyConnected) {
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
  let monitorRepositories = [];
  let closed = false;
  let tokenRemoved = false;
  const document = {
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
              github_monitor_repositories: monitorRepositories
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
