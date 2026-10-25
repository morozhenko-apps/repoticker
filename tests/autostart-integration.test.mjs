import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { settingsText } from "../apps/desktop/ui/settings-i18n.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("native OS login launch uses pinned maintained plugin and scoped IPC only", () => {
  const manifest = read("../apps/desktop/src-tauri/Cargo.toml");
  const native = read("../apps/desktop/src-tauri/src/autostart.rs");
  const main = read("../apps/desktop/src-tauri/src/main.rs");
  const capabilities = JSON.parse(read("../apps/desktop/src-tauri/capabilities/default.json"));
  assert.match(manifest, /tauri-plugin-autostart = "=2\.7\.0"/);
  assert.match(manifest, /tauri-plugin-single-instance = "=2\.5\.4"/);
  const plugins = main.slice(main.indexOf("tauri::Builder::default()"));
  assert.ok(plugins.indexOf("tauri_plugin_single_instance::init(") >= 0);
  assert.ok(plugins.indexOf("tauri_plugin_single_instance::init(") <
    plugins.indexOf("tauri_plugin_clipboard_manager::init("),
    "The single-instance plugin must be registered before other plugins");
  assert.match(main, /tauri_plugin_autostart::Builder::new\(\)\s*\.app_name\("RepoTicker"\)\s*\.build\(\)/);
  assert.match(main, /autostart::autostart_is_enabled/);
  assert.match(main, /autostart::autostart_set_enabled/);
  assert.match(native, /\.autolaunch\(\)/);
  assert.match(native, /manager\.is_enabled\(\)/);
  assert.match(native, /manager\.enable\(\)/);
  assert.match(native, /manager\.disable\(\)/);
  assert.ok(!capabilities.permissions.some(p => p.startsWith("autostart:")),
    "Plugin guest commands remain inaccessible from WebView");
  assert.doesNotMatch(main, /autostart_enabled: bool/,
    "OS registration must not be duplicated in app config");
});

test("Settings offers keyboard-accessible EN/RU login launch, default disabled", () => {
  const html = read("../apps/desktop/ui/settings.html");
  const controller = read("../apps/desktop/ui/settings.mjs");
  assert.match(html, /id="autostart-enabled" type="checkbox" disabled/);
  assert.match(html, /data-i18n="Launch at login"/);
  assert.match(html, /id="autostart-status"[^>]*role="status"/);
  assert.equal(settingsText("ru", "Launch at login"), "Запускать при входе в систему");
  assert.equal(settingsText("ru", "Autostart unavailable"), "Автозапуск недоступен");
  assert.match(controller, /invoke\("autostart_is_enabled"\)/);
  assert.match(controller, /invoke\("autostart_set_enabled"/);
  assert.match(controller, /autostartChanged/);
  assert.doesNotMatch(controller, /__TAURI__\.autostart/);
});
