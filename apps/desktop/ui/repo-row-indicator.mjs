// The row renders local Git divergence first, then the last verified CI
// conclusion. The global Safe Sync count is intentionally more conservative.
export function repoRowIndicator(repo, outcome = null) {
  const valid = value => Number.isSafeInteger(value) && value >= 0;
  const ahead = repo?.ahead;
  const behind = repo?.behind;
  if (repo?.upstream && valid(ahead) && valid(behind)) {
    if (ahead > 0 || behind > 0) {
      const parts = [];
      if (ahead > 0) parts.push("↑" + ahead);
      if (behind > 0) parts.push("↓" + behind);
      return { kind: "git", text: parts.join(" "), ahead, behind };
    }
  } else {
    // Missing tracking data is unknown; do not treat it as a clean branch.
    return { kind: "unknown", text: "—" };
  }
  return { kind: "ci", text: outcome === "success" ? "✓" :
    outcome === "failure" ? "✕" : "—", outcome };
}
