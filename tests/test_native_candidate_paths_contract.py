"""Mode B: all native/UI implementation changes trigger cross-OS candidate tests."""
from fnmatch import fnmatchcase
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/desktop-acceptance-candidates.yml"


def push_patterns(source: str) -> list[str]:
    match = re.search(
        r"(?m)^  push:\s*\n    branches: \[dev\]\s*\n"
        r"    paths:\s*\n((?:      - '[^']+'\s*\n)+)",
        source,
    )
    if not match:
        raise AssertionError("Expected the native candidate push/paths block")
    return re.findall(r"(?m)^      - '([^']+)'$", match.group(1))


def matches(patterns: list[str], source_path: str) -> bool:
    return any(fnmatchcase(source_path, pattern) for pattern in patterns)


class NativeAcceptancePaths(unittest.TestCase):
    def test_every_critical_source_family_triggers_unpublished_cross_os_acceptance(self):
        workflow = WORKFLOW.read_text(encoding="utf8")
        patterns = push_patterns(workflow)
        for path in (
            "apps/desktop/src-tauri/src/github_api.rs",
            "apps/desktop/src-tauri/src/github_etag_cache.rs",
            "apps/desktop/src-tauri/src/github_session.rs",
            "apps/desktop/src-tauri/src/main.rs",
            "crates/repoticker-core/src/git.rs",
            "crates/repoticker-core/src/github_auth.rs",
            "apps/desktop/src-tauri/capabilities/default.json",
            "apps/desktop/src-tauri/icons/icon.png",
            "apps/desktop/ui/settings.mjs",
            "apps/desktop/ui/runner-collector.mjs",
            "apps/desktop/ui/locales/native.json",
            "Cargo.lock",
            "apps/desktop/src-tauri/tauri.conf.json",
            "scripts/release_assets.py",
        ):
            with self.subTest(source=path):
                self.assertTrue(matches(patterns, path), path)

    def test_documentation_only_commits_do_not_trigger_expensive_os_bundles(self):
        patterns = push_patterns(WORKFLOW.read_text(encoding="utf8"))
        for path in (
            "docs/testing/MODE_B_MATRIX.md",
            "README.md",
            "AGENT.md",
            "docs/release/V1_RELEASE_CAMPAIGN.md",
        ):
            with self.subTest(source=path):
                self.assertFalse(matches(patterns, path), path)

    def test_unpublished_windows_and_kde_gates_remain_required(self):
        workflow = WORKFLOW.read_text(encoding="utf8")
        self.assertIn("cargo test --locked -p repoticker --bin repoticker", workflow)
        self.assertIn("cargo test --locked -p repoticker-core windows_git_process_tests", workflow)
        self.assertIn("cargo tauri build --bundles nsis -- --locked", workflow)
        self.assertIn("cargo tauri build --bundles deb,appimage -- --locked", workflow)
        self.assertIn("name: Windows acceptance NSIS candidate", workflow)
        self.assertIn("name: KDE candidate DEB and AppImage", workflow)
        self.assertNotIn("environment: apt-release", workflow)
        self.assertNotIn("r2_release.py", workflow)
        self.assertNotIn("continue-on-error: true", workflow)


if __name__ == "__main__":
    unittest.main()
