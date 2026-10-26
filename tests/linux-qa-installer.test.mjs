import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../scripts/install_qa_linux.sh", import.meta.url));
const source = readFileSync(path, "utf8");

test("QA installer is bash-valid and uses a unique extraction directory", () => {
  const result = spawnSync("bash", ["-n", path], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(source, /mktemp -d/);
  assert.match(source, /repoticker-qa-/);
  assert.doesNotMatch(source, /rm -rf/);
});

test("QA installer refuses stale source and unverified package", () => {
  assert.match(source, /conclusion/);
  assert.match(source, /SOURCE_SHA\.txt/);
  assert.match(source, /sha256sum -c -- \*\.sha256/);
  assert.match(source, /dpkg-deb -f/);
});

test("QA installer starts exactly one actual installed binary, not guessed CLI", () => {
  assert.match(source, /dpkg-query -L repo-ticker/);
  assert.match(source, /exec "\$BIN"/);
  assert.doesNotMatch(source, /^repo-ticker\s*$/m);
});
