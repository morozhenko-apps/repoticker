# Mode B: unpublished Windows/KDE candidates, relay bundle and native Cargo lock evidence

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, named branch `audit/mode-b-testing`, prepared parent `732bb1f6f92cb1713c14ea948cadaab12e0f4d02`.
Workflows: `.github/workflows/desktop-acceptance-candidates.yml` blob `674c6bae2cf322ee853e05113abe6d936671ff8f` (123 source lines); `.github/workflows/relay-worker-dry-run.yml` blob `2531cde1e17a44c92ed573f5039414453d999580` (48 lines); `.github/workflows/relay-lock-candidate.yml` blob `431071d46876935210b980cc8bbcaf72851d1f73` (56 lines).

Assertion sources: `tests/test_release_candidate_contract.py` blob `ea91f3a9b4acd57f0df24f21518d3af276ef4871` (**6 Python tests**, mostly source text and real current `release_version.versions`/Cargo.lock parse); `tests/test_release_native_candidate_paths.py` blob `8e2eccfc0bece3f130b055e563c85319b7b77097` (**3 Python tests**, parsed path patterns and source strings); `tests/test_release_native_gate_contract.py` (**3 static checks**); `tests/test_release_lockfile_contract.py` blob `8e749982d70fc255aa900a94f090d27dae2d1d15` (**2 source/lockfile checks**); `tests/relay-worker-binding-retention.test.mjs` blob `b3814c78302b75e2d0c53b99045898f6e68d854b` (**4 static/JSON/TOML checks**).

These tests inspect exact configuration and CLI *declarations*, not actual Windows/KDE installers, Wrangler compilation, npm execution, Cloudflare network or signing. No new build, CI dispatch or release was run.

## Exact workflow branch ledger

| Workflow / gate | Production/external action and conditional branches | Evidence vs unverified |
| --- | --- | --- |
| Desktop candidate triggers | `push` dev **only** and specified native/UI/lock/version paths; manual dispatch declared | E `test_release_native_candidate_paths` resolves globs across source/capabilities/icons/UI/lock; docs-only excluded; ? GitHub provider event/path behavior |
| Linux candidate `if` | `github.ref == refs/heads/dev` required; Ubuntu 24.04 installs Tauri/GTK Layer Shell dependencies and builds DEB+AppImage from locked sources | S native candidate and source check; ? actual KDE/Wayland physical acceptance, installer execution |
| Linux version/provenance | Derive current release_version.py, `release_assets.py collect` exact Linux; `sha256sum -c` sidecars; write `SOURCE_SHA.txt` and `NOT_A_RELEASE.txt`, upload 7-day staging | E static candidate contract checks; build/download never invoked in this analysis |
| Windows candidate `if` | Same dev-only condition, Windows 2025; first run actual Rust core headless Git process tests and Tauri native desktop Rust tests; build NSIS locked | E source static tests that both Rust command strings exist; OS runtime/build unknown |
| Windows version/provenance | Current version, exact native .exe artifact collect and SHA256 via Get-FileHash, source SHA marker, unsigned/nonrelease warning, upload 7-day staging | E source tests, ? actual NSIS install/portable UI and uninstall |
| Candidate trust separation | No signing protected environment, R2 upload, GitHub release publication or production release tag | E `test_candidate_bundles_have_sha_receipts_and_cannot_publish` text asserts absence; ? other third-party hooks outside repo are not asserted |
| Relay Worker dry run trigger | `workflow_dispatch`, or dev push touching Worker/workflow/`tests/relay-*.test.mjs`; job also gated dev only | E `relay-worker-binding-retention` source and naming; ? unrelated branching workflow execution |
| Relay Worker test command | `node --test tests/relay-*.test.mjs`; *does not match* `tests/mode-b-relay-*.test.mjs` glob. `preflight.yml` and `strict.yml` use `tests/*.test.mjs`, so Mode B relay tests still run in global gates | Source-exact glob distinction; do not claim Mode B relay tests entirely absent from CI |
| Wrangler dry-run | Node 26.13.0, `wrangler@4.158.0 deploy --dry-run --outdir...`, require nonempty JS bundle; CI true, metrics false; no API token or secret upload step | E static test checks exact dry-run, no persisted checkout creds and no token references; ? bundler actually succeeds on target head |
| Wrangler variables | `keep_vars = true` top-level, RelayHub DO SQLite binding, no source-embedded operator allowlist/secret | E 4 JS source/TOML checks; no live dashboard binding readback |
| Native relay lock | Manual dispatch or dev push changing Tauri Cargo.toml/workflow; job dev only, read-only contents, no signing/deploy; generate `Cargo.lock`, rustfmt and canonical source diffs, upload 3-day evidence | S source; `test_release_lockfile_contract` only validates lockfile and `--locked` quality-gate references, **not** entire relay-lock output inventory |
| Native relay lock admission | `cargo metadata` unlock then `cargo fmt --all`, `cargo metadata --locked`, `git diff --check`, write `GITHUB_SHA`, lock SHA256, diff files | S; ? malformed/empty diff, version drift and provenance attestation of uploaded evidence |

## Interaction and deployment safety

- The **audit branch is not dev**; each dev-only candidate job has an explicit runtime `if` that prevents running it on `audit/mode-b-testing`, even if an operator dispatches the workflow at that ref. This is not an audit failure but affects Stage 11 proof design: desktop Rust can be tested via Preflight dispatch on the audit branch, while actual Windows candidate acceptance requires a reviewed dev-source run (or another explicitly authorized compatible method). Do **not** silently move `dev` just for coverage statistics.
- `relay-worker-dry-run.yml` uses Wrangler only in `--dry-run` mode; production Cloudflare Git-linked deployments and dashboard-managed bindings are outside its evidence. `keep_vars=true` is a config assertion, not proof that runtime secret bindings actually survived an external deployment.
- Compiler/build success does not imply physical Windows/KDE tray, OS Keyring, native dialogs or WebKit/WebView focus behavior. Physical acceptance is a separate release gate.
- Even if all docs paths are excluded from candidate triggers, **a PR into dev/main can still trigger Preflight**, with scope classifier expected to decide whether expensive jobs are skipped. A docs-only commit is not proof no GitHub Action ran.
- `relay-lock-candidate.yml` creates an unpublished artifact containing source diff and SHA; it does not commit or apply lock changes. The output must be reviewed against exact source SHA before cherry-pick.

## Positive / N1–N12 scope

| Class | Evidence and remaining |
| --- | --- |
| Positive | E workflow structural path/build/command contracts, not real execution |
| N1 | E invalid path intent and missing release marker prohibited in static checks; ? YAML event parser faults |
| N2 | E exactly named critical path families and 7/3-day staging; ? bundle omitted or zero artifact physical |
| N3 | ? npm/Wrangler download, Rust toolchain/installer and hosted runner outages |
| N4 | ? manual repeated dispatch and same SHA output identity; no public upload claimed |
| N5 | ? dev push while manual native build active, workflows cancel-in-progress behavior |
| N6 | E Cargo.lock tracked and `--locked` commands; ? corrupted candidate artifact/foreign source SHA receipt |
| N7 | E read-only permissions/no persisted checkout token, no R2 credentials in candidates |
| N8 | NA, only source/version identity and fixed retention days |
| N9 | OS: native installer, tray, uninstall, focus and user acceptance |
| N10 | E avoid embedding operator secrets/allowlists in Wrangler config; physical dashboard readback ? |
| N11 | NA |
| N12 | ? disk-full/timeout/upload artifact failure; workflow uses if-no-files-found error |

## Stage 9 / final acceptance obligations

- NC1: test every source path family (including renamed source files and unexpected nested docs) using actual GitHub path pattern or consistent parser, assert known edits trigger appropriate OS jobs.
- NC2: report actual native Windows test/build and KDE physical acceptance from owner/CI SHA, not regex-only source checks.
- NC3: demonstrate Worker bundle exists under exact Wrangler/Node lock and no real deploy; if dry-run remains dev-gated, note source-branch selection in final evidence.
- NC4: resolve whether `mode-b-relay-*.test.mjs` belongs in the Worker-specific dry-run trigger/command or only global Strict, without auto-expanding a deployment policy. Current global suite includes it.
- NC5: verify relay lock candidate source/lockfile evidence not accidentally applied or treated as release.

Mutants: drop dev-only guard, remove no-secret checkout, omit Windows native Rust test, stop checking SHA, publish candidate via R2, remove dry-run, change keep_vars, let docs run 100-minute packaging. These are structural/runtime mutations; existing static contract tests kill only those they actually assert. Stage 3–8 PARTIAL, no source/test/CI/deployment change.
