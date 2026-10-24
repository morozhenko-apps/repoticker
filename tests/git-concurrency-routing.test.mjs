import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const git = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");
const real = readFileSync(new URL("../crates/repoticker-core/tests/git_integration.rs", import.meta.url), "utf8");

test("Safe pull checks pinned refs again after the last external-client checkpoint", () => {
  const start = git.indexOf("fn safe_pull_with_checkpoints(");
  const end = git.indexOf("struct SafePushPin", start);
  const section = git.slice(start, end);
  const parts = section.split("pull_source_unchanged(repo, &state, &expected_head, &expected_upstream_tip)");
  assert.equal(parts.length, 3);
  assert.ok(section.indexOf("before_merge();") < section.lastIndexOf("pull_source_unchanged("));
  assert.ok(section.lastIndexOf("pull_source_unchanged(") < section.indexOf('"merge", "--ff-only"'));
  assert.match(git, /current\.branch == original\.branch/);
  assert.match(git, /current\.upstream == original\.upstream/);
});

test("Safe push checks route again after the live remote probe", () => {
  const start = git.indexOf("fn safe_push_with_checkpoint(");
  const end = git.indexOf("/// One user action chooses", start);
  const section = git.slice(start, end);
  assert.equal(section.split("safe_push_source_unchanged(repo, &first, &pin)").length, 3);
  assert.ok(section.indexOf("after_remote_probe();") < section.lastIndexOf("safe_push_source_unchanged("));
  assert.match(section, /"--no-follow-tags"/);
});

test("Git fixtures cover external branch changes and nonstandard push defaults", () => {
  for (const name of ["remote.pushDefault", "branch.dev.pushRemote", "push.default", "push.followTags",
    "remote.origin.push", "remote.origin.mirror"]) {
    assert.ok(real.includes('"' + name + '"'), name);
  }
  assert.ok(git.includes("fn switching_active_branch_after_second_check_cannot_advance_wrong_branch"));
  assert.ok(git.includes("fn changing_push_remote_during_remote_probe_blocks_safe_push"));
});
