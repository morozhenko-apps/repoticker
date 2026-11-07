import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyGithubWebhookSignature } from "../apps/relay-cloudflare/src/webhook-verify.mjs";

const secret = "It's a Secret to Everybody";
const bytes = value => new TextEncoder().encode(value);
const signature = (body, key = secret) =>
  "sha256=" + createHmac("sha256", key).update(body).digest("hex");

test("Given a valid raw GitHub webhook When verifying HMAC Then exact signed bytes pass", async () => {
  const payload = bytes("Hello, World!");
  assert.equal(signature(payload),
    "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17");
  assert.equal(await verifyGithubWebhookSignature(payload, signature(payload), secret), true);
  assert.equal(await verifyGithubWebhookSignature(bytes('{"text":"Привет"}\n'),
    signature(bytes('{"text":"Привет"}\n')), secret), true);
});

test("Given body or secret differs When verifying webhook Then it is rejected", async () => {
  const body = bytes('{"a":1}');
  const valid = signature(body);
  for (const other of [bytes('{"a": 1}'), bytes('{"a":1}\n'), bytes('{"a":2}'), bytes("")])
    assert.equal(await verifyGithubWebhookSignature(other, valid, secret), false);
  assert.equal(await verifyGithubWebhookSignature(body, valid, "other-secret"), false);
});

test("Given a missing or malformed signature When verifying Then fail closed", async () => {
  const body = bytes("test");
  const valid = signature(body);
  for (const header of [
    null, undefined, "", "sha1=" + valid.slice(7), "SHA256=" + valid.slice(7),
    "sha256=" + "0".repeat(63), "sha256=" + "0".repeat(65),
    "sha256=" + "x".repeat(64), valid.toUpperCase(),
    valid + "," + valid, valid + "\n", " " + valid, { value: valid }
  ]) assert.equal(await verifyGithubWebhookSignature(body, header, secret), false);
});

test("Given invalid verifier input When verifying Then no provider secret or delivery is accepted", async () => {
  const body = bytes("test"), valid = signature(body);
  for (const raw of [null, undefined, "test", {}, new ArrayBuffer(4)])
    assert.equal(await verifyGithubWebhookSignature(raw, valid, secret), false);
  for (const key of [null, "", undefined, 12, {}])
    assert.equal(await verifyGithubWebhookSignature(body, valid, key), false);
});

test("Given an incomplete Hybrid endpoint When building Then no webhook is acknowledged", () => {
  const endpoint = readFileSync(new URL(
    "../apps/relay-cloudflare/src/index.ts", import.meta.url), "utf8");
  assert.match(endpoint, /status: 501/);
  assert.doesNotMatch(endpoint, /status: 200|status: 202/);
});
