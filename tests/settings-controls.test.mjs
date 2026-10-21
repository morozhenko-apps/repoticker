import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

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
      case "get_snapshot": return {
        roots: [], language: "en", github_monitor_org: null
      };
      case "github_auth_status": return { connected: false, phase: "idle", reason: null };
      case "github_begin": return { userCode: "ABCD-1234" };
      default: return undefined;
    }
  };
  const document = {
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
  // Any nonexistent HTML binding throws here, just as it does in WebKitGTK.
  runInNewContext(js, {
    document, window,
    setInterval: () => 1,
    clearInterval() {},
  }, { filename: "settings.mjs" });
  // Flush initial Settings -> get_snapshot -> github_auth_status refresh.
  await new Promise(resolve => setImmediate(resolve));
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

  await handlers.get("github-open-device:click")();
  assert.ok(calls.some(c => c.command === "github_open_device_page"));

  await handlers.get("github-cancel-device:click")();
  assert.ok(calls.some(c => c.command === "github_cancel"));
  assert.equal(elements.get("github-device-flow").hidden, true);
  assert.equal(elements.get("github-user-code").textContent, "");
});
