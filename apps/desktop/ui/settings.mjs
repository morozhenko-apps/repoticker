const byId = id => document.getElementById(id);
const invoke = (command, args = {}) => window.__TAURI__?.core?.invoke(command, args) ??
  Promise.reject(new Error("Open settings in RepoTicker."));
function message(text, error = false) {
  byId("message").textContent = String(text);
  byId("message").classList.toggle("error", error);
}
function renderRoots(roots) {
  const list = byId("roots-list");
  list.replaceChildren();
  if (!roots.length) {
    const label = document.createElement("p");
    label.textContent = "No local folders enrolled.";
    label.className = "hint";
    list.append(label);
  }
  for (const root of roots) {
    const row = document.createElement("div");
    row.className = "root";
    const label = document.createElement("span");
    label.textContent = root;
    label.title = root;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Remove";
    button.addEventListener("click", async () => {
      try {
        await invoke("remove_root", { root });
        await refresh();
        message("Root removed from tracking. Files were not changed.");
      } catch (error) { message(error, true); }
    });
    row.append(label, button);
    list.append(row);
  }
}
async function refresh() {
  const snapshot = await invoke("get_snapshot");
  renderRoots(snapshot.roots || []);
  byId("language").value = snapshot.language || "en";
}
byId("add-root-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await invoke("add_root", { root: byId("root-path").value });
    byId("root-path").value = "";
    await refresh();
    message("Folder enrolled.");
  } catch (error) { message(error, true); }
});
byId("language").addEventListener("change", async event => {
  try {
    await invoke("set_language", { language: event.target.value });
    message("Preference saved.");
  } catch (error) { message(error, true); }
});
window.__TAURI__?.event?.listen?.("repoticker-config-changed", refresh);
refresh().catch(error => message(error, true));
