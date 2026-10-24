import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const core = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");
const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const ui = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
const html = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");

test("Fetch cancellation belongs to registered child groups, not all Git processes", () => {
  assert.match(core, /pub struct FetchCancellation/);
  assert.match(core, /fn register\(&self, pid: u32\)/);
  assert.match(core, /fn unregister\(&self, pid: u32\)/);
  assert.match(core, /pub fn cancel\(&self\)/);
  assert.match(core, /command\.process_group\(0\)/);
  assert.match(core, /kill\(-group, SIGKILL\)/);
  assert.match(core, /taskkill\.exe/);
  assert.match(core, /match cancel\.register\(pid\) \{/);
  assert.match(core, /Ok\(false\) => \{/);
  assert.match(core, /pub fn fetch_with_cancel\(/);
  assert.doesNotMatch(core.match(/pub fn safe_pull\([\s\S]*?\n\}/)?.[0] ?? "", /cancel|SIGKILL|taskkill/);
});

test("desktop cancellation IPC stays independent of the blocking Git operation lock", () => {
  const handler = native.match(/fn cancel_git_fetch\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(handler, /state::<ActiveFetch>\(\)/);
  assert.match(handler, /token\.cancel\(\)/);
  assert.doesNotMatch(handler, /OperationLock|spawn_blocking|execute\(/);
  assert.match(native, /\.manage\(ActiveFetch::default\(\)\)/);
  assert.match(native, /generate_handler!\[[\s\S]*?cancel_git_fetch,/);
  assert.match(native, /git::fetch_with_cancel\(/);
  assert.match(native, /status: "cancelled"/);
});

test("existing four-button card reuses Fetch as Cancel without interrupting Safe pull", () => {
  const actions = html.match(/<nav class="actions"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.equal([...actions.matchAll(/<button /g)].length, 4);
  assert.match(ui, /invoke\("cancel_git_fetch"\)/);
  assert.match(ui, /fetchCancelling \? "stopping" : "cancel"/);
  assert.match(ui, /cardText\(cardLanguage, fetchCancelling/);
  assert.match(ui, /progress\?\.operation === "fetch"/);
  assert.match(ui, /if \(errors\.length\)/);
  assert.match(ui, /item\.status === "error"/);
});
