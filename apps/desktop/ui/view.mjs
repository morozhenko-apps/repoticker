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


// The Safe sync button covers exactly one safe direction per clean branch.
// Diverged, detached, dirty, missing-upstream and unfinished Git states never
// increase the eligible count. Behind and ahead commits are counted equally.
export function syncReadyCommitCount(repositories = []) {
  return repositories.reduce((count, repo) => (
    repo.upstream && !repo.dirty &&
      ((repo.ahead === 0 && /^behind [1-9]\d*$/.test(repo.sync_state || "") &&
        Number.isSafeInteger(repo.behind) && repo.behind > 0)
       ? count + repo.behind
       : (repo.behind === 0 && repo.sync_state === "ahead" &&
          Number.isSafeInteger(repo.ahead) && repo.ahead > 0
          ? count + repo.ahead : count))
  ), 0);
}
