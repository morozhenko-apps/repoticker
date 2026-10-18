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
