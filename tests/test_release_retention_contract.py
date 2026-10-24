"""Release staging data must expire after one day, independently of R2/APT."""
import pathlib
import re
import unittest

WORKFLOW = pathlib.Path(__file__).resolve().parents[1] / ".github/workflows/desktop-release-candidates.yml"


class ReleaseArtifactRetention(unittest.TestCase):
    def test_all_three_uploads_expire_after_one_day(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        blocks = re.findall(
            r"(?m)^      - uses: actions/upload-artifact@v4\n"
            r"        with:\n"
            r"(?P<body>(?:          [^\n]*\n)+)",
            workflow,
        )
        self.assertEqual(len(blocks), 3, "Only expected staging uploads are allowed")
        names = set()
        for block in blocks:
            match = re.search(r"(?m)^          name: (\S+)\s*$", block)
            self.assertIsNotNone(match)
            names.add(match.group(1))
            self.assertRegex(block, r"(?m)^          retention-days: 1\s*$")
            self.assertEqual(len(re.findall(r"retention-days:", block)), 1)
        self.assertEqual(names, {
            "repoticker-linux", "repoticker-windows", "repoticker-apt-keyring"
        })

    def test_publishing_downloads_all_staged_artifacts(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertGreaterEqual(workflow.count("actions/download-artifact@v4"), 5)
        self.assertIn("Verify R2 artifacts and publish signed APT last", workflow)
        self.assertIn("Publish GitHub Release only after signed R2/APT", workflow)


if __name__ == "__main__":
    unittest.main()
