import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import release_assets as a


class ReleaseAssetsTest(unittest.TestCase):
    def test_artifact_names(self):
        self.assertEqual(a.canonical("1.2.3", "linux", ".deb"), "repo-ticker_1.2.3_amd64.deb")
        self.assertEqual(a.canonical("1.2.3", "windows", ".exe"), "RepoTicker-Setup-1.2.3-win-x64.exe")

    def test_merge_validates_all_platforms_and_bytes(self):
        with tempfile.TemporaryDirectory() as dir:
            root = Path(dir)
            parts = []
            for platform, types in a.TYPES.items():
                folder = root / platform
                folder.mkdir()
                files = []
                for ext in types:
                    name = a.canonical("0.1.0", platform, ext)
                    out = folder / name
                    out.write_bytes(("binary:" + name).encode())
                    files.append({"path": f"{platform}/{name}", "sha256": a.digest(out),
                                  "size": out.stat().st_size, "contentType": a.MIMES[ext]})
                part = folder / "part.json"
                part.write_text(json.dumps({"platform": platform, "version": "0.1.0", "files": files}))
                parts.append(part)
            result = root / "latest.json"
            a.merge(parts, result, "0.1.0")
            self.assertEqual(json.loads(result.read_text())["product"], "RepoTicker")
            # Linux/Windows form a complete release while macOS is stubbed.
            a.merge(parts[:2], result, "0.1.0")
            with self.assertRaisesRegex(ValueError, "Missing platforms"):
                a.merge(parts[:1], result, "0.1.0")
            (root / "linux" / a.canonical("0.1.0", "linux", ".deb")).write_bytes(b"wrong")
            with self.assertRaisesRegex(ValueError, "checksum"):
                a.merge(parts, result, "0.1.0")


if __name__ == "__main__":
    unittest.main()
