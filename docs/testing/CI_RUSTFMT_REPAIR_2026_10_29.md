# Preflight incident — Rustfmt gate blocking Mode B

**Observed run:** [40933233701](https://github.com/morozhenko-apps/repoticker/actions/runs/40933233701)
on `dev`, SHA `fb20df8c1c041ad6f9749bd15429095623189b0c`, 2026-10-29
18:41:49–18:43:52 UTC (Europe/Lisbon UTC+0).
**First consecutive failed run inspected:** [40878650803](https://github.com/morozhenko-apps/repoticker/actions/runs/40878650803), 13:04:38 UTC.
The latest nine Preflight runs all report **failure**.

## Diagnosis

The Rust job fails at `cargo fmt --all --check`.
The complete latest failure log supplies **23 Rustfmt diff hunks
in 6 source files**; the first failure also reports the same
step. This blocks Rust core tests and Clippy from executing
on those runs. The separate JavaScript/Python and Linux
desktop compile jobs were successful on the latest SHA.
The aggregate final job fails because one required job failed,
not because the summary gate itself is defective.

## Remediation plan and invariant

1. Apply the **exact formatting transformations from the
   failing CI rustfmt diff**, limited to these files:
   `apps/desktop/src-tauri/src/github_api.rs`,
   `github_etag_cache.rs`, `github_oauth_wire.rs`,
   `github_rate_gate.rs`, `github_session.rs`, and
   `crates/repoticker-core/src/github_auth.rs`.
2. Modify no runtime behavior, tests, authentication,
   release policy, dependency or workflow. Preserve every
   assertion and only rewrite whitespace / line wrapping
   according to the formatter's logged diff.
3. Validate that every one of the 23 hunks matches the
   exact current source and is applied once. Avoid a
   manually guessed or incomplete subset.
4. Keep documentation changes in separate commits from
   Rust formatting changes. Advance `dev` exactly once
   after constructing the complete chain, rather than
   running incremental CI attempts.
5. Do not claim Rust tests/Clippy PASS yet: they were never
   reached on the failed run. The next exact-SHA Preflight
   must execute them and may reveal separate failures.
   Do not poll its result without an explicit request.

**Environment:** current local execution container does not
include cargo/rustfmt or a clone of the repository; the
reproduction is the actual rustfmt diff in the GitHub Actions
log. An exact logged transformation is preferable to
inferred reformatting. If the user wants a pre-CI local
verification on Ubuntu, run `cargo fmt --all --check`.

**Release gates:** Mode B and final Windows/KDE/L10N
acceptance remain open. This incident does not authorize
`main`, release tag, R2, or runner infrastructure changes.
