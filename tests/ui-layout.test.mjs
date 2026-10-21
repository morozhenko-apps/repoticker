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
  const strip = html.slice(html.indexOf('class="status-strip"'), html.indexOf('class="actions"'));
  assert.ok(strip.indexOf('id="runner-status"') < strip.indexOf('id="ci-running"'));
  assert.ok(strip.indexOf('id="ci-running"') < strip.indexOf('id="ci-queued"'));
  assert.ok(strip.indexOf('id="ci-queued"') < strip.indexOf('class="quota-anchor"'));
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
  assert.doesNotMatch(html, /id="quota-tooltip"/);
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
  assert.match(settings, /id="language-trigger"/);
  assert.match(settings, /Worker URL/);
  assert.doesNotMatch(html, /id="roots-editor"/);
  assert.match(ui, /start_card_drag/);
  assert.match(ui, /stop_card_drag/);
  assert.match(ui, /createNativeDragGesture/);
  assert.doesNotMatch(ui, /event\.clientX|event\.screenX/);
});

test("repository drawer disables idle dismissal and drag never survives hiding", () => {
  assert.match(ui, /view !== "compact"/);
  assert.match(ui, /if \(!cardVisible \|\| view !== "compact" \|\| quotaExpanded\) return/);
  assert.match(ui, /"repoticker-card-hidden"/);
  assert.match(ui, /stopDragging\(\)/);
  assert.match(ui, /dragSurface\.setPointerCapture\(event\.pointerId\)/);
  assert.match(ui, /lostpointercapture/);
});

test("parallel repo tracking keeps multiple running rows and monotonic button progress", () => {
  assert.match(ui, /active: new Set\(\)/);
  assert.match(ui, /progress\.active\.add\(payload\.path\)/);
  assert.match(ui, /progress\.active\.delete\(payload\.path\)/);
  assert.match(ui, /Math\.max\(progress\.completed \|\| 0, payload\.completed\)/);
});

test("settings is transactional and has no duplicate title or scrolling page", () => {
  const settingsHtml = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");
  const settingsCss = readFileSync(new URL("../apps/desktop/ui/settings.css", import.meta.url), "utf8");
  const settingsJs = readFileSync(new URL("../apps/desktop/ui/settings.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(settingsHtml, /<h1/);
  assert.doesNotMatch(settingsHtml, /class="heading"/);
  assert.match(settingsHtml, /id="apply-settings"/);
  assert.match(settingsHtml, /id="cancel-settings"/);
  assert.match(settingsJs, /"save_settings"/);
  assert.match(settingsJs, /"close_settings"/);
  assert.doesNotMatch(settingsJs, /"add_root"/);
  assert.doesNotMatch(settingsJs, /"remove_root"/);
  assert.match(settingsCss, /\.github-grid input, \.github-grid select \{[^}]*height: 34px/);
  assert.match(settingsCss, /overflow: hidden/);
});

test("popup is transparent and persists native anchor after manual movement", () => {
  const tauri = JSON.parse(readFileSync(new URL("../apps/desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8"));
  assert.equal(tauri.app.windows.find(w => w.label === "main").transparent, true);
  assert.match(ui, /"stop_card_drag"/);
  assert.match(ui, /quotaExpanded/);
  assert.match(ui, /"show_usage_popup"/);
  assert.match(ui, /"hide_usage_popup"/);
  assert.doesNotMatch(html, /id="quota-tooltip"/);
  const viewSource = readFileSync(new URL("../apps/desktop/ui/view.mjs", import.meta.url), "utf8");
  const nativeSource = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  assert.doesNotMatch(viewSource, /quota: 510/);
  assert.doesNotMatch(nativeSource, /"quota" => 510\.0/);
  assert.match(ui, /dragGesture\.end/);
});

test("tray About uses real package version, icon and author", () => {
  const about = readFileSync(new URL("../apps/desktop/ui/about.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../apps/desktop/ui/about.mjs", import.meta.url), "utf8");
  assert.match(about, /src="\.\/icon.png"/);
  assert.match(about, /id="version"/);
  assert.match(about, /id="author"/);
  assert.match(js, /"get_about_info"/);
  assert.match(js, /"open_project_website"/);
});

test("native geometry changes are serialized by GTK acknowledgment and preserve anchor", () => {
  const native = readFileSync(new URL("../apps/desktop/src-tauri/src/linux_surface.rs", import.meta.url), "utf8");
  const commands = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  assert.match(native, /pub async fn resize\(app: AppHandle, height: i32\)/);
  assert.match(native, /spawn_blocking\(move \|\| receive\.recv\(\)\)/);
  assert.match(native, /apply_card_height\(window, height\)/);
  assert.match(native, /content\.set_size_request\(390, height\)/);
  assert.match(native, /vbox\.set_size_request\(390, 122\)/);
  assert.match(native, /set_layer_shell_margin\(Edge::Bottom, bottom\)/);
  assert.match(native, /set_layer_shell_margin\(Edge::Right, right\)/);
  assert.match(native, /CARD_HEIGHT\.store\(height, Ordering::Release\)/);
  assert.doesNotMatch(native, /CARD_HEIGHT\.swap\(height/);
  assert.match(commands, /async fn set_card_view/);
  assert.match(commands, /linux_surface::resize\(app, height as i32\)\.await/);
  assert.match(commands, /linux_surface::request_resize\(&app, 122\)/);
  assert.match(ui, /\.quota-anchor,\[role=button\]/);
});

test("GitHub Device Flow Settings never expose bearer tokens to JavaScript", () => {
  const html = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../apps/desktop/ui/settings.mjs", import.meta.url), "utf8");
  const cfg = JSON.parse(readFileSync(new URL("../apps/desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8"));
  assert.match(html, /id="github-connect"/);
  assert.match(html, /id="github-disconnect"/);
  assert.match(html, /id="github-device-flow"[^>]*hidden/);
  assert.match(html, /id="github-user-code"/);
  assert.match(js, /"github_begin"/);
  assert.match(js, /"github_auth_status"/);
  assert.match(js, /"github_disconnect"/);
  assert.match(js, /"github_cancel"/);
  assert.match(js, /challenge\.userCode/);
  assert.match(html, /id="github-copy-code"/);
  assert.match(js, /"github_copy_user_code"/);
  assert.doesNotMatch(js, /navigator\.clipboard|plugin:clipboard-manager/);
  const native = readFileSync(new URL("../apps/desktop/src-tauri/src/github_session.rs", import.meta.url), "utf8");
  assert.match(native, /fn valid_user_code/);
  assert.match(native, /clipboard\(\)\s*\.write_text\(code\)/);
  assert.match(js, /"github_flow_status"/);
  assert.match(js, /startGithubStatusUpdates/);
  assert.match(js, /stopGithubStatusUpdates/);
  assert.doesNotMatch(html, /id="github-check-status"/);
  assert.match(js, /"github_auth_status"/);
  assert.match(js, /githubFailureLabels/);
  assert.doesNotMatch(js, /accessToken|refreshToken|deviceCode|localStorage/);
  assert.equal(cfg.app.windows.find(w=>w.label==="main").height, 122);
  assert.equal(cfg.app.windows.find(w=>w.label==="settings").height, 552);
});

test("read-only monitor flow shares native state and allows installation selection", () => {
  const app = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
  const monitor = readFileSync(new URL("../apps/desktop/ui/github-monitor.mjs", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../apps/desktop/ui/settings.mjs", import.meta.url), "utf8");
  const html = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");
  const quota = readFileSync(new URL("../apps/desktop/ui/quota.mjs", import.meta.url), "utf8");
  assert.match(app, /startGithubMonitoring/);
  assert.match(monitor, /collectRunnerState/);
  assert.match(monitor, /"github_api_get"/);
  assert.match(monitor, /"github_monitor_publish"/);
  assert.match(monitor, /15 \* 60_000/);
  assert.match(settings, /"github_set_monitor_org"/);
  assert.match(html, /id="github-monitor-scope"/);
  assert.match(quota, /snapshot\.monitor_message/);
  assert.doesNotMatch(monitor, /accessToken|refreshToken|deviceCode/);
});
