import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const native = source("../apps/desktop/src-tauri/src/main.rs");
const surface = source("../apps/desktop/src-tauri/src/linux_surface.rs");
const github = source("../apps/desktop/src-tauri/src/github_session.rs");

function emittedCalls(source) {
  const calls = [];
  const start = /\beprintln!\s*\(/g;
  let match;
  while ((match = start.exec(source)) !== null) {
    const from = start.lastIndex;
    let depth = 1;
    let quoted = false;
    let escaped = false;
    let closed = false;
    for (let i = from; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') {
        quoted = true;
      } else if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          calls.push(source.slice(from, i));
          start.lastIndex = i + 1;
          closed = true;
          break;
        }
      }
    }
    assert.ok(closed, "Every eprintln! invocation must be balanced");
  }
  return calls;
}


test("native warning diagnostics retain stage but never format raw OS errors", () => {
  assert.match(native, /fn native_warning\(stage: &'static str, _error: impl std::fmt::Display\)/);
  assert.match(native, /eprintln!\("RepoTicker native warning: stage=\{stage\}"\)/);
  assert.equal((native.match(/native_warning\("[a-z0-9_]+", error\)/g) || []).length, 17);
  assert.equal((surface.match(/crate::native_warning\("[a-z0-9_]+", error\)/g) || []).length, 2);
  for (const moduleSource of [native, surface]) {
    const emitted = emittedCalls(moduleSource);
    assert.ok(emitted.length > 0, "Expected at least one native warning to audit");
    for (const call of emitted) {
      const safePresenceOnly = call.replace(/\bsaved\.relay_url\.is_some\(\)/g, "");
      assert.doesNotMatch(safePresenceOnly, /\{error(?:[:}])|\berror\b|secret\.as_str|\brelay_url\b/i);
    }
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
  const emitted = emittedCalls(native);
  for (const call of emitted) {
    assert.doesNotMatch(call, /XDG_SESSION_TYPE|GDK_BACKEND/);
  }
});

test("log scanner respects nested calls and rejects unsafe later messages", () => {
  const example = [
    'eprintln!("safe bool {}", saved.relay_url.is_some());',
    'eprintln!("unsafe {error}");',
  ].join("\n");
  const calls = emittedCalls(example);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /saved\.relay_url\.is_some\(\)/);
  assert.match(calls[1], /\{error\}/);
});
