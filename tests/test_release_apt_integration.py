import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import apt_repository


@unittest.skipUnless(all(shutil.which(cmd) for cmd in (
    "apt-ftparchive", "dpkg-scanpackages", "dpkg-deb", "gpg", "gpgv")),
    "Debian APT packaging tools are not installed")
class SignedAptIntegration(unittest.TestCase):
    def test_signed_inrelease_and_by_hash_for_fixture_deb(self):
        with tempfile.TemporaryDirectory(prefix="repoticker-apt-contract-") as dirname:
            root = Path(dirname)
            files = root / "package"
            control = files / "DEBIAN"
            control.mkdir(parents=True)
            (control / "control").write_text(
                "Package: repo-ticker\n"
                "Version: 0.1.0\n"
                "Architecture: amd64\n"
                "Maintainer: RepoTicker CI <ci@example.invalid>\n"
                "Depends: libgtk-layer-shell0\n"
                "Description: RepoTicker integration test fixture\n",
                encoding="utf-8"
            )
            deb = root / "repo-ticker_0.1.0_amd64.deb"
            subprocess.run(["dpkg-deb", "--build", str(files), str(deb)],
                           check=True, capture_output=True)
            gnupg = root / "gnupg"
            gnupg.mkdir(mode=0o700)
            (root / "signing-passphrase").write_text("")
            subprocess.run([
                "gpg", "--homedir", str(gnupg), "--batch", "--pinentry-mode", "loopback",
                "--passphrase", "", "--quick-generate-key",
                "RepoTicker Integration Test", "ed25519", "default", "1d"
            ], check=True, capture_output=True)
            listing = subprocess.check_output(
                ["gpg", "--homedir", str(gnupg), "--batch", "--with-colons",
                 "--list-secret-keys"], text=True
            )
            fingerprint = next(
                line.split(":")[9] for line in listing.splitlines()
                if line.startswith("fpr:")
            )
            output = root / "apt-repository"
            apt_repository.assemble(
                deb, output, "0.1.0", gnupg, fingerprint,
                root / "signing-passphrase"
            )
            apt_repository.verify(
                output, output / "repoticker-archive-keyring.gpg"
            )
            release = (output / "dists/stable/Release").read_text()
            self.assertIn("Acquire-By-Hash: yes", release)
            self.assertIn("Architectures: amd64", release)
            self.assertIn("main/binary-amd64/Packages.gz", release)
            index = output / "dists/stable/main/binary-amd64/Packages.gz"
            hashed = index.parent / "by-hash/SHA256" / apt_repository.sha256(index)
            self.assertEqual(index.read_bytes(), hashed.read_bytes())
            uncompressed = index.parent / "Packages"
            plain_hash = uncompressed.parent / "by-hash/SHA256" / apt_repository.sha256(uncompressed)
            self.assertEqual(uncompressed.read_bytes(), plain_hash.read_bytes())
            # Wrong public key or altered signed release must not pass gpgv.
            signed = output / "dists/stable/InRelease"
            original = signed.read_bytes()
            self.assertIn(b"Origin: RepoTicker", original)
            signed.write_bytes(original.replace(b"Origin: RepoTicker", b"Origin: ForgedTicker", 1))
            with self.assertRaises(subprocess.CalledProcessError):
                apt_repository.verify(output, output / "repoticker-archive-keyring.gpg")


if __name__ == "__main__":
    unittest.main()
