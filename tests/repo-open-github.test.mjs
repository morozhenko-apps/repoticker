import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const git = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");

test("native opener resolves only enrolled GitHub origins rather than WebView-supplied URLs", () => {
  const handler = native.match(/async fn open_repository_on_github\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(handler, /git::discover_all\(&roots_as_paths\(&config\)\)/);
  assert.match(handler, /repositories\.contains\(&selected\)/);
  assert.match(handler, /git::github_origin_url\(&selected\)/);
  assert.match(handler, /launch_browser\(&url\)/);
  assert.doesNotMatch(handler, /git::fetch|git::safe_pull|remote.*fetch/);
  assert.match(native, /generate_handler!\[[\s\S]*?open_repository_on_github,/);
});

test("git origin browser URL accepts only validated github.com repo names", () => {
  assert.match(git, /pub fn github_remote_to_browser_url\(/);
  assert.match(git, /strip_prefix\("https:\/\/github\.com\/"\)/);
  assert.match(git, /strip_prefix\("git@github\.com:"\)/);
  assert.match(git, /strip_prefix\("ssh:\/\/git@github\.com\/"\)/);
  assert.match(git, /part != "\.\."/);
  assert.match(git, /required\(repo, &\["remote", "get-url", "origin"\]\)/);
});
