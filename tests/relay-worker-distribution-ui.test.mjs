import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
import { LOCALE_ROSTER } from "../apps/desktop/ui/locale-catalog.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../apps/desktop/ui/settings.html");
const js = read("../apps/desktop/ui/settings.mjs");
const css = read("../apps/desktop/ui/settings.css");
const card = read("../apps/desktop/ui/style.css");
const about = read("../apps/desktop/ui/about.css");
const quota = read("../apps/desktop/ui/quota.css");
const rust = read("../apps/desktop/src-tauri/src/main.rs");
const guide = read("../apps/relay-cloudflare/README.md");

test("desktop links directly to both public Worker source and deployment guide", () => {
  const root = "https://github.com/morozhenko-apps/repoticker";
  assert.ok(html.includes('id="relay-worker-source-link" href="' + root +
    '/tree/dev/apps/relay-cloudflare"'));
  assert.ok(html.includes('id="relay-worker-guide-link" href="' + root +
    '/blob/dev/apps/relay-cloudflare/README.md"'));
  for (const id of ["relay-worker-source-link", "relay-worker-guide-link"]) {
    assert.match(html, new RegExp('id="' + id + '"[^>]*target="_blank"'));
    assert.match(html, new RegExp('id="' + id + '"[^>]*rel="noopener noreferrer"'));
  }
  assert.match(guide, /\[Worker source code\]\(https:\/\/github.com\//);
  assert.match(guide, /\[Worker deployment instructions\]\(https:\/\/github.com\//);
  assert.ok(guide.includes("Root directory |"));
  assert.ok(guide.includes("apps/relay-cloudflare"));
});

test("native browser opening admits only two fixed settings-only URL resources", () => {
  assert.match(js, /event\.preventDefault\(\);\s*void invoke\("open_relay_resource", \{ resource \}\)/);
  assert.doesNotMatch(js, /invoke\("open_relay_resource", \{\s*url/);
  assert.match(rust, /fn trusted_relay_resource_url\(resource: &str\) -> Option<&'static str>/);
  assert.match(rust, /"source" => Some\(/);
  assert.match(rust, /"guide" => Some\(/);
  assert.match(rust, /_ => None/);
  assert.match(rust, /fn open_relay_resource\(window: tauri::WebviewWindow, resource: String\)/);
  assert.match(rust, /if window\.label\(\) != "settings"/);
  assert.match(rust, /let url = trusted_relay_resource_url\(&resource\)/);
  assert.match(rust, /launch_browser\(url\)/);
  assert.match(rust, /open_relay_resource,/);
});

test("Worker help links and browser errors have translations in all 20 locales", () => {
  assert.equal(LOCALE_ROSTER.length, 20);
  for (const { code } of LOCALE_ROSTER) {
    for (const key of ["Worker resources", "Get Worker source",
      "Deployment guide", "Cannot open Worker documentation."]) {
      const actual = settingsText(code, key);
      assert.ok(actual.trim(), code + ": " + key);
      if (code !== "en") assert.notEqual(actual, key, code + ": " + key);
    }
  }
});

test("masked password placeholder has normal tracking and readable help contrast", () => {
  assert.match(css, /#relay-secret-mask \{[^}]*font-family: inherit; letter-spacing: normal/);
  assert.match(css, /#relay-secret-mask:not\(:placeholder-shown\) \{[^}]*font-family: ui-monospace/);
  assert.match(css, /#relay-secret-mask::placeholder \{[^}]*letter-spacing: normal;[^}]*opacity: 1/);
  assert.match(css, /\.relay-help \.hint \{[^}]*color: color-mix\(in srgb, CanvasText 85%, Canvas\); opacity: 1/);
  assert.match(css, /\.relay-resource-links a:focus-visible \{[^}]*outline: 2px/);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.relay-resource-links a \{ color: LinkText; \}/);
});

test("each desktop window disables incidental text selection with safe exceptions", () => {
  for (const source of [css, card, about, quota])
    assert.match(source, /html,\s*body,\s*body \* \{[^}]*-webkit-user-select:\s*none;[^}]*user-select:\s*none/);
  assert.match(css, /input:not\(#relay-secret-mask\), textarea, \.relay-secret-command, \.github-user-code \{[^}]*user-select: text/);
  assert.match(css, /\.relay-secret-command \{[^}]*user-select: text/);
  assert.match(css, /#relay-secret-mask \{[^}]*user-select: none/);
  assert.match(card, /input, textarea \{[^}]*user-select: text/);
});
