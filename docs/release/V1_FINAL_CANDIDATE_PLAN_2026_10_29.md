# RepoTicker 1.0.0 candidate and final one-shot gate

Date: 2026-10-29. Owner request: finish the Mode B and release
preparation without rerunning the full stable suite after every small
change. Baseline: `78314dc137690b1413fe687a0a1e027d18d905c4`.

## Decisions

1. The owner states that KDE/Windows and 20-language user acceptance
   have already been performed. Do not demand duplicate manual tests.
   Record this as **owner attestation**, not independent per-platform,
   per-locale run logs or reviewer names that were not provided.
2. Prepare the version `1.0.0` in `dev` as an **unpublished candidate**.
   Update both Cargo package versions, the Tauri package version and
   only the corresponding two local entries in `Cargo.lock`. Keep the
   remaining pinned dependency graph unchanged.
3. Correct the unpublished desktop acceptance workflow: derive the
   release candidate version from the shared version validator,
   instead of hardcoding `0.2.0` after the project version advances.
   Verify checksum and source-SHA artifacts for both OS builds.
4. Add deterministic contract tests for locked version markers,
   release workflow main+tag admission, candidate dynamic version
   and non-publication isolation. Do not hide or skip failing tests.
5. Publish one coherent source set to `dev`, triggering its required
   Preflight plus **unpublished** Linux/Windows candidate builds.
   Do not run CI repeatedly during intermediate implementation and
   do not poll once started.
6. **Publication gate:** do not move `main`, create `v1.0.0` or
   call protected R2 until the exact candidate commit passes CI,
   release-candidate bundles have valid SHA256/installation evidence
   and mandatory Mode B acceptance is supported. A successful
   compilation alone does not establish runtime or independent
   semantic review. The owner has given product release intent,
   but unknown evidence is not a PASS.

## Failure diagnosis

The current candidate workflow collects `--version 0.2.0` on Linux
and Windows. The publisher validates bundle filenames and DEB metadata
against the declared version. Once the Cargo/Tauri package versions are
changed, this stale collection argument will reject valid new bundles.
Possible failure layers considered: Cargo version disagreement, lockfile
drift, artifact packager name, test collection, workflow output path,
and provenance mismatch. Source inspection identifies the literal
version in both platform collection steps as a deterministic blocker.
Fix the version dependency itself rather than rewriting outputs or
bypassing provenance validation.

## Mode B and rollback

This batch does not claim 100% branch coverage, mutation score or
20 independent native-speaker approvals. The required Mode B report
must distinguish source-tested behavior, CI, owner-confirmed physical
checks, and evidence unavailable to the agent. Full stable gate
runs once on a coherent candidate SHA; failures are repaired before
release. No private local paths, token or signing material should
enter public documentation.

Rollback is a single revert of the source/test candidate commit
before publication; reverse the documentation checkpoint separately.
Do not rewrite immutable published artifacts or old release tags.
