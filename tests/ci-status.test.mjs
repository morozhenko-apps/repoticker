import test from "node:test";
import assert from "node:assert/strict";
import { ciOutcomeForRepo, projectLatestCiStatuses } from "../apps/desktop/ui/ci-status.mjs";

const run = conclusion => ({ conclusion });
const result = (repository, conclusion) => ({ repository, runs: [run(conclusion)] });

test("CI status shows the latest completed failure or success, never local Git cleanliness", () => {
  const statuses = projectLatestCiStatuses("Team", [
    result("Team/green", "success"), result("team/red", "failure"),
    result("team/cancelled", "cancelled"), { repository: "team/empty", runs: [] },
    { repository: "team/denied", error: "unavailable" },
  ]);
  assert.equal(ciOutcomeForRepo({ github_repo: "TEAM/green", dirty: true, behind: 5 }, statuses), "success");
  assert.equal(ciOutcomeForRepo({ github_repo: "team/red", dirty: false, ahead: 0 }, statuses), "failure");
  for (const repo of ["cancelled", "empty", "denied", "missing"])
    assert.equal(ciOutcomeForRepo({ github_repo: "team/" + repo }, statuses), null);
});

test("CI status never guesses identity from folder name, fork or a wrong account", () => {
  const statuses = projectLatestCiStatuses("team", [result("team/repo", "failure")]);
  for (const repo of [
    { name: "repo" },
    { name: "repo", github_repo: "other/repo" },
    { name: "repo", github_repo: "team/repo/subdir" },
    { name: "repo", github_repo: "team/../repo" },
    { name: "repo", github_repo: "https://github.com/team/repo" },
    { name: "repo", github_repo: null },
  ]) assert.equal(ciOutcomeForRepo(repo, statuses), null);
  assert.equal(ciOutcomeForRepo({ github_repo: "team/repo" }, null), null);
  assert.equal(ciOutcomeForRepo({ github_repo: "team/repo" }, statuses), "failure");
});

test("CI status rejects scope contamination and duplicate provider identities", () => {
  for (const observations of [
    [result("other/repo", "success")],
    [result("team/repo", "success"), result("TEAM/Repo", "failure")],
    [result("team/../repo", "failure")],
    [result("team/repo", "success"), { repository: "team/repo", error: "unavailable" }],
  ]) assert.equal(projectLatestCiStatuses("team", observations), null);
  for (const account of [null, "", "..", "team/sub", "x".repeat(101)])
    assert.equal(projectLatestCiStatuses(account, []), null);
});

test("CI status treats non-failure conclusions, provider gaps and out-of-scope rows as unknown", () => {
  const statuses = projectLatestCiStatuses("team", [
    result("team/neutral", "neutral"), result("team/timed_out", "timed_out"),
    result("team/skip", "skipped"), result("team/start", "startup_failure"),
  ]);
  for (const repo of ["neutral", "timed_out", "skip", "start"])
    assert.equal(ciOutcomeForRepo({ github_repo: "team/" + repo }, statuses), null);
  assert.equal(projectLatestCiStatuses("team", [] ).outcomes.size, 0);
});
