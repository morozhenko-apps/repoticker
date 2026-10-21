import test from "node:test";
import assert from "node:assert/strict";
import { buildQuotaDetails, buildHoverDetails } from "../apps/desktop/ui/quota-details.mjs";
import { safeActionsJobUrl } from "../apps/desktop/ui/model.mjs";

test("legacy billing-only entrypoint shows only account types and unknown quotas", () => {
  const result = buildQuotaDetails({ counts: { running: 3, queued: 1 }, coverage: {} }, true);
  assert.deepEqual(result.sections.map(section => section.title),
    ["Organization", "Personal account"]);
  for (const section of result.sections) {
    assert.deepEqual(section.rows.map(row => row[1]), ["—", "—", "—"]);
  }
  assert.doesNotMatch(JSON.stringify(result), /Running ·|Queued ·|Runner availability/);
});
test("unavailable runner statistics do not erase authorization", () => {
  const result = buildHoverDetails(null, "runners", true, "GitHub data unavailable");
  assert.equal(result.connected, false);
  assert.equal(result.status, "Runners unavailable");
  assert.match(result.message, /GitHub data unavailable/);
});
test("job URL validator remains restricted even though hover window is pointer-pass-through", () => {
  const bad = [
    "javascript:alert(1)", "https://github.com.evil.test/a/b/actions/runs/1/job/2",
    "https://attacker@github.com/a/b/actions/runs/1/job/2",
    "https://github.com/a/b/settings/tokens",
    "https://github.com/a/b/actions/runs/1/job/2?token=secret",
    "https://github.com/a/b/actions/runs/1/job/2#secret",
  ];
  for (const value of bad) assert.equal(safeActionsJobUrl(value), null, value);
  assert.equal(safeActionsJobUrl("https://github.com/a/b/actions/runs/1/job/2"),
    "https://github.com/a/b/actions/runs/1/job/2");
});
