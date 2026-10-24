import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const git = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");
const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");

test("read-only and remote Git commands have bounded owned execution", () => {
  assert.match(git, /const LOCAL_GIT_TIMEOUT: Duration = Duration::from_secs\(20\)/);
  assert.match(git, /const REMOTE_PROBE_TIMEOUT: Duration = Duration::from_secs\(45\)/);
  assert.match(git, /const FETCH_GIT_TIMEOUT: Duration = Duration::from_secs\(120\)/);
  assert.match(git, /const PUSH_GIT_TIMEOUT: Duration = Duration::from_secs\(120\)/);
  assert.match(git, /fn wait_owned_child\(/);
  assert.match(git, /child\.try_wait\(\)/);
  assert.match(git, /terminate_fetch_group\(pid\)/);
  assert.match(git, /fn drain_git_pipe</);
  assert.match(git, /read_to_end\(&mut bytes\)/);
  assert.match(git, /command\.process_group\(0\)/);
  assert.match(git, /command\.stdin\(Stdio::null\(\)\)/);
  const invoke = git.match(/fn invoke\([\s\S]*?\n\}/)?.[0] ?? "";
  for (const op of ["push", "ls-remote", "fetch"]) {
    assert.ok(invoke.includes('Some("' + op + '")'), op + " must have a deadline");
  }
  assert.match(invoke, /_ => run_bounded_command\(/);
  assert.match(invoke, /Some\("merge"\) => command\.stdin\(Stdio::null\(\)\)\.output\(\)/);
  assert.doesNotMatch(invoke, /["'](?:sh|bash|cmd\.exe)["']/);
});

test("push timeout errors cannot be reported as success or Fetch cancellation", () => {
  assert.match(git, /pub const PUSH_OUTCOME_UNKNOWN:/);
  assert.match(git, /remote outcome unknown; inspect the remote before retrying/);
  const invoke = git.match(/fn invoke\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(invoke, /Some\("push"\) => run_bounded_command\([\s\S]*?PUSH_OUTCOME_UNKNOWN\)/);
  const result = native.match(/fn git_action_result\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(result, /Err\(GitError\(error\)\) if error == git::FETCH_CANCELLED/);
  assert.match(result, /Err\(GitError\(error\)\) => ActionResult/);
  assert.match(result, /status: "error"\.into\(\)/);
});

test("Fetch retains independent cancellation with finite child cleanup", () => {
  assert.match(git, /fn run_cancellable_command_with_timeout\(/);
  assert.match(git, /match cancel\.register\(pid\) \{/);
  assert.match(git, /wait_owned_child\(child, timeout,/);
  assert.match(git, /wait_owned_child\(child, PROCESS_REAP_GRACE,/);
  assert.match(git, /cancel\.unregister\(pid\)/);
  assert.match(git, /pub fn fetch_with_cancel\(/);
});
