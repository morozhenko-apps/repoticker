// The monitor cache is independent of local Git repository discovery.
const MONITOR_FIELDS = ["connected", "runner_state", "monitor_message"];

export function mergeMonitorPresentation(local, remote) {
  if (!remote || typeof remote !== "object" ||
      typeof remote.connected !== "boolean" ||
      !Object.hasOwn(remote, "runner_state") ||
      !Object.hasOwn(remote, "monitor_message")) {
    throw Error("Invalid monitor presentation.");
  }
  const changes = {};
  for (const key of MONITOR_FIELDS) changes[key] = remote[key];
  return { ...local, ...changes };
}

// Native get_snapshot may have started before a newer monitor-only update.
// Protect the newest monitor state from a late full Git scan reply.
export function reconcileScanPresentation(next, current, before, after) {
  if (before === after) return next;
  return mergeMonitorPresentation(next, current);
}
