import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { disableBrowserContextMenu } from "../apps/desktop/ui/browser-context-menu.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Given a WebView document, a right click is prevented", () => {
  const handlers = new Map();
  disableBrowserContextMenu({
    addEventListener(type, handler) { handlers.set(type, handler); },
  });
  assert.deepEqual([...handlers.keys()], ["contextmenu"]);
  const event = { prevented: false, preventDefault() { this.prevented = true; } };
  handlers.get("contextmenu")(event);
  assert.equal(event.prevented, true);
});

test("Given four application windows, each installs the same guard once", () => {
  for (const module of ["app", "settings", "about", "quota"]) {
    const code = read("apps/desktop/ui/" + module + ".mjs");
    assert.match(code, /import \{ disableBrowserContextMenu \} from "\.\/browser-context-menu\.mjs"/);
    assert.equal((code.match(/disableBrowserContextMenu\(document\)/g) ?? []).length, 1, module);
  }
});

test("Given native tray and repository menus, browser suppression does not remove them", () => {
  const card = read("apps/desktop/ui/app.mjs");
  const native = read("apps/desktop/src-tauri/src/main.rs");
  assert.match(card, /function showRepoMenu\(button, repoPath\)/);
  assert.match(card, /showRepoMenu\(button, repo\.path\)/);
  assert.match(native, /build_desktop_tray_menu/);
});

test("Given background resize, native Windows ordering must preserve hidden state", () => {
  const windows = read("apps/desktop/src-tauri/src/windows_geometry.rs");
  const native = read("apps/desktop/src-tauri/src/main.rs");
  assert.match(windows, /SetWindowPos\(/);
  assert.doesNotMatch(windows, /SWP_SHOWWINDOW/);
  const resize = native.slice(native.indexOf("fn resize_usage_popup("),
    native.indexOf("fn hide_card("));
  assert.match(resize, /if popup\s*\.is_visible\(\)/);
  assert.match(resize, /windows_geometry::raise_usage_popup\(&popup\)/);
});
