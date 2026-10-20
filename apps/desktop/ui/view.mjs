// RepoTicker keeps only one drawer/page open; opening from tray resets to compact.
export const CARD_HEIGHT = Object.freeze({
  compact: 122,
  repos: 510,
  settings: 318
});

export function nextCardView(current, requested) {
  if (!Object.hasOwn(CARD_HEIGHT, requested)) throw new Error("Unknown view");
  return current === requested ? "compact" : requested;
}
export function cardWindowHeight(view) {
  if (!Object.hasOwn(CARD_HEIGHT, view)) throw new Error("Unknown view");
  return CARD_HEIGHT[view];
}

// A fast-forward cannot start if a repo is modified, ahead, divergent,
// detached, has an unfinished operation or lacks an upstream.
export function pullReadyCommitCount(repositories = []) {
  return repositories.reduce((count, repo) => (
    repo.upstream && !repo.dirty && repo.ahead === 0 &&
      /^behind [1-9]\d*$/.test(repo.sync_state || "")
      ? count + (Number.isSafeInteger(repo.behind) && repo.behind > 0 ? repo.behind : 0)
      : count
  ), 0);
}
