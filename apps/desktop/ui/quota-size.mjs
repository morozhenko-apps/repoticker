/** Intrinsic content measurement independent of the flex viewport height.
 * Never size a tooltip from the scrollHeight of its stretching scroll area.
 */
export const USAGE_MIN_HEIGHT = 118;
export const USAGE_MAX_HEIGHT = 320;
export const USAGE_CONTENT_GAP = 7;
// 11px top/bottom padding, 2px border, 6px title margin.
export const USAGE_FRAME_HEIGHT = 30;

export function usageHeight(titleHeight, contentHeights) {
  if (!Number.isFinite(titleHeight) || titleHeight < 0 ||
      !Array.isArray(contentHeights) ||
      contentHeights.some(h => !Number.isFinite(h) || h < 0)) {
    return USAGE_MIN_HEIGHT;
  }
  const contents = contentHeights.reduce((a, h) => a + h, 0);
  const gaps = Math.max(0, contentHeights.length - 1) * USAGE_CONTENT_GAP;
  return Math.min(USAGE_MAX_HEIGHT, Math.max(USAGE_MIN_HEIGHT,
    Math.ceil(USAGE_FRAME_HEIGHT + titleHeight + contents + gaps)));
}
