"""Native desktop Rust tests must run in the required Preflight gate."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NativeDesktopPreflightContract(unittest.TestCase):
    def test_native_tests_execute_in_desktop_job(self):
        source = (ROOT / ".github/workflows/preflight.yml").read_text(encoding="utf8")
        self.assertEqual(source.count("cargo test --locked -p repoticker --bin repoticker"), 1)
        self.assertIn("cargo check --locked -p repoticker", source)
        self.assertIn("libwebkit2gtk-4.1-dev", source)
        self.assertIn("libgtk-layer-shell-dev", source)

    def test_windows_native_unit_gate_is_in_unpublished_candidate_workflow(self):
        workflow = (ROOT / ".github/workflows/desktop-acceptance-candidates.yml").read_text(encoding="utf8")
        self.assertIn("cargo test --locked -p repoticker-core windows_git_process_tests", workflow)
        self.assertEqual(workflow.count("cargo test --locked -p repoticker --bin repoticker"), 1)
        self.assertIn("runs-on: windows-2025", workflow)
        self.assertNotIn("environment: apt-release", workflow)

    def test_desktop_result_remains_required_and_fail_closed(self):
        source = (ROOT / ".github/workflows/preflight.yml").read_text(encoding="utf8")
        self.assertIn("needs: [scope, format_and_core, ui, desktop]", source)
        self.assertIn("DESKTOP_RESULT: ${{ needs.desktop.result }}", source)
        self.assertIn('for result in "$CORE_RESULT" "$UI_RESULT" "$DESKTOP_RESULT"; do', source)
        self.assertIn('[[ "$result" == "$expected" ]] || exit 1', source)
        self.assertIn('true) expected=success', source)
        self.assertIn('false) expected=skipped', source)
        self.assertNotIn("continue-on-error: true", source)


if __name__ == "__main__":
    unittest.main()
