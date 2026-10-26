import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const settings = read("../apps/desktop/ui/settings.mjs");
const settingsHtml = read("../apps/desktop/ui/settings.html");
const settingsCss = read("../apps/desktop/ui/settings.css");
const card = read("../apps/desktop/ui/app.mjs");
const cardHtml = read("../apps/desktop/ui/index.html");
const cardCss = read("../apps/desktop/ui/style.css");
const native = read("../apps/desktop/src-tauri/src/main.rs");
const tray = read("../apps/desktop/src-tauri/src/tray_i18n.rs");

test("Windows verbatim paths are normalized only in the display projection", () => {
  const functionText = settings.match(/function displayRootPath\(path\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionText, "Expected a side-effect-free folder display function");
  const display = runInNewContext("(" + functionText + ")");
  const slash = String.fromCharCode(92);
  const prefix = slash + slash + "?" + slash;
  const plain = "C:" + slash + "Users" + slash + "tester" + slash + "GitHub";
  assert.equal(display(prefix + plain), plain);
  assert.equal(display(plain), plain);
  assert.equal(display(prefix + "UNC" + slash + "server" + slash + "share"),
    slash + slash + "server" + slash + "share");
  assert.match(settings, /draft\.roots\.filter\(item => item !== root\)/);
  assert.match(settings, /label\.textContent = displayRootPath\(root\)/);
  assert.doesNotMatch(settings, /if \(configChanged\)/);
});

test("Native titles use saved locale and pending locale cannot repaint Settings", () => {
  assert.match(native, /window\.set_title\(tray_i18n::window_title\(&language, "settings"\)\)/);
  assert.match(native, /window\.set_title\(tray_i18n::window_title\(&language, "about"\)\)/);
  assert.match(tray, /\("ru", "settings"\) => "Настройки RepoTicker"/);
  assert.match(tray, /\("ru", "about"\) => "О RepoTicker"/);
  assert.match(settings, /draft\.language = option\.dataset\.value;\s*\/\/ The selected locale is a draft/);
  assert.match(settings, /if \(Object\.keys\(configChanges\)\.length\)/);
  assert.match(settings, /githubConnected && \(githubScopeTouched \|\| repoChoiceTouched \|\| githubStartedHere\)/);
  assert.match(settings, /if \(disconnectPending\) \{\s*await invoke\("github_disconnect"\)/);
});

test("Folders and ignored child names both have native browse controls", () => {
  assert.match(settingsHtml, /id="browse-root"/);
  assert.match(settingsHtml, /id="browse-ignored-child"/);
  assert.match(settings, /byId\("browse-ignored-child"\)\.addEventListener\("click"/);
  assert.match(settings, /draft\.ignoredChildNames\.push\(name\)/);
  assert.match(settings, /name\.length > 255/);
});

test("Scrollable Settings and dropdown options align at the top without extra padding", () => {
  assert.match(settingsCss, /\.settings-shell \{[^}]*overflow-y: auto;/);
  assert.match(settingsCss, /\.settings-footer \{[^}]*position: sticky;/);
  assert.match(settingsCss, /#language-options \{[^}]*padding: 0;/);
  assert.match(settingsCss, /#language-options button \{[^}]*align-items: center;/);
  assert.match(cardCss, /\.repo-menu button \{[^}]*align-items: center;/);
});

test("Windows drawer pointer interaction does not start window dragging", () => {
  assert.match(card, /event\.target\.closest\("button,input,select,a,\.status-hover,\[role=button\],\.drawer,\.rows,\.repo-row,\.repo-menu"\)/);
  assert.match(cardCss, /scrollbar-width: thin;/);
  assert.match(cardCss, /\.rows::-webkit-scrollbar-thumb/);
  assert.match(cardHtml, /class="action-icon hide-chevron"[^>]*><svg viewBox="0 0 24 24"/);
});

test("Metric hover uses nonfocusable pointer-through Windows balloon without native misleading titles", () => {
  assert.match(native, /popup\s*\.set_focusable\(false\)/);
  assert.match(native, /popup\s*\.set_ignore_cursor_events\(true\)/);
  assert.doesNotMatch(cardHtml, /title="Click to update (Runners|Tasks)"/);
  assert.match(card, /anchor\.addEventListener\("mouseenter"/);
  assert.match(card, /show_usage_popup/);
});
