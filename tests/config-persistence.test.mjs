import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const surface = readFileSync(new URL("../apps/desktop/src-tauri/src/linux_surface.rs", import.meta.url), "utf8");
const store = readFileSync(new URL("../crates/repoticker-core/src/config_store.rs", import.meta.url), "utf8");

test("desktop settings updates use one managed JSON transaction gate", () => {
  assert.match(main, /\.manage\(JsonStore::default\(\)\)/);
  assert.match(main, /fn read_config\([\s\S]*?\.read::<Config>\(&path\)/);
  assert.match(main, /fn update_config<R>\([\s\S]*?\.update\(&path, default_config, change\)/);
  assert.doesNotMatch(main, /fn write_config\(/);
  assert.doesNotMatch(main, /fs::write\(&path, content\)/);
  for (const name of ["add_root", "remove_root", "save_settings", "github_set_monitor_org", "set_language"]) {
    const begin = main.indexOf("fn " + name + "(");
    assert.ok(begin >= 0, "command exists: " + name);
    const nextCommand = main.indexOf("#[tauri::command]", begin + 1);
    const fragment = main.slice(begin, nextCommand > 0 ? nextCommand : begin + 1600);
    assert.match(fragment, /update_config\(&app,/, name + " must update transactionally");
  }
});

test("atomic JSON writer keeps old config and recovery evidence", () => {
  assert.match(store, /fn atomic_replace\(/);
  assert.match(store, /create_new\(true\)/);
  assert.match(store, /file\.sync_all\(\)/);
  assert.match(store, /fs::rename\(&temporary\.path, path\)/);
  assert.match(store, /fn quarantine_corrupt\(/);
  assert.match(store, /pub fn read_json</);
  assert.match(store, /pub fn save_json</);
  assert.match(store, /pub struct JsonStore/);
});

test("Linux drag margin persistence cannot bypass serialized config updates", () => {
  assert.match(surface, /fn persist_now\([\s\S]*?crate::update_config\(app,/);
  assert.doesNotMatch(surface, /crate::write_config\(/);
  assert.doesNotMatch(surface, /let mut config = crate::read_config\(app\)\?/);
});
