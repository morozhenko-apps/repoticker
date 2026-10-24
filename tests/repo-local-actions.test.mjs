import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const core = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");
const ui = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
const html = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");

test("all navigation and clipboard commands share the canonical enrollment verifier", () => {
  assert.match(core, /pub fn resolve_enrolled_checkout\(/);
  assert.match(core, /let selected = normalize_root\(requested\)\?/);
  assert.match(core, /discover_all_with_ignored\(roots, ignored_child_names\)/);
  assert.match(core, /repositories\.binary_search\(&selected\)\.is_ok\(\)/);
  const resolver = native.match(/fn enrolled_repository\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(resolver, /git::resolve_enrolled_checkout_with_ignored\(/);
  assert.match(resolver, /&config\.ignored_child_names/);
  for (const name of ["open_repository_on_github", "open_repository_folder", "copy_repository_path"]) {
    const begin = native.indexOf("fn " + name + "(");
    assert.ok(begin >= 0, name);
    const handler = native.slice(begin, native.indexOf("\n}", begin) + 2);
    assert.match(handler, /enrolled_repository\(&[a-z]+, &repo_path\)/, name);
    assert.ok(native.includes("            " + name + ","), name + " registered");
  }
});

test("folder uses argv-only OS file manager and clipboard writes only canonical path", () => {
  const folder = native.match(/fn launch_file_manager\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(folder, /Command::new\("xdg-open"\)/);
  assert.match(folder, /Command::new\("open"\)/);
  assert.match(folder, /Command::new\("explorer\.exe"\)/);
  assert.match(folder, /\.arg\(path\)/);
  assert.doesNotMatch(folder, /Command::new\("sh"\)|Command::new\("bash"\)/);
  const clip = native.match(/async fn copy_repository_path\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(clip, /selected\s*\.to_str\(\)/);
  assert.match(clip, /\.clipboard\(\)\s*\.write_text\(text\)/);
  assert.doesNotMatch(clip, /read_text|access_token|credentials/);
});

test("five popup options leave the four compact buttons unchanged", () => {
  assert.match(ui, /open_folder: "open_repository_folder"/);
  assert.match(ui, /copy_path: "copy_repository_path"/);
  const start = ui.indexOf("for (const [label, operation] of [");
  const end = ui.indexOf("]) {", start);
  assert.ok(start >= 0 && end > start);
  const items = ui.slice(start, end);
  assert.equal([...items.matchAll(/\["[^"]+", "[^"]+"\]/g)].length, 5);
  const actions = html.match(/<nav class="actions"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.equal([...actions.matchAll(/<button /g)].length, 4);
});
