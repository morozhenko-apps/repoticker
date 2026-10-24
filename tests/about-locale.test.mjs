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
  const controls = new Map(["version","author","website"].map(id=>[id, {
    textContent: "", title: "", handlers: new Map(),
    addEventListener(name,handler) { this.handlers.set(name,handler); }
  }]));
  let locale = "ru";
  const calls = [];
  const listeners = new Map();
  const doc = {
    documentElement: { lang: "en" }, title: "",
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
        throw Error("Unexpected IPC: "+command);
      }
    }}
  };
  globalThis.document=doc;
  globalThis.window=win;
  try {
    await import("../apps/desktop/ui/about.mjs?about-locale-e2e");
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(doc.documentElement.lang, "ru");
    assert.equal(doc.title, "О RepoTicker");
    assert.equal(nodes.get("txt:Version").textContent, "Версия");
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
  } finally {
    if(old.document===undefined) delete globalThis.document; else globalThis.document=old.document;
    if(old.window===undefined) delete globalThis.window; else globalThis.window=old.window;
  }
});
