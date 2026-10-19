import test from "node:test";
import assert from "node:assert/strict";
import worker, { keyFor } from "../infra/download-worker/src/worker.mjs";

test("allow only release assets and signed apt URLs", () => {
  const base = "https://download.morozhenko.com/dist/RepoTicker/";
  assert.equal(keyFor(base + "apt/pool/main/r/repo-ticker/repo-ticker_0.1.0_amd64.deb"),
    "dist/RepoTicker/apt/pool/main/r/repo-ticker/repo-ticker_0.1.0_amd64.deb");
  assert.equal(keyFor(base + "apt/pool/main/r/repoticker/repoticker_0.1.0_amd64.deb"), null);
  assert.equal(keyFor(base + "apt/dists/stable/InRelease"),
    "dist/RepoTicker/apt/dists/stable/InRelease");
  assert.ok(keyFor(base + "releases/v0.1.0/linux/RepoTicker-0.1.0-linux-x64.AppImage"));
  assert.ok(keyFor(base + "apt/dists/stable/main/binary-amd64/by-hash/SHA256/" + "a".repeat(64)));
  assert.equal(keyFor(base + "apt/dists/stable/main/binary-amd64/Packages.gz"),
    "dist/RepoTicker/apt/dists/stable/main/binary-amd64/Packages.gz");
  assert.equal(keyFor(base + "apt/dists/stable/main/binary-amd64/Packages"),
    "dist/RepoTicker/apt/dists/stable/main/binary-amd64/Packages");
  for (const path of ["", "../rQuickShare/key", "apt/", "apt/dists/stable/Release",
                     "apt/../../secret", "%2e%2e/foo", "apt/list",
                     "apt/dists/stable/main/binary-amd64/Packages.xz", "random.txt"]) {
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

test("APT mutable package indexes must not be cached as immutable", async () => {
  const base = "https://download.morozhenko.com/dist/RepoTicker/apt/dists/stable/main/binary-amd64/";
  const env = { ARCHIVE: { async get() { return { body: "contents", size: 8 }; } } };
  for (const suffix of ["Packages", "Packages.gz"]) {
    const response = await worker.fetch(new Request(base + suffix), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  const byHash = await worker.fetch(new Request(base + "by-hash/SHA256/" + "a".repeat(64)), env);
  assert.match(byHash.headers.get("Cache-Control"), /immutable/);
});
