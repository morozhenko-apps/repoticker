import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const main = JSON.parse(read("apps/desktop/src-tauri/tauri.conf.json"));
const linux = JSON.parse(read("apps/desktop/src-tauri/tauri.linux.conf.json"));
const entry = read("apps/desktop/src-tauri/repoticker.desktop");
const cargo = read("apps/desktop/src-tauri/Cargo.toml");
const lock = read("Cargo.lock");
const assets = read("scripts/release_assets.py");
const apt = read("scripts/apt_repository.py");
const worker = read("infra/download-worker/src/worker.mjs");
const qa = read("scripts/install_qa_linux.sh");
const release = read(".github/workflows/desktop-release-candidates.yml");
const preflight = read(".github/workflows/preflight.yml");

test("one executable name for Cargo, Tauri, Windows and Linux", () => {
  assert.match(cargo, /^name = "repoticker"$/m);
  assert.match(lock, /^name = "repoticker"$/m);
  assert.doesNotMatch(cargo, /repoticker-desktop/);
  assert.equal(main.mainBinaryName, "repoticker");
  assert.equal(main.productName, "RepoTicker");
  assert.equal(main.identifier, "com.morozhenko.repoticker");
  assert.equal(linux.productName, "repoticker");
  assert.equal(linux.bundle.linux.deb.desktopTemplate, "repoticker.desktop");
  assert.match(preflight, /cargo check --locked -p repoticker\b/);
});

test("packaging keeps a branded launcher but no hyphenated Debian package", () => {
  assert.match(entry, /^Name=RepoTicker$/m);
  assert.match(entry, /^Exec=\{\{exec\}\}$/m);
  assert.match(entry, /^Icon=\{\{icon\}\}$/m);
  assert.match(entry, /^Terminal=false$/m);
  assert.match(assets, /f"repoticker_\{version\}_amd64\.deb"/);
  assert.match(assets, /\("Package", "repoticker"\)/);
  assert.match(assets, /usr\/bin\/repoticker/);
  assert.match(assets, /usr\/share\/applications\/repoticker\.desktop/);
  assert.match(assets, /Name=RepoTicker/);
  assert.match(apt, /"Package": "repoticker"/);
  assert.match(apt, /pool\/main\/r\/repoticker/);
  assert.match(worker, /apt\\\/pool\\\/main\\\/r\\\/repoticker/);
  assert.match(release, /-name 'repoticker_\*\.deb'/);
});

test("unpublished installer refuses legacy package and launches canonical executable", () => {
  assert.match(qa, /dpkg-query -W -f='\$\{Status\}' repo-ticker/);
  assert.match(qa, /sudo apt remove repo-ticker/);
  assert.match(qa, /DEB="\$OUT\/repoticker_0\.2\.0_amd64\.deb"/);
  assert.match(qa, /BIN="\/usr\/bin\/repoticker"/);
  assert.match(qa, /dpkg-query -L repoticker/);
  assert.match(qa, /exec "\$BIN"/);
  assert.doesNotMatch(qa, /dpkg-query -L repo-ticker/);
});

test("active release and QA scripts contain no accidental alternate product spelling", () => {
  for (const path of [
    "scripts/release_assets.py", "scripts/apt_repository.py",
    "scripts/r2_release.py", "infra/download-worker/src/worker.mjs",
    ".github/workflows/desktop-release-candidates.yml"
  ]) {
    const content = read(path);
    assert.doesNotMatch(content, /repo-ticker|repoticker-desktop/,
      path + " must publish the canonical package");
  }
});
