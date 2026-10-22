import test from "node:test";
import assert from "node:assert/strict";
import {
  githubFailureReason, githubFailureMessage, mostImportantGithubFailure
} from "../apps/desktop/ui/github-errors.mjs";

test("native GitHub HTTP and authorization errors become finite redacted categories", () => {
  const cases = [
    ["GitHub API authorization expired or revoked.", "unauthorized"],
    ["GitHub authorization expired. Reconnect.", "unauthorized"],
    ["GitHub is not connected.", "unauthorized"],
    ["GitHub API permission denied.", "permission_denied"],
    ["GitHub API rate limited.", "rate_limited"],
    ["GitHub rate limit exceeded.", "rate_limited"],
    ["GitHub API resource inaccessible.", "not_found"],
    ["GitHub API network error.", "network"],
    ["GitHub API stream failed.", "network"],
    ["GitHub API request failed.", "unavailable"],
  ];
  for (const [message, reason] of cases) {
    assert.equal(githubFailureReason(message), reason);
    assert.equal(githubFailureReason(new Error(message)), reason);
  }
});

test("arbitrary provider strings, tokens and objects do not enter monitor descriptions", () => {
  const provider = "401 ghp_private_secret /orgs/company/private-resource";
  for (const input of [new Error(provider), provider, null, { message: provider }, 42]) {
    const result = githubFailureReason(input);
    assert.equal(result, "unavailable");
    const visible = githubFailureMessage(result);
    assert.doesNotMatch(visible, /ghp_|company|private-resource/);
    assert.match(visible, /unavailable/);
  }
  assert.equal(githubFailureMessage("permission_denied", "runners"),
    "Runner inventory access denied; authorized Actions jobs remain visible.");
  assert.match(githubFailureMessage("unauthorized"), /Reconnect/);
  assert.match(githubFailureMessage("rate_limited"), /normal schedule/);
});

test("failure priority favors login and throttling while handling empty and malformed inputs", () => {
  assert.equal(mostImportantGithubFailure([]), null);
  assert.equal(mostImportantGithubFailure(null), null);
  assert.equal(mostImportantGithubFailure([null, { reason: "unexpected" }]), "unavailable");
  assert.equal(mostImportantGithubFailure([
    { reason: "incomplete" }, { reason: "permission_denied" }
  ]), "permission_denied");
  assert.equal(mostImportantGithubFailure([
    { reason: "network" }, { reason: "rate_limited" }, { reason: "unavailable" }
  ]), "rate_limited");
  assert.equal(mostImportantGithubFailure([
    { reason: "unauthorized" }, { reason: "rate_limited" }
  ]), "unauthorized");
});
