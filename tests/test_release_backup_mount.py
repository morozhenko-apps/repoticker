"""Fail-closed local backup location admission without real key operations."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "provision_apt_key.sh"
FINGERPRINT = "A" * 40


@unittest.skipUnless(
    all(shutil.which(tool) for tool in ("bash", "gpg", "base64", "realpath")),
    "Signing backup admission tools unavailable",
)
class SigningBackupMountAdmission(unittest.TestCase):
    def invoke(self, destination, fstype="ext4", target="/mnt/backup"):
        with tempfile.TemporaryDirectory(prefix="repoticker-backup-test-") as td:
            base = Path(td)
            binaries = base / "bin"
            binaries.mkdir()
            gh = binaries / "gh"
            gh.write_text("#!/usr/bin/env bash\necho GH_REACHED >&2\nexit 55\n")
            gh.chmod(0o700)
            mount = binaries / "findmnt"
            mount.write_text(
                "#!/usr/bin/env bash\n"
                'case "$*" in\n'
                f'  *"FSTYPE"*) printf "%s\\n" "{fstype}" ;;\n'
                f'  *"TARGET"*) printf "%s\\n" "{target}" ;;\n'
                '  *) exit 9 ;;\n'
                'esac\n'
            )
            mount.chmod(0o700)
            env = os.environ.copy()
            env.pop("REPOTICKER_SIGNING_BACKUP_DIR", None)
            if destination == "EXISTING":
                dest = base / "backup"
                dest.mkdir()
                destination = str(dest)
            elif destination == "MISSING":
                destination = str(base / "missing")
            if destination is not None:
                env["REPOTICKER_SIGNING_BACKUP_DIR"] = destination
            env["PATH"] = str(binaries) + os.pathsep + env.get("PATH", "")
            result = subprocess.run(
                ["bash", str(SCRIPT), FINGERPRINT],
                capture_output=True, text=True, env=env,
                timeout=10, check=False,
            )
            output = result.stdout + result.stderr
            self.assertNotIn(str(base), output, "Local backup paths must be redacted")
            return result.returncode, output

    def test_unset_and_relative_path_fail_before_github_access(self):
        for destination in (None, "relative/backup"):
            with self.subTest(destination=destination):
                status, output = self.invoke(destination)
                self.assertNotEqual(status, 0)
                self.assertIn("REPOTICKER_SIGNING_BACKUP_DIR", output)
                self.assertNotIn("GH_REACHED", output)

    def test_absent_backup_directory_is_never_created(self):
        status, output = self.invoke("MISSING")
        self.assertNotEqual(status, 0)
        self.assertIn("existing absolute directory", output)
        self.assertNotIn("GH_REACHED", output)

    def test_existing_local_directory_is_not_treated_as_mounted_backup(self):
        status, output = self.invoke("EXISTING", fstype="ext4")
        self.assertNotEqual(status, 0)
        self.assertIn("not on a remote or FUSE filesystem", output)
        self.assertNotIn("GH_REACHED", output)

    def test_root_mount_and_unwritable_backup_are_rejected(self):
        status, output = self.invoke("EXISTING", fstype="fuse.rclone", target="/")
        self.assertNotEqual(status, 0)
        self.assertIn("unavailable or not writable", output)
        self.assertNotIn("GH_REACHED", output)

    def test_mounted_fuse_path_reaches_auth_only_and_never_provisions(self):
        status, output = self.invoke("EXISTING", fstype="fuse.rclone")
        self.assertEqual(status, 55)
        self.assertIn("GH_REACHED", output)
        self.assertNotIn("Signing subkey and passphrase validated", output)


if __name__ == "__main__":
    unittest.main()
