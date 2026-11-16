import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("About obtains saved EN/RU on first open and focus, without changing version/author/link", async () => {
  const old = { document: globalThis.document, window: globalThis.window };
  const html = readFileSync(new URL("../apps/desktop/ui/about.html", import.meta.url), "utf8");
  const nodes = new Map();
  for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g))
    nodes.set("txt:" + key, {
      textContent: key,
      getAttribute() { return key; }
    });
  for (const [, key] of html.matchAll(/data-i18n-alt="([^"]+)"/g))
    nodes.set("alt:" + key, {
      alt: key,
      getAttribute() { return key; }
    });
  for (const [, key] of html.matchAll(/data-i18n-aria="([^"]+)"/g))
    nodes.set("aria:" + key, {
      aria: key,
      getAttribute() { return key; },
      setAttribute(name,value) { this.aria = value; }
    });
  const controls = new Map(["version","author","website","close-about"].map(id=>[id, {
    textContent: "", title: "", handlers: new Map(),
    addEventListener(name,handler) { this.handlers.set(name,handler); }
  }]));
  let locale = "ru";
  const calls = [];
  const listeners = new Map();
  const contextMenus = new Map();
  const doc = {
    documentElement: { lang: "en" }, title: "",
    addEventListener(type, callback) { contextMenus.set(type, callback); },
    querySelectorAll(query) {
      if (query === "[data-i18n]") return [...nodes].filter(([k])=>k.startsWith("txt:")).map(([,v])=>v);
      if (query === "[data-i18n-alt]") return [...nodes].filter(([k])=>k.startsWith("alt:")).map(([,v])=>v);
      if (query === "[data-i18n-aria]") return [...nodes].filter(([k])=>k.startsWith("aria:")).map(([,v])=>v);
      return [];
    },
    getElementById(id) { return controls.get(id); }
  };
  const win = {
    addEventListener(name, callback) { listeners.set(name,callback); },
    __TAURI__: { core: {
      async invoke(command) {
        calls.push(command);
        if (command === "get_settings_config") return { language: locale };
        if (command === "get_about_info")
          return { version: "0.2.0", author: "author's name", website: "https://morozhenko.com" };
        if (command === "open_project_website") return undefined;
        if (command === "hide_about") return undefined;
        throw Error("Unexpected IPC: "+command);
      }
    }}
  };
  globalThis.document=doc;
  globalThis.window=win;
  try {
    await import("../apps/desktop/ui/about.mjs?about-locale-e2e");
    assert.equal(typeof contextMenus.get("contextmenu"), "function");
    const rightClick = { prevented: false, preventDefault() { this.prevented = true; } };
    contextMenus.get("contextmenu")(rightClick);
    assert.equal(rightClick.prevented, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(doc.documentElement.lang, "ru");
    assert.equal(doc.title, "О RepoTicker");
    assert.equal(nodes.get("txt:Version").textContent, "Версия");
    assert.equal(nodes.get("aria:Close").aria, "Закрыть");
    assert.equal(nodes.get("txt:Created by").textContent, "Автор");
    assert.equal(nodes.get("alt:RepoTicker application icon").alt, "Значок RepoTicker");
    assert.equal(controls.get("version").textContent, "0.2.0");
    assert.equal(controls.get("author").textContent, "author's name");
    assert.equal(controls.get("website").title, "https://morozhenko.com");
    locale = "en";
    listeners.get("focus")();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(doc.documentElement.lang, "en");
    assert.equal(nodes.get("txt:Version").textContent, "Version");
    assert.equal(calls.filter(x=>x==="get_about_info").length, 1);
    assert.equal(calls.filter(x=>x==="get_settings_config").length, 2);
    controls.get("website").handlers.get("click")();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.filter(x=>x==="open_project_website").length, 1);
    assert.equal(calls.filter(x=>x==="get_snapshot").length, 0);
    controls.get("close-about").handlers.get("click")();
    listeners.get("keydown")({ key: "Escape" });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.filter(x=>x==="hide_about").length, 2);
  } finally {
    if(old.document===undefined) delete globalThis.document; else globalThis.document=old.document;
    if(old.window===undefined) delete globalThis.window; else globalThis.window=old.window;
  }
});

test("About uses an undecorated Close-only titlebar and a scoped native drag permission", () => {
  const html = readFileSync(new URL("../apps/desktop/ui/about.html", import.meta.url), "utf8");
  const aboutJs = readFileSync(new URL("../apps/desktop/ui/about.mjs", import.meta.url), "utf8");
  const rust = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  const config = JSON.parse(readFileSync(new URL("../apps/desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8"));
  const capability = JSON.parse(readFileSync(new URL("../apps/desktop/src-tauri/capabilities/about-drag.json", import.meta.url), "utf8"));
  const about = config.app.windows.find(item => item.label === "about");
  assert.equal(about.decorations, false);
  assert.equal(about.resizable, false);
  assert.match(html, /class="about-titlebar" data-tauri-drag-region/);
  assert.match(html, /id="close-about"[^>]*data-i18n-aria="Close"/);
  assert.doesNotMatch(html, /id="minimize-about"|id="maximize-about"/);
  assert.deepEqual(capability.windows, ["about"]);
  assert.deepEqual(capability.permissions, ["core:window:allow-start-dragging"]);
  assert.match(aboutJs, /invoke\("hide_about"\)/);
  assert.match(rust, /fn hide_about\(app: AppHandle\)/);
  assert.match(rust, /get_webview_window\("about"\)/);
});
