import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleRelayRequest } from "../apps/relay-cloudflare/src/worker.mjs";

const CLIENT = "RelayClientSecret01234567890123456";
const WEBHOOK = "WebhookSecret012345678901234567890";
const DELIVERY = "12345678-1234-4234-8234-123456789abc";
const body = () => JSON.stringify({
  action: "completed", workflow_run: {
    status: "completed", conclusion: "failure", name: "PRIVATE_WORKFLOW"
  }, repository: { full_name: "Team/Repo" }, token: "PRIVATE_TOKEN"
});
const fixture = (state = {}) => {
  const calls = [];
  const env = {
    RELAY_CLIENT_SECRET: CLIENT, WEBHOOK_SECRET: WEBHOOK,
    ALLOWED_REPOSITORIES: "team/repo",
    RELAY_HUB: {
      idFromName(name) {
        assert.equal(name, "personal-v1");
        return name;
      },
      get(name) {
        assert.equal(name, "personal-v1");
        return { async fetch(request) {
          calls.push(request);
          if (state.throwHub) throw Error("PRIVATE_HUB_FAILURE");
          return new Response(state.hubBody ?? null, {
            status: state.hubStatus ?? 202
          });
        } };
      }
    }
  };
  return { calls, env };
};
const access = (path = "/v1/changes", options = {}) =>
  new Request("https://relay.example" + path, {
    headers: { authorization: "Bearer " + CLIENT, ...options.headers },
    ...(options.method ? { method: options.method } : {})
  });
const hook = (payload = body(), options = {}) => {
  const signature = "sha256=" + createHmac("sha256", WEBHOOK).update(payload).digest("hex");
  return new Request("https://relay.example/v1/github" + (options.query ?? ""), {
    method: "POST",
    headers: {
      "content-type": options.contentType ?? "application/json",
      "x-github-event": options.event ?? "workflow_run",
      "x-github-delivery": options.delivery ?? DELIVERY,
      "x-hub-signature-256": options.signature ?? signature,
      ...options.headers
    },
    body: payload
  });
};
const reject = async (request, env, code) => {
  const response = await handleRelayRequest(request, env);
  assert.equal(response.status, code);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "");
};

test("Given missing runtime bindings When any route is accessed Then return 503 without durable access", async () => {
  for (const mutate of [
    env => { delete env.RELAY_HUB; },
    env => { env.RELAY_HUB = null; },
    env => { delete env.RELAY_CLIENT_SECRET; },
    env => { env.RELAY_CLIENT_SECRET = "short"; },
    env => { env.RELAY_CLIENT_SECRET = "A".repeat(257); },
    env => { delete env.ALLOWED_REPOSITORIES; },
    env => { env.ALLOWED_REPOSITORIES = ""; },
    env => { env.ALLOWED_REPOSITORIES = "*/*"; },
    env => { env.ALLOWED_REPOSITORIES = "team/repo,TEAM/REPO"; }
  ]) {
    const { calls, env } = fixture();
    mutate(env);
    await reject(access("/"), env, 503);
    await reject(access("/v1/changes"), env, 503);
    assert.equal(calls.length, 0);
  }
  await reject(access("/"), null, 503);
});

test("Given complete runtime bindings When checking an unknown path Then return 404, not 503", async () => {
  const { calls, env } = fixture();
  await reject(access("/"), env, 404);
  await reject(access("/health"), env, 404);
  assert.equal(calls.length, 0);
});

test("Given wrong HTTP methods When routing Then return 405 before durable access", async () => {
  const { calls, env } = fixture();
  for (const req of [
    access("/v1/changes", { method: "POST" }),
    access("/v1/changes", { method: "PUT" }),
    access("/v1/stream", { method: "POST" }),
    access("/v1/github", { method: "GET" }),
    access("/v1/github", { method: "HEAD" })
  ]) await reject(req, env, 405);
  assert.equal(calls.length, 0);
});

test("Given unauthorized private subscription When requesting changes Then return 401 without durable reads", async () => {
  const { calls, env } = fixture();
  for (const headers of [
    {}, { authorization: "Bearer wrong" },
    { authorization: "bearer " + CLIENT },
    { authorization: "Bearer " + "x".repeat(32) },
    { authorization: "Bearer " + CLIENT + "=" }
  ]) {
    const req = new Request("https://relay.example/v1/changes?after=0", { headers });
    await reject(req, env, 401);
  }
  assert.equal(calls.length, 0);
});

test("Given native authorization with browser Origin or Cookie When subscribing Then deny 403", async () => {
  const { calls, env } = fixture();
  for (const headers of [
    { origin: "https://evil.example" },
    { cookie: "session=forged" },
    { origin: "null", cookie: "x=y" }
  ]) await reject(access("/v1/changes", { headers }), env, 403);
  assert.equal(calls.length, 0);
});

test("Given invalid change cursors When requesting Then reject before a durable read", async () => {
  const { calls, env } = fixture();
  for (const suffix of [
    "?after=", "?after=-1", "?after=01", "?after=1&after=2",
    "?after=1&token=x", "?token=x",
    "?after=9007199254740992", "?after=" + "9".repeat(50)
  ]) await reject(access("/v1/changes" + suffix), env, 400);
  assert.equal(calls.length, 0);
});

test("Given authenticated changes When forwarding Then bound cursor and bearer never enter a public URL", async () => {
  for (const [external, after] of [
    ["/v1/changes", "0"], ["/v1/changes?after=11", "11"],
    ["/v1/changes?after=9007199254740991", "9007199254740991"]
  ]) {
    const { calls, env } = fixture({ hubStatus: 200, hubBody: "{}" });
    const response = await handleRelayRequest(access(external), env);
    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0].url).pathname, "/changes");
    assert.equal(new URL(calls[0].url).searchParams.get("after"), after);
    assert.equal(calls[0].headers.get("authorization"), "Bearer " + CLIENT);
    assert.doesNotMatch(calls[0].url, /Bearer|Secret|token/);
  }
});

test("Given WebSocket upgrade requests When forwarding Then enforce upgrade and native bearer", async () => {
  const { calls, env } = fixture({ hubStatus: 200, hubBody: "{}" });
  await reject(access("/v1/stream"), env, 426);
  await reject(access("/v1/stream", { headers: { upgrade: "h2c" } }), env, 426);
  assert.equal(calls.length, 0);
  const response = await handleRelayRequest(access("/v1/stream?after=5", {
    headers: { upgrade: "websocket" }
  }), env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0].url).pathname, "/stream");
  assert.equal(new URL(calls[0].url).searchParams.get("after"), "5");
  assert.equal(calls[0].headers.get("upgrade"), "websocket");
  assert.equal(calls[0].headers.get("authorization"), "Bearer " + CLIENT);
});

test("Given webhook misconfiguration When ingesting Then fail 503 before verification or storage", async () => {
  for (const replacement of [undefined, null, "", "short"]) {
    const { calls, env } = fixture();
    env.WEBHOOK_SECRET = replacement;
    await reject(hook(), env, 503);
    assert.equal(calls.length, 0);
  }
});

test("Given unauthorized or malformed webhook metadata When ingesting Then reject before durable storage", async () => {
  const { calls, env } = fixture();
  for (const [req, status] of [
    [hook(body(), { query: "?debug=1" }), 400],
    [hook(body(), { contentType: "text/plain" }), 415],
    [hook(body(), { contentType: "application/json; charset=iso-8859-1" }), 415],
    [hook(body(), { signature: "sha256=" + "0".repeat(64) }), 401],
    [hook(body(), { signature: "SHA1=invalid" }), 401],
    [hook(body(), { event: "issues" }), 422],
    [hook(body(), { delivery: "invalid" }), 422],
    [hook(body(), { delivery: "" , headers: { "x-github-delivery": "" } }), 422]
  ]) await reject(req, env, status);
  assert.equal(calls.length, 0);
});

test("Given a payload one byte over the webhook cap When receiving Then reject 413 before HMAC or DO", async () => {
  const { calls, env } = fixture();
  await reject(hook("x".repeat(65_537)), env, 413);
  assert.equal(calls.length, 0);
});

test("Given a correctly signed ping When accepting Then return 204 without DO writes", async () => {
  const { calls, env } = fixture();
  await reject(hook("{}", { event: "ping" }), env, 204);
  assert.equal(calls.length, 0);
});

test("Given verified workflow completion When forwarding to DO Then persist only the minimal hint", async () => {
  const { calls, env } = fixture();
  const response = await handleRelayRequest(hook(), env);
  assert.equal(response.status, 202);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
  assert.equal(new URL(calls[0].url).pathname, "/ingest");
  assert.equal(calls[0].headers.get("authorization"), "Bearer " + CLIENT);
  assert.deepEqual(await calls[0].json(), {
    v: 1, delivery: DELIVERY, repository: "team/repo"
  });
});

test("Given DO errors and unexpected outcomes When ingesting Then return retryable redacted 503", async () => {
  for (const state of [{ hubStatus: 500 }, { hubStatus: 429 }, { hubStatus: 401 }, { throwHub: true }]) {
    const { calls, env } = fixture(state);
    await reject(hook(), env, 503);
    assert.equal(calls.length, 1);
  }
});

test("Given Durable Object exceptions When reading private changes Then emit only redacted no-store 503", async () => {
  const { calls, env } = fixture({ throwHub: true });
  await reject(access("/v1/changes"), env, 503);
  assert.equal(calls.length, 1);
});
