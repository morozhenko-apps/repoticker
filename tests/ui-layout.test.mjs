import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextCardView, cardWindowHeight, CARD_HEIGHT } from "../apps/desktop/ui/view.mjs";

const html = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../apps/desktop/ui/style.css", import.meta.url), "utf8");

test("compact is the default view, list opens from a dedicated action", () => {
  assert.match(html, /data-view="compact"/);
  assert.match(html, /id="repo-drawer"[^>]+hidden/);
  assert.match(html, /id="show-repos"/);
  assert.doesNotMatch(html, /id="toggle-repos"/);
  assert.doesNotMatch(html, /class="brand"/);
  assert.doesNotMatch(html, /id="toggle-runners"/);
});

test("drawer toggle matches rQuickShare's closed/open semantics", () => {
  assert.equal(nextCardView("compact", "repos"), "repos");
  assert.equal(nextCardView("repos", "repos"), "compact");
  assert.equal(nextCardView("repos", "settings"), "settings");
  assert.equal(nextCardView("settings", "settings"), "compact");
  assert.equal(nextCardView("settings", "repos"), "repos");
  assert.throws(() => nextCardView("compact", "__proto__"));
  assert.ok(cardWindowHeight("repos") > cardWindowHeight("compact"));
  assert.ok(cardWindowHeight("settings") > cardWindowHeight("compact"));
  assert.equal(cardWindowHeight("compact"), CARD_HEIGHT.compact);
});

test("usage is a hover/focus tooltip rather than a click toggle", () => {
  assert.match(html, /class="quota-anchor" tabindex="0"/);
  assert.match(html, /class="quota-tooltip" role="tooltip"/);
  assert.match(css, /\.quota-anchor:hover \.quota-tooltip/);
  assert.match(css, /\.quota-anchor:focus-visible \.quota-tooltip/);
  assert.doesNotMatch(html, /id="usage-message"/);
});

test("row typography is regular and not the old 12px bold style", () => {
  assert.match(css, /font-size: 14px/);
  assert.match(css, /\.repo-name \{[^}]*font-weight: 400/s);
  assert.match(css, /\.repo-row \{[^}]*font-size: 14px/s);
});

test("stats stay below the optional list, above action buttons", () => {
  const list = html.indexOf('id="repo-drawer"');
  const stats = html.indexOf('class="metrics"');
  const quota = html.indexOf('class="quota-anchor"');
  const actions = html.indexOf('class="actions"');
  assert.ok(list < stats && stats < quota && quota < actions);
});
