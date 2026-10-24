import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../apps/desktop/ui/settings.css", import.meta.url), "utf8");
const settings = readFileSync(new URL("../apps/desktop/ui/settings.mjs", import.meta.url), "utf8");

test("KDE monitor selectors share two-column alignment and control height", () => {
  assert.match(html, /<label id="github-monitor-scope-row" hidden>Monitor account\s*<select id="github-monitor-scope">/);
  assert.match(html, /<div class="github-repo-heading">[\s\S]*?<label for="github-repo-mode">Monitor repositories<\/label>\s*<select id="github-repo-mode">/);
  assert.match(css, /\.github-grid \{[^}]*grid-template-columns: 1fr 1fr;[^}]*gap: 7px 10px/);
  assert.match(css, /\.github-grid input, \.github-grid select \{[^}]*height: 34px/);
  assert.match(css, /\.github-repo-heading \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*column-gap: 10px/);
  assert.match(css, /\.github-repo-heading select \{[^}]*width: 100%;[^}]*height: 34px/);
  assert.doesNotMatch(css, /\.github-repo-heading select \{[^}]*width: 165px/);
});

test("notification and selected-repository checkboxes are consistent and keyboard accessible", () => {
  assert.match(html, /<label for="ci-failure-notifications">\s*<input id="ci-failure-notifications" type="checkbox">/);
  assert.match(settings, /checkbox\.type = "checkbox"/);
  const base = css.match(/\.ci-alert-controls input\[type="checkbox"\],\s*\.github-repo-choice input\[type="checkbox"\] \{([^}]+)\}/)?.[1];
  assert.ok(base, "Both kinds of checkbox must share a single control reset");
  for (const rule of [
    /-webkit-appearance: none/, /appearance: none/, /width: 16px/,
    /height: 16px/, /margin: 0/, /padding: 0/, /background-position: center/,
    /background-size: 12px 12px/
  ]) assert.match(base, rule);
  assert.match(css, /\.ci-alert-controls input\[type="checkbox"\]:checked,\s*\.github-repo-choice input\[type="checkbox"\]:checked \{[^}]*background-image: url\("data:image\/svg\+xml/);
  assert.match(css, /\.ci-alert-controls input\[type="checkbox"\]:focus-visible,\s*\.github-repo-choice input\[type="checkbox"\]:focus-visible \{[^}]*outline:/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("KDE alignment fix does not alter settings confirmation or popup geometry", () => {
  assert.match(html, /id="apply-settings"/);
  assert.match(html, /id="cancel-settings"/);
  assert.match(html, /id="github-repo-controls"[^>]*hidden/);
  assert.match(css, /\.github-repo-controls\[hidden\]/);
  assert.match(css, /\.settings-shell \{[^}]*height: 100%/);
  assert.match(settings, /ciFailureNotifications: draft\.ciFailureNotifications/);
});

test("KDE GitHub selects have zero block padding and CSS-owned centered closed controls", () => {
  const control = css.match(/\.github-grid select,\s*\.github-repo-heading select \{([^}]+)\}/)?.[1];
  assert.ok(control, "All three visible GitHub selectors share one text-painting contract");
  for (const rule of [
    /-webkit-appearance: none/, /appearance: none/,
    /box-sizing: border-box/, /height: 34px/, /line-height: 32px/,
    /padding: 0 32px 0 12px/,
    /background-position: right 11px center/
  ]) assert.match(control, rule);
  assert.match(css, /\.github-grid select:focus-visible,\s*\.github-repo-heading select:focus-visible/);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*\.github-grid select/);
  // Real HTML selects and their native options remain, not a scripted proxy.
  for (const id of ["github-monitor-scope", "github-connection-mode", "github-repo-mode"]) {
    assert.match(html, new RegExp('<select id="' + id + '"'));
  }
  assert.doesNotMatch(html, /role="combobox"/);
});
