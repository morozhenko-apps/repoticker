import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { placeRepoMenu } from "../apps/desktop/ui/repo-menu.mjs";
import { cardText } from "../apps/desktop/ui/card-i18n.mjs";

const ui = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
const css = readFileSync(new URL("../apps/desktop/ui/style.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");

test("popup is outside scroll-clipped, isolated repository rows and visibly opaque", () => {
  assert.match(html, /id="repo-list"[^>]*>.*<\/div>\s*<div id="repo-menu" class="repo-menu" role="menu"/);
  assert.match(css, /\.drawer \{[^}]*position: relative; isolation: isolate;/);
  assert.match(css, /\.drawer > \.repo-menu \{[^}]*z-index: 30; background: #ffffff;[^}]*pointer-events: auto;/);
  assert.doesNotMatch(ui.match(/function makeRepoRow\([\s\S]*?return row;/)?.[0] ?? "", /row\.append\(menu\)/);
});

test("menu stays within drawer and flips above lower scroll rows", () => {
  const drawer = { top: 100, left: 10, width: 370, height: 370 };
  const menu = { width: 155, height: 120 };
  const center = placeRepoMenu({ top: 205, bottom: 234, right: 360 }, drawer, menu);
  assert.deepEqual(center, { left: 195, top: 138, width: 155 });
  const lower = placeRepoMenu({ top: 426, bottom: 455, right: 360 }, drawer, menu);
  assert.deepEqual(lower, { left: 195, top: 202, width: 155 });
  const left = placeRepoMenu({ top: 115, bottom: 144, right: 60 }, drawer, menu);
  assert.equal(left.left, 6);
  const narrow = placeRepoMenu({ top: 115, bottom: 144, right: 40 },
    { top: 100, left: 10, width: 120, height: 200 }, menu);
  assert.equal(narrow.width, 108);
  assert.ok(narrow.left >= 6);
});

test("menu contains Fetch, Safe pull and native enrolled GitHub open with dismissal", () => {
  for (const [key, operation] of [
    ["fetch", "fetch"], ["safeSync", "safe_sync"],
    ["openGithub", "open_github"], ["openFolder", "open_folder"],
    ["copyPath", "copy_path"]
  ]) {
    assert.ok(ui.includes('["' + key + '", "' + operation + '"]'));
    assert.ok(cardText("en", key).length > 0);
    assert.ok(cardText("ru", key).length > 0);
  }
  assert.match(ui, /cardText\(cardLanguage, key\)/);
  assert.match(ui, /item\.dataset\.localeKey = key/);
  assert.match(ui, /open_github: "open_repository_on_github"/);
  assert.match(ui, /aria-controls", "repo-menu"/);
  assert.match(ui, /byId\("repo-list"\)\.addEventListener\("scroll", \(\) => hideRepoMenus\(\)/);
  assert.match(ui, /function render\(next\) \{\s*hideRepoMenus\(\)/);
  assert.match(ui, /hideRepoMenus\(true\)/);
  assert.match(ui, /repoMenu\.contains\(event\.target\)/);
  assert.match(ui, /repoMenu\.querySelector\("button"\)\?\.focus\(\)/);
});


test("long translated repository actions remeasure at every open and stay inside drawer", () => {
  const show = ui.slice(ui.indexOf("function showRepoMenu("),
    ui.indexOf("\nfor (const [key, operation] of ["));
  assert.match(show, /repoMenu\.style\.width = "";/);
  assert.match(show, /repoMenu\.style\.left = "";/);
  assert.match(show, /repoMenu\.style\.top = "";/);
  assert.match(show, /repoMenu\.scrollTop = 0;/);
  assert.ok(show.indexOf('repoMenu.style.width = "";') <
    show.indexOf("repoMenu.getBoundingClientRect()"));
  assert.ok(show.indexOf("repoMenu.getBoundingClientRect()") <
    show.indexOf("repoMenu.style.width = position.width"));
  const popupStyle = css.match(/\.drawer > \.repo-menu \{([^}]+)\}/)?.[1] ?? "";
  assert.match(popupStyle, /max-width: calc\(100% - 12px\)/);
  assert.match(popupStyle, /max-height: calc\(100% - 12px\)/);
  assert.match(popupStyle, /overflow-y: auto/);
  assert.match(popupStyle, /overscroll-behavior: contain/);
  const buttonStyle = css.match(/\.repo-menu button \{([^}]+)\}/)?.[1] ?? "";
  assert.match(buttonStyle, /white-space: normal/);
  assert.match(buttonStyle, /overflow-wrap: anywhere/);
  assert.match(buttonStyle, /text-align: start/);
  assert.doesNotMatch(buttonStyle, /white-space: nowrap/);
  const clipped = placeRepoMenu(
    { top: 140, bottom: 165, right: 200 },
    { top: 100, left: 0, width: 220, height: 200 },
    { width: 600, height: 150 }
  );
  assert.deepEqual(clipped, { left: 6, top: 44, width: 208 });
  // Long translated strings must not change the fixed set of actions,
  // nor keyboard focus behaviour and the native command mapping.
  assert.equal((ui.match(/item\.setAttribute\("role", "menuitem"\)/g) ?? []).length, 1);
  assert.match(ui, /event\.key === "ArrowDown"/);
  assert.match(ui, /event\.key === "ArrowUp"/);
  assert.match(ui, /repoMenu\.querySelector\("button"\)\?\.focus\(\)/);
});
