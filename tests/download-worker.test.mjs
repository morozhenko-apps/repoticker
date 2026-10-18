import test from "node:test";
import assert from "node:assert/strict";
import worker, { keyFor } from "../infra/download-worker/src/worker.mjs";

test("allow only release assets and signed apt URLs", () => {
  const base = "https://download.morozhenko.com/dist/RepoTicker/";
  assert.equal(keyFor(base + "apt/dists/stable/InRelease"),
    "dist/RepoTicker/apt/dists/stable/InRelease");
  assert.ok(keyFor(base + "releases/v0.1.0/linux/RepoTicker-0.1.0-linux-x64.AppImage"));
  assert.ok(keyFor(base + "apt/dists/stable/main/binary-amd64/by-hash/SHA256/" + "a".repeat(64)));
  for (const path of ["", "../rQuickShare/key", "apt/", "apt/dists/stable/Release",
                     "apt/../../secret", "%2e%2e/foo", "apt/list", "random.txt"]) {
    assert.equal(keyFor(base + path), null, path);
  }
});

test("read-only worker protects mutable InRelease, denies mutation", async () => {
  const key = "dist/RepoTicker/apt/dists/stable/InRelease";
  let reads = 0;
  const env = { ARCHIVE: { async get(input) {
    assert.equal(input, key); reads++;
    return { body: "signed-content", size: 14 };
  } } };
  const url = "https://download.morozhenko.com/dist/RepoTicker/apt/dists/stable/InRelease";
  const get = await worker.fetch(new Request(url), env);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("Cache-Control"), "no-store");
  assert.equal(await get.text(), "signed-content");
  const head = await worker.fetch(new Request(url, { method: "HEAD" }), env);
  assert.equal(head.status, 200);
  assert.equal(reads, 2);
  const post = await worker.fetch(new Request(url, { method: "POST" }), env);
  assert.equal(post.status, 405);
  const forbidden = await worker.fetch(
    new Request("https://download.morozhenko.com/dist/rQuickShare/apt/secret"), env);
  assert.equal(forbidden.status, 404);
});
