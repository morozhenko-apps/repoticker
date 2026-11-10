import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("frameless Settings and About reuse one theme-aware inside-viewport contour", () => {
  const css = read("../apps/desktop/ui/window-frame.css");
  const settings = read("../apps/desktop/ui/settings.html");
  const about = read("../apps/desktop/ui/about.html");
  const app = JSON.parse(read("../apps/desktop/src-tauri/tauri.conf.json"));
  const sharedHref = '<link rel="stylesheet" href="./window-frame.css">';
  for (const [name, html] of [["settings", settings], ["about", about]]) {
    assert.equal(html.split(sharedHref).length - 1, 1, name);
    const window = app.app.windows.find(item => item.label === name);
    assert.ok(window, name + " window must exist");
    assert.equal(window.decorations, false, name + " remains frameless");
    assert.equal(window.resizable, false, name + " keeps fixed geometry");
  }
  const overlay = css.match(/body::after\s*\{([^}]*)\}/)?.[1];
  assert.ok(overlay, "one shared frame is present");
  for (const rule of [
    /content:\s*""/, /position:\s*fixed/, /inset:\s*0/,
    /box-sizing:\s*border-box/,
    /border:\s*1px solid color-mix\(in srgb, CanvasText 38%, Canvas\)/,
    /pointer-events:\s*none/,
    /z-index:\s*10000/
  ]) assert.match(overlay, rule);
  assert.match(css, /@media\s*\(forced-colors: active\)\s*\{\s*body::after\s*\{\s*border-color:\s*CanvasText;/);
  assert.doesNotMatch(css, /(?:padding|margin|width|height|border-radius):/);
});
