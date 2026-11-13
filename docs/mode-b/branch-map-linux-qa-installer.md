# Mode B: unpublished Linux QA installer provenance, safe reinstall and byte-exact launch

Source baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Actual subject `scripts/install_qa_linux.sh`, blob `6e89d8edb175936294dca8af326acffed0b464a5` (77 source lines). Candidate tests `tests/linux-qa-installer.test.mjs` blob `32a9bcdb1b4e51a797ebf68d8a14601489d7ba8b` (**five JS tests**).
Prepared parent `a55a5f3c8f13a5526812fe84c31f4ec510a5489a`, branch `audit/mode-b-testing`.

**Critical evidence distinction:** one test really invokes `bash -n scripts/install_qa_linux.sh` to prove **syntax only**. All five tests inspect the shell script as text, including order of `cmp` and `exec`, and none executes the actual installer's admission, GitHub artifact download, checksum verification, `dpkg`, `sudo apt install`, process guard or eventual binary launch. The real installer has destructive privilege/system implications; no live command, test, installation, download or `sudo` was run for this audit.

## Exact existing static assertions

| Actual Node test | What it proves and does not prove |
| --- | --- |
| `QA installer is bash-valid and uses a unique extraction directory` | Real `bash -n` exit 0, script contains `mktemp -d`, unique prefix, no `rm -rf`, `pgrep` guards; no installer execution |
| `QA installer refuses stale source and unverified package` | Source contains CI conclusion read, SOURCE_SHA.txt, `sha256sum -c`, `dpkg-deb -f`; no injected stale source or corrupt archive |
| `QA installer starts exactly one actual installed binary, not guessed CLI` | Source contains `dpkg-query -L`, `exec "$BIN"`, no legacy direct command; no process spawned |
| `QA installer replaces same-version production DEB and proves exact payload` | Source order `sudo apt install --reinstall` → `dpkg-deb -x` → `cmp` → `exec`; no bytes compared at test runtime |
| `QA installer requires the synchronized current Debian package version` | Source contains actual `release_version.py` call, canonical DEB filename and fields; no malformed version/arch rejection executed |

## Shell entrypoint independent branch ledger

| Real conditional and side effect | Exact intended acceptance/rejection | Evidence / required direct test |
| --- | --- | --- |
| `set -euo pipefail`, args | Exactly 2 args: positive decimal-looking run ID regex and lowercase exact 40-hex source SHA; reject missing, extra, malformed, uppercase, overlong | S usage; ? actual exit 2 and **zero external requests** for all invalid variants. Note regex accepts `0`, potentially a valid lexical input but not a GitHub real run. Do not silently tighten without contract decision |
| external commands | Require `gh,sha256sum,dpkg-deb,dpkg-query,sudo,pgrep,python3,cmp` present | S; ? each missing command exits 1 before GitHub or privilege action |
| old `repo-ticker` package | If installed, refuse and tell user to remove legacy DEB; do not uninstall automatically; preserve user settings | S source; ? fake dpkg-query legacy installed vs absent and verify no `sudo` call |
| `gh run view` | Read **conclusion** for given run/repo, only exact `success` accepted; error/failure/cancelled/missing must block download | S; ? execute with fake `gh`, assert no download for non-success |
| extraction folder | Create `$HOME/Downloads` and unique `mktemp -d` output; `gh run download -n repoticker-acceptance-linux -D "$OUT"`; early failure leaves forensic candidate folder | S unique directory; ? two calls unique and no overwrite, failed download never advances |
| source SHA | Read local `SOURCE_SHA.txt` stripping CRLF, require equality with caller-specified 40-hex argument; mismatch => no install | S; ? missing, stale, different-case, extra bytes and zero sudo calls |
| checksum | Run `sha256sum -c -- *.sha256` from exact downloaded directory; failure aborts before `dpkg-deb`/privilege | S; ? real tiny fixture binary and checksum success/failure/traversal-name handling |
| synchronized version | Determine version via `python3 "$SCRIPT_DIR/release_version.py"`, choose **exact** `repoticker_${VERSION}_amd64.deb` (not wildcard); reject missing | S; ? invalid version script/error, different installed version and extra DEB cannot select wrong one |
| DEB identity | Require regular DEB file and `dpkg-deb -f` Package=repoticker, Version=current, Architecture=amd64 | S; ? each wrong metadata value, command failure and no sudo |
| old process guard | `pgrep -x repoticker` or `pgrep -f '[r]epoticker-desktop'` => refuse until tray Quit | S; ? either process present and both absent, no reinstall on active process |
| privileged reinstall | `sudo apt install --reinstall "$DEB"` once, after all input/provenance/quit checks; command nonzero aborts | S source; ? exact fake `sudo` argument count and failure path, never real apt in unit test |
| installed binary identity | Require executable `/usr/bin/repoticker` and installed package owns this path via `dpkg-query -L` | S; ? wrong owner/missing/not executable, don't launch |
| byte-exact payload | Extract approved DEB with `dpkg-deb -x` into temporary downloaded output folder; compare installed executable using `cmp -s`; mismatch refuses launch | S order; ? identical/different bytes, missing extracted payload and compare failure |
| process launch | `exec /usr/bin/repoticker` only after above, no secondary launcher, no guessed script name | S; ? actual successful process replacement in a **disposable test root**, not host /usr/bin |

## Trust boundary / technical constraints

- **No privilege in tests:** avoid running this script against the host `sudo`, `apt`, `gh`, `/usr/bin` or real GitHub account. An integration harness may prepend fixture command shims to `PATH` and supply isolated HOME/Downloads. The **subject must be the real shell script**, not a rewritten test implementation.
- **Absolute install path:** the script checks `/usr/bin/repoticker` and calls `exec` there. A pure `PATH` shim cannot replace or safely fake this hard-coded path; use a dedicated disposable container/user namespace/fake installation root, or restrict executable tests to the **pre-sudo denial branches** until a behavior-preserving testability seam is agreed. Never run the success path on the host.
- **Run provenance:** source verifies run conclusion and downloaded `SOURCE_SHA.txt` against operator-supplied expected SHA. It does not separately call `gh run view --json headSha` to bind artifact bytes to GH API's run head_sha; the CI artifact carries the SHA marker. This is an **evidence boundary**, not a proven forgery. Clarify source-trust contract before modifying it.
- **Failure leaves extracted QA folder:** source intentionally uses a fresh folder and does not delete it, allowing investigation; no assumption of complete rollback of an installed package on later binary mismatch.
- **No credential logging:** no token is read into script; external `gh` manages its credential. Error output includes run conclusion and output directory, but no explicit secret print; test redaction of fixture paths if required by privacy policy.

## Positive / N1–N12

| Class | State |
| --- | --- |
| Positive | S script structure and bash syntax; real guarded install not executed |
| N1 | ? wrong arguments, malformed run/source SHA, malformed package fields |
| N2 | ? 0/1/max and exact 40/39/41 hex, checksum file count and duplicate names |
| N3 | ? fake gh error, timeout/offline, missing artifact |
| N4 | S `--reinstall`; ? repeated same-version or failed recovery behavior |
| N5 | ? running process race and two simultaneous installs |
| N6 | ? stale source SHA, wrong package version, corrupt DEB, invalid checksums |
| N7 | ? forged download, legacy identity collision and approved run provenance |
| N8 | NA installer does not parse local date/time |
| N9 | ? user tray Quit refusal while app still running |
| N10 | S no token strings, ? external tool stderr/home path privacy |
| N11 | NA no paywall |
| N12 | ? no Downloads permission, sudo denied, dpkg extraction failure and disk-full |

## Stage 9 test suite plan after global Stages 3–8

- LI1: table-driven **direct real script execution** of invalid args, missing dependency, legacy package, unsuccessful CI run, stale SHA, corrupt checksum, wrong package metadata and active process. Implement per-test fake command collector, assert exit code and zero `sudo` calls.
- LI2: synthesize SHA sidecars and package fixture under temp HOME, injected CI `gh` scripts and version; allow no runtime privileges. Test no destructive action until full provenance checks complete.
- LI3: for post-install comparison and successful `exec`, run an **isolated disposable container or namespace** with a fake `/usr/bin/repoticker` and exact approved DEB. Do not run on owner machine by accident.
- LI4: reproduce two simultaneous installers/active process and failed sudo in a controlled environment; only then decide if a lock/transaction is a product contract needing an architectural STOP FACTOR.
- LI5: physical KDE DEB install/uninstall, legacy package migration and autostart acceptance independently from shell unit fixtures.

Mutants: skip run-success guard, match wrong SHA, ignore sha256sum exit, select wildcard DEB, accept wrong Architecture, omit active process guard, remove --reinstall, skip installed ownership/byte comparison, launch on mismatch. Static regex does not kill these runtime mutants. Mode B Stage 3–8 global PARTIAL. No code/tests/CI/host install changed.
