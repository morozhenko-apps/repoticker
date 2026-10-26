import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cardLocale, cardText, metricAccessibleLabel
} from "../apps/desktop/ui/card-i18n.mjs";

const card = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
const markup = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");
const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");

test("card recognizes canonical locales and rejects unknown variants", () => {
  assert.equal(cardLocale("ru"), "ru");
  for (const value of ["en", "", null, "pt-BR", undefined, "RU"]) {
    assert.equal(cardLocale(value), "en");
  }
  assert.equal(cardText("en", "fetch"), "Fetch");
  assert.equal(cardText("ru", "repos"), "Репо");
  assert.equal(cardText("ru", "safeSync"), "Синхр.");
  assert.equal(cardLocale("pt"), "pt");
  assert.equal(cardText("pt", "repos"), "Repositórios");
  assert.throws(() => cardText("ru", "__invalid__"), /translation key/);
});

test("complete compact-card control keys are available in both locales", () => {
  const keys = [
    "repositories", "repositoryActions", "githubMetrics", "runners",
    "tasks", "fetch", "safeSync", "repos", "hide", "cancel", "stopping",
    "openGithub", "openFolder", "copyPath", "noValidRepos", "addRoot",
    "gitOperations", "showRepos", "hideRepos", "hideCard",
    "fetchTitle", "fetchCancel", "syncTitle", "syncUnavailable",
    "refreshRunners", "refreshTasks", "billing", "refresh",
    "refreshing", "unknown", "total", "online", "offline", "running",
    "queued", "cannotResize"
  ];
  for (const locale of ["en", "ru"])
    for (const key of keys) assert.ok(cardText(locale, key).trim(), locale + "/" + key);
  assert.match(cardText("ru", "syncReady", 2), /2/);
  assert.match(cardText("en", "gitOperationsFor", "sandbox"), /sandbox/);
  assert.match(cardText("ru", "gitErrors", 2), /2/);
});

test("accessible metric status keeps unknown distinct from real zero", () => {
  const unknown = { total: "—", online: "—", offline: "—",
    running: "—", queued: "—" };
  const zeros = { total: "0", online: "0", offline: "0",
    running: "0", queued: "0" };
  assert.match(metricAccessibleLabel("en", "runners", unknown), /total: unknown/);
  assert.match(metricAccessibleLabel("ru", "runners", unknown), /всего: неизвестно/);
  assert.match(metricAccessibleLabel("ru", "tasks", zeros), /выполняется: 0/);
  assert.match(metricAccessibleLabel("en", "tasks", zeros), /queued: 0/);
  assert.match(metricAccessibleLabel("en", "tasks", zeros, true), /Refreshing$/);
  assert.doesNotMatch(metricAccessibleLabel("en", "tasks", unknown), /: 0/);
  assert.throws(() => metricAccessibleLabel("ru", "billing", {}), /Unknown metric/);
});

test("initial locale lookup is config-only, guarded against late full-scan outcome", () => {
  assert.match(card, /invoke\("get_settings_config"\)\.then\(config =>/);
  assert.match(card, /if \(firstSnapshotReady \|\| typeof config\?\.language !== "string"\) return/);
  assert.match(card, /setCardLanguage\(config\.language\)/);
  const render = card.match(/function render\(next\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(render, /setCardLanguage\(next\.language\)/);
  assert.ok(render.indexOf("setCardLanguage") < render.indexOf("renderMonitorMetrics"));
  assert.match(native, /fn get_settings_config\(/);
  assert.match(native, /fn get_snapshot\(/);
  assert.doesNotMatch(card.match(/function setCardLanguage\([\s\S]*?\n\}/)?.[0] ?? "",
    /get_snapshot|github_api_get|open_repository/);
});

test("compact-card accessibility updates current counts and localized controls", () => {
  assert.match(card, /metricAccessibleLabel\(cardLanguage, kind, lastMetricStatus, busy\)/);
  assert.match(card, /byId\("runner-status"\)\.querySelector\("\.metric-caption"\)\.textContent/);
  assert.match(card, /byId\("ci-tasks"\)\.querySelector\("\.metric-caption"\)\.textContent/);
  assert.match(card, /node\.setAttribute\("aria-label"/);
  assert.match(card, /document\.documentElement\.lang = cardLanguage/);
  assert.match(card, /item\.dataset\.localeKey/);
  assert.match(card, /cardText\(cardLanguage, "gitOperationsFor", repo\.name\)/);
  assert.match(markup, /id="runner-status"[^>]*aria-busy="false"/);
  assert.match(markup, /id="ci-tasks"[^>]*aria-busy="false"/);
  assert.match(markup, /class="actions"/);
  assert.equal((markup.match(/class="action"/g) || []).length, 4);
});
