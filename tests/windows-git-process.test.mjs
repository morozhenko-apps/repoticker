import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8"
);
const production = source.slice(0, source.indexOf("#[cfg(all(test, windows))]"));

test("Windows GUI spawns Git and taskkill without allocating console windows", () => {
  assert.match(production, /fn configure_background_child\(command: &mut Command\)/);
  assert.match(production, /const CREATE_NO_WINDOW: u32 = 0x0800_0000/);
  assert.match(production, /command\.creation_flags\(CREATE_NO_WINDOW\)/);
  assert.match(production, /fn git_command\(repo: &Path, args: &\[&str\]\) -> Command/);
  assert.match(production, /configure_background_child\(&mut command\)/);
  assert.match(production, /configure_background_child\(&mut terminator\)/);
  assert.match(production, /let mut command = git_command\(repo, args\)/);
  assert.match(production, /let mut command = git_command\(repo, &args\)/);
  assert.equal((production.match(/Command::new\("git"\)/g) ?? []).length, 1);
});

test("Git loader failure retains 0xC0000142 and is not an absent repository", () => {
  assert.match(production, /output\.status\.code\(\) == Some\(0xC000_0142_u32 as i32\)/);
  assert.match(production, /check_git_process_startup\(&output\)/);
  assert.match(production, /Err\(error\) if is_git_process_startup_failure\(&error\) => return Err\(error\)/);
  assert.match(source, /fn loader_failure_reports_ntstatus_without_leaking_command_or_repo_path/);
  assert.match(source, /fn headless_git_command_executes_without_losing_output/);
});
