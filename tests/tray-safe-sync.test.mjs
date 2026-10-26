import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rust = p => readFileSync(new URL(p, import.meta.url), "utf8");
const native = rust("../apps/desktop/src-tauri/src/main.rs");
const linux = rust("../apps/desktop/src-tauri/src/linux_tray.rs");
const locale = rust("../apps/desktop/src-tauri/src/tray_i18n.rs");

const nativeLabels = JSON.parse(rust("../apps/desktop/ui/locales/native.json"));

test("six stable tray actions have 20-language labels and keep Safe Sync dispatch", () => {
  assert.equal(Object.keys(nativeLabels).length, 20);
  const names = ["Open card", "Settings", "Fetch", "Sync", "About RepoTicker", "Quit"];
  for (const values of Object.values(nativeLabels)) {
    for (const name of names)
      assert.ok(values[name]?.trim(), "Native label missing: " + name);
  }
  assert.equal(nativeLabels.ru.Sync, "Синхронизация");
  assert.equal(nativeLabels.pt.Settings, "Definições");
  assert.match(locale, /"sync" => "Sync"/);
  for (const id of ["open", "settings", "fetch", "sync", "about", "quit"]) {
    assert.match(linux, new RegExp('tray_i18n::label\\(&self\\.language, "' + id + '"\\)'));
    assert.match(native, new RegExp('tray_i18n::label\\(language, "' + id + '"\\)'));
  }
  assert.match(native, /"sync" => dispatch_menu_action\\(app, "safe_sync"\\)/);
  assert.match(linux, /"sync" => dispatch_menu_action\\(&app, "safe_sync"\\)/);
  assert.doesNotMatch(native, /"sync" => dispatch_menu_action\\(app, "safe_pull"\\)/);
  assert.doesNotMatch(linux, /"sync" => dispatch_menu_action\\(&app, "safe_pull"\\)/);
});

test("KDE maintains one KSNI tray handle and updates labels on successful save", () => {
  assert.match(linux, /\.spawn\(\)\?/);
  assert.match(linux, /app\.manage\(handle\)/);
  assert.match(linux, /handle\.update\(move \|tray\|/);
  assert.match(linux, /tray\.language = language/);
  assert.match(native, /refresh_tray_language\(&app, &language_for_tray\)/);
  assert.match(native, /linux_tray::set_language\(app, language\)/);
  assert.doesNotMatch(linux, /std::thread::sleep|polling|spawn_blocking/);
});

test("Windows changes menu labels without replacing tray icon or stable action IDs", () => {
  assert.match(native, /fn build_desktop_tray_menu\(/);
  assert.match(native, /app\.tray_by_id\("repoticker"\)/);
  assert.match(native, /tray\.set_menu\(Some\(menu\)\)/);
  assert.match(native, /Menu::with_items\(app, &\[&open, &settings, &fetch, &sync, &about, &quit\]\)/);
  assert.match(native, /"quit" => request_quit\(app\)/);
  assert.match(linux, /"quit" => request_quit\(&app\)/);
  assert.doesNotMatch(native, /app\.exit\(0\);\s*refresh_tray_language/);
});
