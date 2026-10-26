/** Read-only, platform-independent text fallback for the detailed usage popup.
 * Never fetch, infer missing zero counts, or expose token/path/config data. */
import { buildHoverDetails } from "./quota-details.mjs";
import { surfaceText, translateHoverDetails } from "./surface-i18n.mjs";

export function hoverFallbackText(kind, snapshot, language = "en") {
  const state = snapshot?.runner_state ?? null;
  const runnerRows = kind === "tasks" && state?.coverage?.runners === true &&
    Array.isArray(state.runners) ? Math.min(state.runners.length, 4) : 0;
  const details = translateHoverDetails(
    buildHoverDetails(state, kind, snapshot?.connected === true,
      snapshot?.monitor_message, null),
    language, runnerRows
  );
  const lines = [details.status];
  for (const section of details.sections ?? []) {
    if (section.title) lines.push(section.title);
    for (const [label, value] of section.rows ?? [])
      lines.push(label + ": " + value);
    if (section.message) lines.push(section.message);
  }
  if (details.message) lines.push(details.message);
  // The billing fallback contains unknown values rather than the live
  // provider breakdown. The original rich usage window still owns billing.
  if (kind === "billing") lines.push(surfaceText(language,
    "Detailed billing is available only in the usage panel."));
  return lines.join("\n");
}
