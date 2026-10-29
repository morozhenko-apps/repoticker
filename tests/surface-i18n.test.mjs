import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { surfaceLocale, surfaceText, translateHoverDetails } from "../apps/desktop/ui/surface-i18n.mjs";
const about = readFileSync(new URL("../apps/desktop/ui/about.html", import.meta.url), "utf8");
const quota = readFileSync(new URL("../apps/desktop/ui/quota.html", import.meta.url), "utf8");
const quotaController = readFileSync(new URL("../apps/desktop/ui/quota.mjs", import.meta.url), "utf8");

test("Detached surfaces retain EN/RU and translate canonical 20-locale values", () => {
  assert.equal(surfaceLocale("ru"), "ru");
  assert.equal(surfaceLocale("pt"), "pt");
  assert.equal(surfaceLocale("pt-BR"), "en");
  assert.equal(surfaceText("ru", "Version"), "Версия");
  assert.equal(surfaceText("pt", "Version"), "Versão");
  assert.equal(surfaceText("en", "Version"), "Version");
  assert.equal(surfaceText("ru", "morozhenko-apps"), "morozhenko-apps");
  assert.throws(() => surfaceText("ru", null));
});

test("About labels and native icon/accessibility annotations have Russian translations", () => {
  const keys = [...about.matchAll(/data-i18n(?:-aria|-alt)?="([^"]+)"/g)]
    .map(item => item[1]);
  assert.ok(keys.length >= 5);
  for (const key of keys) {
    assert.equal(surfaceText("en", key), key);
    assert.notEqual(surfaceText("ru", key), key);
  }
  assert.match(about, /id="version"/);
  assert.match(about, /id="author"/);
  assert.match(about, /id="website"/);
});

test("Runner/task numeric and provider data are retained in immutable translated projection", () => {
  const model = {
    connected: true, status: "Tasks · Running 3 / Queued 0",
    message: "Checked: 10/24/2026, 21:35",
    sections: [{ title: "", rows: [
      ["GitHub-hosted", "1"], ["runner/частный", "—"], ["More self-hosted", "+12"]
    ], message: null }]
  };
  const source = structuredClone(model);
  const ru = translateHoverDetails(model, "ru");
  assert.equal(ru.status, "Задачи · Выполняется 3 / В очереди 0");
  assert.equal(ru.message, "Проверено: 10/24/2026, 21:35");
  assert.deepEqual(ru.sections[0].rows, [
    ["Раннеры GitHub", "1"], ["runner/частный", "—"], ["Ещё своих раннеров", "+12"]
  ]);
  assert.deepEqual(model, source, "English data must remain untouched");
  assert.equal(translateHoverDetails(model, "en"), model);
  assert.match(translateHoverDetails(model, "it").status, /Attività/);
  assert.notEqual(ru.sections, model.sections);
  const reservedName = {
    connected: true, status: "Tasks · Running 1 / Queued 0", message: "",
    sections: [{ title: "", rows: [
      ["Online", "1"], ["Busy", "0"], ["GitHub-hosted", "0"]
    ], message: null }]
  };
  const safe = translateHoverDetails(reservedName, "ru", 2);
  assert.deepEqual(safe.sections[0].rows, [
    ["Online", "1"], ["Busy", "0"], ["Раннеры GitHub", "0"]
  ], "Even built-in-looking runner names must remain untouched");
});

test("Billing plan names, period, numeric values and untrusted errors remain unchanged", () => {
  const model = {
    connected: true, status: "Actions · 2026-10", message: "",
    sections: [
      { title: "Organization", rows: [
        ["Plan", "pro"], ["Included min", "2,000"],
        ["Used min (gross)", "2,791.5"]
      ], message: "GitHub API 403: scope unknown" },
      { title: "Personal account", rows: [["Plan", "free"]], message: null }
    ]
  };
  const ru = translateHoverDetails(model, "ru");
  assert.equal(ru.status, "Actions · 2026-10");
  assert.deepEqual(ru.sections.map(x => x.title), ["Организация", "Личный аккаунт"]);
  assert.deepEqual(ru.sections[0].rows, [
    ["Тариф", "pro"], ["Включено, мин", "2,000"],
    ["Использовано, мин", "2,791.5"]
  ]);
  assert.equal(ru.sections[0].message, "GitHub API 403: scope unknown");
  assert.equal(ru.sections[1].rows[0][1], "free");
});

test("Unknown/disconnected state remains unknown, with no fabricated zeros", () => {
  const details = {
    connected: false, status: "Not connected",
    sections: [], message: "Connect GitHub in Settings to read this status."
  };
  const ru = translateHoverDetails(details, "ru");
  assert.equal(ru.status, "Не подключено");
  assert.match(ru.message, /Подключите GitHub/);
  const loading = translateHoverDetails({
    connected: false, status: "Connecting", sections: [],
    message: "Checking GitHub connection..."
  }, "ru");
  assert.equal(loading.status, "Подключение");
  assert.match(loading.message, /Проверка подключения/);
  const inaccessible = translateHoverDetails({
    connected: false, status: "Runners unavailable", sections: [],
    message: "server says 'secret'." }, "ru");
  assert.equal(inaccessible.status, "Раннеры недоступны");
  assert.equal(inaccessible.message, "server says 'secret'.");
});

test("checked timestamp preserves unknown as localized unknown, never zero", () => {
  const details = {
    connected: true, status: "Runners · —",
    sections: [],
    message: "Checked: Unknown"
  };
  for (const code of ["ru", "pt", "de", "ar"]) {
    const result = translateHoverDetails(details, code);
    assert.equal(result.message, surfaceText(code, "Checked") +
      ": " + surfaceText(code, "Unknown"));
    assert.doesNotMatch(result.message, /: 0$/);
  }
  assert.equal(details.message, "Checked: Unknown");
});

test("Usage balloon reads only the local saved locale, not local Git repos", () => {
  assert.match(quota, /data-i18n-aria="GitHub Actions and usage"/);
  assert.match(quotaController, /get_settings_config/);
  assert.match(quotaController, /translateHoverDetails\(details, currentLanguage, runnerNameRows\)/);
  assert.match(quotaController, /subscribe\("repoticker-config-changed", refreshLocale\)/);
  assert.doesNotMatch(quotaController, /invoke\("get_snapshot"\)/);
  assert.doesNotMatch(quotaController, /git::inspect|git::discover/);
});


test("Arabic task and runner headers isolate counts and dates without inventing zero", () => {
  const fsi = "\u2068", pdi = "\u2069";
  const model = {
    connected: true, status: "Tasks · Running 2 / Queued —",
    message: "Checked: 10/29/2026, 06:57",
    sections: [{ title: "", rows: [
      ["runner-👩‍💻-qa/東京", "2"], ["GitHub-hosted", "—"]
    ], message: null }],
  };
  const before = structuredClone(model);
  const ar = translateHoverDetails(model, "ar", 1);
  assert.equal(ar.status,
    surfaceText("ar", "Tasks") + " · " +
    surfaceText("ar", "Running") + " " + fsi + "2" + pdi +
    " / " + surfaceText("ar", "Queued") + " —");
  assert.equal(ar.message, surfaceText("ar", "Checked") +
    ": " + fsi + "10/29/2026, 06:57" + pdi);
  assert.deepEqual(ar.sections[0].rows, [
    ["runner-👩‍💻-qa/東京", "2"], [surfaceText("ar", "GitHub-hosted"), "—"]
  ]);
  assert.deepEqual(model, before, "native GitHub state is not rewritten");
  const known = translateHoverDetails({
    connected: true, status: "Runners · 12", message: "Checked: Unknown",
    sections: [],
  }, "ar");
  assert.equal(known.status, surfaceText("ar", "Runners") +
    " · " + fsi + "12" + pdi);
  assert.equal(known.message, surfaceText("ar", "Checked") +
    ": " + surfaceText("ar", "Unknown"));
  assert.equal(translateHoverDetails({
    connected: true, status: "Runners · —",
    message: "Checked: Unknown", sections: [],
  }, "ar").status, surfaceText("ar", "Runners") + " · —");
  const billing = translateHoverDetails({
    connected: true, status: "Actions · 2026-10", sections: [], message: "",
  }, "ar");
  assert.equal(billing.status, surfaceText("ar", "Actions") +
    " · " + fsi + "2026-10" + pdi);
  const other = translateHoverDetails(model, "pt", 1);
  assert.doesNotMatch(other.status, /\u2068|\u2069/);
  assert.deepEqual(other.sections[0].rows[0], model.sections[0].rows[0]);
});
