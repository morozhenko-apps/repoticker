import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from verify_signing_key import validate


FPR = "A" * 40
SUB = "B" * 40


def record(kind, secret="", caps=""):
    fields = [""] * 15
    fields[0] = kind
    fields[11] = caps
    fields[14] = secret
    return ":".join(fields)


def fpr(value):
    fields = [""] * 15
    fields[0] = "fpr"
    fields[9] = value
    return ":".join(fields)


class SigningIdentityTests(unittest.TestCase):
    def test_subkey_only_authority(self):
        valid = "\n".join([record("sec", "#"), fpr(FPR), record("ssb", "+", "s"), fpr(SUB)])
        validate(valid, FPR)
        with self.assertRaisesRegex(ValueError, "primary"):
            validate(valid.replace(record("sec", "#"), record("sec", "+")), FPR)
        with self.assertRaisesRegex(ValueError, "signing subkey"):
            validate(valid.replace(record("ssb", "+", "s"), record("ssb", "#", "s")), FPR)
        with self.assertRaisesRegex(ValueError, "fingerprint"):
            validate(valid, "C" * 40)


if __name__ == "__main__":
    unittest.main()
