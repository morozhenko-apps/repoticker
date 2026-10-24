import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const git = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");
const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const settings = readFileSync(new URL("../apps/desktop/ui/settings.mjs", import.meta.url), "utf8");
const html = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");

test("config defaults to legacy discovery and never drops existing settings", () => {
  assert.match(native, /#\[serde\(default\)\]\s*ignored_child_names: Vec<String>/);
  assert.match(native, /ignored_child_names: Vec::new\(\)/);
  assert.match(native, /ignored_child_names: config\.ignored_child_names/);
  assert.match(native, /ignored_child_names: Option<Vec<String>>/);
  assert.match(native, /config\.ignored_child_names = ignored/);
});

test("snapshot actions and navigation all share the same ignore boundary", () => {
  assert.match(native, /git::discover_all_with_ignored\(&roots_as_paths\(&config\), &config\.ignored_child_names\)/);
  assert.match(native, /let \(repositories, failures\) = git::discover_all_with_ignored\(/);
  assert.match(native, /git::resolve_enrolled_checkout_with_ignored\(/);
  assert.match(native, /&config\.ignored_child_names/);
  assert.match(git, /pub fn discover_with_ignored\(/);
  assert.match(git, /pub fn discover_all_with_ignored\(/);
  assert.match(git, /pub fn validate_ignored_child_names\(/);
  assert.match(git, /pub fn resolve_enrolled_checkout_with_ignored\(/);
  assert.match(git, /ignored_child_names\.iter\(\)\.any/);
});

test("ignore Settings edits are draft-only and saved on the existing OK contract", () => {
  for (const id of ["ignore-child-form", "ignored-child-name", "ignored-child-list"]) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.match(settings, /draft\.ignoredChildNames/);
  assert.match(settings, /original\.ignoredChildNames/);
  assert.match(settings, /ignoredChildNames: \[\.\.\.draft\.ignoredChildNames\]/);
  assert.match(settings, /ignored_child_names/);
  assert.match(settings, /function renderIgnoredChildren\(/);
  assert.match(settings, /byId\("ignore-child-form"\)\.addEventListener\("submit"/);
});
