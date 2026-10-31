"""Manual Mode B strict gate must validate stable tests once, without hiding failures."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
STRICT = ROOT / ".github" / "workflows" / "strict.yml"


class StrictStablePolicyContract(unittest.TestCase):
    def setUp(self):
        self.workflow = STRICT.read_text(encoding="utf-8")

    def test_given_strict_workflow_when_triggered_then_only_explicit_dispatch_is_allowed(self):
        self.assertRegex(self.workflow, r"(?m)^\s{2}workflow_dispatch:\s*$")
        self.assertNotRegex(self.workflow, r"(?m)^\s{2}(push|pull_request|schedule):")
        self.assertIn("cancel-in-progress: false", self.workflow)

    def test_given_mode_b_stable_suite_when_strict_runs_then_each_required_command_runs_once(self):
        commands = (
            "cargo fmt --all --check",
            "cargo test --locked -p repoticker-core",
            "cargo clippy --locked -p repoticker-core --all-targets -- -D warnings",
            "node --test tests/*.test.mjs",
            "python3 -m unittest discover -s tests -p 'test_release_*.py' -v",
        )
        for command in commands:
            with self.subTest(command=command):
                self.assertEqual(self.workflow.count(command), 1)
        self.assertIn("node-version: 26.13.0", self.workflow)
        self.assertIn("components: rustfmt, clippy", self.workflow)
        self.assertIn("apt-utils dpkg-dev gnupg gpgv", self.workflow)

    def test_given_stable_gate_when_failing_then_no_repeat_or_quarantine_can_hide_failure(self):
        self.assertNotRegex(self.workflow, r"(?mi)\b(for\s+pass|repeat_core_and_ui|ten independent|\b1\.\.10\b)\b")
        self.assertNotRegex(self.workflow, r"(?mi)\bcontinue-on-error:\s*true\b")
        self.assertNotIn("|| true", self.workflow)
        self.assertNotIn("--test-name-pattern", self.workflow)
        self.assertNotIn("--skip", self.workflow)


if __name__ == "__main__":
    unittest.main()
