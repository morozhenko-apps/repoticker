import test from "node:test";
import assert from "node:assert/strict";
import {
  BODY_LIMIT, HISTORY_LIMIT, HISTORY_AGE_MS, SOCKET_LIMIT, allowedRepositories,
  canonicalRepository, validDeliveryId, parseCursor, cursorFromUrl,
  validatedWorkflowEvent, boundedRequestBody, validClientAuthorization
} from "../apps/relay-cloudflare/src/relay-protocol.mjs";

const allowlist = allowedRepositories("Team/Repo,owner/second");
const bytes = value => new TextEncoder().encode(value);
const signedEvent = (repository = "TEAM/Repo", action = "completed") =>
  bytes(JSON.stringify({ action, repository: { full_name: repository },
    workflow_run: { status: "completed" } }));

test("Given operator allowlist When validating names Then only exact unique owner/repos pass", () => {
  assert.deepEqual([...allowlist], ["team/repo", "owner/second"]);
  for (const input of ["team", "x/y/z", "team/../repo", "https://github.com/a/b",
    "a/", "/b", "a/?b", "a/b.git\n", ".git/..", "team/ repo"])
    assert.equal(canonicalRepository(input), null, input);
  assert.equal(canonicalRepository("OWNER/MyRepo.git"), "owner/myrepo.git");
  for (const input of ["", "a/b,A/B", "a/b,", "a/b,other/../repo", "a".repeat(202),
    Array.from({ length: 101 }, (_, i) => "team/r" + i).join(",")])
    assert.equal(allowedRepositories(input), null, input.slice(0, 25));
});

test("Given GitHub delivery identifier and cursor When parsing Then reject replays via strict formats", () => {
  assert.equal(validDeliveryId("F5B51D5E-B4D9-4ADD-B99C-10488691E24A"),
    "f5b51d5e-b4d9-4add-b99c-10488691e24a");
  for (const id of ["", null, "abc", "x".repeat(36), "f".repeat(36), "../foo"])
    assert.equal(validDeliveryId(id), null);
  for (const n of [null, "0", "1", "9007199254740991"])
    assert.ok(parseCursor(n) !== null, n);
  for (const n of ["", "-1", "01", "1e3", "9007199254740992", "1.5", "0x22", {}, "9".repeat(80)])
    assert.equal(parseCursor(n), null, String(n));
  for (const url of ["https://relay.test/v1/stream?after=1&after=2",
    "https://relay.test/v1/stream?token=a", "https://relay.test/v1/stream?after=-1"])
    assert.equal(cursorFromUrl(url), null, url);
});

test("Given signed workflow_run event When checking schema Then only completed allowlisted run hints pass", () => {
  assert.deepEqual(validatedWorkflowEvent(signedEvent(), "workflow_run", allowlist),
    { kind: "workflow_run.completed", repository: "team/repo" });
  assert.deepEqual(validatedWorkflowEvent(bytes("not json"), "ping", allowlist), { kind: "ping" });
  for (const [payload, event] of [
    [signedEvent("other/repo"), "workflow_run"],
    [signedEvent("team/repo", "requested"), "workflow_run"],
    [signedEvent(), "workflow_job"], [bytes("not json"), "workflow_run"],
    [bytes('{"action":"completed","repository":{"full_name":"team/repo"}}'), "workflow_run"],
    [bytes('{"action":"completed","workflow_run":{"status":"queued"},"repository":{"full_name":"team/repo"}}'), "workflow_run"],
    [new Uint8Array([0xff]), "workflow_run"]
  ]) assert.equal(validatedWorkflowEvent(payload, event, allowlist), null);
});

test("Given request body When reading Then cap bytes before accumulation and refuse mismatch", async () => {
  const good = new Request("https://test.invalid", { method: "POST", body: "abc",
    headers: { "Content-Length": "3" }, duplex: "half" });
  assert.deepEqual(boundedRequestBody ? Array.from(await boundedRequestBody(good)) : [], [97, 98, 99]);
  for (const [content, claimed] of [["abc", "2"], ["abc", "9999999"]]) {
    const request = new Request("https://test.invalid", { method: "POST",
      body: content, headers: { "Content-Length": claimed }, duplex: "half" });
    assert.equal(await boundedRequestBody(request), null);
  }
  const huge = new Request("https://test.invalid", { method: "POST",
    body: "X".repeat(BODY_LIMIT + 1), duplex: "half" });
  assert.equal(await boundedRequestBody(huge), null);
});

test("Given operator bearer secret When checking client Then no wrong token is authorized", async () => {
  const secret = "RelAySeCrEt01234567890123456789Ab";
  assert.equal(await validClientAuthorization("Bearer " + secret, secret), true);
  for (const token of ["", "x".repeat(64), secret.slice(0, -1) + "X",
    "Bearer " + secret, secret + ", " + secret])
    assert.equal(await validClientAuthorization("Bearer " + token, secret), false);
  for (const configuration of ["", "short", "x".repeat(300)])
    assert.equal(await validClientAuthorization("Bearer " + secret, configuration), false);
  assert.equal(await validClientAuthorization(null, secret), false);
  assert.equal(HISTORY_LIMIT, 128);
  assert.equal(HISTORY_AGE_MS, 86_400_000);
  assert.equal(SOCKET_LIMIT, 8);
});
