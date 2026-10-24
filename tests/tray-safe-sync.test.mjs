import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const linux = readFileSync(new URL("../apps/desktop/src-tauri/src/linux_tray.rs", import.meta.url), "utf8");

test("both platform tray menus use the Safe sync action, not legacy pull", () => {
  assert.match(native, /"Safe sync all"/);
  assert.match(linux, /label: "Safe sync all"\.into\(\)/);
  assert.match(native, /"sync" => dispatch_menu_action\(app, "safe_sync"\)/);
  assert.match(linux, /"sync" => dispatch_menu_action\(&app, "safe_sync"\)/);
  assert.doesNotMatch(native, /"sync" => dispatch_menu_action\(app, "safe_pull"\)/);
  assert.doesNotMatch(linux, /"sync" => dispatch_menu_action\(&app, "safe_pull"\)/);
});
