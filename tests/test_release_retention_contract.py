"""Release staging data must expire after one day, independently of R2/APT."""
import pathlib
import re
import unittest

WORKFLOW = pathlib.Path(__file__).resolve().parents[1] / ".github/workflows/desktop-release-candidates.yml"


class ReleaseArtifactRetention(unittest.TestCase):
    def test_given_release_when_staged_then_both_archives_expire_after_one_day(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        blocks = re.findall(
            r"(?m)^      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9(?:[ \t]+#[^\n]*)?\n"
            r"        with:\n"
            r"(?P<body>(?:          [^\n]*\n)+)",
            workflow,
        )
        self.assertEqual(len(blocks), 2, "Only expected staging uploads are allowed")
        names = set()
        for block in blocks:
            match = re.search(r"(?m)^          name: (\S+)\s*$", block)
            self.assertIsNotNone(match)
            names.add(match.group(1))
            self.assertRegex(block, r"(?m)^          retention-days: 1\s*$")
            self.assertEqual(len(re.findall(r"retention-days:", block)), 1)
        self.assertEqual(names, {
            "repoticker-linux", "repoticker-windows"
        })

    def test_given_release_when_finalized_then_cleanup_and_text_only_notes_follow_public_readback(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertEqual(workflow.count("actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333"), 2)
        self.assertIn("Verify flat R2 files, signed APT and latest manifest", workflow)
        self.assertIn("needs: [validate, publish, cleanup]", workflow)
        self.assertIn("scripts/cleanup-published-artifacts.mjs", workflow)
        self.assertIn("--receipt", workflow)
        self.assertNotIn("gh release upload", workflow)
        self.assertNotIn('"$RUNNER_TEMP"/release/linux/*.deb', workflow)


if __name__ == "__main__":
    unittest.main()
