import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const native = readFileSync(new URL(
  "../apps/desktop/src-tauri/src/github_api.rs", import.meta.url), "utf8");
const main = readFileSync(new URL(
  "../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");

test("native GitHub REST reuses a process-local client without caching response data", () => {
  const transport = native.match(
    /pub struct GitHubRestClient[\s\S]*?\n\}\n\nimpl GitHubRestClient \{[\s\S]*?\n\}/
  )?.[0];
  assert.ok(transport, "missing process-local native client");
  assert.match(transport, /OnceLock<Result<Client, &'static str>>/);
  assert.match(transport, /\.get_or_init\(/);
  assert.match(transport, /\.redirect\(Policy::none\(\)\)/);
  assert.match(transport, /\.timeout\(Duration::from_secs\(15\)\)/);
  assert.equal((native.match(/Client::builder\(\)/g) || []).length, 1);
  assert.match(main, /\.manage\(github_api::GitHubRestClient::default\(\)\)/);
  assert.doesNotMatch(transport, /bearer_auth|access_token|Authorization|response_cache|\.json\(/);
});

test("each read still applies native token, validates route, enforces rate gate and response projection", () => {
  const handler = native.match(
    /pub async fn github_api_get\([\s\S]*?\n\}\n\n#\[cfg\(test\)\]/
  )?.[0];
  assert.ok(handler, "missing authorized native REST handler");
  assert.match(handler, /if !valid_path\(&path\)/);
  assert.match(handler, /gate\.remaining_seconds\(\) > 0/);
  assert.match(handler, /github_session::github_access_token\(&app\)\.await/);
  assert.match(handler, /let client = transport\.client\(\)\?/);
  assert.match(handler, /\.bearer_auth\(&token\)/);
  assert.match(handler, /\.redirect\(Policy::none\(\)\)|let client = transport\.client\(\)\?/);
  assert.match(handler, /project\(&path, value\)/);
  assert.match(handler, /if bytes\.len\(\)\.saturating_add\(chunk\.len\(\)\) > MAX_BODY/);
  assert.doesNotMatch(handler, /cache\.insert|localStorage|sessionStorage/);
});
