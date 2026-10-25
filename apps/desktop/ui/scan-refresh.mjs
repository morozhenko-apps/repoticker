/**
 * Exactly one expensive local Git snapshot may be active per card. Repeated
 * refresh requests are invalidations, not extra concurrently running scans.
 *
 * The newest requested scan is the only one published. This guarantees
 * action/config changes aren't lost and older replies cannot rewind the UI.
 * No timers, polling, caches or hidden automatic Git/network mutations.
 */
export function createScanRefreshQueue({ scan, publish, onError }) {
  if (typeof scan !== "function" || typeof publish !== "function" ||
      typeof onError !== "function") {
    throw new TypeError("Scan queue requires scan, publish and onError callbacks");
  }

  let active = null;
  let invalidated = false;
  async function drain() {
    do {
      invalidated = false;
      try {
        const result = await scan();
        if (!invalidated) publish(result);
      } catch (error) {
        if (!invalidated) onError(error);
      }
    } while (invalidated);
  }

  return function refresh() {
    if (active) {
      invalidated = true;
      return active;
    }
    active = drain().finally(() => { active = null; });
    return active;
  };
}
