"""Integration contract for isolated CI signing-subkey passphrase validation."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "verify_signing_passphrase.sh"
TOOLS = ("gpg", "gpgconf", "gpgv", "bash", "python3")


def run(*args, env, data=None, expect_success=True):
    process = subprocess.run(
        list(map(str, args)), input=data, env=env, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, timeout=30, check=False
    )
    if expect_success and process.returncode != 0:
        raise AssertionError(
            f"Command failed with status {process.returncode}: "
            + process.stderr.decode(errors="replace")
        )
    return process


@unittest.skipUnless(all(shutil.which(command) for command in TOOLS),
                     "GPG signing integration tools are unavailable")
class SigningPassphraseIntegration(unittest.TestCase):
    def test_isolated_correct_and_incorrect_passphrases(self):
        with tempfile.TemporaryDirectory(prefix="repoticker-signing-") as temp:
            home = Path(temp) / "source-gnupg"
            home.mkdir(mode=0o700)
            env = os.environ.copy()
            env["GNUPGHOME"] = str(home)
            passphrase = "repo-ticker-ci-fixture-only"
            common = ("gpg", "--batch", "--yes", "--pinentry-mode", "loopback",
                      "--passphrase", passphrase)
            run(*common, "--quick-generate-key",
                "RepoTicker Test <repoticker-test@example.invalid>",
                "ed25519", "cert", "0", env=env)
            inventory = run("gpg", "--batch", "--with-colons",
                            "--list-secret-keys", env=env).stdout.decode()
            fingerprint = next(
                row.split(":")[9] for row in inventory.splitlines()
                if row.startswith("fpr:")
            )
            run(*common, "--quick-add-key", fingerprint, "ed25519",
                "sign", "0", env=env)

            exported = run(*common, "--export-secret-subkeys", fingerprint,
                           env=env).stdout
            self.assertGreater(len(exported), 100)

            password_file = Path(temp) / "sign-passphrase"
            password_file.write_text("incorrect-passphrase")
            password_file.chmod(0o600)
            wrong = run("bash", SCRIPT, fingerprint, password_file, env=env,
                        data=exported, expect_success=False)
            self.assertNotEqual(wrong.returncode, 0)
            self.assertIn(b"rejected the provided passphrase", wrong.stderr)

            password_file.write_text(passphrase)
            correct = run("bash", SCRIPT, fingerprint, password_file,
                          env=env, data=exported)
            self.assertIn(b"verification passed", correct.stdout)

            corrupt = run("bash", SCRIPT, fingerprint, password_file,
                          env=env, data=b"not an OpenPGP private key",
                          expect_success=False)
            self.assertNotEqual(corrupt.returncode, 0)

    def test_github_secret_write_is_after_verification(self):
        script = (ROOT / "scripts" / "provision_apt_key.sh").read_text()
        self.assertLess(script.index('verify_signing_passphrase.sh'),
                        script.index('gh secret set REPOTICKER_APT_SIGNING_SUBKEY_BASE64'))
        self.assertLess(script.index('verify_signing_passphrase.sh'),
                        script.index('gh secret set REPOTICKER_APT_SIGNING_PASSPHRASE'))


if __name__ == "__main__":
    unittest.main()
