import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { listAvailableInstallations } from "../apps/desktop/ui/github-installations.mjs";
import { settingsLocale, settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
import { localeName, localeDirection } from "../apps/desktop/ui/locale-catalog.mjs";
import { repositorySelectionMessage } from "../apps/desktop/ui/locale-counts.mjs";
import { disableBrowserContextMenu } from "../apps/desktop/ui/browser-context-menu.mjs";

const read = name => readFileSync(new URL(name, import.meta.url), "utf8");
const html = read("../apps/desktop/ui/settings.html");
const source = read("../apps/desktop/ui/settings.mjs");
const native = read("../apps/desktop/src-tauri/src/relay_secret.rs");
const main = read("../apps/desktop/src-tauri/src/main.rs");
const knownIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

async function launch({ stored = false, mode = "polling" } = {}) {
  const handlers = new Map();
  const calls = [];
  const elements = new Map();
  let keyring = stored;
  let staged = null;
  const create = id => ({
    id, value: "", textContent: "", disabled: false, hidden: false,
    dataset: {}, firstChild: { textContent: "" },
    classList: { toggle() {} },
    addEventListener(type, cb) { handlers.set(id + ":" + type, cb); },
    replaceChildren() {}, append() {}, focus() {}, setAttribute() {},
    querySelectorAll() { return []; }, getAttribute() { return null; },
  });
  for (const id of knownIds) elements.set(id, create(id));
  const invoke = async (name, args = {}) => {
    calls.push({ name, args });
    switch (name) {
      case "get_settings_config": return {
        roots: [], language: "en", ignored_child_names: [],
        github_monitor_org: null, github_monitor_repositories: [],
        connection_mode: mode, relay_url: "", ci_notification_mode: "off"
      };
      case "github_auth_status": return { connected: false, phase: "idle" };
      case "relay_secret_status": return staged === null ? keyring : staged === "set";
      case "relay_prompt_secret": staged = "set"; return true;
      case "relay_clear_secret": staged = "remove"; return;
      case "relay_commit_secret_draft":
        if (staged === "set") keyring = true;
        if (staged === "remove") keyring = false;
        staged = null;
        return;
      case "close_settings": staged = null; return;
      case "autostart_is_enabled": return false;
      default: return undefined;
    }
  };
  const doc = {
    documentElement: { lang: "en", dir: "ltr" },
    getElementById: id => elements.get(id) ?? null,
    createElement: () => create("dynamic"),
    addEventListener() {},
  };
  const win = {
    __TAURI__: {
      core: { invoke },
      event: { listen: () => Promise.resolve(() => {}) }
    },
    addEventListener() {},
  };
  const imports =
    'import { listAvailableInstallations } from "./github-installations.mjs";\n' +
    'import { settingsLocale, settingsText } from "./settings-i18n.mjs";\n' +
    'import { localeName, localeDirection } from "./locale-catalog.mjs";\n' +
    'import { repositorySelectionMessage } from "./locale-counts.mjs";\n' +
    'import { disableBrowserContextMenu } from "./browser-context-menu.mjs";\n';
  assert.ok(source.startsWith(imports), "mock harness must cover all real imports");
  runInNewContext(source.slice(imports.length), {
    document: doc, window: win, listAvailableInstallations, settingsLocale,
    settingsText, localeName, localeDirection, repositorySelectionMessage,
    disableBrowserContextMenu, setInterval: () => 1, clearInterval() {}
  }, { filename: "settings.mjs" });
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
  const click = async id => {
    const handler = handlers.get(id + ":click");
    assert.equal(typeof handler, "function");
    await handler();
  };
  return {
    elements, calls, handlers, click,
    stored: () => keyring,
    pending: () => staged,
    el: id => elements.get(id),
  };
}

test("unconfigured relay offers native password entry through readonly field, not WebView secret input", async () => {
  const app = await launch();
  const mask = app.el("relay-secret-mask");
  assert.equal(mask.disabled, false);
  assert.equal(mask.value, "");
  assert.equal(app.el("relay-remove-secret").hidden, true);
  assert.doesNotMatch(html, /<input[^>]*type="password"/i);
  await app.click("relay-secret-mask");
  assert.equal(app.pending(), "set");
  assert.equal(app.stored(), false, "native draft cannot mutate Keyring before OK");
  assert.equal(mask.value, "••••••••••••");
  assert.equal(mask.disabled, true);
  assert.equal(app.el("relay-remove-secret").hidden, false);
  assert.equal(app.el("apply-settings").disabled, false);
  assert.ok(app.calls.some(call => call.name === "relay_prompt_secret"));
  assert.ok(!app.calls.some(call => call.name === "relay_commit_secret_draft"));
});

test("Cancel discards native staged secret without a Keyring write", async () => {
  const app = await launch();
  await app.click("relay-secret-mask");
  await app.click("cancel-settings");
  assert.equal(app.stored(), false);
  assert.equal(app.pending(), null);
  assert.ok(app.calls.some(call => call.name === "close_settings"));
  assert.equal(app.calls.some(call => call.name === "relay_commit_secret_draft"), false);
});

test("OK commits native staged secret before closing, even without other changes", async () => {
  const app = await launch();
  await app.click("relay-secret-mask");
  await app.click("apply-settings");
  assert.equal(app.stored(), true);
  assert.equal(app.pending(), null);
  const order = app.calls.map(call => call.name);
  assert.ok(order.indexOf("relay_commit_secret_draft") >= 0);
  assert.ok(order.indexOf("relay_commit_secret_draft") < order.lastIndexOf("close_settings"));
  assert.equal(app.el("relay-secret-mask").value, "••••••••••••");
});

test("Configured relay masks credential, locks field and stages Disconnect until OK", async () => {
  const app = await launch({ stored: true, mode: "hybrid" });
  const mask = app.el("relay-secret-mask");
  assert.equal(mask.value, "••••••••••••");
  assert.equal(mask.disabled, true);
  assert.equal(app.el("relay-remove-secret").hidden, false);
  await app.click("relay-remove-secret");
  assert.equal(app.stored(), true);
  assert.equal(app.pending(), "remove");
  assert.equal(mask.value, "");
  assert.equal(mask.disabled, false);
  assert.equal(app.el("github-connection-mode").value, "polling",
    "Disconnect must never persist unusable Hybrid");
  assert.equal(app.el("apply-settings").disabled, false);
  await app.click("apply-settings");
  assert.equal(app.stored(), false);
  assert.equal(app.pending(), null);
  const order = app.calls.map(call => call.name);
  assert.ok(order.indexOf("save_settings") < order.indexOf("relay_commit_secret_draft"));
});

test("OS Keyring secret never crosses JS IPC, and Rust clears staged values on native close", () => {
  assert.doesNotMatch(source, /invoke\("relay_prompt_secret",\s*\{/);
  assert.doesNotMatch(source, /invoke\("relay_commit_secret_draft",\s*\{/);
  assert.match(native, /RelaySecretDraftState\(Mutex<Option<RelaySecretDraft>>\)/);
  assert.match(native, /enum RelaySecretDraft \{/);
  assert.match(native, /impl Drop for SensitiveSecret/);
  assert.match(native, /pub\(crate\) fn discard_draft\(app: &AppHandle\)/);
  assert.match(native, /let candidate = SensitiveSecret\(secret\)/);
  assert.match(native, /fn store_secret\(secret: &SensitiveSecret\)/);
  assert.match(main, /fn close_settings\([\s\S]*?relay_secret::discard_draft\(&app\)/);
  assert.match(main, /relay_secret::relay_commit_secret_draft,/);
  assert.match(source, /await invoke\("relay_commit_secret_draft"\)/);
});
