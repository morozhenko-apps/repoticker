// Pure relative positioning for the single, drawer-level repository menu.
// The menu is never a descendant of an isolated/scroll-clipped repo row.
export function placeRepoMenu(anchor, drawer, menu, gap = 4) {
  const margin = 6;
  const width = Math.min(menu.width, Math.max(0, drawer.width - margin * 2));
  const left = Math.max(margin, Math.min(
    anchor.right - drawer.left - width,
    drawer.width - width - margin
  ));
  const below = anchor.bottom - drawer.top + gap;
  const above = anchor.top - drawer.top - menu.height - gap;
  const lowerLimit = drawer.height - menu.height - margin;
  const top = below <= lowerLimit
    ? below
    : above >= margin
      ? above
      : Math.max(margin, Math.min(below, lowerLimit));
  return { left, top, width };
}
