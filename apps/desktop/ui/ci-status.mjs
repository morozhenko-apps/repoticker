// A CI result is never a local Git cleanliness or synchronization signal.
// The provider scope and the local origin must match exactly (case-insensitive).
const NAME = /^[A-Za-z0-9_.-]{1,100}$/;
const identity = fullName => {
  if (typeof fullName !== "string") return null;
  const parts = fullName.split("/");
  if (parts.length !== 2 || parts.some(part =>
    !NAME.test(part) || part === "." || part === "..")) return null;
  return parts.map(part => part.toLowerCase());
};

export function projectLatestCiStatuses(account, observations) {
  if (typeof account !== "string" || !NAME.test(account) ||
      account === "." || account === ".." || !Array.isArray(observations) ||
      observations.length > 100) return null;
  const outcomes = new Map();
  for (const result of observations) {
    const parts = identity(result?.repository);
    if (!parts || parts[0] !== account.toLowerCase() ||
        outcomes.has(parts.join("/"))) return null;
    // The collector guarantees provider identity, timestamp and conclusion.
    // Unreadable, absent and non-success/failure conclusions stay unknown.
    const conclusion = result.error ? null : result.runs?.[0]?.conclusion;
    const outcome = conclusion === "success" || conclusion === "failure"
      ? conclusion : null;
    outcomes.set(parts.join("/"), outcome);
  }
  return { account: account.toLowerCase(), outcomes };
}

export function ciOutcomeForRepo(repo, statuses) {
  const parts = identity(repo?.github_repo);
  if (!parts || !statuses || parts[0] !== statuses.account ||
      !(statuses.outcomes instanceof Map)) return null;
  return statuses.outcomes.get(parts.join("/")) ?? null;
}
