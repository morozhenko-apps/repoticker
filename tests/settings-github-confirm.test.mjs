import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { settingsText } from "../apps/desktop/ui/settings-i18n.mjs";

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
  const windowHandlers = new Map();
  const documentHandlers = new Map();
  const calls = [];
  let connected = initiallyConnected;
  let phase = options.authPhase ?? (connected ? "connected" : "idle");
  let monitorOrg = Object.hasOwn(options, "initialMonitorOrg")
    ? options.initialMonitorOrg : (connected ? "one" : null);
  let monitorRepositories = [...initialRepositories];
  const persistedIgnored = [...(options.ignoredChildNames || [])];
  let closed = false;
  let osAutostart = options.autostartEnabled === true;
  let persistedConnectionMode = options.connectionMode || "polling";
  let persistedRelayUrl = options.relayUrl || null;
  let relayStored = options.relayStored === true;
  let relayStatusReadCount = 0;
  // Mirror native Rust: password dialogs stage only, Keyring mutates on OK.
  let relayPending = null;
  let relayTransportPhase = options.relayTransportPhase ?? "polling";
  let relayTransportReason = options.relayTransportReason ?? "none";
  let releaseRelayTransportStatus = null;
  const delayedRelayTransportStatus = options.deferRelayTransportStatus
    ? new Promise(resolve => { releaseRelayTransportStatus = resolve; }) : null;
  let tokenRemoved = false;
  let releaseInstallations = null;
  const delayedInstallations = options.deferInstallations
    ? new Promise(resolve => { releaseInstallations = resolve; }) : null;
  let releaseRepositoryInventory = null;
  const deferredRepositoryInventory = options.deferRepositoryForAccount
    ? new Promise(resolve => { releaseRepositoryInventory = resolve; }) : null;
  let resolveInitialConfig = null;
  let rejectInitialConfig = null;
  const deferredInitialConfig = options.deferInitialConfig
    ? new Promise((resolve, reject) => {
      resolveInitialConfig = resolve;
      rejectInitialConfig = reject;
    }) : null;
  let configReadCount = 0;
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
    addEventListener(name, handler) { windowHandlers.set(name, handler); },
    __TAURI__: {
      core: {
        async invoke(command, args) {
          calls.push([command, args]);
          switch (command) {
            case "get_settings_config": {
              const response = {
                roots: options.roots ?? ["/repos"], language: options.language ?? "en",
                github_monitor_org: monitorOrg,
                github_monitor_repositories: monitorRepositories,
                ignored_child_names: persistedIgnored,
                connection_mode: persistedConnectionMode,
                relay_url: persistedRelayUrl,
                // Deliberately omit the enum in legacy-format fixtures.
                ...(options.legacyCiFailureNotifications === true
                  ? { ci_failure_notifications: true }
                  : { ci_notification_mode: options.ciNotificationMode ?? "off" })
              };
              configReadCount++;
              if (configReadCount === 1 && deferredInitialConfig) return deferredInitialConfig;
              if (options.configReadError)
                throw Error("PRIVATE_CONFIG_ERROR_DO_NOT_RENDER");
              return response;
            }
            case "get_monitor_scope": return monitorOrg;
            case "autostart_is_enabled":
              if (options.autostartError) throw Error("OS autostart read failed");
              return osAutostart;
            case "autostart_set_enabled":
              if (options.autostartWriteError) throw Error("OS registration denied");
              // Native OS registration can be refused without throwing.
              if (options.autostartWriteMismatch) return osAutostart;
              osAutostart = args.enabled;
              return osAutostart;
            case "relay_secret_status": {
              const firstRead = relayStatusReadCount++ === 0;
              if (options.relayStatusError &&
                  (!options.relayStatusErrorInitialOnly || firstRead))
                throw Error("PRIVATE_RELAY_STATUS");
              return relayPending === null ? relayStored : relayPending === "set";
            }
            case "relay_connection_diagnostics":
              if (options.relayTransportStatusError) throw Error("PRIVATE_RELAY_PHASE");
              return delayedRelayTransportStatus ?? {
                phase: relayTransportPhase, reason: relayTransportReason
              };
            case "relay_stage_secret":
              if (options.relayStageError) throw Error("Invalid relay credential.");
              if (typeof args.secret !== "string" ||
                  args.secret.length < 32 || args.secret.length > 256 ||
                  !/^[A-Za-z0-9_-]+$/.test(args.secret))
                throw Error("Relay secret must be 32-256 base64url characters.");
              relayPending = "set";
              return undefined;
            case "relay_clear_secret":
              if (options.relayClearError) throw Error("PRIVATE_RELAY_CLEAR");
              relayPending = "remove";
              return undefined;
            case "relay_commit_secret_draft":
              if (options.relayCommitPromise) await options.relayCommitPromise;
              if (options.relayCommitError) throw Error("System credential store unavailable.");
              if (relayPending === "set") relayStored = true;
              if (relayPending === "remove" && !options.relayRemoveStillStored)
                relayStored = false;
              relayPending = null;
              return undefined;
            case "github_auth_status":
              if (options.authStatusError)
                throw Error(options.authStatusErrorText ?? "Credential status unavailable");
              return { connected, phase, reason: options.authReason ?? null };
            case "github_api_get":
              if (args.path.includes("/repositories?")) {
                if (options.repositoryError) throw Error("Synthetic repository API denial");
                if (deferredRepositoryInventory &&
                    args.path.includes("/" + (options.deferRepositoryForAccount === "one" ? 1 : 2) +
                      "/repositories?"))
                  return deferredRepositoryInventory;
                if (options.repositoryPages) {
                  const page = Number(args.path.match(/[?&]page=(\d+)/)?.[1] ?? 1);
                  return { repositories: options.repositoryPages[page - 1] ?? [] };
                }
                return { repositories: [
                  { full_name: "one/core" }, { full_name: "one/docs" },
                  { full_name: "two/api" }, { full_name: "two/web" }
                ].filter(item => item.full_name.startsWith(
                  monitorOrg === "two" || args.path.includes("/2/") ? "two/" : "one/")) };
              }
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
              if (options.beginError) throw Error(options.beginErrorText ?? "Device authorization unavailable");
              phase = "pending";
              if (options.beginPromise) return options.beginPromise;
              return { userCode: "ABCD-1234" };
            case "github_copy_user_code":
              if (options.copyCodeError) throw Error("System clipboard denied");
              return undefined;
            case "github_open_device_page":
              if (options.openDeviceError) throw Error("Device page launch denied");
              return undefined;
            case "open_relay_resource":
              if (!["source", "guide"].includes(args?.resource))
                throw Error("Invalid relay resource");
              if (options.relayDocsOpenError) throw Error("Cannot open browser");
              return undefined;
            case "github_cancel":
              if (!connected) phase = "cancelled";
              return undefined;
            case "github_disconnect":
              if (options.disconnectError) throw Error("Credential revocation denied");
              connected = false;
              tokenRemoved = true;
              phase = "disconnected";
              return undefined;
            case "github_set_monitor_org":
              if (options.scopeWriteError) throw Error("Monitor scope update denied");
              monitorOrg = args.org;
              monitorRepositories = args.repositories ?? monitorRepositories;
              return undefined;
            case "select_repository_root":
              if (options.folderPickerError) throw Error("Folder picker unavailable");
              if (options.folderPickerPromise) return options.folderPickerPromise;
              return options.folderPath ?? null;
            case "save_settings":
              if (options.saveSettingsError) throw Error("Settings write denied");
              if (args.connectionMode) persistedConnectionMode = args.connectionMode;
              if (Object.hasOwn(args, "relayUrl") &&
                  !(options.relayConfigNotCleared && args.connectionMode === "polling"))
                persistedRelayUrl = args.relayUrl;
              return undefined;
            case "close_settings":
              if (options.closeSettingsError)
                throw Error("Synthetic window close rejected");
              relayPending = null;
              closed = true;
              return undefined;
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
    get relayStored() { return relayStored; },
    get relayPending() { return relayPending; },
    get connectionMode() { return persistedConnectionMode; },
    dispatchRelayPhase(phase, reason = "none") {
      relayTransportPhase = phase;
      relayTransportReason = reason;
      listeners.get("repoticker-relay-state")?.({ payload: { phase, reason } });
    },
    releaseRelayTransportStatus: phase => releaseRelayTransportStatus?.(phase),
    setRelayPhaseWithoutEvent: (phase, reason = "none") => {
      relayTransportPhase = phase;
      relayTransportReason = reason;
    },
    async dispatchFocus() {
      windowHandlers.get("focus")?.();
      await tick();
      await tick();
    },
    get relayUrl() { return persistedRelayUrl; },
    get monitorRepositories() { return monitorRepositories; },
    releaseInstallations: payload => releaseInstallations?.(payload),
    releaseRepositoryInventory: payload => releaseRepositoryInventory?.(payload),
    releaseInitialConfig: payload => resolveInitialConfig?.(payload),
    rejectInitialConfig: error => rejectInitialConfig?.(error),
    setConfigReadError: value => { options.configReadError = value; },
    setRelayCommitError: value => { options.relayCommitError = value; },
    setRelayStatusError: value => { options.relayStatusError = value; },
    setAuthStatusError: value => { options.authStatusError = value; },
    setAuthStatusErrorText: value => { options.authStatusErrorText = value; },
    setLanguage: value => { options.language = value; },
    async dispatchOpened() {
      await listeners.get("repoticker-settings-opened")?.({});
      await tick();
      await tick();
    },
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
    assert.equal(ui.node("github-monitor-scope").dir, "ltr");
    assert.equal(ui.node("github-monitor-scope").children.find(option => option.value === "two")?.dir, "auto");
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


test("Existing single eligible GitHub account shows a readonly account and Disconnect on one row", async () => {
  const ui = await fixture("single-existing-account", true, [], {
    installationPages: [[{ id: 1, account: { login: "one" } }]]
  });
  try {
    assert.equal(ui.node("github-monitor-scope-row").hidden, false);
    assert.equal(ui.node("github-account-name").hidden, false);
    assert.equal(ui.node("github-account-name").value, "one");
    assert.equal(ui.node("github-monitor-scope").hidden, true);
    assert.equal(ui.node("github-monitor-scope").children.length, 1,
      "one complete eligible installation needs no Choose account placeholder");
    assert.equal(ui.node("github-monitor-scope").children[0]?.value, "one");
    assert.equal(ui.node("github-disconnect").hidden, false);
    assert.equal(ui.node("github-connection-indicator").hidden, true);
    assert.equal(ui.node("github-auth-message").hidden, true);
    assert.equal(ui.node("apply-settings").disabled, true,
      "existing unchanged GitHub authorization is not an OK confirmation");
    assert.equal(ui.calls.some(([name]) => name === "github_set_monitor_org"), false);
  } finally { ui.restore(); }
});

test("Previously authorized unique installation initializes missing scope without an extra OK", async () => {
  const ui = await fixture("single-autobind-existing", true, [], {
    initialMonitorOrg: null,
    installationPages: [[{ id: 1, account: { login: "one" } }]]
  });
  try {
    assert.equal(ui.monitorOrg, "one");
    assert.equal(ui.node("github-account-name").value, "one");
    assert.equal(ui.node("github-monitor-scope").hidden, true);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.filter(([name]) => name === "github_set_monitor_org").length, 1);
    assert.ok(!ui.calls.some(([name]) => name === "save_settings"));
  } finally { ui.restore(); }
});

test("New GitHub authorization with one installation keeps Cancel/revocation safe until OK", async () => {
  const ui = await fixture("single-new-device-flow", false, [], {
    installationPages: [[{ id: 1, account: { login: "one" } }]]
  });
  try {
    await ui.node("github-connect").fire("click");
    ui.authConnected();
    await ui.dispatchAuth();
    assert.equal(ui.node("github-account-name").value, "one");
    assert.equal(ui.node("github-monitor-scope").hidden, true);
    assert.ok(!ui.calls.some(([name]) => name === "github_set_monitor_org"),
      "a new native token remains provisional until Settings OK");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.tokenRemoved, true, "cancel revokes only the newly authorized token");
    assert.equal(ui.monitorOrg, null);
  } finally { ui.restore(); }
});

test("Single-account automatic scope initialization failure remains retryable and never claims success", async () => {
  const ui = await fixture("single-autobind-denied", true, [], {
    initialMonitorOrg: null,
    scopeWriteError: true,
    installationPages: [[{ id: 1, account: { login: "one" } }]]
  });
  try {
    assert.equal(ui.monitorOrg, null);
    assert.equal(ui.node("apply-settings").disabled, false,
      "explicit OK must be available after a failed unique-scope auto initialization");
    assert.equal(ui.node("github-auth-message").hidden, false);
    assert.match(ui.node("github-auth-message").textContent, /Cannot save GitHub monitoring account/);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.monitorOrg, null);
    assert.equal(ui.tokenRemoved, false);
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
    assert.equal(choice.children[1].dir, "auto");
    assert.equal(choice.children[1].textContent, "one/core");
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
    assert.equal(ui.node("github-connection-indicator").textContent, "Pending disconnect");
    assert.equal(ui.tokenRemoved, false, "Disconnect stays draft until OK");
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
      ignoredChildNames: ["Archive", "Old"]
    }, "Unchanged roots, language and notifications must not be resent");
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
    assert.equal(Object.hasOwn(saved[1], "roots"), false);
  } finally { ui.restore(); }
});

test("CI notification mode defaults off and Cancel does not persist opt-in", async () => {
  const ui = await fixture("notify-cancel", false);
  try {
    assert.equal(ui.node("ci-notification-mode").value, "off");
    assert.equal(ui.node("apply-settings").disabled, true);
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 0);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 0);
  } finally { ui.restore(); }
});

test("CI failure notification mode persists only on OK with existing GitHub scope", async () => {
  const ui = await fixture("notify-save", true, [], {
    legacyCiFailureNotifications: true
  });
  try {
    assert.equal(ui.node("ci-notification-mode").value, "off",
      "a legacy true Boolean never migrates to an enabled enum");
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.calls.find(([command]) => command === "save_settings")?.[1]
      ?.ciNotificationMode, "failures");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("CI successes and both modes are independent, draft-only Settings choices", async () => {
  for (const mode of ["successes", "both"]) {
    const cancel = await fixture("notify-" + mode + "-cancel", true);
    try {
      assert.equal(cancel.node("ci-notification-mode").value, "off");
      cancel.node("ci-notification-mode").value = mode;
      await cancel.node("ci-notification-mode").fire("change");
      assert.equal(cancel.node("apply-settings").disabled, false);
      await cancel.node("cancel-settings").fire("click");
      assert.equal(cancel.calls.some(([name]) => name === "save_settings"), false);
    } finally { cancel.restore(); }

    const commit = await fixture("notify-" + mode + "-save", true);
    try {
      commit.node("ci-notification-mode").value = mode;
      await commit.node("ci-notification-mode").fire("change");
      await commit.node("apply-settings").fire("click");
      assert.deepEqual(commit.calls.filter(([name]) => name === "save_settings")
        .map(([, args]) => args), [{ ciNotificationMode: mode }]);
      assert.equal(commit.closed, true);
    } finally { commit.restore(); }
  }
});

test("Saved Russian Settings renders native status in Russian and draft EN preview does not persist on Cancel", async () => {
  const ui = await fixture("locale-ru-cancel", true, [], { language: "ru" });
  try {
    assert.equal(ui.language, "ru");
    assert.equal(ui.node("github-account-name").value, "one");
    assert.equal(ui.node("language-trigger").firstChild.textContent, "Русский ");
    await ui.languageOption("en").fire("click");
    assert.equal(ui.language, "ru", "Draft selection must not change visible persisted locale");
    assert.equal(ui.node("github-account-name").value, "one");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("English saved Settings keeps EN until OK and persists only chosen locale", async () => {
  const ui = await fixture("locale-en-save", true);
  try {
    assert.equal(ui.language, "en");
    await ui.languageOption("ru").fire("click");
    assert.equal(ui.language, "en");
    assert.equal(ui.node("github-account-name").value, "one");
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

test("Keyboard language choice stays a draft, and Cancel leaves locale unchanged", async () => {
  const ui = await fixture("keyboard-confirmation", true);
  try {
    await ui.node("language-trigger").fire("keydown", { key: "ArrowDown" });
    await ui.node("language-options").fire("keydown", { key: "ArrowDown" });
    assert.equal(ui.activeElement, ui.languageOption("ru"));
    await ui.languageOption("ru").fire("click");
    assert.equal(ui.language, "en");
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
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.autostartEnabled, false);
    assert.ok(ui.calls.some(([name, args]) => name === "save_settings" &&
      args.ciNotificationMode === "failures"));
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Unavailable autostart state stays unknown but does not block other Settings", async () => {
  const ui = await fixture("login-unavailable", true, [], { autostartError: true });
  try {
    assert.equal(ui.node("autostart-enabled").disabled, true);
    assert.equal(ui.node("autostart-status").textContent, "Autostart unavailable");
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
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

test("Native folder selection stays a draft until Settings OK", async () => {
  const ui = await fixture("root-native-ok", true, [], { folderPath: "C:\\\\GitHub" });
  try {
    await ui.node("browse-root").fire("click");
    assert.equal(ui.node("browse-root").disabled, false);
    assert.ok(ui.node("roots-list").children.some(row =>
      row.children.some(node => node.textContent === "C:\\\\GitHub")));
    assert.equal(ui.calls.some(([command]) => command === "save_settings"), false);
    await ui.node("apply-settings").fire("click");
    assert.ok(ui.calls.some(([command, args]) =>
      command === "save_settings" && args.roots.includes("C:\\\\GitHub")));
  } finally { ui.restore(); }
});

test("Cancelling folder picker makes no draft change or write", async () => {
  const ui = await fixture("root-native-cancel", true);
  try {
    await ui.node("browse-root").fire("click");
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Folder picker error keeps Settings open without persisting roots", async () => {
  const ui = await fixture("root-native-error", true, [], { folderPickerError: true });
  try {
    await ui.node("browse-root").fire("click");
    assert.equal(ui.node("browse-root").disabled, false);
    assert.match(ui.node("message").textContent, /Folder picker unavailable/);
    assert.equal(ui.closed, false);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("Native folder picker rejects concurrent modal requests", async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const ui = await fixture("root-native-single-flight", true, [], { folderPickerPromise: pending });
  try {
    const first = ui.node("browse-root").fire("click");
    assert.equal(ui.node("browse-root").disabled, true);
    await ui.node("browse-root").fire("click");
    assert.equal(ui.calls.filter(([name]) => name === "select_repository_root").length, 1);
    finish("C:\\\\Projects");
    await first;
    assert.equal(ui.node("browse-root").disabled, false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("Changing only language never reapplies existing GitHub account or other settings", async () => {
  const ui = await fixture("locale-no-reapply", true, ["one/core"], {
    language: "en", ignoredChildNames: ["Archive"], ciNotificationMode: "both"
  });
  try {
    await ui.languageOption("ru").fire("click");
    assert.equal(ui.language, "en");
    await ui.node("apply-settings").fire("click");
    const patches = ui.calls.filter(([name]) => name === "save_settings");
    assert.equal(patches.length, 1);
    assert.deepEqual(patches[0][1], { language: "ru" });
    assert.equal(ui.calls.some(([name]) => name === "github_set_monitor_org"), false);
    assert.equal(ui.calls.some(([name]) => name === "autostart_set_enabled"), false);
  } finally { ui.restore(); }
});

test("Native browse for excluded children captures only the final folder NAME", async () => {
  const ui = await fixture("ignored-native-folder", true, [], {
    folderPath: "C:\\\\Projects\\\\Archive"
  });
  try {
    await ui.node("browse-ignored-child").fire("click");
    assert.deepEqual(ui.node("ignored-child-list").children.map(row => row.children[0].textContent),
      ["Archive"]);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("Existing GitHub authorization survives Cancel after draft disconnect", async () => {
  const ui = await fixture("disconnect-cancel-transaction", true);
  try {
    await ui.node("github-disconnect").fire("click");
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.monitorOrg, "one");
  } finally { ui.restore(); }
});

test("Existing GitHub authorization is revoked only by explicit OK", async () => {
  const ui = await fixture("disconnect-apply-transaction", true);
  try {
    await ui.node("github-disconnect").fire("click");
    assert.equal(ui.tokenRemoved, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.tokenRemoved, true);
    assert.equal(ui.closed, true);
    assert.equal(ui.calls.filter(([cmd]) => cmd === "github_disconnect").length, 1);
  } finally { ui.restore(); }
});


test("Arabic Settings keeps provider identifiers isolated and Cancel preserves configuration", async () => {
  const ui = await fixture("arabic-bidi", true, [], { language: "ar" });
  try {
    assert.equal(ui.language, "ar");
    assert.equal(ui.node("github-monitor-scope").dir, "ltr");
    const account = ui.node("github-monitor-scope").children.find(option => option.value === "one");
    assert.ok(account);
    assert.equal(account.dir, "auto");
    assert.equal(account.textContent, "one");
    ui.node("github-repo-mode").value = "selected";
    await ui.node("github-repo-mode").fire("change");
    const choice = ui.node("github-repo-list").children.find(item =>
      item.children[1]?.textContent === "one/core");
    assert.ok(choice);
    assert.equal(choice.children[1].dir, "auto");
    assert.equal(choice.children[1].textContent, "one/core");
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, []);
    assert.equal(ui.monitorOrg, "one");
  } finally { ui.restore(); }
});

test("Mode B: Settings enumerates ten full repository pages without claiming completeness", async () => {
  const pages = Array.from({ length: 10 }, (_, page) =>
    Array.from({ length: 100 }, (_, index) => ({
      full_name: "one/repo" + (page * 100 + index)
    })));
  const ui = await fixture("mode-b-repo-10-pages", true, ["one/repo0"], {
    repositoryPages: pages
  });
  try {
    const queries = ui.calls.filter(([command, args]) => command === "github_api_get" &&
      args.path.includes("/repositories?"));
    assert.equal(queries.length, 10, "bounded pagination cannot request an eleventh page");
    assert.equal(ui.node("github-repo-mode").value, "selected");
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.ok(ui.node("github-repo-list").children.length <= 100,
      "render at most 100 repository options per filter");
    assert.ok(ui.node("github-repo-status").textContent.length > 0,
      "partial inventory must display status, not a fabricated complete count");
    ui.node("github-repo-filter").value = "repo999";
    await ui.node("github-repo-filter").fire("input");
    const last = ui.node("github-repo-list").children.find(row =>
      row.children[1]?.textContent === "one/repo999");
    assert.ok(last, "last available page must be selectable");
    last.children[0].checked = true;
    await last.children[0].fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.deepEqual(ui.monitorRepositories, ["one/repo0"],
      "changing filters and selections must not persist before OK");
    await ui.node("apply-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/repo0", "one/repo999"]);
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: denied repository inventory preserves saved subset on Settings Cancel", async () => {
  const ui = await fixture("mode-b-repo-denied", true, ["one/core"], {
    repositoryError: true
  });
  try {
    assert.equal(ui.node("github-repo-mode").value, "selected");
    assert.equal(ui.node("github-repo-list").children.length, 0,
      "API denial must not invent previously authorized repo rows");
    assert.match(ui.node("github-repo-status").textContent, /unavailable/i);
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    assert.equal(ui.monitorOrg, "one");
    assert.equal(ui.closed, true);
    assert.equal(ui.calls.some(([command]) => command === "github_set_monitor_org"),
      false);
  } finally { ui.restore(); }
});

test("Mode B: late old-owner repository inventory cannot overwrite newly chosen owner", async () => {
  const ui = await fixture("mode-b-stale-repo-owner", true, ["one/core"], {
    deferRepositoryForAccount: "one"
  });
  try {
    const first = ui.calls.filter(([command, args]) => command === "github_api_get" &&
      args.path.includes("/1/repositories?"));
    assert.equal(first.length, 1, "old account request is in flight");
    ui.node("github-monitor-scope").value = "two";
    await ui.node("github-monitor-scope").fire("change");
    await tick();
    await tick();
    ui.node("github-repo-mode").value = "selected";
    await ui.node("github-repo-mode").fire("change");
    const before = ui.node("github-repo-list").children.map(row =>
      row.children[1]?.textContent);
    assert.ok(before.includes("two/api"));
    assert.ok(!before.some(name => name?.startsWith("one/")));
    ui.releaseRepositoryInventory({ repositories: [
      { full_name: "one/private-old" }
    ] });
    await tick();
    await tick();
    const after = ui.node("github-repo-list").children.map(row =>
      row.children[1]?.textContent);
    assert.deepEqual(after, before, "late old owner cannot resurrect unauthorized rows");
    assert.equal(ui.node("github-monitor-scope").value, "two");
    assert.equal(ui.monitorOrg, "one", "draft account must not be persisted");
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    assert.equal(ui.monitorOrg, "one");
  } finally { ui.restore(); }
});

test("Mode B: malformed installation scope never authorizes a guessed account", async () => {
  const ui = await fixture("mode-b-invalid-installation", true, [], {
    installationPages: [[
      { id: 1, account: { login: "one" } },
      { id: 2, account: { login: "../spoof" } }
    ]]
  });
  try {
    assert.match(ui.node("github-auth-message").textContent,
      /cannot list available installations/i);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.node("github-monitor-scope").value, "");
    assert.equal(ui.calls.some(([command]) => command === "github_set_monitor_org"),
      false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.monitorOrg, "one");
  } finally { ui.restore(); }
});

test("Mode B: unavailable wallet read fails closed without enabling Save or Connect", async () => {
  const ui = await fixture("mode-b-wallet-unavailable", false, [], {
    authStatusError: true
  });
  try {
    assert.equal(ui.node("github-connect").hidden, true);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.match(ui.node("message").textContent, /Cannot initialize settings/);
    assert.equal(ui.node("github-connection-indicator").textContent, "Connection unavailable");
    assert.doesNotMatch(ui.node("message").textContent, /Credential status unavailable/);
    assert.equal(ui.calls.some(([name]) => [
      "github_set_monitor_org", "save_settings", "github_disconnect",
      "autostart_set_enabled"
    ].includes(name)), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
  } finally { ui.restore(); }
});

test("Mode B: rejected Device Flow challenge never displays a code or pending session", async () => {
  const ui = await fixture("mode-b-device-challenge-error", false, [], {
    beginError: true
  });
  try {
    await ui.node("github-connect").fire("click");
    assert.equal(ui.node("github-connect").disabled, false);
    assert.equal(ui.node("github-connect").hidden, false);
    assert.equal(ui.node("github-device-flow").hidden, true);
    assert.equal(ui.node("github-user-code").textContent, "");
    assert.equal(ui.node("github-auth-message").textContent,
      "GitHub authorization failed.");
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.calls.some(([name]) => name === "github_disconnect"), false);
  } finally { ui.restore(); }
});

test("Mode B: denied config write retains draft and never commits unrelated native commands", async () => {
  const ui = await fixture("mode-b-config-write-error", true, [], {
    saveSettingsError: true
  });
  try {
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.node("apply-settings").disabled, false,
      "rejected save must keep edited draft available for retry");
    assert.equal(ui.node("ci-notification-mode").value, "failures");
    assert.match(ui.node("message").textContent, /Settings write denied/);
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 1);
    assert.equal(ui.calls.some(([name]) => [
      "github_set_monitor_org", "autostart_set_enabled", "github_disconnect"
    ].includes(name)), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.monitorOrg, "one");
  } finally { ui.restore(); }
});

test("Mode B: denied monitoring-scope write preserves the current account", async () => {
  const ui = await fixture("mode-b-scope-write-error", true, [], {
    scopeWriteError: true
  });
  try {
    ui.node("github-monitor-scope").value = "two";
    await ui.node("github-monitor-scope").fire("change");
    assert.equal(ui.monitorOrg, "one", "selection must remain a draft");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.monitorOrg, "one", "rejected write cannot change native scope");
    assert.equal(ui.closed, false);
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.match(ui.node("message").textContent, /Monitor scope update denied/);
    assert.equal(ui.calls.filter(([name]) => name === "github_set_monitor_org").length, 1);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.monitorOrg, "one");
  } finally { ui.restore(); }
});

test("Mode B: denied wallet revocation cannot claim a completed disconnect", async () => {
  const ui = await fixture("mode-b-wallet-revoke-error", true, [], {
    disconnectError: true
  });
  try {
    await ui.node("github-disconnect").fire("click");
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.monitorOrg, "one");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.match(ui.node("message").textContent, /Credential revocation denied/);
    assert.equal(ui.calls.filter(([name]) => name === "github_disconnect").length, 1);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.tokenRemoved, false, "Cancel must not erase an existing wallet token");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: invalid folder basename from native picker never becomes an exclusion", async () => {
  const ui = await fixture("mode-b-invalid-ignored-picker", false, [], {
    folderPath: "/tmp/.."
  });
  try {
    await ui.node("browse-ignored-child").fire("click");
    assert.match(ui.node("message").textContent, /Invalid folder name/);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: native excluded-folder picker refuses the 101st unique exclusion", async () => {
  const names = Array.from({ length: 100 }, (_, index) => "Excluded-" + index);
  const ui = await fixture("mode-b-ignored-cap-picker", false, [], {
    ignoredChildNames: names, folderPath: "/tmp/Extra"
  });
  try {
    assert.equal(ui.node("ignored-child-list").children.length, 100);
    await ui.node("browse-ignored-child").fire("click");
    assert.match(ui.node("message").textContent, /at most 100 child folder names/);
    assert.equal(ui.node("ignored-child-list").children.length, 100);
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("Mode B: Settings filters native-invalid repository identities before selection", async () => {
  const exact100 = "a".repeat(100);
  const tooLong = "b".repeat(101);
  const ui = await fixture("mode-b-native-repo-name-parity", true, [], {
    repositoryPages: [[
      { full_name: "one/" + exact100 },
      { full_name: "one/" + tooLong },
      { full_name: "one/." },
      { full_name: "one/.." },
      { full_name: "one/" },
      { full_name: "one/valid-repo" },
      { full_name: "two/foreign" },
      { full_name: "one/nested/child" },
      { full_name: "one/invalid name" }
    ]]
  });
  try {
    ui.node("github-repo-mode").value = "selected";
    await ui.node("github-repo-mode").fire("change");
    const offered = ui.node("github-repo-list").children.map(row =>
      row.children[1]?.textContent).sort();
    assert.deepEqual(offered, ["one/" + exact100, "one/valid-repo"].sort(),
      "Settings must never offer names native valid_name would reject");
    assert.equal(ui.node("apply-settings").disabled, true);
    const valid = ui.node("github-repo-list").children.find(row =>
      row.children[1]?.textContent === "one/valid-repo");
    valid.children[0].checked = true;
    await valid.children[0].fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/valid-repo"]);
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: offline saved repository subset survives unrelated Settings persistence", async () => {
  const ui = await fixture("mode-b-offline-repo-unrelated-save", true,
    ["one/core"], { repositoryError: true });
  try {
    assert.equal(ui.node("github-repo-mode").value, "selected");
    assert.match(ui.node("github-repo-status").textContent, /unavailable/i);
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false,
      "unmodified offline selection must not block unrelated settings");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    assert.equal(ui.monitorOrg, "one");
    assert.deepEqual(ui.calls.filter(([name]) => name === "save_settings")
      .map(([, args]) => args), [{ ciNotificationMode: "failures" }]);
    assert.equal(ui.calls.some(([name]) => name === "github_set_monitor_org"),
      false, "an offline inventory must not silently rewrite the selected scope");
  } finally { ui.restore(); }
});

test("Mode B: Settings blocks 101 selected repositories and accepts exactly 100", async () => {
  const first = Array.from({ length: 100 }, (_, index) => ({
    full_name: "one/repo" + String(index).padStart(3, "0")
  }));
  const ui = await fixture("mode-b-100-repo-cap", true, [], {
    repositoryPages: [first, [{ full_name: "one/repo100" }]]
  });
  try {
    ui.node("github-repo-mode").value = "selected";
    await ui.node("github-repo-mode").fire("change");
    for (let index = 0; index < 100; index++) {
      const name = "one/repo" + String(index).padStart(3, "0");
      const row = ui.node("github-repo-list").children.find(item =>
        item.children[1]?.textContent === name);
      assert.ok(row, name);
      row.children[0].checked = true;
      await row.children[0].fire("change");
    }
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.deepEqual(ui.monitorRepositories, []);
    ui.node("github-repo-filter").value = "repo100";
    await ui.node("github-repo-filter").fire("input");
    const extra = ui.node("github-repo-list").children[0]?.children[0];
    assert.ok(extra);
    extra.checked = true;
    await extra.fire("change");
    assert.match(ui.node("github-repo-status").textContent, /at most 100/i);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.some(([name]) => name === "github_set_monitor_org"),
      false);
    const excess = ui.node("github-repo-list").children[0]?.children[0];
    excess.checked = false;
    await excess.fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.monitorRepositories.length, 100);
    assert.equal(ui.monitorRepositories.includes("one/repo100"), false);
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: auth event cannot undo a draft GitHub disconnect", async () => {
  const ui = await fixture("mode-b-draft-disconnect-event", true, ["one/core"]);
  try {
    await ui.node("github-disconnect").fire("click");
    assert.equal(ui.node("github-connection-indicator").textContent, "Pending disconnect");
    assert.equal(ui.node("github-monitor-scope-row").hidden, true);
    assert.equal(ui.tokenRemoved, false);
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.dispatchAuth();
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Pending disconnect", "reconciliation must not silently restore Authorized");
    assert.equal(ui.node("github-disconnect").hidden, true);
    assert.equal(ui.node("github-monitor-scope-row").hidden, true);
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.monitorOrg, "one");
    assert.equal(ui.tokenRemoved, false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
  } finally { ui.restore(); }
});

test("Mode B: clipboard denial preserves public user code and allows manual copying", async () => {
  const ui = await fixture("mode-b-copy-denied", false, [], {
    copyCodeError: true
  });
  try {
    await ui.node("github-connect").fire("click");
    assert.equal(ui.node("github-user-code").textContent, "ABCD-1234");
    await ui.node("github-copy-code").fire("click");
    assert.equal(ui.node("github-user-code").textContent, "ABCD-1234");
    assert.equal(ui.node("github-device-flow").hidden, false);
    assert.equal(ui.node("github-copy-code").textContent, "Copy code");
    assert.match(ui.node("github-auth-message").textContent, /Ctrl\+C/);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.filter(([name]) => name === "github_copy_user_code").length, 1);
    await ui.node("github-cancel-device").fire("click");
    assert.equal(ui.node("github-device-flow").hidden, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
  } finally { ui.restore(); }
});

test("Mode B: browser launch failure does not consume GitHub challenge", async () => {
  const ui = await fixture("mode-b-browser-launch-denied", false, [], {
    openDeviceError: true
  });
  try {
    await ui.node("github-connect").fire("click");
    await ui.node("github-open-device").fire("click");
    assert.match(ui.node("github-auth-message").textContent,
      /Device page launch denied/);
    assert.equal(ui.node("github-device-flow").hidden, false);
    assert.equal(ui.node("github-user-code").textContent, "ABCD-1234");
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.filter(([name]) => name === "github_open_device_page").length, 1);
    await ui.node("github-cancel-device").fire("click");
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.tokenRemoved, false);
  } finally { ui.restore(); }
});

test("Mode B: unknown native GitHub failure reason is never interpolated into WebView", async () => {
  const untrusted = "PRIVATE_NATIVE_DETAIL_DO_NOT_RENDER";
  const ui = await fixture("mode-b-unknown-auth-reason", false, [], {
    authPhase: "failed", authReason: untrusted
  });
  try {
    assert.equal(ui.node("github-auth-message").textContent,
      "GitHub authorization failed.");
    assert.doesNotMatch(ui.node("github-auth-message").textContent,
      /PRIVATE_NATIVE_DETAIL_DO_NOT_RENDER/);
    assert.equal(ui.node("github-connect").hidden, false);
    assert.equal(ui.node("apply-settings").disabled, true);
  } finally { ui.restore(); }
  const known = await fixture("mode-b-known-auth-reason", false, [], {
    authPhase: "failed", authReason: "credential_store"
  });
  try {
    assert.match(known.node("github-auth-message").textContent,
      /system wallet/);
    assert.doesNotMatch(known.node("github-auth-message").textContent,
      /credential_store/);
  } finally { known.restore(); }
});

test("Mode B: Settings opened during native pending auth requires explicit cancellation", async () => {
  const ui = await fixture("mode-b-native-auth-pending-open", false, [], {
    authPhase: "awaiting_approval"
  });
  try {
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Authorization pending");
    assert.equal(ui.node("github-connect").hidden, true);
    assert.equal(ui.node("github-device-flow").hidden, false);
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
    assert.ok(ui.calls.some(([name]) => name === "github_cancel"));
    assert.equal(ui.calls.some(([name]) => name === "github_disconnect"), false);
  } finally { ui.restore(); }
});

test("Mode B: blank and duplicate root form submissions keep Settings pristine", async () => {
  const ui = await fixture("mode-b-root-empty-duplicate", false);
  try {
    for (const value of ["", "  ", "/repos"]) {
      ui.node("root-path").value = value;
      await ui.node("add-root-form").fire("submit");
      assert.equal(ui.node("apply-settings").disabled, true,
        "blank and duplicate roots must not enable Apply");
      assert.deepEqual(ui.node("roots-list").children.map(row =>
        row.children[0]?.textContent), ["/repos"]);
    }
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: adding then removing a root restores the original draft", async () => {
  const ui = await fixture("mode-b-root-revert", false);
  try {
    ui.node("root-path").value = " /extra ";
    await ui.node("add-root-form").fire("submit");
    assert.equal(ui.node("apply-settings").disabled, false);
    const added = ui.node("roots-list").children.find(row =>
      row.children[0]?.textContent === "/extra");
    assert.ok(added);
    await added.children[1].fire("click");
    assert.deepEqual(ui.node("roots-list").children.map(row =>
      row.children[0]?.textContent), ["/repos"]);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: ignored-child manual form rejects path traversal and invalid lengths", async () => {
  const ui = await fixture("mode-b-ignored-form-rejections", false);
  try {
    const invalid = [
      "", "   ", ".", "..", "nested/child", "nested\\child",
      "bad\nname", "bad\u007fname", "x".repeat(256)
    ];
    for (const value of invalid) {
      ui.node("ignored-child-name").value = value;
      await ui.node("ignore-child-form").fire("submit");
      assert.equal(ui.node("ignored-child-list").children.length, 1,
        "invalid input must leave the empty-state hint alone");
      assert.equal(ui.node("apply-settings").disabled, true);
    }
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: ignored child duplicate is idempotent and 255 characters are accepted", async () => {
  const ui = await fixture("mode-b-ignored-max-bound", false, [], {
    ignoredChildNames: ["Archive"]
  });
  try {
    ui.node("ignored-child-name").value = " Archive ";
    await ui.node("ignore-child-form").fire("submit");
    assert.deepEqual(ui.node("ignored-child-list").children.map(row =>
      row.children[0]?.textContent), ["Archive"]);
    assert.equal(ui.node("apply-settings").disabled, true);
    const longest = "z".repeat(255);
    ui.node("ignored-child-name").value = longest;
    await ui.node("ignore-child-form").fire("submit");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    const patches = ui.calls.filter(([name]) => name === "save_settings");
    assert.equal(patches.length, 1);
    assert.deepEqual(patches[0][1].ignoredChildNames, ["Archive", longest]);
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: Windows verbatim roots are displayed normally but persisted unchanged", async () => {
  const slash = String.fromCharCode(92);
  const drive = slash + slash + "?" + slash + "C:" + slash + "Dev";
  const unc = slash + slash + "?" + slash + "UNC" + slash +
    "server" + slash + "share";
  const ui = await fixture("mode-b-verbatim-root-integrity", false, [], {
    roots: [drive, unc]
  });
  try {
    assert.deepEqual(ui.node("roots-list").children.map(row =>
      row.children[0]?.textContent), [
      "C:" + slash + "Dev",
      slash + slash + "server" + slash + "share"
    ]);
    assert.equal(ui.node("apply-settings").disabled, true);
    ui.node("root-path").value = "/extra";
    await ui.node("add-root-form").fire("submit");
    await ui.node("apply-settings").fire("click");
    const write = ui.calls.find(([name]) => name === "save_settings");
    assert.deepEqual(write?.[1].roots, [drive, unc, "/extra"],
      "display-only path normalization must not mutate persisted canonical roots");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: mismatched OS autostart response fails verification without claiming success", async () => {
  const ui = await fixture("mode-b-autostart-mismatch", false, [], {
    autostartWriteMismatch: true
  });
  try {
    ui.node("autostart-enabled").checked = true;
    await ui.node("autostart-enabled").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.autostartEnabled, false);
    assert.equal(ui.node("autostart-enabled").checked, true,
      "the requested change remains available for retry");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.match(ui.node("message").textContent, /could not be verified/);
    assert.equal(ui.calls.filter(([name]) => name === "autostart_set_enabled").length, 1);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("Mode B: initial Settings config failure reports unavailable without revealing IPC detail", async () => {
  const ui = await fixture("mode-b-config-startup-denied", false, [], {
    configReadError: true
  });
  try {
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Connection unavailable");
    assert.equal(ui.node("github-connect").hidden, true);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.match(ui.node("message").textContent, /Cannot initialize settings/);
    assert.doesNotMatch(ui.node("message").textContent,
      /PRIVATE_CONFIG_ERROR_DO_NOT_RENDER/);
    assert.equal(ui.calls.some(([name]) => [
      "save_settings", "github_set_monitor_org", "github_disconnect"
    ].includes(name)), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: failed Settings reopen blocks stale dirty draft until a successful reload", async () => {
  const ui = await fixture("mode-b-config-reopen-failure", true);
  try {
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    ui.setConfigReadError(true);
    await ui.dispatchOpened();
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Connection unavailable");
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.doesNotMatch(ui.node("message").textContent,
      /PRIVATE_CONFIG_ERROR_DO_NOT_RENDER/);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    ui.setConfigReadError(false);
    await ui.dispatchOpened();
    assert.equal(ui.node("github-connection-indicator").textContent, "Authorized");
    assert.equal(ui.node("ci-notification-mode").value, "off");
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
  } finally { ui.restore(); }
});

test("Mode B: late first config read cannot overwrite the newer reopened Settings form", async () => {
  const ui = await fixture("mode-b-stale-first-config", false, [], {
    deferInitialConfig: true, language: "en"
  });
  try {
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Checking connection...");
    ui.setLanguage("ru");
    await ui.dispatchOpened();
    assert.equal(ui.language, "ru");
    assert.equal(ui.node("github-connection-indicator").textContent,
      settingsText(ui.language, "Not connected"));
    ui.releaseInitialConfig({
      roots: ["/stale"], language: "en", github_monitor_org: null,
      github_monitor_repositories: [], ignored_child_names: [],
      ci_failure_notifications: true
    });
    await tick();
    await tick();
    assert.equal(ui.language, "ru");
    assert.deepEqual(ui.node("roots-list").children.map(row =>
      row.children[0]?.textContent), ["/repos"]);
    assert.equal(ui.node("ci-notification-mode").value, "off");
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("Mode B: late failed startup cannot replace a successful reopen with an error", async () => {
  const ui = await fixture("mode-b-stale-first-config-error", false, [], {
    deferInitialConfig: true, language: "en"
  });
  try {
    await ui.dispatchOpened();
    assert.equal(ui.node("github-connection-indicator").textContent, "Not connected");
    ui.rejectInitialConfig(Error("PRIVATE_STALE_INITIAL_ERROR"));
    await tick();
    await tick();
    assert.equal(ui.node("github-connection-indicator").textContent, "Not connected");
    assert.doesNotMatch(ui.node("message").textContent, /PRIVATE_STALE_INITIAL_ERROR/);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
  } finally { ui.restore(); }
});

test("Mode B: oversized repository page is unavailable rather than complete", async () => {
  const oversized = Array.from({ length: 101 }, (_, i) => ({
    full_name: "one/repo" + i
  }));
  const ui = await fixture("mode-b-repo-page-overflow", true, ["one/core"], {
    repositoryPages: [oversized]
  });
  try {
    assert.equal(ui.node("github-repo-mode").value, "selected");
    assert.equal(ui.node("github-repo-list").children.length, 0);
    assert.match(ui.node("github-repo-status").textContent, /unavailable/i);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.filter(([name, args]) =>
      name === "github_api_get" && args.path.includes("/repositories?")).length, 1,
      "reject the oversized page without trusting or fetching further pages");
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    assert.equal(ui.calls.some(([name]) => name === "github_set_monitor_org"), false);
  } finally { ui.restore(); }
});

test("Mode B: malformed repository row fails closed without losing saved selection", async () => {
  const ui = await fixture("mode-b-repo-bad-fullname", true, ["one/core"], {
    repositoryPages: [[{ full_name: "one/core" }, { full_name: null }]]
  });
  try {
    assert.equal(ui.node("github-repo-list").children.length, 0,
      "a structurally broken row must invalidate the entire page");
    assert.match(ui.node("github-repo-status").textContent, /unavailable/i);
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    assert.equal(ui.monitorOrg, "one");
  } finally { ui.restore(); }
});

test("Mode B: malformed second repository page discards earlier tentative rows", async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => ({
    full_name: "one/repo" + i
  }));
  const ui = await fixture("mode-b-repo-second-page-malformed", true, ["one/core"], {
    repositoryPages: [page1, [{ full_name: 5 }]]
  });
  try {
    const reads = ui.calls.filter(([name, args]) =>
      name === "github_api_get" && args.path.includes("/repositories?"));
    assert.equal(reads.length, 2);
    assert.equal(ui.node("github-repo-list").children.length, 0,
      "the first page must never be published as a confident partial success");
    assert.match(ui.node("github-repo-status").textContent, /unavailable/i);
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
  } finally { ui.restore(); }
});

test("Mode B: unrelated Settings save preserves scope when repository page is corrupt", async () => {
  const ui = await fixture("mode-b-repo-bad-save-unrelated", true, ["one/core"], {
    repositoryPages: [[{ full_name: "one/core" }, {}]]
  });
  try {
    assert.match(ui.node("github-repo-status").textContent, /unavailable/i);
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false,
      "a corrupt inventory must not block independent preference edits");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    assert.equal(ui.monitorOrg, "one");
    assert.deepEqual(ui.calls.filter(([name]) => name === "save_settings")
      .map(([, args]) => args), [{ ciNotificationMode: "failures" }]);
    assert.equal(ui.calls.some(([name]) => name === "github_set_monitor_org"),
      false, "unknown inventory is not a reason to rewrite native scope");
  } finally { ui.restore(); }
});

test("Mode B: concurrent Connect events issue only one native GitHub challenge", async () => {
  let completeBegin;
  const firstChallenge = new Promise(resolve => { completeBegin = resolve; });
  const ui = await fixture("mode-b-device-single-flight", false, [], {
    beginPromise: firstChallenge
  });
  try {
    const firstClick = ui.node("github-connect").fire("click");
    assert.equal(ui.node("github-connect").disabled, true);
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("github-connect").fire("click");
    assert.equal(ui.calls.filter(([name]) => name === "github_begin").length, 1,
      "single-flight must be enforced by the controller as well as disabled DOM");
    assert.equal(ui.node("github-user-code").textContent, "");
    completeBegin({ userCode: "ABCD-1234" });
    await firstClick;
    assert.equal(ui.node("github-user-code").textContent, "ABCD-1234");
    assert.equal(ui.node("github-device-flow").hidden, false);
    assert.equal(ui.calls.filter(([name]) => name === "github_begin").length, 1);
    await ui.node("github-cancel-device").fire("click");
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
  } finally { ui.restore(); }
});

test("Mode B: failed device challenge requires no wallet cleanup on Cancel", async () => {
  const ui = await fixture("mode-b-begin-no-unnecessary-vault-read", false, [], {
    beginError: true
  });
  try {
    await ui.node("github-connect").fire("click");
    assert.equal(ui.node("github-device-flow").hidden, true);
    assert.equal(ui.node("github-user-code").textContent, "");
    const initialStatusReads = ui.calls.filter(([name]) =>
      name === "github_auth_status").length;
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.calls.filter(([name]) =>
      name === "github_auth_status").length, initialStatusReads);
    assert.equal(ui.calls.some(([name]) => name === "github_disconnect"), false);
    assert.equal(ui.calls.some(([name]) => name === "github_cancel"), false);
  } finally { ui.restore(); }
});

test("Mode B: native status failure after open is redacted and blocks dirty Apply", async () => {
  const sensitiveError = "PRIVATE_PROVIDER_BODY_MUST_NOT_RENDER";
  const ui = await fixture("mode-b-status-event-failure", true);
  try {
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    ui.setAuthStatusErrorText(sensitiveError);
    ui.setAuthStatusError(true);
    await ui.dispatchAuth();
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Connection unavailable");
    assert.equal(ui.node("github-connect").hidden, true);
    assert.equal(ui.node("github-disconnect").hidden, true);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.node("github-auth-message").textContent, "Connection unavailable");
    assert.doesNotMatch(ui.node("github-auth-message").textContent,
      /PRIVATE_PROVIDER_BODY_MUST_NOT_RENDER/);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false,
      "a failed wallet status must not authorize unrelated persisted changes");
    ui.setAuthStatusError(false);
    await ui.dispatchAuth();
    assert.equal(ui.node("github-connection-indicator").textContent, "Authorized");
    assert.equal(ui.node("apply-settings").disabled, false,
      "successful wallet reconciliation permits previously drafted change");
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
  } finally { ui.restore(); }
});

test("Mode B: auth event cannot rescue untrusted Settings initialization", async () => {
  const ui = await fixture("mode-b-auth-event-after-config-failure", true, [], {
    configReadError: true
  });
  try {
    const reads = ui.calls.filter(([name]) => name === "github_auth_status").length;
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Connection unavailable");
    await ui.dispatchAuth();
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Connection unavailable");
    assert.equal(ui.calls.filter(([name]) => name === "github_auth_status").length,
      reads, "failed initialization requires a successful full reload");
    assert.equal(ui.node("apply-settings").disabled, true);
    ui.setConfigReadError(false);
    await ui.dispatchOpened();
    assert.equal(ui.node("github-connection-indicator").textContent, "Authorized");
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
  } finally { ui.restore(); }
});

test("Mode B: Cancel during in-flight device challenge ignores late success", async () => {
  let finishBegin;
  const deferred = new Promise(resolve => { finishBegin = resolve; });
  const ui = await fixture("mode-b-cancel-inflight-begin", false, [], {
    beginPromise: deferred
  });
  try {
    const begin = ui.node("github-connect").fire("click");
    assert.equal(ui.node("github-connect").disabled, true);
    assert.equal(ui.calls.filter(([name]) => name === "github_begin").length, 1);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.calls.filter(([name]) => name === "github_cancel").length, 1);
    assert.equal(ui.tokenRemoved, false);
    finishBegin({ userCode: "ABCD-1234" });
    await begin;
    await tick();
    assert.equal(ui.node("github-user-code").textContent, "");
    assert.equal(ui.node("github-device-flow").hidden, true);
    assert.equal(ui.calls.filter(([name]) => name === "github_flow_status").length, 0);
    assert.equal(ui.calls.some(([name]) => name === "github_disconnect"), false);
  } finally { ui.restore(); }
});

test("Mode B: reopened Settings invalidates earlier device challenge completion", async () => {
  let finishBegin;
  const deferred = new Promise(resolve => { finishBegin = resolve; });
  const ui = await fixture("mode-b-reopen-inflight-begin", false, [], {
    beginPromise: deferred
  });
  try {
    const begin = ui.node("github-connect").fire("click");
    assert.equal(ui.node("github-connect").disabled, true);
    await ui.dispatchOpened();
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Authorization pending");
    assert.equal(ui.node("github-user-code").textContent, "");
    finishBegin({ userCode: "ABCD-1234" });
    await begin;
    await tick();
    assert.equal(ui.node("github-connection-indicator").textContent,
      "Authorization pending");
    assert.equal(ui.node("github-user-code").textContent, "",
      "late result from prior window generation must not expose an old challenge");
    assert.equal(ui.node("github-connect").disabled, false);
    await ui.node("github-cancel-device").fire("click");
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
  } finally { ui.restore(); }
});

test("Mode B: rejected device code request does not disclose native error body", async () => {
  const ui = await fixture("mode-b-redacted-begin-error", false, [], {
    beginError: true, beginErrorText: "PRIVATE_NATIVE_OAUTH_DETAIL_DO_NOT_RENDER"
  });
  try {
    await ui.node("github-connect").fire("click");
    assert.equal(ui.node("github-auth-message").textContent,
      "GitHub authorization failed.");
    assert.doesNotMatch(ui.node("github-auth-message").textContent,
      /PRIVATE_NATIVE_OAUTH_DETAIL_DO_NOT_RENDER/);
    assert.equal(ui.node("github-device-flow").hidden, true);
    assert.equal(ui.node("github-user-code").textContent, "");
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.tokenRemoved, false);
  } finally { ui.restore(); }
});

const mixedCaseInstallations = [[{
  id: 1, account: { login: "One" }
}]];
const mixedCaseRepositories = [[
  { full_name: "One/core" }, { full_name: "One/docs" }
]];

test("Mode B: GitHub owner casing preserves configured account and loads inventory", async () => {
  const ui = await fixture("mode-b-owner-case-reconcile", true, ["one/core"], {
    installationPages: mixedCaseInstallations,
    repositoryPages: mixedCaseRepositories
  });
  try {
    assert.equal(ui.monitorOrg, "one");
    assert.equal(ui.node("github-monitor-scope").value, "One",
      "provider-cased account must be selected for saved case-equivalent scope");
    assert.equal(ui.node("github-monitor-scope-row").hidden, false);
    assert.equal(ui.node("github-repo-controls").hidden, false);
    assert.equal(ui.node("github-repo-list").children.length, 2);
    assert.equal(ui.calls.some(([command, args]) =>
      command === "github_api_get" &&
      args.path === "/user/installations/1/repositories?per_page=100&page=1"), true);
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.calls.some(([command]) => command === "github_set_monitor_org"), false);
  } finally { ui.restore(); }
});

test("Mode B: case-equivalent saved repo is visibly selected without fabricated missing entry", async () => {
  const ui = await fixture("mode-b-saved-repo-case-reconcile", true, ["one/core"], {
    installationPages: mixedCaseInstallations,
    repositoryPages: mixedCaseRepositories
  });
  try {
    const row = ui.node("github-repo-list").children.find(item =>
      item.children[1]?.textContent === "One/core");
    assert.ok(row, "provider repo must appear");
    assert.equal(row.children[0].checked, true,
      "saved case-equivalent repository must display as selected");
    assert.equal(ui.node("github-repo-mode").value, "selected");
    assert.doesNotMatch(ui.node("github-repo-status").textContent,
      /unavailable/i);
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    assert.equal(ui.calls.some(([command]) => command === "save_settings"), false);
  } finally { ui.restore(); }
});

test("Mode B: same GitHub account selected twice does not clear saved repository subset", async () => {
  const ui = await fixture("mode-b-duplicate-account-case", true, ["one/core"], {
    installationPages: mixedCaseInstallations,
    repositoryPages: mixedCaseRepositories
  });
  try {
    const scope = ui.node("github-monitor-scope");
    assert.equal(scope.value, "One");
    await scope.fire("change");
    assert.equal(ui.node("github-repo-mode").value, "selected");
    assert.equal(ui.node("github-repo-list").children.find(row =>
      row.children[1]?.textContent === "One/core")?.children[0].checked, true);
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("cancel-settings").fire("click");
    assert.deepEqual(ui.monitorRepositories, ["one/core"]);
    assert.equal(ui.monitorOrg, "one");
    assert.equal(ui.calls.some(([command]) => command === "github_set_monitor_org"), false);
  } finally { ui.restore(); }
});

test("Mode B: unchecking case-variant repo removes the original identity", async () => {
  const ui = await fixture("mode-b-uncheck-case-variant", true, ["one/core"], {
    installationPages: mixedCaseInstallations,
    repositoryPages: mixedCaseRepositories
  });
  try {
    const core = ui.node("github-repo-list").children.find(row =>
      row.children[1]?.textContent === "One/core");
    assert.ok(core);
    assert.equal(core.children[0].checked, true);
    core.children[0].checked = false;
    await core.children[0].fire("change");
    const docs = ui.node("github-repo-list").children.find(row =>
      row.children[1]?.textContent === "One/docs");
    assert.ok(docs);
    docs.children[0].checked = true;
    await docs.children[0].fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.deepEqual(ui.monitorRepositories, ["One/docs"]);
    assert.equal(ui.monitorOrg, "One");
    assert.equal(ui.calls.filter(([name]) => name === "github_set_monitor_org").length, 1);
  } finally { ui.restore(); }
});

test("Mode B: adding repository preserves case-equivalent saved subset without duplicates", async () => {
  const ui = await fixture("mode-b-add-repo-saved-case", true, ["one/core"], {
    installationPages: mixedCaseInstallations,
    repositoryPages: mixedCaseRepositories
  });
  try {
    const docs = ui.node("github-repo-list").children.find(row =>
      row.children[1]?.textContent === "One/docs");
    assert.ok(docs);
    docs.children[0].checked = true;
    await docs.children[0].fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.deepEqual(ui.monitorRepositories, ["One/docs", "one/core"]);
    assert.equal(new Set(ui.monitorRepositories.map(x => x.toLowerCase())).size, 2);
    assert.equal(ui.calls.filter(([name]) => name === "github_set_monitor_org").length, 1);
  } finally { ui.restore(); }
});

test("Inline relay secret remains a Settings draft and Cancel never calls Keyring", async () => {
  const ui = await fixture("inline-relay-cancel", true, [], {
    connectionMode: "hybrid", relayUrl: "https://relay.example.com/"
  });
  try {
    const field = ui.node("relay-secret-mask");
    assert.equal(field.type, "password");
    assert.equal(field.disabled, false);
    field.value = "A".repeat(64);
    await field.fire("input");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.calls.some(([name]) => name === "relay_stage_secret"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(field.value, "");
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayPending, null);
    assert.ok(!ui.calls.some(([name]) => name === "relay_commit_secret_draft"));
  } finally { ui.restore(); }
});

test("Inline password is staged exactly once on OK and cleared before OS Keyring commit", async () => {
  const ui = await fixture("inline-relay-ok", true, [], {
    connectionMode: "hybrid", relayUrl: "https://relay.example.com/"
  });
  try {
    const field = ui.node("relay-secret-mask");
    field.value = "B".repeat(64);
    await field.fire("input");
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayPending, null);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.relayStored, true);
    assert.equal(ui.relayPending, null);
    assert.equal(ui.closed, true);
    const names = ui.calls.map(([name]) => name);
    const stage = names.indexOf("relay_stage_secret");
    const commit = names.indexOf("relay_commit_secret_draft");
    assert.ok(stage >= 0 && commit > stage);
    assert.ok(names.lastIndexOf("close_settings") > commit);
    assert.equal(field.value, "••••••••••••", "only fixed nonrevealing mask remains");
  } finally { ui.restore(); }
});

test("Inline secret validation rejects too-short inputs before any IPC", async () => {
  const ui = await fixture("inline-relay-invalid", true, [], {
    connectionMode: "hybrid", relayUrl: "https://relay.example.com/"
  });
  try {
    const field = ui.node("relay-secret-mask");
    field.value = "short";
    await field.fire("input");
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.ok(!ui.calls.some(([name]) => name === "relay_stage_secret"));
  } finally { ui.restore(); }
});

test("Relay Disconnect preserves selected Hybrid mode and commits removal only on OK", async () => {
  const ui = await fixture("inline-relay-disconnect", true, [], {
    connectionMode: "hybrid", relayUrl: "https://relay.example.com/",
    relayStored: true
  });
  try {
    assert.equal(ui.node("relay-secret-mask").disabled, true);
    await ui.node("relay-remove-secret").fire("click");
    assert.equal(ui.relayStored, true);
    assert.equal(ui.relayPending, "remove");
    assert.equal(ui.node("github-connection-mode").value, "hybrid");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.relayStored, false);
    assert.equal(ui.connectionMode, "hybrid");
    assert.equal(ui.relayPending, null);
  } finally { ui.restore(); }
});

test("Failed Keyring commit retains retryable staged secret without closing Settings", async () => {
  const ui = await fixture("inline-relay-commit-error", true, [], {
    connectionMode: "hybrid", relayUrl: "https://relay.example.com/",
    relayCommitError: true
  });
  try {
    ui.node("relay-secret-mask").value = "C".repeat(64);
    await ui.node("relay-secret-mask").fire("input");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayPending, "set");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.node("relay-remove-secret").disabled, false,
      "failed save must not strand the staged credential control");
    assert.doesNotMatch(ui.node("message").textContent, /C{32}|token=/);
  } finally { ui.restore(); }
});

test("Hybrid mode and URL are committed together only after Settings OK", async () => {
  const ui = await fixture("hybrid-confirm", true, [], { relayStored: true });
  try {
    assert.equal(ui.node("github-connection-mode").disabled, false);
    ui.node("github-connection-mode").value = "hybrid";
    await ui.node("github-connection-mode").fire("change");
    ui.node("github-worker-url").value = "https://relay.example.com/";
    await ui.node("github-worker-url").fire("input");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.connectionMode, "polling");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.connectionMode, "hybrid");
    assert.equal(ui.relayUrl, "https://relay.example.com/");
    const last = ui.calls.filter(([command]) => command === "save_settings").at(-1);
    assert.equal(last[1].connectionMode, "hybrid");
    assert.equal(last[1].relayUrl, "https://relay.example.com/");
    assert.equal(ui.calls.filter(([command]) => command === "relay_stage_secret").length, 0);
  } finally { ui.restore(); }
});

test("Hybrid edits are discarded on Settings Cancel without a config or keyring write", async () => {
  const ui = await fixture("hybrid-cancel", true, [], { relayStored: true });
  try {
    ui.node("github-connection-mode").value = "hybrid";
    await ui.node("github-connection-mode").fire("change");
    ui.node("github-worker-url").value = "https://relay.example.com";
    await ui.node("github-worker-url").fire("input");
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.connectionMode, "polling");
    assert.equal(ui.relayUrl, null);
    assert.equal(ui.calls.filter(([command]) => command === "save_settings").length, 0);
    assert.equal(ui.calls.filter(([command]) => command === "relay_stage_secret").length, 0);
  } finally { ui.restore(); }
});

test("Hybrid validates URL and rejects insecure origin before Settings can persist", async () => {
  const ui = await fixture("hybrid-url-deny", true, [], { relayStored: true });
  try {
    ui.node("github-connection-mode").value = "hybrid";
    await ui.node("github-connection-mode").fire("change");
    for (const invalid of [
      "", "http://relay.example.com", "https://127.0.0.1",
      "https://relay.example.com/path", "https://user:pass@relay.example.com/",
      "https://relay.example.com/?token=secret"
    ]) {
      ui.node("github-worker-url").value = invalid;
      await ui.node("github-worker-url").fire("input");
      assert.equal(ui.node("apply-settings").disabled, true, invalid);
    }
    assert.equal(ui.calls.filter(([command]) => command === "save_settings").length, 0);
  } finally { ui.restore(); }
});

test("Hybrid returns to Simple when Keyring status read fails but removal works", async () => {
  const ui = await fixture("hybrid-rollback", true, [], {
    connectionMode: "hybrid",
    relayUrl: "https://relay.example.com/",
    relayStatusError: true, relayStatusErrorInitialOnly: true
  });
  try {
    assert.equal(ui.node("github-connection-mode").disabled, false);
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.connectionMode, "polling");
    assert.equal(ui.relayUrl, "");
    assert.equal(ui.relayStored, false);
  } finally { ui.restore(); }
});

test("Hybrid to Simple polling OK permanently clears Worker URL and Keyring secret", async () => {
  const ui = await fixture("simple-confirm-deletion", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/", relayStored: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    assert.equal(ui.connectionMode, "hybrid", "mode change must remain a draft");
    assert.equal(ui.relayStored, true);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.connectionMode, "polling");
    assert.equal(ui.relayUrl, "");
    assert.equal(ui.relayStored, false);
    const names = ui.calls.map(([name]) => name);
    const stage = names.lastIndexOf("relay_clear_secret");
    const save = names.lastIndexOf("save_settings");
    const commit = names.lastIndexOf("relay_commit_secret_draft");
    assert.ok(stage >= 0 && stage < save && save < commit);
    assert.ok(commit < names.lastIndexOf("close_settings"));
    const write = ui.calls.findLast(([name]) => name === "save_settings")[1];
    assert.equal(write.connectionMode, "polling");
    assert.equal(write.relayUrl, "");
    await ui.dispatchOpened();
    assert.equal(ui.node("github-worker-url").value, "");
    assert.equal(ui.node("relay-secret-mask").type, "password");
  } finally { ui.restore(); }
});

test("Cancel after choosing Simple polling preserves Worker URL and Keyring secret", async () => {
  const ui = await fixture("simple-cancel-deletion", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/", relayStored: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.connectionMode, "hybrid");
    assert.equal(ui.relayUrl, "https://worker.example.com/");
    assert.equal(ui.relayStored, true);
    assert.equal(ui.calls.some(([name]) => [
      "relay_clear_secret", "relay_commit_secret_draft", "save_settings"
    ].includes(name)), false);
  } finally { ui.restore(); }
});

test("Previously retained polling secret can be explicitly cleared without URL", async () => {
  const ui = await fixture("simple-legacy-secret", true, [], {
    connectionMode: "polling", relayStored: true
  });
  try {
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayUrl, null);
    assert.equal(ui.calls.filter(([name]) => name === "relay_clear_secret").length, 1);
    assert.equal(ui.calls.filter(([name]) => name === "relay_commit_secret_draft").length, 1);
  } finally { ui.restore(); }
});

test("Previously retained polling URL is cleared even if Keyring status read fails", async () => {
  const ui = await fixture("simple-legacy-url", true, [], {
    connectionMode: "polling", relayUrl: "https://worker.example.com/",
    relayStatusError: true, relayStatusErrorInitialOnly: true
  });
  try {
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.relayUrl, "");
    assert.ok(ui.calls.some(([name]) => name === "relay_clear_secret"));
  } finally { ui.restore(); }
});

test("Failed Settings write retains relay credential and Cancel drops staged removal", async () => {
  const ui = await fixture("simple-config-write-failure", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/",
    relayStored: true, saveSettingsError: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.connectionMode, "hybrid");
    assert.equal(ui.relayStored, true);
    assert.equal(ui.relayPending, "remove");
    assert.equal(ui.calls.some(([name]) => name === "relay_commit_secret_draft"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.relayPending, null);
    assert.equal(ui.relayStored, true);
    assert.equal(ui.relayUrl, "https://worker.example.com/");
  } finally { ui.restore(); }
});

test("Failed Keyring removal never closes Settings and retries without replaying secret", async () => {
  const ui = await fixture("simple-keyring-write-failure", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/",
    relayStored: true, relayCommitError: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.connectionMode, "polling", "independent config and Keyring writes");
    assert.equal(ui.relayUrl, "");
    assert.equal(ui.relayStored, true);
    assert.equal(ui.relayPending, "remove");
    assert.match(ui.node("message").textContent, /credential store unavailable/);
    assert.equal(ui.node("apply-settings").disabled, false);
    ui.setRelayCommitError(false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayPending, null);
  } finally { ui.restore(); }
});

test("Secret typed into an abandoned Hybrid draft cannot persist on Simple OK", async () => {
  const ui = await fixture("simple-abandoned-hybrid-draft", true);
  try {
    ui.node("github-connection-mode").value = "hybrid";
    await ui.node("github-connection-mode").fire("change");
    ui.node("github-worker-url").value = "https://worker.example.com/";
    await ui.node("github-worker-url").fire("input");
    const field = ui.node("relay-secret-mask");
    field.value = "X".repeat(64);
    await field.fire("input");
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    assert.equal(field.value, "", "abandoned secret is removed from the WebView");
    assert.equal(ui.node("github-worker-url").value, "", "abandoned Worker origin is cleared");
    assert.equal(ui.node("apply-settings").disabled, true,
      "reverting an unsaved draft is a no-op, not a reason to enable OK");
    // Independently save a real preference change while polling: the
    // abandoned Hybrid credential must never be staged or committed.
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(field.value, "");
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayUrl, null);
    const saves = ui.calls.filter(([name]) => name === "save_settings");
    assert.equal(saves.length, 1);
    assert.equal(saves[0][1].ciNotificationMode, "failures");
    assert.ok(!Object.hasOwn(saves[0][1], "relayUrl"));
    assert.equal(ui.calls.some(([name]) => [
      "relay_stage_secret", "relay_clear_secret", "relay_commit_secret_draft"
    ].includes(name)), false);
  } finally { ui.restore(); }
});

test("Simple polling unrelated Settings remain usable when Keyring is unavailable", async () => {
  const ui = await fixture("simple-without-keyring", true, [], {
    connectionMode: "polling", relayStatusError: true
  });
  try {
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.calls.some(([name]) => [
      "relay_clear_secret", "relay_commit_secret_draft"
    ].includes(name)), false);
  } finally { ui.restore(); }
});

test("Hybrid setup provides one native-browser deployment guide link", async () => {
  const ui = await fixture("relay-docs-native-links", true);
  try {
    await ui.node("relay-worker-guide-link").fire("click");
    // Native receives only a two-value selector, never a WebView-supplied URL.
    assert.deepEqual(
      ui.calls.filter(([command]) => command === "open_relay_resource")
        .map(([, args]) => args),
      [{ resource: "guide" }]
    );
    assert.equal(ui.calls.filter(([command]) => command === "save_settings").length, 0,
      "opening documentation does not mutate Settings");
    assert.equal(ui.calls.filter(([command]) => command === "relay_commit_secret_draft").length, 0,
      "opening documentation never touches the Keyring");
  } finally { ui.restore(); }
});

test("Failed native Worker documentation open reports a redacted localized message", async () => {
  const ui = await fixture("relay-docs-native-failure", true, [], {
    relayDocsOpenError: true
  });
  try {
    await ui.node("relay-worker-guide-link").fire("click");
    await tick();
    assert.equal(ui.node("message").textContent,
      "Cannot open Worker documentation.");
    assert.doesNotMatch(ui.node("message").textContent, /Cannot open browser/);
  } finally { ui.restore(); }
});

test("Connected native Worker locks URL and mask but leaves the native Disconnect action", async () => {
  const ui = await fixture("relay-online-lock", true, [], {
    relayStored: true, connectionMode: "hybrid",
    relayUrl: "https://worker.example.com", relayTransportPhase: "online"
  });
  try {
    assert.equal(ui.node("relay-connection-state").hidden, false);
    assert.equal(ui.node("relay-connection-state").dataset.state, "online");
    assert.match(ui.node("relay-connection-text").textContent, /connected \(WebSocket\)/);
    assert.equal(ui.node("github-worker-url").disabled, true);
    assert.equal(ui.node("relay-secret-mask").disabled, true);
    assert.equal(ui.node("relay-remove-secret").disabled, false);
    assert.equal(ui.node("relay-remove-secret").hidden, false);
    assert.equal(ui.node("relay-connection-state").title, "");
    assert.equal(ui.node("relay-connection-detail").hidden, true);
    ui.node("github-worker-url").value = "https://forged.example.com";
    await ui.node("github-worker-url").fire("input");
    assert.equal(ui.node("apply-settings").disabled, true,
      "disabled URL cannot mutate native Settings draft");
  } finally { ui.restore(); }
});

test("Native fallback unlocks Worker URL and never masquerades as a healthy webhook", async () => {
  const ui = await fixture("relay-online-fallback", true, [], {
    relayStored: true, connectionMode: "hybrid",
    relayUrl: "https://worker.example.com", relayTransportPhase: "online"
  });
  try {
    assert.equal(ui.node("github-worker-url").disabled, true);
    ui.dispatchRelayPhase("fallback");
    assert.equal(ui.node("github-worker-url").disabled, false);
    assert.equal(ui.node("relay-connection-state").dataset.state, "fallback");
    assert.match(ui.node("relay-connection-text").textContent, /REST fallback active/);
    assert.equal(ui.node("relay-secret-mask").disabled, true);
    assert.equal(ui.node("relay-remove-secret").disabled, false);
    ui.node("github-worker-url").value = "https://repaired.example.com";
    await ui.node("github-worker-url").fire("input");
    assert.equal(ui.node("apply-settings").disabled, false,
      "fallback must allow a new Worker endpoint to be saved");
    ui.dispatchRelayPhase("online");
    assert.equal(ui.node("github-worker-url").disabled, false,
      "online status for old persisted URL cannot lock a different draft URL");
    assert.notEqual(ui.node("relay-connection-state").dataset.state, "online");
  } finally { ui.restore(); }
});

test("Missing native phase or unconfigured secret cannot lock Worker URL", async () => {
  for (const [label, opts] of [
    ["no-secret", { relayStored: false, relayTransportPhase: "online" }],
    ["unavailable", { relayStored: true, relayTransportStatusError: true }],
    ["connecting", { relayStored: true, relayTransportPhase: "connecting" }]
  ]) {
    const ui = await fixture("relay-phase-" + label, true, [], {
      connectionMode: "hybrid", relayUrl: "https://worker.example.com", ...opts
    });
    try {
      assert.equal(ui.node("github-worker-url").disabled, false, label);
      assert.notEqual(ui.node("relay-connection-state").dataset.state, "online");
      assert.equal(ui.node("relay-remove-secret").hidden, !opts.relayStored);
    } finally { ui.restore(); }
  }
});

test("Late native status read cannot override a newer WebSocket transition", async () => {
  const ui = await fixture("relay-late-initial-phase", true, [], {
    relayStored: true, connectionMode: "hybrid",
    relayUrl: "https://worker.example.com",
    deferRelayTransportStatus: true
  });
  try {
    ui.dispatchRelayPhase("fallback");
    assert.equal(ui.node("github-worker-url").disabled, false);
    ui.releaseRelayTransportStatus("online");
    await tick();
    assert.equal(ui.node("relay-connection-state").dataset.state, "fallback");
    assert.equal(ui.node("github-worker-url").disabled, false);
    ui.dispatchRelayPhase("online");
    assert.equal(ui.node("github-worker-url").disabled, true);
  } finally { ui.restore(); }
});

test("Simple polling hides Worker status regardless of native event", async () => {
  const ui = await fixture("relay-simple-hidden", true, [], {
    relayStored: true, connectionMode: "polling", relayTransportPhase: "online"
  });
  try {
    assert.equal(ui.node("relay-settings").hidden, true);
    assert.equal(ui.node("relay-connection-state").hidden, true);
    ui.dispatchRelayPhase("fallback");
    assert.equal(ui.node("relay-settings").hidden, true);
    assert.equal(ui.node("relay-connection-state").hidden, true);
  } finally { ui.restore(); }
});

test("New Hybrid selection displays pending confirmation before native handshake", async () => {
  const ui = await fixture("relay-pending", true, [], {
    connectionMode: "polling", relayTransportPhase: "fallback",
    relayTransportReason: "http_401"
  });
  try {
    ui.node("github-connection-mode").value = "hybrid";
    await ui.node("github-connection-mode").fire("change");
    assert.equal(ui.node("relay-connection-state").hidden, false);
    assert.equal(ui.node("relay-connection-state").dataset.state, "inactive");
    assert.equal(ui.node("relay-connection-detail").hidden, false);
    assert.match(ui.node("relay-connection-detail").textContent, /pending confirmation/);
    assert.doesNotMatch(ui.node("relay-connection-detail").textContent, /HTTP 401/);
  } finally { ui.restore(); }
});

test("Edited Hybrid endpoint cannot inherit old Worker fallback failure", async () => {
  const ui = await fixture("relay-pending-endpoint", true, [], {
    connectionMode: "hybrid", relayStored: true,
    relayUrl: "https://old.example.com/", relayTransportPhase: "fallback",
    relayTransportReason: "http_403"
  });
  try {
    assert.match(ui.node("relay-connection-detail").textContent, /HTTP 403/);
    ui.node("github-worker-url").value = "https://new.example.com/";
    await ui.node("github-worker-url").fire("input");
    assert.equal(ui.node("relay-connection-state").dataset.state, "inactive");
    assert.match(ui.node("relay-connection-detail").textContent, /pending confirmation/);
    assert.doesNotMatch(ui.node("relay-connection-detail").textContent, /HTTP 403/);
    assert.equal(ui.node("relay-remove-secret").disabled, false);
  } finally { ui.restore(); }
});

test("Persisted Hybrid in native polling phase explains inactive transport", async () => {
  const ui = await fixture("relay-persisted-polling", true, [], {
    connectionMode: "hybrid", relayStored: true,
    relayUrl: "https://worker.example.com/", relayTransportPhase: "polling"
  });
  try {
    assert.equal(ui.node("relay-connection-state").dataset.state, "inactive");
    assert.equal(ui.node("relay-connection-detail").hidden, false);
    assert.match(ui.node("relay-connection-detail").textContent, /REST monitoring is active/);
    assert.equal(ui.node("relay-remove-secret").disabled, false);
  } finally { ui.restore(); }
});

test("Unavailable native Relay IPC uses finite redacted unavailable reason", async () => {
  const ui = await fixture("relay-status-ipc-error", true, [], {
    connectionMode: "hybrid", relayStored: true,
    relayUrl: "https://worker.example.com/", relayTransportStatusError: true
  });
  try {
    assert.equal(ui.node("relay-connection-state").dataset.state, "unknown");
    assert.equal(ui.node("relay-connection-detail").hidden, false);
    assert.match(ui.node("relay-connection-detail").textContent, /REST monitoring is active/);
    assert.doesNotMatch(ui.node("relay-connection-detail").textContent, /PRIVATE_RELAY_PHASE/);
  } finally { ui.restore(); }
});

test("Reopening persisted Hybrid restores enabled Disconnect and native failure", async () => {
  const ui = await fixture("relay-settings-reopen", true, [], {
    connectionMode: "hybrid", relayStored: true, relayTransportPhase: "fallback",
    relayTransportReason: "network", relayUrl: "https://worker.example.com/"
  });
  try {
    await ui.node("cancel-settings").fire("click");
    await ui.dispatchOpened();
    assert.equal(ui.node("relay-remove-secret").disabled, false);
    assert.equal(ui.node("relay-remove-secret").hidden, false);
    assert.match(ui.node("relay-connection-detail").textContent, /Network connection/);
  } finally { ui.restore(); }
});

test("Native failure reason identifies the failing WSS stage without leaking raw errors", async () => {
  const ui = await fixture("relay-specific-reasons", true, [], {
    relayStored: true, connectionMode: "hybrid", relayTransportPhase: "fallback",
    relayTransportReason: "http_403", relayUrl: "https://worker.example.com"
  });
  try {
    assert.equal(ui.node("relay-connection-state").dataset.state, "fallback");
    assert.equal(ui.node("relay-connection-detail").hidden, false);
    assert.match(ui.node("relay-connection-detail").textContent, /HTTP 403/);
    assert.equal(ui.node("relay-connection-state").title, "");
    ui.dispatchRelayPhase("fallback", "http_401");
    assert.match(ui.node("relay-connection-detail").textContent, /HTTP 401/);
    ui.dispatchRelayPhase("fallback", "missing_secret");
    assert.match(ui.node("relay-connection-detail").textContent, /No relay secret/);
    ui.dispatchRelayPhase("fallback", "credential_store");
    assert.match(ui.node("relay-connection-detail").textContent, /credential store/);
    ui.dispatchRelayPhase("online");
    assert.equal(ui.node("relay-connection-detail").hidden, true);
    assert.equal(ui.node("github-worker-url").disabled, true);
  } finally { ui.restore(); }
});

test("Disconnect stays available when WSS is offline, and custom Close behaves as Cancel", async () => {
  const ui = await fixture("relay-custom-close", true, [], {
    relayStored: true, connectionMode: "hybrid",
    relayUrl: "https://worker.example.com",
    relayTransportPhase: "fallback", relayTransportReason: "http_403"
  });
  try {
    assert.equal(ui.node("relay-remove-secret").disabled, false);
    await ui.node("relay-remove-secret").fire("click");
    assert.equal(ui.relayPending, "remove");
    assert.equal(ui.node("github-connection-mode").value, "hybrid");
    await ui.node("settings-close").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.relayStored, true);
    assert.equal(ui.relayPending, null);
  } finally { ui.restore(); }
});

test("Saved Simple mode never resurrects Worker origin or stored credential on Hybrid reselect", async () => {
  const ui = await fixture("hybrid-to-simple-to-hybrid-clean", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/", relayStored: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    assert.equal(ui.node("github-worker-url").value, "", "old origin cleared in Simple draft");
    assert.equal(ui.relayStored, true, "before OK Keyring must remain unchanged");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayUrl, "");
    const orderedCalls = ui.calls.map(([command]) => command);
    assert.ok(orderedCalls.lastIndexOf("relay_commit_secret_draft") <
      orderedCalls.lastIndexOf("relay_secret_status"), "verify after Keyring commit");
    await ui.dispatchOpened();
    ui.node("github-connection-mode").value = "hybrid";
    await ui.node("github-connection-mode").fire("change");
    assert.equal(ui.node("github-worker-url").value, "");
    assert.equal(ui.node("relay-secret-mask").type, "password");
    assert.equal(ui.node("relay-secret-mask").value, "");
    assert.equal(ui.node("apply-settings").disabled, true, "reconfiguration requires new origin and secret");
  } finally { ui.restore(); }
});

test("Keyring removal that acknowledges but remains stored must not close Settings", async () => {
  const ui = await fixture("broken-keyring-removal", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/",
    relayStored: true, relayRemoveStillStored: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.relayStored, true);
    assert.match(ui.node("message").textContent, /Relay cleanup could not be verified/);
    assert.equal(ui.node("apply-settings").disabled, false, "recovery remains interactive");
  } finally { ui.restore(); }
});

test("Native config that leaves stale Worker origin must not claim completed cleanup", async () => {
  const ui = await fixture("broken-url-removal", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/",
    relayStored: true, relayConfigNotCleared: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.relayUrl, "https://worker.example.com/");
    assert.match(ui.node("message").textContent, /Relay cleanup could not be verified/);
  } finally { ui.restore(); }
});

test("Settings focus re-reads native WebSocket state when previous event was missed", async () => {
  const ui = await fixture("relay-recover-on-focus", true, [], {
    relayStored: true, connectionMode: "hybrid",
    relayUrl: "https://worker.example.com/", relayTransportPhase: "connecting"
  });
  try {
    assert.equal(ui.node("relay-connection-state").dataset.state, "connecting");
    ui.setRelayPhaseWithoutEvent("online");
    await ui.dispatchFocus();
    assert.equal(ui.node("relay-connection-state").dataset.state, "online");
    assert.match(ui.node("relay-connection-text").textContent, /connected \(WebSocket\)/);
    assert.equal(ui.node("github-worker-url").disabled, true);
  } finally { ui.restore(); }
});

test("Missed Settings-opened event reloads saved Hybrid and online status on focus", async () => {
  const ui = await fixture("hybrid-saved-missed-open-event", true);
  try {
    const mode = ui.node("github-connection-mode");
    const url = ui.node("github-worker-url");
    const field = ui.node("relay-secret-mask");
    mode.value = "hybrid";
    await mode.fire("change");
    url.value = "https://worker.example.com/";
    await url.fire("input");
    field.value = "A".repeat(64);
    await field.fire("input");
    assert.equal(ui.node("apply-settings").disabled, false);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.relayStored, true);
    assert.equal(ui.connectionMode, "hybrid");
    const configReadsBefore = ui.calls.filter(([name]) => name === "get_settings_config").length;
    // Mimic the native transport becoming online while the WebView is hidden.
    // The normal repoticker-settings-opened notification is intentionally lost.
    ui.setRelayPhaseWithoutEvent("online");
    await ui.dispatchFocus();
    assert.ok(ui.calls.filter(([name]) => name === "get_settings_config").length >
      configReadsBefore, "a new session must refresh config, not only phase");
    assert.equal(mode.value, "hybrid");
    assert.equal(url.value, "https://worker.example.com/");
    assert.equal(field.value, "••••••••••••");
    assert.equal(ui.node("relay-connection-state").dataset.state, "online");
    assert.equal(ui.node("relay-remove-secret").disabled, false);
  } finally { ui.restore(); }
});

test("Disconnecting only Hybrid credential never silently selects Simple on reopen", async () => {
  const ui = await fixture("hybrid-credential-only-reopen", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/",
    relayStored: true, relayTransportPhase: "online"
  });
  try {
    await ui.node("relay-remove-secret").fire("click");
    assert.equal(ui.node("github-connection-mode").value, "hybrid");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, true);
    assert.equal(ui.connectionMode, "hybrid");
    assert.equal(ui.relayStored, false);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    const readsBefore = ui.calls.filter(([name]) => name === "get_settings_config").length;
    ui.setRelayPhaseWithoutEvent("fallback", "missing_secret");
    await ui.dispatchFocus(); // No repoticker-settings-opened event.
    assert.ok(ui.calls.filter(([name]) => name === "get_settings_config").length > readsBefore);
    assert.equal(ui.node("github-connection-mode").value, "hybrid");
    assert.equal(ui.node("github-worker-url").value, "https://worker.example.com/");
    assert.equal(ui.node("relay-secret-mask").type, "password");
    assert.equal(ui.node("relay-secret-mask").value, "");
    assert.equal(ui.node("relay-connection-state").dataset.state, "fallback");
    assert.match(ui.node("relay-connection-detail").textContent, /No relay secret is stored/);
  } finally { ui.restore(); }
});

test("Cancel with missed reopened event restores prior Hybrid draft", async () => {
  const ui = await fixture("hybrid-cancel-missed-open-event", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/",
    relayStored: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    assert.equal(ui.node("github-worker-url").value, "");
    await ui.node("cancel-settings").fire("click");
    await ui.dispatchFocus();
    assert.equal(ui.node("github-connection-mode").value, "hybrid");
    assert.equal(ui.node("github-worker-url").value, "https://worker.example.com/");
    assert.equal(ui.relayStored, true);
  } finally { ui.restore(); }
});

test("Ordinary focus within an editing session retains unsaved Relay changes", async () => {
  const ui = await fixture("hybrid-edit-preserve-focus", true, [], {
    connectionMode: "hybrid", relayUrl: "https://worker.example.com/",
    relayStored: true, relayTransportPhase: "fallback"
  });
  try {
    const url = ui.node("github-worker-url");
    url.value = "https://replacement.example.com/";
    await url.fire("input");
    assert.equal(ui.node("apply-settings").disabled, false);
    const readsBefore = ui.calls.filter(([name]) => name === "get_settings_config").length;
    await ui.dispatchFocus();
    assert.equal(url.value, "https://replacement.example.com/");
    assert.equal(ui.node("apply-settings").disabled, false);
    assert.equal(ui.calls.filter(([name]) => name === "get_settings_config").length,
      readsBefore, "focus while editing must not reload persistent settings");
  } finally { ui.restore(); }
});


test("Given many unsaved mode toggles When returning to original polling Then no credential or config writes occur", async () => {
  const ui = await fixture("mode-b-relay-rapid-toggle-draft", true);
  try {
    const mode = ui.node("github-connection-mode");
    const url = ui.node("github-worker-url");
    const secret = ui.node("relay-secret-mask");
    for (let i = 0; i < 24; i++) {
      mode.value = "hybrid";
      await mode.fire("change");
      url.value = "https://worker.example.com/";
      await url.fire("input");
      secret.value = "A".repeat(64);
      await secret.fire("input");
      mode.value = "polling";
      await mode.fire("change");
    }
    assert.equal(mode.value, "polling");
    assert.equal(url.value, "");
    assert.equal(secret.value, "");
    assert.equal(ui.node("apply-settings").disabled, true);
    assert.equal(ui.connectionMode, "polling");
    assert.equal(ui.relayUrl, null);
    assert.equal(ui.relayStored, false);
    assert.ok(!ui.calls.some(([name]) => [
      "save_settings", "relay_stage_secret", "relay_clear_secret", "relay_commit_secret_draft"
    ].includes(name)), "editing an unsaved draft cannot invoke persistence");
  } finally { ui.restore(); }
});

test("Given a failed native stage When confirming Hybrid Then keep Settings open with no config or secret mutation", async () => {
  const ui = await fixture("mode-b-relay-stage-failure", true, [], {
    relayStageError: true
  });
  try {
    const mode = ui.node("github-connection-mode");
    mode.value = "hybrid";
    await mode.fire("change");
    ui.node("github-worker-url").value = "https://worker.example.com/";
    await ui.node("github-worker-url").fire("input");
    ui.node("relay-secret-mask").value = "A".repeat(64);
    await ui.node("relay-secret-mask").fire("input");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.connectionMode, "polling");
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayPending, null);
    assert.equal(ui.calls.filter(([name]) => name === "relay_stage_secret").length, 1);
    assert.equal(ui.calls.some(([name]) => name === "save_settings"), false);
    assert.equal(ui.calls.some(([name]) => name === "relay_commit_secret_draft"), false);
  } finally { ui.restore(); }
});

test("Given staged Hybrid credential and rejected config write When cancelling Then drop native draft without Keyring write", async () => {
  const ui = await fixture("mode-b-relay-config-write-failure", true, [], {
    saveSettingsError: true
  });
  try {
    const mode = ui.node("github-connection-mode");
    mode.value = "hybrid";
    await mode.fire("change");
    ui.node("github-worker-url").value = "https://worker.example.com/";
    await ui.node("github-worker-url").fire("input");
    ui.node("relay-secret-mask").value = "A".repeat(64);
    await ui.node("relay-secret-mask").fire("input");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    assert.equal(ui.connectionMode, "polling");
    assert.equal(ui.relayPending, "set");
    assert.equal(ui.relayStored, false);
    assert.equal(ui.calls.some(([name]) => name === "relay_commit_secret_draft"), false);
    await ui.node("cancel-settings").fire("click");
    assert.equal(ui.relayPending, null);
    assert.equal(ui.relayStored, false);
    assert.equal(ui.relayUrl, null);
  } finally { ui.restore(); }
});

test("Given concurrent OK taps during credential commit When saving Then stage and commit exactly once", async () => {
  let releaseCommit;
  const pendingCommit = new Promise(resolve => { releaseCommit = resolve; });
  const ui = await fixture("mode-b-relay-double-confirm", true, [], {
    relayCommitPromise: pendingCommit
  });
  try {
    const mode = ui.node("github-connection-mode");
    mode.value = "hybrid";
    await mode.fire("change");
    ui.node("github-worker-url").value = "https://worker.example.com/";
    await ui.node("github-worker-url").fire("input");
    ui.node("relay-secret-mask").value = "A".repeat(64);
    await ui.node("relay-secret-mask").fire("input");
    const first = ui.node("apply-settings").fire("click");
    await tick();
    assert.equal(ui.node("apply-settings").disabled, true);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.calls.filter(([name]) => name === "relay_commit_secret_draft").length, 1);
    releaseCommit();
    await first;
    assert.equal(ui.closed, true);
    assert.equal(ui.connectionMode, "hybrid");
    assert.equal(ui.relayStored, true);
    assert.equal(ui.calls.filter(([name]) => name === "relay_stage_secret").length, 1);
    assert.equal(ui.calls.filter(([name]) => name === "save_settings").length, 1);
    assert.equal(ui.calls.filter(([name]) => name === "close_settings").length, 1);
  } finally { ui.restore(); }
});

test("Given a rejected Settings close When focusing same session Then preserve its editing state", async () => {
  const ui = await fixture("mode-b-relay-close-error", true, [], {
    connectionMode: "hybrid",
    relayUrl: "https://worker.example.com/",
    relayStored: true,
    closeSettingsError: true
  });
  try {
    ui.node("ci-notification-mode").value = "failures";
    await ui.node("ci-notification-mode").fire("change");
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false);
    const reads = ui.calls.filter(([name]) => name === "get_settings_config").length;
    await ui.dispatchFocus();
    assert.equal(ui.calls.filter(([name]) => name === "get_settings_config").length, reads,
      "a failed close must never reinitialize the same editing session");
    assert.equal(ui.node("ci-notification-mode").value, "failures");
    assert.equal(ui.node("github-connection-mode").value, "hybrid");
    assert.equal(ui.relayStored, true);
  } finally { ui.restore(); }
});

test("Given two focus events after a missed reopening notification When reconciling Then reload config once", async () => {
  const ui = await fixture("mode-b-relay-reopen-focus-idempotence", true, [], {
    connectionMode: "hybrid",
    relayUrl: "https://worker.example.com/",
    relayStored: true
  });
  try {
    await ui.node("cancel-settings").fire("click");
    const before = ui.calls.filter(([name]) => name === "get_settings_config").length;
    await ui.dispatchFocus();
    const afterFirst = ui.calls.filter(([name]) => name === "get_settings_config").length;
    assert.equal(afterFirst, before + 1);
    await ui.dispatchFocus();
    assert.equal(ui.calls.filter(([name]) => name === "get_settings_config").length,
      afterFirst, "second focus belongs to the current editing session");
    assert.equal(ui.node("github-connection-mode").value, "hybrid");
  } finally { ui.restore(); }
});

test("Given saved Hybrid but missing stored secret When reopening Then preserve Hybrid and explain REST fallback", async () => {
  const ui = await fixture("mode-b-relay-missing-keyring-hybrid", true, [], {
    connectionMode: "hybrid",
    relayUrl: "https://worker.example.com/",
    relayStored: false,
    relayTransportPhase: "fallback",
    relayTransportReason: "missing_secret"
  });
  try {
    assert.equal(ui.node("github-connection-mode").value, "hybrid");
    assert.equal(ui.node("github-worker-url").value, "https://worker.example.com/");
    assert.equal(ui.node("relay-secret-mask").type, "password");
    assert.equal(ui.node("relay-secret-mask").value, "");
    assert.equal(ui.node("relay-connection-state").dataset.state, "fallback");
    assert.match(ui.node("relay-connection-detail").textContent, /No relay secret/);
    assert.equal(ui.relayStored, false);
  } finally { ui.restore(); }
});

test("Given failed postcommit Keyring status read When clearing Relay Then do not claim successful teardown", async () => {
  const ui = await fixture("mode-b-relay-readback-error", true, [], {
    connectionMode: "hybrid",
    relayUrl: "https://worker.example.com/",
    relayStored: true
  });
  try {
    ui.node("github-connection-mode").value = "polling";
    await ui.node("github-connection-mode").fire("change");
    // Simulate an OS wallet read outage after the initial successful Settings load.
    // The native command intentionally returns a synthetic error without credentials.
    ui.setRelayStatusError?.(true);
    await ui.node("apply-settings").fire("click");
    assert.equal(ui.closed, false, "failure to verify cleanup must not report success");
    assert.equal(ui.connectionMode, "polling");
    assert.equal(ui.relayStored, false);
  } finally { ui.restore(); }
});
