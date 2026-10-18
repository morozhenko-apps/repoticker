import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextCardView, cardWindowHeight, pullReadyCommitCount } from "../apps/desktop/ui/view.mjs";

const html = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../apps/desktop/ui/style.css", import.meta.url), "utf8");
const ui = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");

test("compact has no duplicate header, refresh, or permanent results", () => {
  assert.match(html, /data-view="compact"/);
  assert.match(html, /id="repo-drawer"[^>]+hidden/);
  assert.doesNotMatch(html, /class="utility-bar"/);
  assert.doesNotMatch(html, /id="refresh"/);
  assert.doesNotMatch(html, /id="results-panel"/);
  assert.doesNotMatch(html, /id="metric-repos"/);
  assert.doesNotMatch(html, /RepoTicker<\/span>/);
  assert.match(html, /id="hide-card"/);
  assert.match(html, /id="show-repos"/);
});

test("four main operations are at the bottom without an extra heading", () => {
  assert.match(css, /\.actions \{[^}]*grid-template-columns: repeat\(4/s);
  assert.ok(html.indexOf('id="repo-drawer"') < html.indexOf('class="status-strip"'));
  assert.ok(html.indexOf('class="status-strip"') < html.indexOf('class="actions"'));
  assert.match(html, /id="ci-running"/);
  assert.match(html, /id="ci-queued"/);
  assert.match(html, /id="runner-status"/);
});

test("repeating Repos collapses to compact; new open always resets", () => {
  assert.equal(nextCardView("compact", "repos"), "repos");
  assert.equal(nextCardView("repos", "repos"), "compact");
  assert.equal(nextCardView("settings", "repos"), "repos");
  assert.equal(nextCardView("settings", "settings"), "compact");
  assert.ok(cardWindowHeight("repos") > cardWindowHeight("compact"));
  assert.throws(() => nextCardView("compact", "constructor"));
  assert.match(ui, /function resetView/);
  assert.match(ui, /"repoticker-reset-view"/);
});

test("only clean, behind and upstream tracking repos activate safe pull", () => {
  const base = { upstream: "origin/dev", ahead: 0, behind: 4, dirty: false, sync_state: "behind 4" };
  assert.equal(pullReadyCommitCount([base]), 4);
  for (const changed of [
    { dirty: true }, { ahead: 1 }, { upstream: null },
    { sync_state: "operation in progress" }, { sync_state: "diverged" },
    { behind: 0 }, { behind: -1 }
  ]) {
    assert.equal(pullReadyCommitCount([{ ...base, ...changed }]), 0);
  }
});

test("successes do not create logs, errors remain visible and check is green", () => {
  assert.doesNotMatch(ui, /result-line/);
  assert.match(ui, /results\.filter\(item => item\.status === "error"\)/);
  assert.match(css, /\.repo-delta\.is-current \{[^}]*color: #159947/s);
  assert.match(css, /\.repo-name \{[^}]*font-weight: 400/s);
  assert.match(html, /class="quota-anchor" tabindex="0"/);
  assert.match(css, /\.quota-anchor:hover \.quota-tooltip/);
});

test("native progress reports are in rows with translucent fills and bulk button percentages", () => {
  assert.match(ui, /"repoticker-git-progress"/);
  assert.match(ui, /dataset[.]repoPath/);
  assert.match(ui, /pct \+ "%"/);
  assert.match(css, /[.]repo-row[.]is-running::before/);
  assert.match(css, /[.]repo-row[.]is-finished::before/);
  assert.match(ui, /const IDLE_MS = 15_000/);
  assert.match(ui, /"repoticker-card-shown"/);
});

test("settings has a separate entrypoint and card can be dragged", () => {
  const settings = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");
  assert.match(settings, /id="roots-list"/);
  assert.match(settings, /id="language"/);
  assert.match(settings, /Worker URL/);
  assert.doesNotMatch(html, /id="roots-editor"/);
  assert.match(ui, /start_card_drag/);
  assert.match(ui, /move_card/);
  assert.match(ui, /movementX/);
});

test("repository drawer disables idle dismissal and drag never survives hiding", () => {
  assert.match(ui, /view !== "compact"/);
  assert.match(ui, /if \(!cardVisible \|\| view !== "compact"\) return/);
  assert.match(ui, /"repoticker-card-hidden"/);
  assert.match(ui, /stopDragging\(\)/);
  assert.match(ui, /dragSurface\.setPointerCapture\(event\.pointerId\)/);
  assert.match(ui, /lostpointercapture/);
});
