# Mode B source inventory: release, CI and installer scripts

Exact source `5b07a3273a27516af8ceb793f0d427a1bada964b`. These are executable release contracts, not harmless utility DTOs. Source-oriented test suites must exercise real signing/catalog/manifest and isolated publication adapters; **no live R2 or publishing**, no GPG key material in Git.

Files 13, signatures 44, branch/return anchors 232. PowerShell, Bash, Python and JavaScript have different branching syntaxes; counts are discovery hints, NOT AST-confirmed exhaustive branch coverage.

### `scripts/accept_autostart_linux.sh`

Risk **High**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 7 before mapping existing release tests.

**Named functions (0)**
- Shell/powershell executable entrypoint with no named functions; source-level branch/exit code validation

**Conditional/early-exit anchors (7)**
- L17 if [[ ! -d "$dir" ]]; then
- L19 else
- L22 for entry in "$dir"/*.desktop; do
- L23 if grep -Eiq '^(Name\|Exec\|X-GNOME-Autostart-enabled)=(.*[Rr]epo[- ]?[Tt]icker\|.*repoticker)' "$entry"; then
- L26 if grep -Eiq '^Exec=.*(repoticker-desktop\|repo-ticker)' "$entry"; then
- L30 if grep -Eqi '^Hidden=true$\|^X-GNOME-Autostart-enabled=false$' "$entry"; then
- L32 else

### `scripts/accept_autostart_windows.ps1`

Risk **High**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 2 before mapping existing release tests.

**Named functions (0)**
- Shell/powershell executable entrypoint with no named functions; source-level branch/exit code validation

**Conditional/early-exit anchors (2)**
- L10 if (Test-Path $runPath) {
- L18 if ([string]$_.Value -match "(?i)repoticker-desktop(\.exe)?") {

### `scripts/apt_repository.py`

Risk **Critical**, level **unit/contract + isolated integration**, candidate negative N1 N2 N3 N4 N5 N6 N7 N8 N10 N12. Estimated per-source case budget 22 before mapping existing release tests.

**Named functions (6)**
- L17 `def invoke(*args, env=None, input_data=None):`
- L21 `def sha256(path):`
- L29 `def package_field(deb, field):`
- L33 `def assemble(deb: Path, out: Path, version: str, gpg_home: Path,`
- L100 `def verify(root, keyring):`
- L112 `def main():`

**Conditional/early-exit anchors (16)**
- L18 return subprocess.run(args, check=True, capture_output=True, env=env, input=input_data).stdout
- L24 for chunk in iter(lambda: f.read(1024 * 1024), b""):
- L26 return h.hexdigest()
- L30 return invoke("dpkg-deb", "-f", str(deb), field).decode().strip()
- L35 if not deb.is_file() or not gpg_home.is_dir() or not passphrase_file.is_file():
- L37 if out.exists() and any(out.iterdir()):
- L40 for name, value in expected.items():
- L41 if package_field(deb, name) != value:
- L43 if "libgtk-layer-shell0" not in package_field(deb, "Depends"):
- L46 if not fingerprint or len(fingerprint) != 40:
- L60 if (packages.count(b"Package: repoticker\n") != 1 or
- L80 for name in ("Packages", "Packages.gz")
- L94 if not keyring.stat().st_size:
- L97 return inrelease
- L106 if len(packages) != 1:
- L124 if __name__ == "__main__":

### `scripts/ci-pr-scope.sh`

Risk **High**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 5 before mapping existing release tests.

**Named functions (0)**
- Shell/powershell executable entrypoint with no named functions; source-level branch/exit code validation

**Conditional/early-exit anchors (5)**
- L6 case "${GITHUB_EVENT_NAME:-}" in
- L9 [[ ${#refs[@]} -eq 3 ]] \|\| { echo 'Expected a two-parent PR merge' >&2; exit 1; }
- L13 [[ -s "$changed" ]] \|\| { echo 'Empty PR merge diff' >&2; exit 1; }
- L15 while IFS= read -r -d '' path; do
- L16 case "$path" in

### `scripts/cleanup-published-artifacts.mjs`

Risk **Critical**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 30 before mapping existing release tests.

**Named functions (5)**
- L11 `const isSha = value => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);`
- L13 `export function validateR2Receipt(receipt) {`
- L79 `async function listRunArtifacts(run, token, request) {`
- L97 `export async function deletePublishedArtifacts(receipt, token, request = fetch) {`
- L138 `async function main() {`

**Conditional/early-exit anchors (25)**
- L14 if (!receipt \|\| receipt.schema !== 1 \|\| receipt.product !== "RepoTicker" \|\|
- L27 if (!latest \|\| latest.url !== BASE + "latest.json" \|\|
- L35 if (new Set(receipt.artifacts.map(item => item.run_id)).size !== 1) {
- L54 for (const item of receipt.artifacts) {
- L55 if (!Number.isSafeInteger(item.run_id) \|\| item.run_id < 1 \|\|
- L61 if (actualUrls.length !== expectedUrls.length \|\|
- L66 for (const file of item.files) {
- L67 if (typeof file.url !== "string" \|\|
- L76 return receipt;
- L81 for (let page = 1; page <= 10; page++) {
- L87 if (response.status !== 200) throw Error("Could not list GitHub Actions artifacts");
- L89 if (!Array.isArray(payload.artifacts) \|\| payload.artifacts.length > 100)
- L92 if (payload.artifacts.length < 100) return result;
- L99 if (!token) throw Error("Missing Actions-write cleanup token");
- L106 for (const target of receipt.artifacts) {
- L108 if (matches.length > 1) throw Error("Ambiguous release artifact; refusing deletion");
- L109 if (!matches.length) continue; // idempotent after a successful prior cleanup
- L111 if (!Number.isSafeInteger(artifact.id) \|\| artifact.id < 1 \|\|
- L118 if (new Set(approved.map(item => item.artifact.id)).size !== approved.length) {
- L123 for (const {target, artifact} of approved) {
- L128 if (response.status !== 204) throw Error("GitHub Actions artifact cleanup failed");
- L131 if (remaining.some(a => a.id === artifact.id \|\| a.name === target.name)) {
- L135 return removed;
- L139 if (process.argv.length !== 4 \|\| process.argv[2] !== "--verified-receipt") {
- L146 if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {

### `scripts/install_qa_linux.sh`

Risk **High**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 9 before mapping existing release tests.

**Named functions (0)**
- Shell/powershell executable entrypoint with no named functions; source-level branch/exit code validation

**Conditional/early-exit anchors (9)**
- L6 if [[ "$#" -ne 2 \|\| ! "$1" =~ ^[0-9]+$ \|\| ! "$2" =~ ^[0-9a-f]{40}$ ]]; then
- L10 for binary in gh sha256sum dpkg-deb dpkg-query sudo pgrep python3 cmp; do
- L15 if [[ "$(dpkg-query -W -f='${Status}' repo-ticker 2>/dev/null \|\| true)" == "install ok installed" ]]; then
- L22 if [[ "$RESULT" != "success" ]]; then
- L31 if [[ "$SOURCE" != "$2" ]]; then
- L44 if [[ ! -f "$DEB" \|\|
- L54 if pgrep -x repoticker >/dev/null \|\| pgrep -f '[r]epoticker-desktop' >/dev/null; then
- L62 if [[ ! -x "$BIN" ]] \|\| ! dpkg-query -L repoticker \| grep -Fxq "$BIN"; then
- L70 if [[ ! -f "$PAYLOAD/usr/bin/repoticker" ]] \|\|

### `scripts/provision_apt_key.sh`

Risk **Critical**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 7 before mapping existing release tests.

**Named functions (1)**
- L65 `cleanup_signing_validation() {`

**Conditional/early-exit anchors (6)**
- L11 if [[ ! "$FPR" =~ ^[0-9a-fA-F]{40}$ ]]; then
- L15 for item in gh gpg base64; do
- L18 [[ -d "$BACKUP" ]] \|\| {
- L32 [[ ! -e "$BACKUP/$filename" ]] \|\| { echo "Refusing overwrite: $filename" >&2; exit 1; }
- L39 [[ "$backup_pass" =~ .{16} && "$backup_pass" == "$repeat_pass" ]] \|\| {
- L60 [[ -n "$key_pass" ]] \|\| { echo "Empty signing passphrase rejected." >&2; exit 1; }

### `scripts/r2_release.py`

Risk **Critical**, level **unit/contract + isolated integration**, candidate negative N1 N2 N3 N4 N5 N6 N7 N8 N10 N12. Estimated per-source case budget 113 before mapping existing release tests.

**Named functions (19)**
- L39 `def digest(path):`
- L47 `def safe_file(path):`
- L56 `def platform_files(release, platform, version, commit):`
- L97 `def verify_signed_apt_indexes(inrelease, index):`
- L152 `def verify_apt_package_catalog(packages, compressed, pool, version):`
- L217 `def apt_files(apt, linux_deb, version):`
- L242 `def source_map(release, apt, version, commit):`
- L258 `def latest_manifest(immutable, version, commit):`
- L260 `def item(key):`
- L278 `def content_type(path):`
- L284 `class _RejectPublicRedirect(urllib.request.HTTPRedirectHandler):`
- L287 `def redirect_request(self, req, fp, code, msg, headers, newurl):`
- L291 `def _verified_public_opener(request, timeout):`
- L300 `def public_readback(path, relative, opener=_verified_public_opener):`
- L333 `def object_head(client, key):`
- L344 `def object_etag(head):`
- L354 `def upload(client, key, file, immutable, expected_latest=_NO_SNAPSHOT):`
- L403 `def publish(release, apt, version, commit, run_id, output, account, access_key, secret):`
- L468 `def main():`

**Conditional/early-exit anchors (94)**
- L42 for part in iter(lambda: fh.read(1024 * 1024), b""):
- L44 return h.hexdigest()
- L48 if path.is_symlink() or not path.is_file():
- L51 if not 0 < size <= 350 * 1024 * 1024:
- L53 return size
- L62 for platform in (platform,):
- L64 if base.is_symlink() or not base.is_dir() or (base / "part.json").is_symlink() or not (base / "part.json").is_file(
- L67 if manifest.get("platform") != platform or manifest.get("version") != version:
- L71 for extension in TYPES[platform]:
- L76 if not binary.is_file() or not sidecar.is_file() or binary.is_symlink() or sidecar.is_symlink():
- L81 if sidecar.read_text().strip() != checksum + "  " + name:
- L84 if {file.name for file in base.iterdir()} != required \| {"part.json"}:
- L88 for item in manifest.get("files", [])
- L90 if actual != entries or len(manifest.get("files", [])) != len(entries):
- L92 for name in sorted(required):
- L94 return result
- L103 try:
- L109 if (not lines or lines[0] != "-----BEGIN PGP SIGNED MESSAGE-----"
- L122 for line in lines[blank + 1:signed_end]:
- L123 if line == "SHA256:":
- L124 if saw_sha256:
- L128 if not in_sha256:
- L130 if not line.startswith((" ", "\t")):
- L134 if match is None:
- L137 if name in required:
- L138 if name in found:
- L141 if not saw_sha256 or set(found) != set(required):
- L143 for name, package_index in required.items():
- L144 if not package_index.is_file():
- L147 if signed_size != package_index.stat().st_size or signed_sha != digest(package_index):
- L160 try:
- L168 for line in lines:
- L169 if not line:
- L170 if fields:
- L175 if line[0] in " \t":
- L178 if previous is None or previous in critical:
- L182 if (not separator or
- L188 if fields:
- L190 if len(entries) != 1:
- L201 if any(record.get(key) != value for key, value in expected.items()):
- L206 try:
- L208 while chunk := plain.read(1024 * 1024):
- L209 if packed.read(len(chunk)) != chunk:
- L211 if packed.read(1):
- L218 if apt.is_symlink() or not apt.is_dir():
- L228 for file in (staged, keyring, packages, compressed, inrelease):
- L230 if digest(staged) != digest(linux_deb):
- L236 return ({"linux/" + keyring.name: keyring},
- L243 if not VERSION.fullmatch(version) or not COMMIT.fullmatch(commit):
- L250 if set(immutable).intersection(apt_mutable):
- L252 return immutable, apt_mutable, {
- L262 return {"url": BASE + key, "sha256": digest(file), "size": file.stat().st_size}
- L263 return {
- L279 if path.name == "InRelease" or path.name == "Packages":
- L280 return "text/plain; charset=utf-8"
- L281 return MIMES.get(path.suffix, "application/octet-stream")
- L295 return urllib.request.build_opener(_RejectPublicRedirect()).open(
- L312 if reply.status != 200:
- L316 while chunk := reply.read(1024 * 1024):
- L318 if length > expected_size:
- L321 if length != expected_size or hasher.hexdigest() != expected_sha:
- L323 return {
- L335 try:
- L336 return client.head_object(Bucket=BUCKET, Key=PREFIX + key)
- L339 if status == 404:
- L340 return None
- L346 if head is None:
- L347 return None
- L349 if not isinstance(etag, str) or not re.fullmatch(r'"[^"\r\n]{1,128}"', etag):
- L351 return etag
- L360 if expected_latest is not _NO_SNAPSHOT:
- L363 if object_etag(existing) != object_etag(expected_latest):
- L365 if existing is not None and existing.get("Metadata", {}).get("sha256") == sha:
- L369 if existing and immutable:
- L370 if existing.get("Metadata", {}).get("sha256") != sha:
- L372 elif not (existing and existing.get("Metadata", {}).get("sha256") == sha):
- L373 conditional = ({"IfNoneMatch": "*"} if existing is None else
- L383 if immutable else "no-store"),
- L386 elif not immutable:
- L393 for piece in obj["Body"].iter_chunks(chunk_size=1024 * 1024):
- L394 if piece:
- L396 if length > size:
- L399 if length != size or hasher.hexdigest() != sha:
- L404 if not re.fullmatch(r"[a-f0-9]{32}", account) or not access_key or not secret:
- L406 if not str(run_id).isdigit() or int(run_id) < 1:
- L408 if output.exists() or output.is_symlink():
- L414 if latest_path.exists() or latest_path.is_symlink():
- L428 if original_latest is not None:
- L431 for key, file in sorted(immutable.items()):
- L437 for key, file in sorted(mutable.items()):
- L438 if key == "linux/InRelease":
- L449 if latest_path.exists() or latest_path.is_symlink():
- L461 for name, files in platforms.items()
- L484 if __name__ == "__main__":

### `scripts/release_assets.py`

Risk **Critical**, level **unit/contract + isolated integration**, candidate negative N1 N2 N3 N4 N5 N6 N7 N8 N10 N12. Estimated per-source case budget 42 before mapping existing release tests.

**Named functions (6)**
- L25 `def digest(path):`
- L33 `def canonical(version, platform, ext):`
- L48 `def source_has_version(filename, version):`
- L55 `def collect(source, target, platform, version):`
- L112 `def merge(parts, output, version):`
- L142 `def main():`

**Conditional/early-exit anchors (36)**
- L28 for buf in iter(lambda: f.read(1024 * 1024), b""):
- L30 return h.hexdigest()
- L34 if ext == ".deb":
- L35 return f"repoticker_{version}_amd64.deb"
- L36 if ext == ".AppImage":
- L37 return f"RepoTicker-{version}-linux-x64.AppImage"
- L38 if ext == ".exe":
- L39 return f"RepoTicker-Setup-{version}-win-x64.exe"
- L40 if ext == ".dmg":
- L41 return f"RepoTicker-{version}-macos-arm64.dmg"
- L51 return re.search(r"(?<![0-9.])" + re.escape(version) +
- L56 if not SEMVER.fullmatch(version):
- L58 if target.exists() and any(target.iterdir()):
- L61 for ext in TYPES[platform]:
- L63 p for p in source.rglob("*") if p.is_file() and not p.is_symlink()
- L67 if len(choices) != 1:
- L70 if not 0 < file.stat().st_size < 350 * 1024 * 1024:
- L72 if ext == ".deb":
- L73 for key, expected in [("Package", "repoticker"), ("Version", version),
- L76 if value != expected:
- L79 if "libgtk-layer-shell0" not in deps:
- L90 if not executable.is_file() or not launcher.is_file():
- L93 if "Name=RepoTicker" not in desktop:
- L96 if line.startswith("Exec=")]
- L97 if len(commands) != 1 or commands[0].split(" ", 1)[0] not in (
- L115 for path in parts:
- L118 if platform not in TYPES or platform in found or obj["version"] != version:
- L121 if {Path(v["path"]).suffix for v in obj["files"]} != set(TYPES[platform]):
- L123 for item in obj["files"]:
- L125 if rel.is_absolute() or len(rel.parts) != 2 or rel.parts[0] != platform:
- L128 if not local.is_file() or local.stat().st_size != item["size"] or digest(local) != item["sha256"]:
- L133 if not required.issubset(found):
- L155 try:
- L156 if a.command == "collect":
- L158 else:
- L164 if __name__ == "__main__":

### `scripts/release_version.py`

Risk **High**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 15 before mapping existing release tests.

**Named functions (3)**
- L24 `def versions():`
- L32 `def bump(which):`
- L56 `def main():`

**Conditional/early-exit anchors (12)**
- L27 if len(set(values)) != 1 or not SEMVER.fullmatch(values[0]):
- L29 return values[0]
- L37 for part in range(index + 1, 3):
- L40 for path in CARGO:
- L43 lambda match: 'version = "' + new + '"' if match.group(1) == old else match.group(),
- L46 if count != 1 or text == updated:
- L53 return new
- L62 try:
- L63 if args.bump:
- L65 else:
- L67 if args.check_tag and args.check_tag != "v" + current:
- L74 if __name__ == "__main__":

### `scripts/verify_signing_key.py`

Risk **Critical**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 13 before mapping existing release tests.

**Named functions (2)**
- L8 `def validate(text, fingerprint):`
- L32 `def main():`

**Conditional/early-exit anchors (11)**
- L10 if not re.fullmatch(r"[A-F0-9]{40}", fingerprint):
- L12 lines = [row.split(":") for row in text.splitlines() if row.strip()]
- L14 if not lines or any(tag not in {"sec", "ssb", "fpr", "uid", "grp"} for tag in types):
- L16 keys = [row for row in lines if row[0] in {"sec", "ssb", "fpr"}]
- L17 if [row[0] for row in keys] != ["sec", "fpr", "ssb", "fpr"]:
- L20 if len(primary) < 15 or primary[14] != "#":
- L22 if len(subkey) < 15 or subkey[14] != "+" or "s" not in subkey[11].lower():
- L24 if primary_fpr[9].upper() != fingerprint or not re.fullmatch(
- L28 if subkey_fpr[9].upper() == fingerprint:
- L37 try:
- L43 if __name__ == "__main__":

### `scripts/verify_signing_passphrase.sh`

Risk **Critical**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 6 before mapping existing release tests.

**Named functions (1)**
- L18 `cleanup() {`

**Conditional/early-exit anchors (5)**
- L9 if [[ $# -ne 2 \|\| ! "$FPR" =~ ^[0-9a-fA-F]{40}$ \|\| ! -s "$PASSPHRASE_FILE" ]]; then
- L13 for item in gpg gpgconf gpgv python3; do
- L27 if ! gpg --homedir "$tmp/gnupg" --batch --import >/dev/null 2>&1; then
- L37 if ! gpg --homedir "$tmp/gnupg" --batch --yes --no-tty \
- L45 if ! gpgv --keyring "$tmp/public.gpg" "$tmp/InRelease" >/dev/null 2>&1; then

### `tools/import_icon.py`

Risk **High**, level **unit/contract + isolated integration**, candidate negative N1 N2 N4 N5 N6 N7 N9 N10 N12. Estimated per-source case budget 5 before mapping existing release tests.

**Named functions (1)**
- L15 `def main():`

**Conditional/early-exit anchors (4)**
- L20 if not source.is_file():
- L24 if base.width != base.height or base.width < 32:
- L30 for size in sizes:
- L43 if __name__ == "__main__":


## External workflow contracts / metadata

- `.github/workflows/preflight.yml`, `strict.yml`: required outcomes and no skip-as-success; test routing by changes, exact Node 26.13.0 and Rust/Clippy/Python execution.
- `.github/workflows/desktop-acceptance-candidates.yml`, `desktop-release-candidates.yml`: native Linux and Windows package provenance, checksums, no publish under dev.
- `.github/workflows/relay-worker-dry-run.yml`, `relay-lock-candidate.yml`: Worker bundle without deployment or hosted secrets.
- `apps/relay-cloudflare/wrangler.toml`: single Durable Object + SQLite migration, top-level `keep_vars = true` so runtime allowlist survives Git-linked deploy. Existing regression `tests/relay-worker-binding-retention.test.mjs` must kill false/absent values.
- Build and manifest files (`Cargo.lock`, Rust Cargo manifests, `package.json`, Tauri config) are contract data; inspect for dependency/source version constraints but do not count them as functions.

## Candidate existing test evidence

Python `tests/test_release_*.py`, `tests/test_ci_policy.py`, JS `tests/artifact-retention.test.mjs`, `tests/linux-qa-installer.test.mjs`, Windows package and credential-cleanup tests. Reconcile **every** upload/rollback/error path, transaction ordering and symlink refusal; a test that only regex-matches source is not equivalent to isolated runtime integration. N11 (purchases) is inapplicable to RepoTicker. N8 applies to timestamp, retention and semantic-version handling, not to every shell command. N12 includes write failures/readonly filesystem, not only invalid path strings.
