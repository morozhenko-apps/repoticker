// Settings are transactional: editing never writes on disk until Apply.
const byId = id => document.getElementById(id);
const invoke = (command, args = {}) => window.__TAURI__?.core?.invoke(command, args) ??
  Promise.reject(new Error("Open settings in RepoTicker."));

let original = null;
let draft = null;
let saving = false;

function message(text, error = false) {
  byId("message").textContent = String(text);
  byId("message").classList.toggle("error", error);
}
function isDirty() {
  if (!original || !draft) return false;
  return original.language !== draft.language ||
    JSON.stringify(original.roots) !== JSON.stringify(draft.roots);
}
function updateApply() {
  byId("apply-settings").disabled = saving || !isDirty();
}
function renderRoots() {
  const list = byId("roots-list");
  list.replaceChildren();
  if (!draft.roots.length) {
    const label = document.createElement("p");
    label.textContent = "No enrolled folders.";
    label.className = "hint";
    list.append(label);
  }
  for (const root of draft.roots) {
    const row = document.createElement("div");
    row.className = "root";
    const label = document.createElement("span");
    label.textContent = root;
    label.title = root;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      draft.roots = draft.roots.filter(item => item !== root);
      renderRoots();
      updateApply();
    });
    row.append(label, remove);
    list.append(row);
  }
}
async function refresh() {
  const snapshot = await invoke("get_snapshot");
  original = {
    roots: [...(snapshot.roots || [])],
    language: snapshot.language || "en"
  };
  draft = { roots: [...original.roots], language: original.language };
  byId("root-path").value = "";
  byId("language").value = draft.language;
  renderRoots();
  message("");
  updateApply();
}
byId("add-root-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!draft || saving) return;
  const value = byId("root-path").value.trim();
  if (!value) return;
  if (!draft.roots.includes(value)) draft.roots.push(value);
  byId("root-path").value = "";
  renderRoots();
  updateApply();
});
byId("language").addEventListener("change", event => {
  if (!draft || saving) return;
  draft.language = event.target.value;
  updateApply();
});
byId("cancel-settings").addEventListener("click", async () => {
  try { await invoke("close_settings"); }
  catch (error) { message(error, true); }
});
byId("apply-settings").addEventListener("click", async () => {
  if (!isDirty() || saving) return;
  saving = true;
  updateApply();
  try {
    await invoke("save_settings", {
      roots: [...draft.roots],
      language: draft.language
    });
    await invoke("close_settings");
  } catch (error) {
    message(error, true);
  } finally {
    saving = false;
    updateApply();
  }
});
window.__TAURI__?.event?.listen?.("repoticker-settings-opened", () => {
  void refresh().catch(error => message(error, true));
});
void refresh().catch(error => message(error, true));
