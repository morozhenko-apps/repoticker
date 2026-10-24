import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { placeRepoMenu } from "../apps/desktop/ui/repo-menu.mjs";

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
  assert.match(ui, /\["Fetch", "fetch"\]/);
  assert.match(ui, /\["Safe sync", "safe_sync"\]/);
  assert.match(ui, /\["Open on GitHub", "open_github"\]/);
  assert.match(ui, /\["Open folder", "open_folder"\]/);
  assert.match(ui, /\["Copy path", "copy_path"\]/);
  assert.match(ui, /open_github: "open_repository_on_github"/);
  assert.match(ui, /aria-controls", "repo-menu"/);
  assert.match(ui, /byId\("repo-list"\)\.addEventListener\("scroll", \(\) => hideRepoMenus\(\)/);
  assert.match(ui, /function render\(next\) \{\s*hideRepoMenus\(\)/);
  assert.match(ui, /hideRepoMenus\(true\)/);
  assert.match(ui, /repoMenu\.contains\(event\.target\)/);
  assert.match(ui, /repoMenu\.querySelector\("button"\)\?\.focus\(\)/);
});
