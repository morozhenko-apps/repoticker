import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const native = source("../apps/desktop/src-tauri/src/main.rs");
const surface = source("../apps/desktop/src-tauri/src/linux_surface.rs");
const github = source("../apps/desktop/src-tauri/src/github_session.rs");

test("native warning diagnostics retain stage but never format raw OS errors", () => {
  assert.match(native, /fn native_warning\(stage: &'static str, _error: impl std::fmt::Display\)/);
  assert.match(native, /eprintln!\("RepoTicker native warning: stage=\{stage\}"\)/);
  assert.equal((native.match(/native_warning\("[a-z0-9_]+", error\)/g) || []).length, 17);
  assert.equal((surface.match(/crate::native_warning\("[a-z0-9_]+", error\)/g) || []).length, 2);
  for (const moduleSource of [native, surface]) {
    assert.doesNotMatch(moduleSource, /eprintln!\([^;]*\{error\}/);
    assert.doesNotMatch(moduleSource, /eprintln!\([^;]*(?:error:\?|secret\.as_str|relay_url)/i);
  }
});

test("verbose desktop traces only enable with an explicit debug value of 1", () => {
  assert.match(native, /fn ui_hover_debug_enabled\(\) -> bool \{\s*std::env::var\("REPOTICKER_UI_DEBUG"\)\.as_deref\(\) == Ok\("1"\)/);
  assert.match(surface, /crate::ui_hover_debug_enabled\(\)/);
  assert.match(github, /crate::ui_hover_debug_enabled\(\)/);
  for (const moduleSource of [native, surface, github]) {
    assert.doesNotMatch(moduleSource, /std::env::var_os\("REPOTICKER_UI_DEBUG"\)\.is_some\(\)/);
  }
  assert.match(native, /if ui_hover_debug_enabled\(\) \{\s*eprintln!\(\s*"RepoTicker surface mode=/);
  assert.doesNotMatch(native, /eprintln!\([^;]*(?:XDG_SESSION_TYPE|GDK_BACKEND)/);
});
