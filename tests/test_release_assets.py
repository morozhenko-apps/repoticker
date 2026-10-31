import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import release_assets as a


class ReleaseAssetsTest(unittest.TestCase):
    def test_artifact_names(self):
        self.assertEqual(a.canonical("1.2.3", "linux", ".deb"), "repoticker_1.2.3_amd64.deb")
        self.assertEqual(a.canonical("1.2.3", "windows", ".exe"), "RepoTicker-Setup-1.2.3-win-x64.exe")

    def test_windows_collection_requires_whole_semver_source_token(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            sources = root / "sources"
            sources.mkdir()
            for wrong in (
                "RepoTicker_11.0.0_x64-setup.exe",
                "RepoTicker_1.0.0.1_x64-setup.exe",
                "RepoTicker_01.0.0_x64-setup.exe",
            ):
                with self.subTest(source=wrong):
                    p = sources / wrong
                    p.write_bytes(b"unrelated Windows build")
                    with self.assertRaisesRegex(ValueError, "Expected one windows"):
                        a.collect(sources, root / "out", "windows", "1.0.0")
                    p.unlink()
            expected = sources / "RepoTicker_1.0.0_x64-setup.exe"
            expected.write_bytes(b"exact accepted Windows 1.0.0 installer")
            a.collect(sources, root / "accepted", "windows", "1.0.0")
            output = root / "accepted" / a.canonical("1.0.0", "windows", ".exe")
            self.assertEqual(output.read_bytes(), expected.read_bytes())
            self.assertEqual(
                (output.parent / (output.name + ".sha256")).read_text().strip(),
                a.digest(output) + "  " + output.name,
            )
            self.assertEqual(
                json.loads((root / "accepted" / "part.json").read_text())["version"],
                "1.0.0",
            )

    def test_windows_collection_rejects_ambiguous_exact_source_versions(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            sources = root / "sources"
            sources.mkdir()
            (sources / "RepoTicker_1.0.0_x64-setup.exe").write_bytes(b"a")
            (sources / "RepoTicker-1.0.0-win-x64.exe").write_bytes(b"b")
            with self.assertRaisesRegex(ValueError, "found 2"):
                a.collect(sources, root / "out", "windows", "1.0.0")
            self.assertFalse((root / "out").exists())

    def test_candidate_collection_rejects_noncanonical_requested_versions(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for invalid in ("", "v1.0.0", "01.0.0", "1.0.0.1", "1.0.0-rc1"):
                with self.subTest(version=invalid):
                    with self.assertRaisesRegex(ValueError, "Invalid candidate release version"):
                        a.collect(root, root / "out", "windows", invalid)
            self.assertFalse((root / "out").exists())

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
