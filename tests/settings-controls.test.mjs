import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { listAvailableInstallations } from "../apps/desktop/ui/github-installations.mjs";
import { settingsLocale, settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
import { localeName, localeDirection } from "../apps/desktop/ui/locale-catalog.mjs";

const html = readFileSync(
  new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8"
);
const js = readFileSync(
  new URL("../apps/desktop/ui/settings.mjs", import.meta.url), "utf8"
);

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const usedIds = new Set([...js.matchAll(/\bbyId\(["']([^"']+)["']\)/g)].map(m => m[1]));

test("all Settings JS element bindings exist in the actual HTML", () => {
  assert.deepEqual(
    [...usedIds].filter(id => !htmlIds.has(id)),
    [],
    "Removed Settings elements must not leave addEventListener(null) exceptions"
  );
});

test("Device Flow buttons register and invoke native commands after JS startup", async () => {
  const handlers = new Map();
  const calls = [];
  const elements = new Map();
  const createElement = id => ({
    id,
    textContent: "",
    value: "",
    hidden: false,
    disabled: false,
    dataset: {},
    firstChild: { textContent: "" },
    classList: { toggle() {} },
    addEventListener(type, callback) { handlers.set(id + ":" + type, callback); },
    querySelectorAll() { return []; },
    replaceChildren() {},
    append() {},
    setAttribute() {},
    focus() {},
  });
  for (const id of htmlIds) elements.set(id, createElement(id));
  const invoke = async (command, args = {}) => {
    calls.push({ command, args });
    switch (command) {
      case "get_settings_config": return {
        roots: [], language: "en", github_monitor_org: null,
        github_monitor_repositories: []
      };
      case "get_monitor_scope": return null;
      case "github_auth_status": return { connected: false, phase: "idle", reason: null };
      case "github_begin": return { userCode: "ABCD-1234" };
      default: return undefined;
    }
  };
  const document = {
    documentElement: { lang: "en" },
    getElementById: id => elements.get(id) ?? null,
    createElement: () => createElement("dynamic"),
    addEventListener() {},
  };
  const window = {
    __TAURI__: {
      core: { invoke },
      event: { listen: () => Promise.resolve(() => {}) },
    },
    addEventListener() {},
  };
  // vm.Script executes the actual Settings controller in an isolated realm,
  // while its ESM dependency is supplied as the real imported function.
  // Fail closed if the controller's single known import changes.
  const importLine =
    'import { listAvailableInstallations } from "./github-installations.mjs";\n' +
    'import { settingsLocale, settingsText } from "./settings-i18n.mjs";\n' +
    'import { localeName, localeDirection } from "./locale-catalog.mjs";\n';
  assert.equal(js.startsWith(importLine), true,
    "Settings harness must recognize its real ESM dependency");
  runInNewContext(js.slice(importLine.length), {
    document, window, listAvailableInstallations, settingsLocale, settingsText,
    localeName, localeDirection,
    setInterval: () => 1,
    clearInterval() {},
  }, { filename: "settings.mjs" });
  // New startup does not need a full local Git snapshot and checks
  // authorization concurrently with config-only settings retrieval.
  assert.equal(elements.get("github-connection-indicator").textContent,
    "Checking connection...");
  assert.equal(elements.get("github-connect").hidden, true);
  assert.equal(elements.get("github-account-status").value,
    "Checking connection...");
  assert.ok(!calls.some(c => c.command === "get_snapshot"));
  await new Promise(resolve => setImmediate(resolve));
  const mode = elements.get("github-connection-mode");
  const workerRow = elements.get("github-worker-row");
  const workerUrl = elements.get("github-worker-url");
  mode.disabled = true;
  mode.value = "polling";
  handlers.get("github-connection-mode:change")();
  assert.equal(workerRow.hidden, true);
  assert.equal(workerUrl.disabled, true);
  // The unavailable relay must not expose its URL in polling mode.
  mode.disabled = false;
  mode.value = "hybrid";
  handlers.get("github-connection-mode:change")();
  assert.equal(workerRow.hidden, false);
  assert.equal(workerUrl.disabled, false);
  mode.value = "polling";
  handlers.get("github-connection-mode:change")();
  assert.equal(workerRow.hidden, true);
  assert.equal(workerUrl.disabled, true);
  for (const button of ["github-connect", "github-copy-code",
    "github-open-device", "github-cancel-device"]) {
    assert.equal(typeof handlers.get(button + ":click"), "function",
      button + " must have a working click callback");
  }
  await handlers.get("github-connect:click")();
  assert.equal(elements.get("github-user-code").textContent, "ABCD-1234");
  assert.equal(elements.get("github-device-flow").hidden, false);

  await handlers.get("github-copy-code:click")();
  // The fixture executes Settings in another VM realm; compare the
  // transmitted scalar instead of object prototypes across realms.
  assert.equal(calls.find(c => c.command === "github_copy_user_code")?.args?.code,
    "ABCD-1234");

  assert.equal(elements.get("github-copy-code").textContent, "Copied");

  await handlers.get("github-open-device:click")();
  assert.ok(calls.some(c => c.command === "github_open_device_page"));

  await handlers.get("github-cancel-device:click")();
  assert.ok(calls.some(c => c.command === "github_cancel"));
  assert.equal(elements.get("github-device-flow").hidden, true);
  assert.equal(elements.get("github-user-code").textContent, "");
  assert.equal(elements.get("github-copy-code").textContent, "Copy code");
});

test("shipped Simple polling has no configurable Worker URL or active Hybrid mode", () => {
  assert.match(html, /id="github-connection-mode" disabled/);
  assert.match(html, /value="polling" data-i18n="Simple polling">Simple polling/);
  assert.match(html, /value="hybrid" data-i18n="Hybrid webhook relay \(not available yet\)">Hybrid webhook relay \(not available yet\)/);
  assert.match(html, /id="github-worker-row"[^>]*hidden/);
  assert.match(html, /id="github-worker-url" disabled/);
  assert.doesNotMatch(js, /save_settings[\s\S]*worker_url|save_settings[\s\S]*workerUrl/);
});

test("Settings native command reads config only, without Git scanning", () => {
  const native = readFileSync(
    new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  const body = native.match(/fn get_settings_config\([\s\S]*?\n\}/)?.[0];
  assert.ok(body, "native config-only Settings command must exist");
  assert.match(body, /read_config\(&app\)\?/);
  assert.doesNotMatch(body, /git::inspect|git::discover|scan\(/);
  assert.match(native, /generate_handler!\[[\s\S]*?get_settings_config,/);
  assert.doesNotMatch(js, /invoke\("get_snapshot"\)/,
    "Settings must never request the expensive full Git snapshot");
  assert.match(js, /Promise\.all\(\[\s*invoke\("get_settings_config"\),\s*invoke\("github_auth_status"\)/);
});
