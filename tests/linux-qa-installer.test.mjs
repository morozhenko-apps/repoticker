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
  assert.match(source, /pgrep -x repoticker/);
  assert.match(source, /pgrep -f/);
  assert.match(source, /still running/);
});

test("QA installer refuses stale source and unverified package", () => {
  assert.match(source, /conclusion/);
  assert.match(source, /SOURCE_SHA\.txt/);
  assert.match(source, /sha256sum -c -- \*\.sha256/);
  assert.match(source, /dpkg-deb -f/);
});

test("QA installer starts exactly one actual installed binary, not guessed CLI", () => {
  assert.match(source, /dpkg-query -L repoticker/);
  assert.match(source, /exec "\$BIN"/);
  assert.doesNotMatch(source, /^repo-ticker\s*$/m);
});

test("QA installer requires the synchronized current Debian package version", () => {
  // Only the exact candidate version is allowed. No wildcard or stale pin.
  assert.match(source, /python3[^\n]*release_version\.py/);
  assert.match(source, /DEB="\$OUT\/repoticker_\$\{VERSION\}_amd64\.deb"/);
  assert.match(source, /dpkg-deb -f "\$DEB" Package/);
  assert.match(source, /dpkg-deb -f "\$DEB" Version/);
  assert.match(source, /dpkg-deb -f "\$DEB" Architecture/);
  assert.match(source, /Version\)" != "\$VERSION"/);
  assert.match(source, /Architecture\)" != "amd64"/);
  assert.doesNotMatch(source, /repoticker_0\.2\.0_amd64\.deb/);
});
