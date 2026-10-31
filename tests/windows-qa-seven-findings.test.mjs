import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cardText } from "../apps/desktop/ui/card-i18n.mjs";
import { LOCALE_ROSTER } from "../apps/desktop/ui/locale-catalog.mjs";
import { buildHoverDetails } from "../apps/desktop/ui/quota-details.mjs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const card = read("apps/desktop/ui/app.mjs");
const native = read("apps/desktop/src-tauri/src/main.rs");
const html = read("apps/desktop/ui/index.html");
const css = read("apps/desktop/ui/style.css");
const settings = read("apps/desktop/ui/settings.mjs");
const keychain = read("apps/desktop/src-tauri/src/github_native.rs");

test("Fetch controls are meaningful localized verbs, not 19 English Fetch labels", () => {
  assert.equal(cardText("en", "fetch"), "Fetch");
  assert.equal(cardText("ru", "fetch"), "Получить");
  assert.equal(cardText("pt", "fetch"), "Obter");
  assert.equal(cardText("de", "fetch"), "Abrufen");
  assert.equal(cardText("ja", "fetch"), "取得");
  for (const { code } of LOCALE_ROSTER) {
    assert.ok(cardText(code, "fetch").trim());
    if (code !== "en")
      assert.notEqual(cardText(code, "fetch"), "Fetch", code);
  }
  assert.match(card, /cardText\(cardLanguage, "fetch"\)/);
});

test("all three Windows metrics use a single styled native usage window", () => {
  const show = native.slice(native.indexOf("fn show_usage_popup("),
    native.indexOf("fn hide_usage_popup("));
  assert.match(show, /windows_geometry::raise_usage_popup\(&popup\)/);
  assert.ok(show.indexOf("windows_geometry::raise_usage_popup(&popup)") > show.indexOf(".show()"));
  assert.doesNotMatch(show, /popup\.set_always_on_top\(/);
  assert.match(card, /function clearBrowserTooltips/);
  assert.match(card, /node\.removeAttribute\("title"\)/);
  assert.doesNotMatch(card, /node\.title = hoverFallbackText/);
  assert.doesNotMatch(html, /title="Click to update (Runners|Tasks)"/);
  assert.match(native, /position_unmanaged_usage_popup\(&card, &popup\)/);
  assert.match(native, /footer_anchored_usage_position\(/);
  assert.match(native, /card_position\.1 \+ card_size\.1/);
  assert.match(native, /FOOTER_CLEARANCE_LOGICAL: f64 = 125\.0/);
  assert.doesNotMatch(native, /i64::from\(position\.y\) - i64::from\(popup_size\.height\)/);
});

test("billing retains full authoritative data and refuses invented allowances", () => {
  const unknown = buildHoverDetails(null, "billing", true, null, null);
  assert.equal(unknown.sections[0].rows[1][1], "—");
  const known = buildHoverDetails(null, "billing", true, null, {
    month: "2026-10",
    organization: { plan: "team", included: 3000, reported: 152.5 },
    personal: { plan: null, included: null, reported: null,
      reason: "Personal billing unavailable; reauthorize Plan: read." }
  });
  assert.equal(known.sections[0].rows[1][1], "3,000");
  assert.match(known.sections[1].message, /Plan: read/);
  assert.match(read("apps/desktop/ui/quota.mjs"), /billingCache\.load\(scope, true\)/);
  assert.match(read("apps/desktop/ui/quota.mjs"), /paintSnapshot\(currentSnapshot\)/);
});

test("compact Windows geometry has no unaccounted top gap", () => {
  assert.match(native, /"compact" => \{\s*if cfg!\(target_os = "windows"\) \{\s*108\.0\s*\} else \{\s*122\.0/);
  assert.match(native, /resize_unmanaged_card\(\s*&window,\s*if cfg!\(target_os = "windows"\)/);
  assert.match(card, /classList\.add\("windows-platform"\)/);
  assert.match(css, /\.windows-platform \.card\[data-view="compact"\] \{ padding-top: 3px; \}/);
  // 3px top + 25px metrics + 70px actions + 10px bottom = 108px.
  assert.equal(3 + 25 + 70 + 10, 108);
});

test("Settings Apply closes after committed mutation, not after a second network read", () => {
  const apply = settings.slice(settings.indexOf('byId("apply-settings").addEventListener'),
    settings.indexOf('window.__TAURI__?.event?.listen?.("repoticker-settings-opened"'));
  assert.ok(apply.includes('await invoke("github_set_monitor_org"'));
  assert.ok(apply.includes('await invoke("close_settings")'));
  assert.doesNotMatch(apply, /await refreshMonitorScopes\(\)/);
  assert.doesNotMatch(apply, /refreshMonitorScopes\(\)\.catch\(\(\) => \{\}\)/);
  assert.match(card, /function refreshCardConfiguration\(\)/);
  assert.match(card, /get_settings_config/);
  assert.match(card, /authoritativeSavedLocale \?\? next\.language/);
  assert.match(card, /"repoticker-config-changed", refreshCardConfiguration/);
});

test("AppData and OS keychain are separate stores; uninstall cannot silently revoke OAuth", () => {
  assert.match(keychain, /KEYRING_SERVICE: &str = "com\.morozhenko\.repoticker\.github"/);
  assert.match(keychain, /KEYRING_USER: &str = "github-app-user-token-v1"/);
  assert.match(keychain, /delete_credential\(\)/);
  assert.doesNotMatch(native, /delete_credential\(\)/);
});
