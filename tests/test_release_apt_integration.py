import os
import pwd
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import apt_repository


@unittest.skipUnless(all(shutil.which(cmd) for cmd in (
    "dpkg-scanpackages", "dpkg-deb", "gpg", "gpgv", "apt-get", "apt-cache")),
    "Debian APT packaging tools are not installed")
class SignedAptIntegration(unittest.TestCase):
    def test_given_real_signed_flat_apt_when_verified_then_direct_deb_and_catalog_are_identical(self):
        dirname = self.enterContext(tempfile.TemporaryDirectory(prefix="repoticker-apt-contract-"))
        root = Path(dirname)
        files = root / "package"
        control = files / "DEBIAN"
        control.mkdir(parents=True)
        (control / "control").write_text(
            "Package: repoticker\n"
            "Version: 0.1.0\n"
            "Architecture: amd64\n"
            "Maintainer: RepoTicker CI <ci@example.invalid>\n"
            "Depends: libgtk-layer-shell0\n"
            "Description: RepoTicker integration test fixture\n",
            encoding="utf-8"
        )
        deb = root / "repoticker_0.1.0_amd64.deb"
        subprocess.run(["dpkg-deb", "--build", str(files), str(deb)],
                       check=True, capture_output=True)
        gnupg = root / "gnupg"
        gnupg.mkdir(mode=0o700)
        self.addCleanup(subprocess.run, ["gpgconf", "--homedir", str(gnupg), "--kill", "gpg-agent"], check=True)
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
        release = (output / "Release").read_text()
        self.assertIn("Architectures: amd64", release)
        self.assertNotIn("Acquire-By-Hash", release)
        self.assertIn(" Packages.gz", release)
        self.assertEqual((output / deb.name).read_bytes(), deb.read_bytes())
        catalog = (output / "Packages").read_text()
        self.assertIn("Filename: ./" + deb.name, catalog)
        self.assertEqual({item.name for item in output.iterdir()}, {
            deb.name, "Packages", "Packages.gz", "Release", "InRelease",
            "repoticker-archive-keyring.gpg"
        })
        self.assert_flat_apt_acquisition(root, output, deb)
        # Altered signed cleartext must fail real gpgv verification.
        signed = output / "InRelease"
        original = signed.read_bytes()
        self.assertIn(b"Origin: RepoTicker", original)
        signed.write_bytes(original.replace(b"Origin: RepoTicker", b"Origin: ForgedTicker", 1))
        with self.assertRaises(subprocess.CalledProcessError):
            apt_repository.verify(output, output / "repoticker-archive-keyring.gpg")

    def assert_flat_apt_acquisition(self, root, repository, deb):
        client = root / "client"
        for relative in ["etc/apt", "state/lists/partial", "cache/archives/partial", "log", "downloads"]:
            (client / relative).mkdir(parents=True)
        (client / "state/status").write_text("")
        keyring = repository / "repoticker-archive-keyring.gpg"
        (client / "etc/apt/source.list").write_text(
            f"deb [arch=amd64 signed-by={keyring}] {repository.as_uri()}/ ./\n")
        config = client / "apt.conf"
        config.write_text(f'''Dir "{client}";
Dir::Etc "etc/apt";
Dir::Etc::main "-";
Dir::Etc::parts "-";
Dir::Etc::sourcelist "source.list";
Dir::Etc::sourceparts "-";
Dir::Etc::trusted "trusted.gpg";
Dir::Etc::trustedparts "-";
Dir::State "state";
Dir::State::status "{client}/state/status";
Dir::State::lists "lists";
Dir::Cache "cache";
Dir::Cache::archives "archives";
Dir::Log "log";
APT::Architecture "amd64";
APT::Architectures {{ "amd64"; }};
APT::Sandbox::User "{pwd.getpwuid(os.geteuid()).pw_name}";
Acquire::Languages "none";
Acquire::Retries "0";
Acquire::AllowInsecureRepositories "false";
APT::Get::AllowUnauthenticated "false";
''')
        env = {"PATH": os.environ["PATH"], "HOME": str(client), "LC_ALL": "C", "APT_CONFIG": str(config)}
        def invoke(binary, *arguments):
            result = subprocess.run([binary, *arguments], cwd=client / "downloads", env=env,
                                    capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            return result.stdout
        invoke("apt-get", "update", "--error-on=any")
        self.assertIn("Candidate: 0.1.0", invoke("apt-cache", "policy", "repoticker"))
        invoke("apt-get", "download", "repoticker=0.1.0")
        downloads = list((client / "downloads").glob("*.deb"))
        self.assertEqual(len(downloads), 1)
        self.assertEqual(downloads[0].read_bytes(), deb.read_bytes())
        self.assertEqual((client / "state/status").read_text(), "")


if __name__ == "__main__":
    unittest.main()
