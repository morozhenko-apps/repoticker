import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const git = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");
const tests = readFileSync(new URL("../crates/repoticker-core/tests/git_integration.rs", import.meta.url), "utf8");

test("all Safe sync eligibility checks explicitly include tracked submodules", () => {
  const region = git.match(/pub fn inspect\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(region, /"status"/);
  assert.match(region, /"--porcelain=v1"/);
  assert.match(region, /"--untracked-files=normal"/);
  assert.match(region, /"--ignore-submodules=none"/);
  assert.match(git, /pub fn safe_sync\(/);
  assert.match(git, /fn safe_push_source_unchanged\(/);
  assert.match(git, /fn safe_pull_with_checkpoints\(/);
});

test("nested dirtiness, second remote and alternate hooks have real Git regressions", () => {
  for (const regression of [
    "configured_ignore_all_cannot_hide_dirty_submodule_from_safe_push",
    "configured_ignore_all_cannot_hide_dirty_submodule_from_safe_pull",
    "safe_sync_uses_configured_origin_when_second_remote_is_present",
    "custom_hookspath_pre_push_failure_blocks_safe_sync_without_mutation",
  ]) assert.ok(tests.includes("fn " + regression + "()"), regression);
  assert.match(tests, /"diff.ignoreSubmodules", "all"/);
  assert.match(tests, /"protocol.file.allow=always"/);
  assert.match(tests, /"core.hooksPath"/);
});
