import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOCALE_ROSTER } from "../apps/desktop/ui/locale-catalog.mjs";
import { REPO_STATUS_MESSAGES, repositorySelectionMessage } from "../apps/desktop/ui/locale-counts.mjs";
import { CARD_PLURALS, localizedGitCount } from "../apps/desktop/ui/locale-plurals.mjs";
import { cardText } from "../apps/desktop/ui/card-i18n.mjs";
import { buildHoverDetails, localCheckedTime } from "../apps/desktop/ui/quota-details.mjs";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const notifications = JSON.parse(read("../apps/desktop/ui/locales/notifications.json"));
const native = read("../apps/desktop/src-tauri/src/ci_notifications.rs");
const settings = read("../apps/desktop/ui/settings.mjs");
const quota = read("../apps/desktop/ui/quota.mjs");
const hover = read("../apps/desktop/ui/hover-fallback.mjs");

test("every locale has complete, placeholder-safe repository-count sentences", () => {
  const codes = LOCALE_ROSTER.map(x => x.code);
  assert.deepEqual(Object.keys(REPO_STATUS_MESSAGES), codes);
  for (const code of codes) {
    const texts = REPO_STATUS_MESSAGES[code];
    assert.deepEqual(Object.keys(texts).sort(), ["more", "selected", "truncated", "unavailable"]);
    assert.deepEqual([...texts.selected.matchAll(/\{[^}]+\}/g)].map(m => m[0]).sort(),
      ["{selected}", "{total}"]);
    assert.deepEqual([...texts.unavailable.matchAll(/\{[^}]+\}/g)].map(m => m[0]), ["{count}"]);
    assert.ok(texts.truncated && texts.more);
    const msg = repositorySelectionMessage(code, {
      selected: 2, total: 17, complete: false, filterHasMore: true
    });
    assert.ok(msg.includes(texts.truncated) && msg.includes(texts.more));
    assert.ok(!msg.includes("{") && msg.length > 30);
  }
  assert.match(settings, /repositorySelectionMessage\(uiLocale,/);
  assert.doesNotMatch(settings, /t\("selected of"\)/);
});

test("repository selection formats non-fabricated quantities and locale plurals", () => {
  assert.match(repositorySelectionMessage("en", { selected: 1, total: 2 }),
    /1 of 2 accessible repositories selected/);
  assert.match(repositorySelectionMessage("en", {
    selected: 2, total: 3, unavailable: 1
  }), /1 selected repository is no longer accessible/);
  assert.match(repositorySelectionMessage("pl", {
    selected: 3, total: 5, unavailable: 2
  }), /2 wybrane repozytoria/);
  assert.match(repositorySelectionMessage("ru", {
    selected: 3, total: 10, unavailable: 5
  }), /Выбранных репозиториев больше недоступно/);
  assert.match(repositorySelectionMessage("ar", {
    selected: 1, total: 2
  }), /\u2068.*\u2069/);
  assert.throws(() => repositorySelectionMessage("en", {
    selected: -1, total: 2
  }), RangeError);
  assert.throws(() => repositorySelectionMessage("en", {
    selected: 1, total: Number.NaN
  }), RangeError);
});

test("Git counts choose plural rules without translating identifiers", () => {
  for (const code of LOCALE_ROSTER.map(x => x.code)) {
    const text = localizedGitCount(code, "syncReady", 2);
    assert.ok(text.trim() && !text.includes("{count}"), code);
    assert.ok(cardText(code, "gitErrors", 3).includes("Git"), code);
    assert.throws(() => localizedGitCount(code, "gitErrors", -1), RangeError);
  }
  assert.match(cardText("ru", "syncReady", 1), /Коммит для/);
  assert.match(cardText("ru", "syncReady", 2), /Коммита для/);
  assert.match(cardText("ru", "syncReady", 5), /Коммитов для/);
  assert.match(cardText("pl", "syncReady", 1), /1 commit /);
  assert.match(cardText("pl", "syncReady", 2), /2 commity /);
  assert.match(cardText("pl", "syncReady", 5), /5 commitów /);
  assert.match(cardText("en", "gitErrors", 1), /1 Git operation error:/);
  assert.match(cardText("ar", "gitErrors", 2), /\u2068.*\u2069/);
  assert.equal(CARD_PLURALS.ar.syncReady.zero.includes("{count}"), true);
});

test("all CI notifications preserve provider run identity and opt-in scope", () => {
  assert.deepEqual(Object.keys(notifications), LOCALE_ROSTER.map(x => x.code));
  for (const [language, values] of Object.entries(notifications)) {
    assert.ok(values.title.includes("RepoTicker"), language);
    assert.ok(values.title.includes("CI"), language);
    for (const name of ["permissionError", "stateError", "deliveryError"]) {
      assert.equal(typeof values[name], "string", language + "/" + name);
      assert.ok(values[name].trim(), language + "/" + name);
      assert.doesNotMatch(values[name], /<script|javascript:/i);
    }
    for (const key of ["{repository}", "{runId}", "{attempt}"]) {
      assert.equal(values.body.split(key).length - 1, 1, language + "/" + key);
    }
    assert.doesNotMatch(values.body, /<script|javascript:/i);
  }
  assert.match(native, /notification_text\(&config\.language, &repository, run_id, run_attempt\)/);
  assert.match(native, /approved_scope\(&config, &repository, run_id, run_attempt\)/);
  assert.match(native, /MAX_DELIVERED/);
  assert.match(native, /notification_error\(&config\.language, "permission"\)/);
  assert.match(native, /notification_error\(&config\.language, "state"\)/);
  assert.match(native, /notification_error\(&config\.language, "delivery"\)/);
});

test("usage presentation localizes numbers, dates and isolates provider names", () => {
  const billing = {
    month: "2026-10",
    organization: { plan: "team", included: 1200.25, reported: 1 },
    personal: null
  };
  const english = buildHoverDetails(null, "billing", true, null, billing, "en");
  const portuguese = buildHoverDetails(null, "billing", true, null, billing, "pt");
  const enNumber = new Intl.NumberFormat("en", {maximumFractionDigits: 2}).format(1200.25);
  const ptNumber = new Intl.NumberFormat("pt-PT", {maximumFractionDigits: 2}).format(1200.25);
  assert.equal(english.sections[0].rows[1][1], enNumber);
  assert.equal(portuguese.sections[0].rows[1][1], ptNumber);
  assert.notEqual(ptNumber, enNumber);
  const unknown = buildHoverDetails(null, "billing", true, null, null, "pt");
  assert.equal(unknown.sections[0].rows[1][1], "—");
  assert.equal(unknown.sections[0].rows[2][1], "—");
  assert.equal(localCheckedTime("2026-10-26T10:00:00Z", "UTC", "de"),
    new Intl.DateTimeFormat("de", {
      year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit",
      minute:"2-digit", hourCycle:"h23", timeZone:"UTC"
    }).format(new Date("2026-10-26T10:00:00Z")));
  assert.match(quota, /if \(providerName\) name\.dir = "auto"/);
  assert.match(quota, /count\.dir = "ltr"/);
  assert.match(quota, /billingState, currentLanguage/);
  assert.match(hover, /snapshot\?\.monitor_message, null, language/);
});
