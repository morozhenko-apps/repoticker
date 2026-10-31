import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LOCALE_ROSTER, CORE_TERMS, normalizeLocale, localeDirection,
  localeName, coreText
} from "../apps/desktop/ui/locale-catalog.mjs";
import { EXTENDED_TERMS } from "../apps/desktop/ui/locale-extended.mjs";
import { WORKFLOW_TERMS } from "../apps/desktop/ui/locale-workflow.mjs";
import { AUTH_TERMS } from "../apps/desktop/ui/locale-auth.mjs";
import { SURFACE_TERMS } from "../apps/desktop/ui/locale-surface.mjs";
import { CARD_TERMS } from "../apps/desktop/ui/locale-card.mjs";
import { settingsLocale, settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
import { cardLocale, cardText } from "../apps/desktop/ui/card-i18n.mjs";
import { surfaceLocale, surfaceText } from "../apps/desktop/ui/surface-i18n.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const native = JSON.parse(read("../apps/desktop/ui/locales/native.json"));
const settingsHtml = read("../apps/desktop/ui/settings.html");
const settingsController = read("../apps/desktop/ui/settings.mjs");
const nativeController = read("../apps/desktop/src-tauri/src/main.rs");
const localeSources = [
  read("../apps/desktop/ui/settings-i18n.mjs"),
  read("../apps/desktop/ui/surface-i18n.mjs"),
];
const sourceKeys = [...new Set(localeSources.flatMap(source =>
  [...source.matchAll(/^\s+"([^"]+)":/gm)].map(match => match[1])
))];
const bundles = [CORE_TERMS, EXTENDED_TERMS, WORKFLOW_TERMS, AUTH_TERMS, SURFACE_TERMS];
const expected = ["en", "ru", "es", "pt", "de", "fr", "it", "pl",
  "hi", "zh-Hant", "ja", "nl", "sv", "tr", "ko", "bn", "th", "id", "fil", "ar"];

test("exact 20 canonical locales, native names, no accidental regional aliases", () => {
  assert.deepEqual(LOCALE_ROSTER.map(locale => locale.code), expected);
  assert.equal(new Set(expected).size, 20);
  assert.deepEqual(Object.keys(native), expected);
  const options = [...settingsHtml.matchAll(/data-value="([^"]+)"/g)]
    .map(item => item[1]);
  assert.deepEqual(options, expected);
  for (const locale of LOCALE_ROSTER) {
    assert.ok(locale.name.trim());
    assert.equal(localeName(locale.code), locale.name);
    assert.equal(normalizeLocale(locale.code), locale.code);
    assert.equal(cardLocale(locale.code), locale.code);
    assert.equal(surfaceLocale(locale.code), locale.code);
    assert.equal(settingsLocale(locale.code), locale.code);
    assert.equal(localeDirection(locale.code), locale.dir);
  }
  for (const code of ["pt-BR", "zh", "zh-Hans", "tl", "EN", "", null]) {
    assert.equal(normalizeLocale(code), "en");
  }
  assert.equal(localeDirection("ar"), "rtl");
  assert.equal(localeDirection("pt"), "ltr");
});

test("all legacy static UI labels are present in every additional locale", () => {
  assert.ok(sourceKeys.length >= 130);
  for (const code of expected.slice(2)) {
    const translated = Object.assign({}, ...bundles.map(bundle => bundle[code]));
    const missing = sourceKeys.filter(key => !Object.hasOwn(translated, key));
    assert.deepEqual(missing, [], code + " has untranslated UI keys");
    for (const key of sourceKeys) {
      const value = translated[key];
      assert.equal(typeof value, "string", code + "/" + key);
      assert.ok(value.trim().length, code + "/" + key);
      assert.equal(value, value.trim(), code + "/" + key + " has whitespace");
      assert.doesNotMatch(value, /<\/?(?:script|iframe|img)|\{\{/i);
      assert.equal(coreText(code, key), value);
      const placeholders = [...key.matchAll(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g)]
        .map(x => x[0]).sort();
      assert.deepEqual([...value.matchAll(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g)]
        .map(x => x[0]).sort(), placeholders, code + "/" + key);
    }
  }
});

test("native catalog uses the identical seven fixed menu/title keys", () => {
  const keys = ["Open card", "Settings", "Fetch", "Sync", "About RepoTicker",
    "Quit", "RepoTicker Settings"].sort();
  for (const [code, records] of Object.entries(native)) {
    assert.deepEqual(Object.keys(records).sort(), keys, code);
    assert.ok(records["RepoTicker Settings"].includes("RepoTicker"));
    assert.ok(records["About RepoTicker"].includes("RepoTicker"));
  }
  assert.equal(native.pt.Settings, "Definições");
  assert.equal(native["zh-Hant"].Quit, "結束");
  assert.equal(native.ar.Settings, "الإعدادات");
  assert.match(nativeController, /tray_i18n::is_supported_locale/);
});

test("technical semantics: Git safety, unknown values, errors and credential boundaries", () => {
  for (const code of expected.slice(2)) {
    const safe = coreText(code, "Safe sync");
    const sync = coreText(code, "Sync");
    assert.notEqual(safe, sync, code + " safe sync distinction missing");
    assert.notEqual(coreText(code, "Offline"), coreText(code, "Unknown"));
    assert.notEqual(coreText(code, "Running"), coreText(code, "Queued"));
    assert.ok(coreText(code, "GitHub authorization failed.").includes("GitHub"));
    assert.ok(coreText(code, "GitHub returned an unsuccessful HTTP response.").includes("HTTP"));
    const walletFailure = coreText(code,
      "Authorization reached the system wallet, but KWallet/Secret Service could not store the token."
    );
    assert.ok(walletFailure.includes("KWallet/Secret Service"),
      code + ": wallet integration label changed its technical identifier: " + walletFailure);
    const copyShortcut = coreText(code,
      "Cannot access system clipboard. Select the code and copy with Ctrl+C."
    );
    // German keyboard conventions label Control as Strg. Preserve the
    // actual shortcut semantics rather than an untranslated literal.
    assert.ok(copyShortcut.includes(code === "de" ? "Strg+C" : "Ctrl+C"),
      code + " must retain the platform copy shortcut");
    assert.ok(coreText(code,
      "Open source · Apache License 2.0").includes("Apache"));
    assert.ok(coreText(code,
      "Open source · Apache License 2.0").includes("2.0"));
    assert.ok(coreText(code,
      "Waiting for GitHub approval. The application is checking at GitHub's required interval."
    ).includes("GitHub"));
  }
  assert.equal(settingsText("pt", "Local repositories"), "Repositórios locais");
  assert.equal(surfaceText("ja", "Version"), "バージョン");
  assert.equal(cardText("de", "safeSync"), "Sicher synchronisieren");
});

test("direction and persistence are presentation-only, provider IDs stay LTR", () => {
  assert.match(settingsController, /document\.documentElement\.dir = localeDirection\(uiLocale\)/);
  assert.match(settingsController, /languageTrigger\.firstChild\.textContent = localeName\(draft\.language\)/);
  assert.match(settingsController, /draft\.language = option\.dataset\.value/);
  assert.match(settingsController, /if \(original\.language !== draft\.language\)/);
  assert.match(settingsController, /label\.dir = "ltr"/);
  assert.match(settingsHtml, /id="root-path" dir="ltr"/);
  assert.match(settingsHtml, /id="github-repo-filter" dir="ltr"/);
  assert.doesNotMatch(settingsController, /draft\.language = option\.dataset\.value;\s*applySettingsLanguage/);
});


test("dynamic Git card templates preserve placeholders and untranslated values", () => {
  const expectedKeys = [
    "repositoryActions", "githubMetrics", "stopping", "noValidRepos",
    "addRoot", "gitOperations", "gitOperationsFor", "showRepos",
    "hideRepos", "hideCard", "fetchTitle", "fetchCancel", "syncTitle",
    "syncReady", "syncUnavailable", "refreshRunners", "refreshTasks",
    "billing", "refresh", "refreshing", "cannotResize", "gitErrors", "total"
  ];
  for (const code of expected.slice(2)) {
    assert.deepEqual(Object.keys(CARD_TERMS[code]).sort(), [...expectedKeys].sort());
    const withName = CARD_TERMS[code].gitOperationsFor;
    const withCount = CARD_TERMS[code].syncReady;
    assert.equal((withName.match(/\{name\}/g) ?? []).length, 1, code);
    assert.equal((withCount.match(/\{count\}/g) ?? []).length, 1, code);
    assert.equal((CARD_TERMS[code].gitErrors.match(/\{count\}/g) ?? []).length, 1, code);
    assert.match(CARD_TERMS[code].syncTitle, /fast-forward/i,
      code + " must preserve fast-forward requirement");
    assert.match(CARD_TERMS[code].syncTitle, /force/i,
      code + " must not imply force-push");
    assert.match(CARD_TERMS[code].fetchCancel, /Fetch/,
      code + " cancellation warning must retain Git operation");
    assert.ok(CARD_TERMS[code].noValidRepos.trim());
    assert.ok(CARD_TERMS[code].addRoot.trim());
    assert.ok(cardText(code, "gitOperationsFor", "feature/main").includes("feature/main"));
    assert.ok(cardText(code, "syncReady", 3).includes("3"));
  }
  const arabic = cardText("ar", "gitOperationsFor", "feature/main");
  assert.match(arabic, /\u2068feature\/main\u2069/,
    "Arabic mixed direction must isolate repository references");
  assert.equal(cardText("en", "gitOperationsFor", "feature/main"),
    "Git operations for feature/main");
});


test("RTL locale isolates provider names, Git refs and device codes without rewriting data", () => {
  const card = read("../apps/desktop/ui/app.mjs");
  const cardCss = read("../apps/desktop/ui/style.css");
  assert.equal(localeDirection("ar"), "rtl");
  assert.equal(localeDirection("en"), "ltr");
  assert.match(card, /const name = addText\(row, "span", repo\.name, "repo-name"\);\s*name\.dir = "auto"/);
  assert.match(card, /const branch = addText\(row, "span", repo\.branch, "repo-branch"\);\s*branch\.dir = "ltr"/);
  assert.match(cardCss, /\.repo-name, \.repo-branch \{ unicode-bidi: isolate; \}/);
  assert.match(settingsController, /title\.dir = "auto";[\s\S]*?title\.textContent = name/);
  assert.match(settingsController, /select\.dir = "ltr";[\s\S]*?select\.replaceChildren\(\)/);
  assert.match(settingsController, /option\.value = name;[\s\S]*?option\.dir = "auto";[\s\S]*?option\.textContent = name/);
  assert.match(settingsHtml, /id="github-user-code" class="github-user-code" dir="ltr"/);
  assert.match(settingsHtml, /id="github-repo-filter" dir="ltr"/);
  assert.match(read("../apps/desktop/ui/quota.mjs"), /if \(providerName\) name\.dir = "auto"/);
  assert.match(read("../apps/desktop/ui/quota.mjs"), /count\.dir = "ltr"/);
});
