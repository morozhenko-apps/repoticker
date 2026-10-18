import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
import r2_release
import release_assets


class R2ArtifactContract(unittest.TestCase):
    def prepare(self, root):
        for platform in ("linux", "windows"):
            folder = root / "release" / platform
            folder.mkdir(parents=True)
            files = []
            for ext in release_assets.TYPES[platform]:
                name = release_assets.canonical("0.1.0", platform, ext)
                path = folder / name
                path.write_bytes(b"test-" + name.encode())
                checksum = release_assets.digest(path)
                (folder / (name + ".sha256")).write_text(checksum + "  " + name + "\n")
                files.append({"path": platform + "/" + name, "sha256": checksum,
                              "size": path.stat().st_size})
            (folder / "part.json").write_text(
                json.dumps({"platform": platform, "version": "0.1.0", "files": files}))
        apt = root / "apt"
        for path in (
            "pool/main/r/repoticker/repoticker_0.1.0_amd64.deb",
            "dists/stable/main/binary-amd64/by-hash/SHA256/" + "a" * 64,
            "dists/stable/InRelease", "repoticker-archive-keyring.gpg",
        ):
            item = apt / path
            item.parent.mkdir(parents=True, exist_ok=True)
            item.write_bytes(b"test")
        return apt

    def test_rejects_wrong_native_files_before_any_r2_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            apt = self.prepare(root)
            release = root / "release"
            items, active = r2_release.source_map(release, apt, "0.1.0")
            self.assertIn("releases/v0.1.0/windows/RepoTicker-Setup-0.1.0-win-x64.exe", items)
            self.assertEqual(active[0], "apt/dists/stable/InRelease")
            unexpected = release / "linux" / "evil-0.1.0.deb"
            unexpected.write_bytes(b"bad")
            with self.assertRaisesRegex(ValueError, "Unexpected file"):
                r2_release.source_map(release, apt, "0.1.0")
            unexpected.unlink()
            (release / "linux" / "repoticker_0.1.0_amd64.deb.sha256").write_text("bad")
            with self.assertRaisesRegex(ValueError, "sidecar mismatch"):
                r2_release.source_map(release, apt, "0.1.0")


if __name__ == "__main__":
    unittest.main()
