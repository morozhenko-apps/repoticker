// Explicit card states make list disclosure independent of Git synchronization.
export const CARD_HEIGHT = Object.freeze({
  compact: 225,
  repos: 550,
  settings: 370
});

export function nextCardView(current, requested) {
  if (!Object.hasOwn(CARD_HEIGHT, requested)) throw new Error("Unknown view");
  return current === requested ? "compact" : requested;
}

export function cardWindowHeight(view) {
  if (!Object.hasOwn(CARD_HEIGHT, view)) throw new Error("Unknown view");
  return CARD_HEIGHT[view];
}
