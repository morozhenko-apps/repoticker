# Verification

Mode B release-delta inventory, branch map and unresolved production gates
are maintained in [the Mode B release gate](MODE_B_RELEASE_GATE.md).
This file intentionally remains the concise permanent CI contract.


RepoTicker uses targeted tests during development and a complete stable gate for changes ready to ship. Mode B is a finite, risk-driven test-expansion phase after substantial functionality changes or before a release. It is not an automatically repeated pipeline stage.

## Automated checks

- JavaScript tests cover UI state, GitHub monitoring, Settings transactions, localization and failure handling.
- Rust unit/integration tests cover local Git safety, native process behavior, OAuth/credential boundaries and provider response handling.
- Python release contracts cover versions, installer inputs, signatures, package indexes, immutable publication and readback safety.
- Preflight verifies formatting, unit/contract tests, Clippy and Linux native compilation. A separate unpublished platform workflow packages Linux and Windows candidates.

A passing CI build does not prove an installed application's native UI or lifecycle. That requires platform acceptance of the behaviors relevant to the release.


## Shared Settings localization contract

The custom Settings titlebar reuses the canonical `Settings` label already
provided by `CORE_TERMS` for all 20 supported locales. Feature-specific
`EXTENDED_TERMS` must not shadow this label: conflicting values cause
inconsistent WebView labels even when each translation is nonempty.
Preserve the exact locale-parity assertion and a dedicated no-shadowing
regression check. Formatting-only Rust repairs must preserve native
window behavior and pass the normal Preflight gate.

## Release evidence

Use the exact checked source revision, real test outcomes and verified package checksums. Never represent skipped, missing, canceled or failed checks as passed. Keep diagnostics free of credentials and private repository information. One stable test pass is the normal gate; repeat tests only to investigate an evidenced failure or instability.

## CI toolchain maintenance

Scope: refresh maintained GitHub Actions implementations while preserving existing
permissions, triggers, runner routing, cache intent and release/publication gates.
JavaScript action internals use supported Node24; this is distinct from project Node.
Project development/build/test tooling targets exact Node26.13.0 LTS. Update
active pins and exact-version source guards together; compatible broader engine
floors and immutable historical receipts remain unchanged. Keep Linux libatomic
prerequisites where Node26 runs in a minimal container.

Maintained action targets:

- `Swatinem/rust-cache`: `v2.9.3` (`d1527c8f67ef9af357290475d4af4b0fab8f12e0`).
- `actions/checkout`: `v7.0.1` (`3d3c42e5aac5ba805825da76410c181273ba90b1`).
- `actions/download-artifact`: `v8.0.2` (`9000827ccba6bdab643e8b6fd33ac0654aef8333`).
- `actions/upload-artifact`: `v7.0.2` (`cf430e030ddbb5b0abf93d22962f4752f3646cd9`).

Milestones:

- [x] Read current source, agent/CI owners, permanent refs and concurrent work.
- [x] Record scope, compatibility decisions, validation and rollback before code.
- [x] Apply scoped action/toolchain and directly related source-contract changes.
- [x] Execute applicable stable checks once at the final gate; report separate
  known-flaky/stability outcomes and unexecuted native/provider gates.
- [x] Record the final local source/verification boundary and remaining blockers.
- [ ] Complete exact-source remote CI and the separately authorized release process.

Planned validation:

- Parse all affected workflow YAML and verify maintained action SHA/runtime identities.
- Review diffs and preserve permissions, events, routing, signing/publication admission,
  artifact names/paths and existing non-Node SDK versions.
- `Existing source-contract suites: tests/test_release_strict_contract.py, tests/test_ci_policy.py, tests/test_release_retention_contract.py`.
- `node --test tests/*.test.mjs`.
- `python3 -m unittest discover -s tests -v (offline source/distribution contracts)`.

Risk and rollback: action majors may change auth/cache/artifact or build-wrapper
behavior; Node-major transitions require the existing tooling checks. Revert the
scoped executable commit and its documentation update separately if needed. This
maintenance does not authorize protected-branch promotion, tags, store upload,
runner changes or cloud deployment. Native/device/provider acceptance remains
independent of local checks. No architecture or application contract changes.

### Final gate correction

The final source gate found an obsolete exact Node assertion and a staging-upload regex that rejected readable comments after the new exact action pin. Require Node26.13.0 and permit an optional comment after the exact maintained upload SHA; retain exact upload count, artifact names and one-day expiry checks. Rerun the full Python gate.

### Local execution outcome

Applicable local source/tooling gates completed successfully.
Remote CI, protected release-branch promotion, native/provider/store acceptance and production deployment are not established by this local execution.

Node26.13.0 with bundled npm11.20.0 was used. Non-Node SDK versions were preserved. Application dependency versions were preserved; any required test-tool compatibility correction is documented separately.

Executed commands (paths are relative to this repository; glob notation abbreviates the recorded expanded file list):

- `python3 -m unittest discover -s tests -v` — exit `0` (STABLE_SOURCE).
- `node --test 'tests/*.test.mjs'` — exit `0` (STABLE_NODE).

Publication boundary: dev maintenance may be shared with these exact outcomes. Failed gates block completion/release. Main/master, accepted tags, deployment configuration and store identities remain outside this maintenance publication. Rollback uses ordinary reverts of the separate executable commits and this documentation receipt.

## Native QA package provenance on same-version candidates

A development acceptance DEB can have the same semantic version as the
installed production package. Running `apt install` without a reinstall
request may leave the previously installed binary intact. The unpublished
Linux QA installer must use the exact checked CI run and source SHA, verify
the DEB checksum, force a reinstall from that local DEB, and compare the
installed executable byte-for-byte with the executable inside the verified
package before launching. The package's version number alone is not
source provenance.

Installed settings and OS Keyring contents are preserved. Never bypass
the existing single-instance check or treat the existence of an executable
as proof of the candidate. If verification fails, refuse launch and keep
the diagnostic non-secret. The installer remains operator-invoked and may
replace the locally installed app only after owner acceptance of the
unpublished candidate. Do not alter release publication, signing,
protected branches or external services.

Acceptance: bash syntax, exact-package source guard, mandatory
`--reinstall`, content comparison, fail-closed mismatch, installed
runtime diagnostics and a later separate production-release gate.

## Unpublished desktop bundler diagnostics

Native acceptance is separate from the successful Rust compile and unit-test gates. On Ubuntu 24.04, a Tauri executable and DEB may build while the external AppImage `linuxdeploy` step fails. The dev-only candidate workflow sets `NO_STRIP=true` for the Linux bundling command to avoid a known incompatibility between `linuxdeploy`'s stripping tool and modern ELF relocation sections; it also enables verbose Tauri diagnostics to make future bundling failures actionable. This flag does not disable Cargo release optimization, ABI checks, or artifact integrity verification. A passing bundle still requires installed KDE acceptance.

The Windows NSIS candidate depends on Tauri's verified external NSIS toolchain download. An upstream HTTP 5xx is a packaging dependency failure, not a proven application defect. Preserve Tauri's tool verification, the full NSIS build, required checksums, provenance sidecars, and fail-closed artifact upload conditions. Investigate persistent download failures rather than using unverified mirrors or skipping the packaging gate. Unpublished candidate validation never authorizes publishing or changing release branches.
