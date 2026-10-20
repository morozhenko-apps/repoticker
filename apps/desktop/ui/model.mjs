export function summarize(snapshot) {
  const repos = Array.isArray(snapshot?.repositories) ? snapshot.repositories : [];
  const runners = Array.isArray(snapshot?.runners) ? snapshot.runners : [];
  return {
    repositoryCount: repos.length,
    behind: repos.reduce((total, repo) => total + Math.max(0, Number(repo.behind) || 0), 0),
    onlineRunners: runners.filter(runner => runner.online === true).length,
    busyRunners: runners.filter(runner => runner.online === true && runner.busy === true).length,
    running: Math.max(0, Number(snapshot?.ci_running) || 0),
    failed: Math.max(0, Number(snapshot?.ci_failed) || 0)
  };
}

export function safeRunUrl(url) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") return null;
    if (!/^\/[^/]+\/[^/]+\/actions\/runs\/\d+\/?$/.test(parsed.pathname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Permit only canonical GitHub Actions job URLs; no redirects or credentials. */
export function safeActionsJobUrl(url) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" ||
      parsed.port || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const validName = name => /^[A-Za-z0-9_.-]+$/.test(name) && name !== "." && name !== "..";
    const validNumber = num => /^[0-9]+$/.test(num);
    if (parts.length !== 7 || !validName(parts[0]) || !validName(parts[1]) ||
      parts[2] !== "actions" || parts[3] !== "runs" ||
      !validNumber(parts[4]) || parts[5] !== "job" || !validNumber(parts[6])) return null;
    return parsed.href;
  } catch {
    return null;
  }
}
