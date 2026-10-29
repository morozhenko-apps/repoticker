# Mode B — release artifact version token identity

Date: 2026-10-29. Source: `scripts/release_assets.py::collect`.

## Risk and observed source
The candidate collector discovers files using `version in p.name`,
which also accepts a longer embedded semantic version: a source file
`RepoTicker_11.0.0_x64-setup.exe` matches expected `1.0.0`.
It would be copied and re-labeled with the correct *destination*
name, so the resulting SHA256 sidecar describes incorrect source
bytes. Linux DEBs additionally verify dpkg metadata; Windows NSIS
has no equivalent source metadata verification in the collector.
This is a genuine artifact provenance weakness.

## Remediation and tests
Use a bounded semantic-version token with no adjacent digit or dot
instead of substring matching. Reject malformed requested versions
before searching the filesystem. Preserve the existing generic Tauri
bundle filename support (Tauri can use distinct Linux/Windows suffixes),
exactly-one-candidate rule, Windows/Linux checksums, source SHA and
signed distribution process.

Add isolated Windows collector tests: exact v1.0.0 filename accepted;
`11.0.0`, `1.0.0.1`, `01.0.0` only artifacts refused;
ambiguous two same-version files refused; invalid requested version
rejected. This is Mode B N1/N2/N6/N7 release-provenance coverage.
Execute the full stable CI once after the cohesive candidate batch;
do not start a separate release job or publication for this fix.
