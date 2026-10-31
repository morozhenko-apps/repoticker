import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../apps/desktop/ui/style.css", import.meta.url), "utf8");
const markup = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");
const card = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
const rule = selector => {
  const escaped = selector.replace(/[.*+?^\x24{}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(escaped + "\\s*\\{([^{}]*)\\}"));
  assert.ok(match, "missing CSS selector " + selector);
  return match[1];
};

test("a metric refresh paints an absolute indicator, never inserts flowing label content", () => {
  const button = rule(".metric-button");
  const busy = rule('.metric-button[aria-busy="true"]');
  const pseudo = rule(".metric-button::after");
  const indicator = rule('.metric-button[aria-busy="true"]::after');
  assert.match(button, /position:\s*relative/);
  assert.match(button, /height:\s*23px/);
  assert.match(pseudo, /position:\s*absolute/);
  assert.match(pseudo, /height:\s*2px/);
  assert.match(pseudo, /content:\s*""/);
  assert.match(pseudo, /opacity:\s*0/);
  assert.match(indicator, /opacity:\s*\.85/);
  assert.doesNotMatch(busy, /padding|height|width|margin|position|content/);
  assert.doesNotMatch(css, /\.metric-button\[aria-busy="true"\]\s+\.metric-caption::after/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("manual refresh keeps fixed card and row geometry with independent metric controls", () => {
  assert.match(rule(".status-strip"), /height:\s*25px/);
  assert.match(rule(".status-strip"), /flex-shrink:\s*0/);
  assert.equal((markup.match(/class="status-hover metric-button"/g) || []).length, 2);
  assert.match(markup, /id="runner-status"[^>]*aria-busy="false"/);
  assert.match(markup, /id="ci-tasks"[^>]*aria-busy="false"/);
  assert.match(card, /function monitorRefreshState\(kind, active\)/);
  assert.match(card, /node\.setAttribute\("aria-busy", String\(active\)\)/);
  assert.match(markup, /class="actions"/);
  assert.match(css, /grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/);
});
