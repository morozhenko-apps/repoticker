import test from "node:test";
import assert from "node:assert/strict";
import { summarize, safeRunUrl } from "../apps/desktop/ui/model.mjs";

test("empty or missing state never invents activity", () => {
  assert.deepEqual(summarize({}), {
    repositoryCount: 0, behind: 0, onlineRunners: 0, busyRunners: 0, running: 0, failed: 0
  });
});

test("summary counts online and busy runners separately", () => {
  assert.deepEqual(summarize({
    repositories: [{ behind: 3 }, { behind: 0 }],
    runners: [{ online: true, busy: true }, { online: true, busy: false }, { online: false, busy: true }],
    ci_running: 2,
    ci_failed: 1
  }), {
    repositoryCount: 2, behind: 3, onlineRunners: 2, busyRunners: 1, running: 2, failed: 1
  });
});

test("only direct GitHub Actions run links pass validation", () => {
  assert.equal(safeRunUrl("https://github.com/acme/widget/actions/runs/123"), "https://github.com/acme/widget/actions/runs/123");
  assert.equal(safeRunUrl("javascript:alert(1)"), null);
  assert.equal(safeRunUrl("https://github.com.evil.example/acme/widget/actions/runs/123"), null);
  assert.equal(safeRunUrl("https://github.com/acme/widget/settings/secrets"), null);
  assert.equal(safeRunUrl(undefined), null);
});
