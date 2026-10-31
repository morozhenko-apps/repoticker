import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const main = read("../apps/desktop/src-tauri/src/main.rs");
const linux = read("../apps/desktop/src-tauri/src/linux_tray.rs");
const state = read("../crates/repoticker-core/src/shutdown.rs");

test("KDE and Windows Quit both enter one native graceful shutdown path", () => {
  assert.match(linux, /"quit" => request_quit\(&app\)/);
  assert.match(main, /"quit" => request_quit\(app\)/);
  assert.doesNotMatch(linux, /"quit" => app\.exit/);
  assert.doesNotMatch(main, /"quit" => app\.exit/);
  assert.match(main, /\.manage\(ShutdownSignal::default\(\)\)/);
  assert.match(state, /!self\.0\.swap\(true, Ordering::AcqRel\)/);
  assert.match(state, /fn queued_operation_cannot_start_after_quit_is_requested/);
});

test("graceful Quit cancels Fetch before waiting for existing operation lock", () => {
  const quit = main.match(/fn request_quit\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.ok(quit);
  const begin = quit.indexOf("ShutdownSignal>().begin()");
  const cancel = quit.indexOf("token.cancel()");
  const lock = quit.indexOf("OperationLock>()");
  const exit = quit.indexOf("app.exit(0)");
  assert.ok(begin >= 0 && cancel > begin && lock > cancel && exit > lock);
  assert.match(quit, /spawn_blocking\(move \|\|/);
  assert.match(quit, /let operation_guard = operation\.0\.lock\(\);\s*match operation_guard \{/,
    "Keep OperationLock state binding alive until after its guard is consumed");
  assert.doesNotMatch(quit, /match operation\.0\.lock\(\)/,
    "Do not reintroduce the E0597 temporary-lifetime pattern");
  assert.match(quit, /Err\(_\) => \{\s*eprintln!\("RepoTicker quit refused: Git operation lock poisoned"/);
  assert.doesNotMatch(quit, /sleep|poll\(/);
});

test("Git action admission and Fetch publication both check shutdown state", () => {
  const exec = main.match(/fn execute\([\s\S]*?\n\}\n\n#\[tauri::command\]/)?.[0] ?? "";
  assert.ok(exec);
  const first = exec.indexOf("ShutdownSignal>().is_requested()");
  const published = exec.indexOf("ActiveFetchLease(&active_fetch)");
  const second = exec.lastIndexOf("ShutdownSignal>().is_requested()");
  assert.ok(first > exec.indexOf("state.0.lock()"));
  assert.ok(published > first);
  assert.ok(second > published);
  assert.match(exec.slice(second), /token\.cancel\(\)/);
  assert.match(exec, /return Err\("RepoTicker is shutting down"\.into\(\)\)/);
  assert.match(main, /impl Drop for ActiveFetchLease/);
});

test("window close still hides, Safe sync is not killed, and events remain untouched", () => {
  assert.match(main, /WindowEvent::CloseRequested \{ api, \.\. \} = event/);
  assert.match(main, /api\.prevent_close\(\)/);
  assert.match(main, /"sync" => dispatch_menu_action\(app, "safe_sync"\)/);
  assert.match(main, /fn cancel_git_fetch\([\s\S]*?token\.cancel\(\)/);
  assert.match(main, /repoticker-git-action-finished/);
  const quit = main.match(/fn request_quit\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(quit, /safe_sync|kill\(|terminate_fetch_group|SIGKILL/);
});
