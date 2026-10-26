import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { settingsLocale, settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
const html = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");
const settings = readFileSync(new URL("../apps/desktop/ui/settings.mjs", import.meta.url), "utf8");

test("Settings preserves English and Russian and supports canonical Portugal locale", () => {
  assert.equal(settingsLocale("ru"), "ru");
  assert.equal(settingsLocale("pt"), "pt");
  assert.equal(settingsLocale("pt-BR"), "en");
  assert.equal(settingsText("ru", "Local repositories"), "Локальные репозитории");
  assert.equal(settingsText("en", "Local repositories"), "Local repositories");
  assert.equal(settingsText("pt", "Local repositories"), "Repositórios locais");
  assert.equal(settingsText("ru", "owner/repository"), "owner/repository");
  assert.throws(() => settingsText("ru", null));
});

test("All Settings declarative labels and accessibility keys have RU text", () => {
  const keys = [...html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)]
    .map(m => m[1].replaceAll("&amp;", "&"));
  assert.ok(keys.length >= 26);
  for (const key of keys) {
    assert.equal(settingsText("en", key), key);
    assert.notEqual(settingsText("ru", key), key, "Missing RU translation: " + key);
  }
  assert.match(settings, /document\.documentElement\.lang = uiLocale/);
  assert.match(settings, /applySettingsLanguage\(draft\.language\)/);
  assert.match(settings, /draft\.language = option\.dataset\.value;/);
  assert.doesNotMatch(settings, /draft\.language = option\.dataset\.value;\s*applySettingsLanguage/);
  assert.match(settings, /configChanges\.ciFailureNotifications = draft\.ciFailureNotifications/);
  assert.equal(settingsText("ru", "RepoTicker Settings"), "Настройки RepoTicker");
});
