import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleRelayRequest } from "../apps/relay-cloudflare/src/worker.mjs";

const secret = "WebhookSecret012345678901234567890";
const client = "RelayClientSecret01234567890123456";
const delivery = "12345678-1234-4234-8234-123456789abc";
const payload = () => JSON.stringify({
  action: "completed", repository: { full_name: "Team/Repo" },
  workflow_run: { status: "completed", conclusion: "failure" }
});
const fixture = (status = 202, names = "team/repo") => {
  const calls = [];
  const env = {
    WEBHOOK_SECRET: secret, RELAY_CLIENT_SECRET: client, ALLOWED_REPOSITORIES: names,
    RELAY_HUB: {
      idFromName: name => name,
      get: id => {
        assert.equal(id, "personal-v1");
        return { fetch: async req => { calls.push(req); return new Response(null, { status }); } };
      }
    }
  };
  return { calls, env };
};
const request = (body, event = "workflow_run", sig = null, id = delivery) =>
  new Request("https://relay.example/v1/github", {
    method: "POST", body,
    headers: { "content-type": "application/json", "x-github-event": event,
      "x-github-delivery": id,
      "x-hub-signature-256": sig || "sha256=" +
        createHmac("sha256", secret).update(body).digest("hex") }
  });

test("Given a signed allowed completion When accepted Then enqueue only minimal durable hint", async () => {
  const { env, calls } = fixture();
  assert.equal((await handleRelayRequest(request(payload()), env)).status, 202);
  assert.equal(calls.length, 1);
  assert.deepEqual(await calls[0].json(), { v: 1, delivery, repository: "team/repo" });
});
test("Given signed requested/in_progress/completed When accepted Then relay only repo hints", async () => {
  for (const [action, status] of [
    ["requested", "queued"], ["in_progress", "in_progress"],
    ["completed", "completed"]
  ]) {
    const body = JSON.stringify({
      action, repository: { full_name: "Team/Repo" },
      workflow_run: { status, conclusion: "success", name: "secret-workflow" }
    });
    const { env, calls } = fixture();
    assert.equal((await handleRelayRequest(request(body), env)).status, 202);
    assert.equal(calls.length, 1);
    const hint = await calls[0].json();
    assert.deepEqual(hint, { v: 1, delivery, repository: "team/repo" });
    assert.ok(!Object.hasOwn(hint, "action"));
    assert.ok(!Object.hasOwn(hint, "status"));
    assert.ok(!Object.hasOwn(hint, "conclusion"));
  }
});

test("Given invalid signature, schema, ID or owner When received Then reject before persistence", async () => {
  for (const [body, event, signature, id, allowed, code] of [
    [payload(), "workflow_run", "sha256=" + "0".repeat(64), delivery, "team/repo", 401],
    [payload(), "workflow_run", null, delivery, "other/repo", 422],
    [JSON.stringify({ action: "queued" }), "workflow_run", null, delivery, "team/repo", 422],
    [payload(), "workflow_run", null, "unsafe", "team/repo", 422],
    ["x".repeat(65_537), "workflow_run", null, delivery, "team/repo", 413]
  ]) {
    const { env, calls } = fixture(202, allowed);
    assert.equal((await handleRelayRequest(request(body, event, signature, id), env)).status, code);
    assert.equal(calls.length, 0);
  }
});
test("Given signed ping When GitHub initializes hook Then acknowledge without a hint", async () => {
  const { env, calls } = fixture();
  assert.equal((await handleRelayRequest(request("{}", "ping"), env)).status, 204);
  assert.equal(calls.length, 0);
});
test("Given durable failure When ingesting Then return retryable 503", async () => {
  const { env } = fixture(500);
  assert.equal((await handleRelayRequest(request(payload()), env)).status, 503);
});
test("Given client subscription When not authenticated Then do not read private journal", async () => {
  const { env, calls } = fixture(200);
  const path = "https://relay.example/v1/changes?after=11";
  for (const headers of [{}, { authorization: "Bearer invalid" },
    { authorization: "Bearer " + client, origin: "https://evil.invalid" }]) {
    const response = await handleRelayRequest(new Request(path, { headers }), env);
    assert.ok(response.status === 401 || response.status === 403);
  }
  assert.equal(calls.length, 0);
  assert.equal((await handleRelayRequest(new Request(path,
    { headers: { authorization: "Bearer " + client } }), env)).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).searchParams.get("after"), "11");
});
test("Given unsafe method or query When checking ingress Then reject without calling durable object", async () => {
  const { env, calls } = fixture();
  for (const input of [
    new Request("https://relay.example/v1/changes?after=1&after=2",
      { headers: { authorization: "Bearer " + client } }),
    new Request("https://relay.example/v1/stream",
      { headers: { authorization: "Bearer " + client } }),
    new Request("https://relay.example/v1/changes", { method: "POST" }),
    new Request("https://relay.example/status")
  ]) {
    assert.ok([400, 404, 405, 426].includes(
      (await handleRelayRequest(input, env)).status));
  }
  assert.equal(calls.length, 0);
});
