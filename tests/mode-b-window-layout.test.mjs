import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const settingsHtml = read("../apps/desktop/ui/settings.html");
const settingsCss = read("../apps/desktop/ui/settings.css");
const frame = read("../apps/desktop/ui/window-frame.css");
const about = read("../apps/desktop/ui/about.html");
const conf = JSON.parse(read("../apps/desktop/src-tauri/tauri.conf.json"));

test("Given bounded KDE Settings height When rendering Then footer is a sibling outside the only scrollable main", () => {
  const start = settingsHtml.indexOf('<main class="settings-shell"');
  const end = settingsHtml.indexOf("</main>", start);
  const footer = settingsHtml.indexOf('<footer class="settings-footer">', end);
  assert.ok(start >= 0 && end > start && footer > end);
  const inner = settingsHtml.slice(start, end);
  assert.doesNotMatch(inner, /id="(?:apply-settings|cancel-settings)"/);
  assert.match(settingsHtml.slice(footer), /id="cancel-settings"/);
  assert.match(settingsHtml.slice(footer), /id="apply-settings"/);
  assert.equal((settingsHtml.match(/id="apply-settings"/g) || []).length, 1);
  assert.equal((settingsHtml.match(/id="cancel-settings"/g) || []).length, 1);
});

test("Given short Settings viewport When laying out Then title and footer retain space while form may scroll", () => {
  const body = settingsCss.match(/body\s*\{\s*display:\s*flex;\s*flex-direction:\s*column;\s*\}/);
  assert.ok(body, "body must be a vertical flex container");
  const finalShell = [...settingsCss.matchAll(/\.settings-shell\s*\{([^}]+)\}/g)].at(-1)?.[1];
  assert.ok(finalShell);
  for (const rule of [/height:\s*auto/, /flex:\s*1 1 auto/, /min-height:\s*0/])
    assert.match(finalShell, rule);
  const initialShell = [...settingsCss.matchAll(/\.settings-shell\s*\{([^}]+)\}/g)][0]?.[1];
  assert.match(initialShell, /overflow-y:\s*auto/);
  const footer = settingsCss.match(/\.settings-footer\s*\{([^}]+)\}/)?.[1];
  assert.ok(footer);
  assert.match(footer, /flex:\s*0 0 auto/);
  assert.match(footer, /min-height:\s*58px/);
  assert.doesNotMatch(footer, /(?:overflow|bottom):\s*(?:hidden|-)/);
  const titlebar = settingsCss.match(/\.settings-titlebar\s*\{([^}]+)\}/)?.[1];
  assert.match(titlebar, /flex:\s*0 0 30px/);
  const window = conf.app.windows.find(item => item.label === "settings");
  assert.ok(window);
  assert.ok(window.minHeight >= 30 + 58 + 34,
    "minimum Settings height must accommodate titlebar, footer and one control");
});

test("Given very long localized errors When rendering footer Then error text can wrap without shrinking buttons", () => {
  const message = settingsCss.match(/#message\s*\{([^}]+)\}/)?.[1];
  assert.match(message, /min-width:\s*0/);
  assert.match(message, /overflow-wrap:\s*anywhere/);
  const controls = settingsCss.match(/\.footer-buttons\s*\{([^}]+)\}/)?.[1];
  assert.match(controls, /flex:\s*0 0 auto/);
  assert.match(settingsCss, /\.footer-buttons button\s*\{\s*min-width:\s*80px/);
  assert.match(settingsHtml, /id="message"[^>]*role="status"/);
});

test("Given themed Settings and About When drawing frame Then border never intercepts controls", () => {
  for (const html of [settingsHtml, about])
    assert.equal(html.split('<link rel="stylesheet" href="./window-frame.css">').length - 1, 1);
  const overlay = frame.match(/body::after\s*\{([^}]+)\}/)?.[1];
  assert.ok(overlay);
  assert.match(overlay, /position:\s*fixed/);
  assert.match(overlay, /inset:\s*0/);
  assert.match(overlay, /pointer-events:\s*none/);
  assert.match(overlay, /border:\s*1px solid/);
  assert.match(frame, /@media\s*\(forced-colors:\s*active\)/);
  assert.doesNotMatch(overlay, /overflow:\s*hidden/);
});

test("Given fixed-size frameless windows When comparing to CSS Then no layout adds OS titlebar controls", () => {
  for (const name of ["settings", "about"]) {
    const window = conf.app.windows.find(item => item.label === name);
    assert.ok(window, name);
    assert.equal(window.decorations, false);
    assert.equal(window.resizable, false);
  }
  assert.equal((settingsHtml.match(/id="settings-close"/g) || []).length, 1);
  assert.doesNotMatch(settingsHtml, /id="settings-minimize"|id="settings-maximize"/);
  assert.match(settingsHtml, /id="settings-titlebar"/);
});
