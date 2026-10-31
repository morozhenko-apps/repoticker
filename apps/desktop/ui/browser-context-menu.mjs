/** Disable embedded browser context menus without affecting native tray menus. */
export function disableBrowserContextMenu(documentRef) {
  documentRef.addEventListener("contextmenu", event => event.preventDefault());
}
