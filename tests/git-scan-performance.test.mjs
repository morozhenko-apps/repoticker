import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const git = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");
test("local snapshot uses bounded independent inspection", () => {
  const scan = native.match(/fn scan\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(scan, /git::inspect_all\(repositories\)/);
  assert.doesNotMatch(scan, /for path in repositories/);
  assert.match(git, /pub fn inspect_all\(/);
  assert.match(git, /crate::bounded::bounded_map\(/);
  assert.match(git, /tasks,\s*4,/);
  assert.match(git, /inspected\.sort_by_key/);
  assert.match(scan, /summaries\.sort_by/);
});
test("operation markers are checked with one per-worktree Git admin directory", () => {
  const region = git.match(/fn git_operation_in_progress\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(region, /rev-parse", "--absolute-git-dir"/);
  assert.doesNotMatch(region, /"--git-path"/);
  for (const marker of ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply", "sequencer"]) {
    assert.ok(region.includes('"' + marker + '"'), marker);
  }
  assert.match(region, /git_dir\.join\(marker\)\.exists\(\)/);
});
