/** Redacted, finite failure vocabulary for RepoTicker's internal native
 * GitHub API command. Provider exceptions are untrusted; never show their
 * bodies, URL paths, account names, headers, or bearer strings in the UI.
 */
const NATIVE_MESSAGES = Object.freeze({
  "GitHub API authorization expired or revoked.": "unauthorized",
  "GitHub authorization expired. Reconnect.": "unauthorized",
  "GitHub authorization rejected.": "unauthorized",
  "GitHub is not connected.": "unauthorized",
  "GitHub API permission denied.": "permission_denied",
  "GitHub API resource inaccessible.": "not_found",
  "GitHub API rate limited.": "rate_limited",
  "GitHub rate limit exceeded.": "rate_limited",
  "GitHub API network error.": "network",
  "GitHub is unreachable.": "network",
  "GitHub API stream failed.": "network",
});

export function githubFailureReason(error) {
  const message = typeof error === "string" ? error :
    error instanceof Error ? error.message : null;
  return Object.hasOwn(NATIVE_MESSAGES, message) ?
    NATIVE_MESSAGES[message] : "unavailable";
}

export function githubFailureMessage(reason, scope = "monitor") {
  const detail = {
    unauthorized: "GitHub authorization unavailable. Reconnect in Settings.",
    permission_denied: "GitHub access denied. Check installation permissions.",
    rate_limited: "GitHub API rate limited. Monitoring will retry on its normal schedule.",
    not_found: "GitHub resource inaccessible to this installation.",
    network: "GitHub network unavailable. Monitoring will retry.",
    incomplete: "Some GitHub data is incomplete.",
    unavailable: "GitHub Actions data unavailable.",
  };
  if (scope === "runners" && reason === "permission_denied")
    return "Runner inventory access denied; authorized Actions jobs remain visible.";
  return Object.hasOwn(detail, reason) ? detail[reason] : detail.unavailable;
}

// Higher priority means a more actionable reason. Never print the
// arbitrary scope/resource identifier as part of the diagnostic.
const PRIORITY = Object.freeze({
  unauthorized: 6,
  rate_limited: 5,
  network: 4,
  permission_denied: 3,
  not_found: 2,
  incomplete: 1,
  unavailable: 0,
});
export function mostImportantGithubFailure(failures) {
  if (!Array.isArray(failures) || !failures.length) return null;
  const known = failures.filter(entry =>
    entry && typeof entry.reason === "string" &&
    Object.hasOwn(PRIORITY, entry.reason)
  );
  if (!known.length) return "unavailable";
  return known.reduce((best, entry) =>
    PRIORITY[entry.reason] > PRIORITY[best] ? entry.reason : best,
  "unavailable");
}
