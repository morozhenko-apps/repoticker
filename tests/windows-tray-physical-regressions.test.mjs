import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const card = read("apps/desktop/ui/app.mjs");
const html = read("apps/desktop/ui/index.html");
const css = read("apps/desktop/ui/style.css");
const native = read("apps/desktop/src-tauri/src/main.rs");
const windows = read("apps/desktop/src-tauri/src/windows_geometry.rs");
const workflow = read(".github/workflows/desktop-acceptance-candidates.yml");

test("Given main card, right click cannot expose a WebView browser menu", () => {
  assert.match(card, /disableBrowserContextMenu\(document\)/);
  assert.doesNotMatch(card, /dragSurface\.addEventListener\("contextmenu"/);
  assert.match(card, /const dragSurface = byId\("card"\)/);
  assert.match(card, /\.repo-more/);
  assert.match(card, /showRepoMenu\(button, repo\.path\)/);
  assert.match(native, /build_desktop_tray_menu/);
});

test("Given empty repository drawer, message aligns centered without overlay or new height", () => {
  assert.match(card, /addText\(list, "p", next\.roots\?\.length/);
  assert.match(html, /<div id="repo-list" class="rows"/);
  assert.match(css, /\.empty\s*\{[^}]*text-align:\s*center;/);
  assert.doesNotMatch(css.match(/\.empty\s*\{[^}]*\}/)?.[0] ?? "", /position:\s*absolute|height:/);
});

test("Given Windows hover, left mouse-drag cannot capture metric targets", () => {
  assert.match(card, /anchor\.addEventListener\("mouseenter", enter\)/);
  assert.match(card, /anchor\.addEventListener\("focusin", enter\)/);
  assert.match(card, /event\.button !== 0/);
  assert.match(card, /\.status-hover,\[role=button\],\.drawer/);
  for (const id of ["runner-status", "ci-tasks"]) assert.ok(html.includes('id="' + id + '"'));
  assert.match(html, /class="quota-anchor status-hover"/);
});

test("Given native Windows usage popup, show and resize enforce topmost without focus", () => {
  assert.match(windows, /pub\(crate\) fn raise_usage_popup\(popup: &WebviewWindow\)/);
  assert.match(windows, /fn SetWindowPos\(/);
  assert.match(windows, /let topmost = \(-1_isize\)/);
  for (const flag of ["SWP_NOSIZE", "SWP_NOMOVE", "SWP_NOACTIVATE"])
    assert.ok(windows.includes(flag), flag);
  assert.match(windows, /if changed == 0\s*\{\s*return Err/);
  assert.doesNotMatch(windows, /SetForegroundWindow|SWP_NOZORDER|SWP_SHOWWINDOW/);
  assert.match(native, /if popup\s*\.is_visible\(\)/);
  const show = native.slice(native.indexOf("fn show_usage_popup("),
    native.indexOf("fn hide_usage_popup("));
  assert.ok(show.indexOf("windows_geometry::raise_usage_popup(&popup)") >
    show.indexOf("popup\n            .show()"));
  const resize = native.slice(native.indexOf("fn resize_usage_popup("),
    native.indexOf("fn hide_card("));
  assert.match(resize, /windows_geometry::raise_usage_popup\(&popup\)/);
  assert.match(native, /popup\.set_focusable\(false\)/);
  assert.match(native, /popup\.set_ignore_cursor_events\(true\)/);
});

test("Given QA code change, Windows and Linux acceptance jobs stay unpublished", () => {
  assert.match(workflow, /apps\/desktop\/ui\/app\.mjs/);
  assert.match(workflow, /apps\/desktop\/src-tauri\/src\/windows_geometry\.rs/);
  assert.match(workflow, /tests\/windows-tray-physical-regressions\.test\.mjs/);
  assert.match(workflow, /--bundles deb,appimage/);
  assert.match(workflow, /--bundles nsis/);
  assert.match(workflow, /NOT_A_RELEASE\.txt/);
});
