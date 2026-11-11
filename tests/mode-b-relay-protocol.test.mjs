import test from "node:test";
import assert from "node:assert/strict";
import {
  BODY_LIMIT, allowedRepositories, canonicalRepository, isAllowedRepository,
  validDeliveryId, parseCursor, cursorFromUrl, validatedWorkflowEvent,
  boundedRequestBody, validClientAuthorization
} from "../apps/relay-cloudflare/src/relay-protocol.mjs";

const bytes = text => new TextEncoder().encode(text);
const workflow = (action, status, repository = "Acme/Repo") =>
  bytes(JSON.stringify({ action, workflow_run: {
    status, conclusion: "success", name: "PRIVATE_WORKFLOW"
  }, repository: { full_name: repository }, token: "PRIVATE_TOKEN" }));
const allowed = allowedRepositories("acme/repo");

test("Given repository components at 100/101 characters When canonicalizing Then the exact bound is enforced", () => {
  const max = "A".repeat(100) + "/" + "B".repeat(100);
  assert.equal(canonicalRepository(max), "a".repeat(100) + "/" + "b".repeat(100));
  for (const input of [
    "A".repeat(101) + "/b", "a/" + "B".repeat(101),
    "a" + "b".repeat(201), "a//b", "a/b/c",
    "./b", "../b", "a/.", "a/..", "a/*", "a/b?c",
    "a/b\n", "a/b ", "a/🐈"
  ]) assert.equal(canonicalRepository(input), null, String(input).slice(0, 28));
  assert.equal(canonicalRepository("A/b"), "a/b");
});

test("Given malformed nonstring repository identities When canonicalizing Then the identity is rejected", () => {
  for (const value of [null, undefined, false, 0, 1, [], ["a", "b"], {}, { toString: () => "a/b" }])
    assert.equal(canonicalRepository(value), null);
});

test("Given allowlists at exact count limits When parsing Then accept 100 unique entries and reject the 101st", () => {
  const entries = Array.from({ length: 100 }, (_, index) => "team/repo" + index);
  assert.equal(allowedRepositories(entries.join(","))?.size, 100);
  assert.equal(allowedRepositories([...entries, "team/extra"].join(",")), null);
  assert.equal(allowedRepositories("team/repo,TEAM/REPO"), null);
  assert.equal(allowedRepositories("team/*,TEAM/*"), null);
  assert.equal(allowedRepositories("Team/*, Team/repo")?.size, 2);
  assert.equal(allowedRepositories("team/*,team/repo")?.size, 2);
});

test("Given malformed or oversized allowlist source When parsing Then reject all unauthorized scopes", () => {
  for (const input of [
    null, false, {}, [], "", " ", "a/b,", ",a/b", "a/b,,c/d",
    "*", "*/*", "a/**", "a/r*", "a/*/c", "a/../*", "a/*,a/*",
    "a/b\nc/d", "a".repeat(20_101), "a/" + "b".repeat(20_000)
  ]) assert.equal(allowedRepositories(input), null, String(input).slice(0, 28));
});

test("Given exact repository and owner wildcard When authorizing Then only the intended GitHub owner passes", () => {
  const scope = allowedRepositories("TeAm/*,other/Exact");
  for (const input of ["TEAM/Repo", "team/new", "team/.hidden", "Other/Exact"])
    assert.equal(isAllowedRepository(scope, input), true, input);
  for (const input of ["team2/repo", "other/new", "team/repo/child", "team/*",
    "team/../a", "TEAM/Repo?token=x", "", null, [], {}])
    assert.equal(isAllowedRepository(scope, input), false, String(input));
  assert.equal(isAllowedRepository(new Set(["*/*"]), "team/repo"), false);
  assert.equal(isAllowedRepository(null, "team/repo"), false);
});

test("Given delivery IDs When validating Then exact UUID syntax and normalized case are required", () => {
  const value = "A0123456-ABCD-4000-8000-001122334455";
  assert.equal(validDeliveryId(value), value.toLowerCase());
  for (const input of [null, undefined, 0, "", "f".repeat(36), value + "x",
    value.slice(1), value.replace("-", "_"), value + "\n", {}])
    assert.equal(validDeliveryId(input), null, String(input));
});

test("Given cursor boundaries When parsing Then only safe decimal integers pass", () => {
  for (const [raw, expected] of [
    [null, 0], [undefined, 0], ["0", 0], ["1", 1],
    ["999999999999999", 999999999999999],
    ["9007199254740991", Number.MAX_SAFE_INTEGER]
  ]) assert.equal(parseCursor(raw), expected, String(raw));
  for (const invalid of [
    "", "-1", "+1", "00", "01", "1.0", "1e2", "0x10", " 1",
    "1 ", "9007199254740992", "9999999999999999",
    "10000000000000000", "9".repeat(40), NaN, Infinity, -1, 1, {}, []
  ]) assert.equal(parseCursor(invalid), null, String(invalid));
});

test("Given query parameter ambiguity When parsing cursor Then reject duplicates and unknown fields", () => {
  assert.equal(cursorFromUrl("https://relay.test/v1/changes"), 0);
  assert.equal(cursorFromUrl("https://relay.test/v1/changes?after=0"), 0);
  assert.equal(cursorFromUrl("https://relay.test/v1/stream?after=19"), 19);
  for (const suffix of [
    "?after=", "?after=-1", "?after=01", "?after=1&after=2",
    "?after=1&x=1", "?x=1", "?after=1%20", "?after=" + "9".repeat(60)
  ]) assert.equal(cursorFromUrl("https://relay.test/v1/changes" + suffix), null, suffix);
});

test("Given supported run transitions When validating signed content Then emit only advisory repository hints", () => {
  const cases = [
    ["requested", "requested"], ["requested", "queued"],
    ["requested", "pending"], ["requested", "waiting"],
    ["in_progress", "in_progress"], ["completed", "completed"]
  ];
  for (const [action, status] of cases) {
    const result = validatedWorkflowEvent(workflow(action, status), "workflow_run", allowed);
    assert.deepEqual(result, { kind: "workflow_run." + action, repository: "acme/repo" });
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|token|conclusion|status/);
  }
});

test("Given unsupported action/status pairs and broken UTF-8 When validating Then deny all payloads", () => {
  const invalidPairs = [
    ["queued", "queued"], ["requested", "completed"],
    ["in_progress", "queued"], ["completed", "in_progress"],
    ["completed", "success"], ["completed", ""],
    [null, "completed"], ["completed", null]
  ];
  for (const [action, status] of invalidPairs)
    assert.equal(validatedWorkflowEvent(workflow(action, status), "workflow_run", allowed), null);
  for (const bad of [
    bytes("{"), new Uint8Array([0xff]), bytes("null"),
    bytes("[]"), bytes('"string"'),
    bytes(JSON.stringify({ action: "completed", workflow_run: { status: "completed" } }))
  ]) assert.equal(validatedWorkflowEvent(bad, "workflow_run", allowed), null);
  assert.equal(validatedWorkflowEvent(workflow("completed", "completed", "other/repo"),
    "workflow_run", allowed), null);
  assert.equal(validatedWorkflowEvent(workflow("completed", "completed"),
    "workflow_job", allowed), null);
  assert.deepEqual(validatedWorkflowEvent(new Uint8Array([0xff]), "ping", allowed),
    { kind: "ping" });
});

test("Given empty and maximal request bodies When bounding Then accept exact limit and reject overlimit", async () => {
  const empty = new Request("https://relay.test/", { method: "POST", body: "" });
  assert.equal((await boundedRequestBody(empty))?.byteLength, 0);
  const single = new Request("https://relay.test/", { method: "POST", body: "x" });
  assert.equal(new TextDecoder().decode(await boundedRequestBody(single)), "x");
  const maximal = new Request("https://relay.test/", {
    method: "POST", body: "x".repeat(BODY_LIMIT)
  });
  assert.equal((await boundedRequestBody(maximal))?.byteLength, BODY_LIMIT);
  const over = new Request("https://relay.test/", {
    method: "POST", body: "x".repeat(BODY_LIMIT + 1)
  });
  assert.equal(await boundedRequestBody(over), null);
});

test("Given invalid body limits and lying content length When bounding Then return null", async () => {
  for (const limit of [0, -1, BODY_LIMIT + 1, 1.5, NaN, Infinity, null]) {
    const req = new Request("https://relay.test/", { method: "POST", body: "x" });
    assert.equal(await boundedRequestBody(req, limit), null, String(limit));
  }
  for (const count of ["bad", "-1", "1.5", "9".repeat(13), "3", String(BODY_LIMIT + 1)]) {
    const req = new Request("https://relay.test/", {
      method: "POST", body: "xy", headers: { "content-length": count }
    });
    assert.equal(await boundedRequestBody(req), null, count);
  }
  const exact = new Request("https://relay.test/", {
    method: "POST", body: "xy", headers: { "content-length": "2" }
  });
  assert.equal(new TextDecoder().decode(await boundedRequestBody(exact)), "xy");
});

test("Given chunked upload at limit When bounding Then reject the first overflowing chunk", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes("ab"));
      controller.enqueue(bytes("cd"));
      controller.enqueue(bytes("e"));
      controller.close();
    }
  });
  const req = new Request("https://relay.test/", { method: "POST", body, duplex: "half" });
  assert.equal(await boundedRequestBody(req, 4), null);
});

test("Given bearer secret at lower and upper bounds When verifying Then require an exact match", async () => {
  for (const size of [32, 33, 255, 256]) {
    const value = "A".repeat(size);
    assert.equal(await validClientAuthorization("Bearer " + value, value), true, String(size));
    assert.equal(await validClientAuthorization("Bearer " + "B".repeat(size), value), false, String(size));
  }
});

test("Given malformed bearer formats When verifying Then fail closed without throwing", async () => {
  const valid = "A".repeat(32);
  for (const [header, expected] of [
    [undefined, valid], [null, valid], ["Bearer " + valid, null],
    ["Bearer " + valid, 42], ["bearer " + valid, valid],
    [valid, valid], ["Bearer " + "A".repeat(31), valid],
    ["Bearer " + "A".repeat(257), valid],
    ["Bearer " + valid, "A".repeat(31)],
    ["Bearer " + valid, "A".repeat(257)],
    ["Bearer " + valid + "=", valid], ["Bearer " + valid + "\n", valid],
    ["Bearer " + valid, "A".repeat(31) + "+"],
    ["Bearer " + valid, "A".repeat(31) + "="]
  ]) assert.equal(await validClientAuthorization(header, expected), false,
    JSON.stringify({ headerLength: header?.length, expectedLength: expected?.length }));
});
