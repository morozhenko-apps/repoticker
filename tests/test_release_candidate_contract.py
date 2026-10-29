"""Guard v1.0.0 candidate version and unpublished artifact provenance."""
import pathlib
import sys
import tomllib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import release_version


class ReleaseCandidateContract(unittest.TestCase):
    def test_locked_workspace_packages_match_both_cargo_and_tauri(self):
        version = release_version.versions()
        packages = tomllib.loads((ROOT / "Cargo.lock").read_text(encoding="utf-8"))
        for name in ("repoticker", "repoticker-core"):
            with self.subTest(package=name):
                matches = [p for p in packages["package"] if p["name"] == name]
                self.assertEqual(len(matches), 1)
                self.assertEqual(matches[0]["version"], version)
        self.assertGreaterEqual(int(version.split(".")[0]), 1)

    def test_candidate_linux_and_windows_collect_current_workspace_version(self):
        workflow = (ROOT / ".github/workflows/desktop-acceptance-candidates.yml").read_text()
        self.assertIn('VERSION="$(python3 scripts/release_version.py)"', workflow)
        self.assertIn('--platform linux --version "$VERSION"', workflow)
        self.assertIn('$version = python scripts/release_version.py', workflow)
        self.assertIn('--platform windows --version "$version"', workflow)
        self.assertNotIn("--version 0.2.0", workflow)
        self.assertNotIn("official v0.2.0 release", workflow)

    def test_candidate_bundles_have_sha_receipts_and_cannot_publish(self):
        workflow = (ROOT / ".github/workflows/desktop-acceptance-candidates.yml").read_text()
        self.assertIn('"$GITHUB_SHA" > "$OUT/SOURCE_SHA.txt"', workflow)
        self.assertIn('Set-Content -Path "$env:OUT/SOURCE_SHA.txt" -Value "$env:GITHUB_SHA"', workflow)
        self.assertEqual(workflow.count("NOT_A_RELEASE.txt"), 2)
        self.assertIn("sha256sum -c -- *.sha256", workflow)
        self.assertIn("Get-FileHash -Algorithm SHA256", workflow)
        self.assertIn("if-no-files-found: error", workflow)
        for forbidden in ("gh release create", "scripts/r2_release.py", "environment: apt-release"):
            self.assertNotIn(forbidden, workflow)

    def test_candidate_changes_to_version_or_lockfile_trigger_both_builds(self):
        workflow = (ROOT / ".github/workflows/desktop-acceptance-candidates.yml").read_text()
        for name in (
            "Cargo.lock",
            "crates/repoticker-core/Cargo.toml",
            "apps/desktop/src-tauri/Cargo.toml",
            "apps/desktop/src-tauri/tauri.conf.json",
            "scripts/release_version.py",
        ):
            with self.subTest(file=name):
                self.assertIn("      - '" + name + "'", workflow)
        self.assertIn("branches: [dev]", workflow)

    def test_publication_restricted_to_main_matching_tag_and_protected_env(self):
        release = (ROOT / ".github/workflows/desktop-release-candidates.yml").read_text()
        self.assertIn('git rev-parse origin/main^{commit}', release)
        self.assertIn('python3 scripts/release_version.py --check-tag "$RELEASE_TAG"', release)
        self.assertIn("environment: apt-release", release)
        self.assertIn("scripts/r2_release.py", release)
        self.assertIn("needs: [validate, publish, cleanup]", release)


if __name__ == "__main__":
    unittest.main()
