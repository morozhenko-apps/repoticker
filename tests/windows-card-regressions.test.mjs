import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cardWindowHeight } from "../apps/desktop/ui/view.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("Expanded card sizes 0, 1, 2, 10 and 100 repositories without empty space", () => {
  assert.equal(cardWindowHeight("compact"), 122);
  assert.equal(cardWindowHeight("repos", 0), 183);
  assert.equal(cardWindowHeight("repos", 1), 175);
  assert.equal(cardWindowHeight("repos", 2), 210);
  assert.equal(cardWindowHeight("repos", 10), 490);
  assert.equal(cardWindowHeight("repos", 100), 490);
  assert.equal(cardWindowHeight("settings"), 318);
  for (const invalid of [-1, 0.5, Number.POSITIVE_INFINITY, NaN])
    assert.throws(() => cardWindowHeight("repos", invalid), /Invalid repository count/);
});

test("One repo is rendered without a minimum item count", () => {
  const app = read("../apps/desktop/ui/app.mjs");
  assert.match(app, /if \(!next\.repositories\.length\)/);
  assert.match(app, /for \(const repo of next\.repositories\) list\.append\(makeRepoRow\(repo\)\)/);
  assert.match(app, /repositoryCount: snapshot\.repositories\.length/);
  assert.match(app, /previousCount !== next\.repositories\.length/);
});

test("Windows release binary has no console and transparent popups lack native white shadow", () => {
  const main = read("../apps/desktop/src-tauri/src/main.rs");
  const config = JSON.parse(read("../apps/desktop/src-tauri/tauri.conf.json"));
  assert.match(main, /windows_subsystem = "windows"/);
  for (const label of ["main", "usage"]) {
    const window = config.app.windows.find(item => item.label === label);
    assert.equal(window.transparent, true);
    assert.equal(window.decorations, false);
    assert.equal(window.shadow, false);
  }
});

test("Windows popup restores and saves position using existing config margins", () => {
  const native = read("../apps/desktop/src-tauri/src/main.rs");
  const geometry = read("../apps/desktop/src-tauri/src/windows_geometry.rs");
  assert.match(native, /windows_geometry::restore\(app, &window\)/);
  assert.match(native, /windows_geometry::save\(app, &window\)/);
  assert.match(geometry, /monitor\.work_area\(\)/);
  assert.match(geometry, /config\.card_right_margin/);
  assert.match(geometry, /config\.card_bottom_margin/);
});

test("Windows close handler saves using typed WebviewWindow rather than generic Window", () => {
  const main = read("../apps/desktop/src-tauri/src/main.rs");
  assert.match(main, /if let Some\(card\) = window\.app_handle\(\)\.get_webview_window\("main"\)/);
  assert.match(main, /windows_geometry::save\(window\.app_handle\(\), &card\)/);
  assert.doesNotMatch(main, /windows_geometry::save\(window\.app_handle\(\), window\)/);
  assert.match(main, /Windows close anchor save failed/);
});

test("Native folder selection has no broad WebView permissions", () => {
  const main = read("../apps/desktop/src-tauri/src/main.rs");
  const settings = read("../apps/desktop/ui/settings.mjs");
  const html = read("../apps/desktop/ui/settings.html");
  const capability = JSON.parse(read("../apps/desktop/src-tauri/capabilities/default.json"));
  assert.match(main, /pick_folder\(move \|selected\|/);
  assert.match(main, /select_repository_root,/);
  assert.match(settings, /invoke\("select_repository_root"\)/);
  assert.match(html, /id="browse-root"/);
  assert.ok(!capability.permissions.some(item => item.startsWith("dialog:")),
    "Only the native settings IPC may open a directory chooser");
});
