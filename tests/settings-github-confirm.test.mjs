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
  // Match initial HTML: the custom language listbox starts hidden.
  // The default mockNode.hidden=false previously made the first
  // trigger click close the list instead of opening it.
  assert.match(html, /id="language-options"[^>]* hidden>/);
  elements.get("language-options").hidden = true;
  const languageOptions = ["en", "ru"].map(value => {
    const item = mockNode("locale-" + value);
    item.dataset.value = value;
    return item;
  });
  elements.get("language-options").querySelectorAll = () => languageOptions;
  const listeners = new Map();
  const documentHandlers = new Map();
  const calls = [];
  let connected = initiallyConnected;
  let phase = connected ? "connected" : "idle";
  let monitorOrg = connected ? "one" : null;
  let monitorRepositories = [...initialRepositories];
  const persistedIgnored = [...(options.ignoredChildNames || [])];
  let closed = false;
  let osAutostart = options.autostartEnabled === true;
  let tokenRemoved = false;
  let releaseInstallations = null;
  const delayedInstallations = options.deferInstallations
    ? new Promise(resolve => { releaseInstallations = resolve; }) : null;
  const document = {
    activeElement: null,
    documentElement: { lang: "en" },
    getElementById(id) {
      if (!elements.has(id)) throw Error("Unknown Settings element " + id);
      return elements.get(id);
    },
    createElement(tag) { return mockNode(tag); },
    addEventListener(name, handler) { documentHandlers.set(name, handler); },
  };
  for (const node of [...elements.values(), ...languageOptions])
    node.focus = () => { document.activeElement = node; };
  const window = {
    addEventListener() {},
    __TAURI__: {
      core: {
        async invoke(command, args) {
          calls.push([command, args]);
          switch (command) {
            case "get_settings_config": return {
              roots: ["/repos"], language: options.language ?? "en", github_monitor_org: monitorOrg,
              github_monitor_repositories: monitorRepositories,
              ignored_child_names: persistedIgnored,
              ci_failure_notifications: options.ciFailureNotifications === true
            };
            case "get_monitor_scope": return monitorOrg;
            case "autostart_is_enabled":
              if (options.autostartError) throw Error("OS autostart read failed");
              return osAutostart;
            case "autostart_set_enabled":
              if (options.autostartWriteError) throw Error("OS registration denied");
              osAutostart = args.enabled;
              return osAutostart;
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
    languageOption: value => languageOptions.find(item => item.dataset.value === value),
    get activeElement() { return document.activeElement; },
    async documentKeydown(key) {
      const handler = documentHandlers.get("keydown");
      if (handler) return handler({ key, preventDefault() {} });
    },
    async outsidePointerdown() {
      const handler = documentHandlers.get("pointerdown");
      if (handler) return handler({ target: { closest: () => null } });
    },
    get language() { return document.documentElement.lang; },
    authConnected() { connected = true; phase = "connected"; },
    get closed() { return closed; },
    get tokenRemoved() { return tokenRemoved; },
    get monitorOrg() { return monitorOrg; },
    get autostartEnabled() { return osAutostart; },
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

test("Saved Russian Settings renders native status in Russian and draft EN preview does not persist on Cancel", async () => {
  const ui = await fixture("locale-ru-cancel", true, [], { language: "ru" });
  try {
    assert.equal(ui.language, "ru");
    assert.equal(ui.node("github-account-status").value, "Авторизовано");
    assert.equal(ui.node("language-trigger").firstChild.textContent, "Русский ");
    await ui.languageOption("en").fire("click");
    assert.equal(ui.language, "en");
    assert.equal(ui.node("github-account-status").value, "Authorized");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("English saved Settings previews RU before OK and persists only chosen locale", async () => {
  const ui = await fixture("locale-en-save", true);
  try {
    assert.equal(ui.language, "en");
    await ui.languageOption("ru").fire("click");
    assert.equal(ui.language, "ru");
    assert.equal(ui.node("github-account-status").value, "Авторизовано");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.calls.find(([name]) => name === "save_settings")?.[1]?.language, "ru");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Language popup fixture starts in the hidden state declared by shipped HTML", async () => {
  const ui = await fixture("language-start-hidden", true);
  try {
    const trigger = ui.node("language-trigger");
    const list = ui.node("language-options");
    assert.equal(list.hidden, true);
    await trigger.fire("click");
    assert.equal(list.hidden, false);
    assert.equal(ui.activeElement, ui.languageOption("en"));
    await trigger.fire("click");
    assert.equal(list.hidden, true);
    assert.equal(ui.activeElement, trigger);
  } finally { ui.restore(); }
});

test("Keyboard arrows wrap, Home/End move focus, Escape restores trigger and no change is saved", async () => {
  const ui = await fixture("keyboard-navigation", true);
  try {
    const trigger = ui.node("language-trigger");
    const list = ui.node("language-options");
    await trigger.fire("keydown", { key: "ArrowDown" });
    assert.equal(list.hidden, false);
    assert.equal(ui.activeElement, ui.languageOption("en"));
    assert.equal(ui.language, "en");
    assert.equal(ui.calls.some(([command]) => command === "save_settings"), false);
    await list.fire("keydown", { key: "ArrowDown" });
    assert.equal(ui.activeElement, ui.languageOption("ru"));
    await list.fire("keydown", { key: "ArrowDown" });
    assert.equal(ui.activeElement, ui.languageOption("en"));
    await list.fire("keydown", { key: "ArrowUp" });
    assert.equal(ui.activeElement, ui.languageOption("ru"));
    await list.fire("keydown", { key: "Home" });
    assert.equal(ui.activeElement, ui.languageOption("en"));
    await list.fire("keydown", { key: "End" });
    assert.equal(ui.activeElement, ui.languageOption("ru"));
    await list.fire("keydown", { key: "Escape" });
    assert.equal(list.hidden, true);
    assert.equal(ui.activeElement, trigger);
    assert.equal(ui.language, "en");
    assert.equal(ui.node("apply-settings").disabled, true);
  } finally { ui.restore(); }
});

test("Tab leaves popup and mouse outside closes without stealing focus", async () => {
  const ui = await fixture("keyboard-tab-outside", true);
  try {
    const trigger = ui.node("language-trigger");
    const list = ui.node("language-options");
    await trigger.fire("click");
    assert.equal(list.hidden, false);
    assert.equal(ui.activeElement, ui.languageOption("en"));
    await list.fire("keydown", { key: "Tab" });
    assert.equal(list.hidden, true);
    assert.equal(ui.activeElement, ui.languageOption("en"),
      "Tab must be left to native browser navigation");
    await trigger.fire("keydown", { key: "End" });
    assert.equal(ui.activeElement, ui.languageOption("ru"));
    await ui.outsidePointerdown();
    assert.equal(list.hidden, true);
    assert.equal(ui.activeElement, ui.languageOption("ru"),
      "An outside click must not cause focus theft");
  } finally { ui.restore(); }
});

test("Keyboard language choice previews immediately, and Cancel leaves persistence unchanged", async () => {
  const ui = await fixture("keyboard-confirmation", true);
  try {
    await ui.node("language-trigger").fire("keydown", { key: "ArrowDown" });
    await ui.node("language-options").fire("keydown", { key: "ArrowDown" });
    assert.equal(ui.activeElement, ui.languageOption("ru"));
    await ui.languageOption("ru").fire("click");
    assert.equal(ui.language, "ru");
    assert.equal(ui.activeElement, ui.node("language-trigger"));
    assert.equal(ui.node("language-options").hidden, true);
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.calls.filter(([command]) => command === "save_settings").length, 0);
    await ui.node("language-trigger").fire("click");
    assert.equal(ui.activeElement, ui.languageOption("ru"));
    await ui.documentKeydown("Escape");
    assert.equal(ui.activeElement, ui.node("language-trigger"));
    assert.equal(ui.node("language-options").hidden, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.filter(([command]) => command === "save_settings").length, 0);
  } finally { ui.restore(); }
});

test("Login launch remains OFF by default and Cancel never registers with OS", async () => {
  const ui = await fixture("login-cancel", true);
  try {
    assert.equal(ui.node("autostart-enabled").disabled, false);
    assert.equal(ui.node("autostart-enabled").checked, false);
    ui.node("autostart-enabled").checked = true;
    await ui.node("autostart-enabled").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.calls.some(([name]) => name === "autostart_set_enabled"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.autostartEnabled, false);
    assert.equal(ui.calls.some(([name]) => name === "autostart_set_enabled"), false);
  } finally { ui.restore(); }
});

test("Login launch uses native OS registration only on OK, not config.json", async () => {
  const ui = await fixture("login-save", true);
  try {
    ui.node("autostart-enabled").checked = true;
    await ui.node("autostart-enabled").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.autostartEnabled, true);
    assert.deepEqual(ui.calls.filter(([name]) => name === "autostart_set_enabled")
      .map(([, args]) => args.enabled), [true]);
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 0);
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Existing OS autostart can be disabled and saved with another preference", async () => {
  const ui = await fixture("login-disable", true, [], { autostartEnabled: true });
  try {
    assert.equal(ui.node("autostart-enabled").checked, true);
    ui.node("autostart-enabled").checked = false;
    await ui.node("autostart-enabled").fire("change");
    ui.node("ci-failure-notifications").checked = true;
    await ui.node("ci-failure-notifications").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.autostartEnabled, false);
    assert.ok(ui.calls.some(([name, args]) => name === "save_settings" &&
      args.ciFailureNotifications === true));
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Unavailable autostart state stays unknown but does not block other Settings", async () => {
  const ui = await fixture("login-unavailable", true, [], { autostartError: true });
  try {
    assert.equal(ui.node("autostart-enabled").disabled, true);
    assert.equal(ui.node("autostart-status").textContent, "Autostart unavailable");
    ui.node("ci-failure-notifications").checked = true;
    await ui.node("ci-failure-notifications").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.calls.some(([name]) => name === "autostart_set_enabled"), false);
  } finally { ui.restore(); }
});

test("Failed native OS registration keeps dialog open and does not claim success", async () => {
  const ui = await fixture("login-error", true, [], { autostartWriteError: true });
  try {
    ui.node("autostart-enabled").checked = true;
    await ui.node("autostart-enabled").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.autostartEnabled, false);
    assert.equal(ui.closed, false);
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.ok(ui.calls.some(([name]) => name === "autostart_set_enabled"));
  } finally { ui.restore(); }
});
