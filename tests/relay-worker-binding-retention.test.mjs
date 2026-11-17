import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8");
const config = read("../apps/relay-cloudflare/wrangler.toml");
const guide = read("../apps/relay-cloudflare/README.md");
const pipeline = read("../.github/workflows/relay-worker-dry-run.yml");

test("Git-linked Wrangler deployments retain dashboard-managed runtime variables", () => {
  const entries = [...config.matchAll(/^\s*keep_vars\s*=\s*(.*?)\s*$/gm)];
  assert.equal(entries.length, 1, "keep_vars must be explicitly declared once");
  assert.equal(entries[0][1], "true", "dashboard variables must be preserved");
  const firstTable = config.search(/^\s*\[/m);
  assert.ok(firstTable >= 0, "Durable Object binding table must exist");
  assert.ok(entries[0].index < firstTable,
    "keep_vars must be top-level, never inside a TOML binding table");
});

test("Worker source does not embed operator secrets or private allowlist values", () => {
  assert.doesNotMatch(config, /^\s*\[(?:vars|env\.[^\]]+\.vars)\]\s*$/m);
  assert.doesNotMatch(config,
    /^\s*(?:ALLOWED_REPOSITORIES|RELAY_CLIENT_SECRET|WEBHOOK_SECRET)\s*=/m);
  assert.match(config, /^\s*name\s*=\s*"RELAY_HUB"\s*$/m);
  assert.match(config, /^\s*new_sqlite_classes\s*=\s*\["RelayHub"\]\s*$/m);
});

test("Deployment guide separates runtime bindings from build variables", () => {
  assert.match(guide, /keep_vars = true/);
  assert.match(guide, /ALLOWED_REPOSITORIES/);
  assert.match(guide, /runtime Secret bindings/);
  assert.match(guide, /not build\s+environment variables/);
});

test("GitHub relay CI compiles the Worker without publishing or uploading secrets", () => {
  assert.match(pipeline, /wrangler@4\.158\.0 deploy --dry-run/);
  assert.match(pipeline, /persist-credentials: false/);
  assert.doesNotMatch(pipeline, /CLOUDFLARE_API_TOKEN|wrangler secret put/);
});
