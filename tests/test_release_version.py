import unittest
import tempfile
import pathlib
import json
import subprocess
import sys
import importlib.util
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import release_version as rv


class VersionContract(unittest.TestCase):
    def test_repo_markers_agree(self):
        self.assertRegex(rv.versions(), r"^\d+\.\d+\.\d+$")
        repo = ROOT / "apps/desktop/src-tauri/tauri.conf.json"
        cfg = json.loads(repo.read_text())
        self.assertTrue(cfg["bundle"]["active"])
        self.assertEqual(cfg["bundle"]["license"], "Apache-2.0")
        self.assertIn("icons/icon.icns", cfg["bundle"]["icon"])

    def test_tag_validation_is_strict(self):
        version = rv.versions()
        good = subprocess.run(
            [sys.executable, str(ROOT / "scripts/release_version.py"), "--check-tag", "v" + version],
            check=False, capture_output=True,
        )
        self.assertEqual(good.returncode, 0, good.stderr)
        bad = subprocess.run(
            [sys.executable, str(ROOT / "scripts/release_version.py"), "--check-tag", "v0.0.0-bad"],
            check=False, capture_output=True,
        )
        self.assertNotEqual(bad.returncode, 0)

    def test_bump_in_isolated_copy(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            a = root / "core.toml"
            b = root / "desktop.toml"
            t = root / "tauri.json"
            a.write_text('[package]\nversion = "0.1.0"\n')
            b.write_text('[package]\nversion = "0.1.0"\n')
            t.write_text('{"version":"0.1.0"}')
            with patch.object(rv, "CARGO", (a, b)), patch.object(rv, "TAURI", t):
                self.assertEqual(rv.bump("patch"), "0.1.1")
                self.assertEqual(rv.bump("minor"), "0.2.0")
                self.assertEqual(rv.bump("major"), "1.0.0")
                self.assertEqual(rv.versions(), "1.0.0")


if __name__ == "__main__":
    unittest.main()
