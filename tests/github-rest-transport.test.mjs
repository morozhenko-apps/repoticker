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

test("ETag caching is native, generation-scoped and never serves unvalidated 304", () => {
  const cache = readFileSync(new URL(
    "../apps/desktop/src-tauri/src/github_etag_cache.rs", import.meta.url), "utf8");
  const session = readFileSync(new URL(
    "../apps/desktop/src-tauri/src/github_session.rs", import.meta.url), "utf8");
  assert.match(main, /mod github_etag_cache;/);
  assert.match(main, /\.manage\(github_etag_cache::GitHubETagCache::default\(\)\)/);
  assert.match(native, /\.header\(header::IF_NONE_MATCH, etag\.as_str\(\)\)/);
  assert.match(native, /reqwest::StatusCode::NOT_MODIFIED/);
  assert.match(native, /cached\\s*\\.not_modified\\(&path, &lookup\\)/);
  assert.match(native, /cached\.unchanged\(lookup\.generation\)/);
  assert.match(native, /cached\.save\(&path, &lookup, etag\.as_deref\(\), &projected\)/);
  assert.match(cache, /const MAX_ENTRIES: usize = 64;/);
  assert.match(cache, /const MAX_ITEM_BYTES: usize = 64 \* 1024;/);
  assert.match(cache, /state\.generation = state\.generation\.wrapping_add\(1\)/);
  assert.match(cache, /entry\.path == path && entry\.etag == tag/);
  assert.match(cache, /!path\.contains\("\/settings\/billing\/"\)/);
  assert.match(session, /pub async fn github_disconnect[\s\S]*?GitHubETagCache>\(\)\.invalidate\(\)/);
  assert.match(session, /pub async fn github_begin[\s\S]*?GitHubETagCache>\(\)\.invalidate\(\)/);
  assert.match(session, /store_credential\(rotated\)[\s\S]*?GitHubETagCache>\(\)\.invalidate\(\)/);
  assert.match(main, /fn github_set_monitor_org[\s\S]*?GitHubETagCache>\(\)\.invalidate\(\)/);
  assert.doesNotMatch(cache, /access_token|refresh_token|bearer_auth|localStorage/);
});
