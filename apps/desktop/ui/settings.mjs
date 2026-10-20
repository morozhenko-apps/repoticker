// Settings are transactional: editing never writes on disk until Apply.
const byId = id => document.getElementById(id);
const invoke = (command, args = {}) => window.__TAURI__?.core?.invoke(command, args) ??
  Promise.reject(new Error("Open settings in RepoTicker."));

let original = null;
let draft = null;
let saving = false;
let githubPending = false;
let githubConnected = false;

function githubMessage(text, error = false) {
  const element = byId("github-auth-message");
  element.textContent = text;
  element.classList.toggle("error", error);
}

function githubButtons() {
  byId("github-connect").hidden = githubConnected || githubPending;
  byId("github-disconnect").hidden = !githubConnected;
  byId("github-device-flow").hidden = !githubPending;
  byId("github-connection-indicator").textContent = githubPending
    ? "Authorization pending" : githubConnected ? "Authorized" : "Not connected";
  byId("github-account-status").value = githubConnected
    ? "Authorized (account selection pending)" : "Not connected";
}

async function refreshGithub() {
  try {
    const auth = await invoke("github_auth_status");
    githubConnected = auth.connected === true;
    if (githubConnected) githubPending = false;
    githubButtons();
    if (githubConnected) githubMessage("GitHub access authorized. CI monitoring is the next stage.");
    else if (!githubPending) githubMessage("Uses secure device authorization.");
  } catch (error) {
    githubButtons();
    githubMessage(String(error), true);
  }
}

byId("github-connect").addEventListener("click", async () => {
  if (githubPending) return;
  byId("github-connect").disabled = true;
  try {
    const challenge = await invoke("github_begin");
    // Only a public one-time USER code may enter the WebView.
    byId("github-user-code").textContent = challenge.userCode;
    githubPending = true;
    githubMessage("Waiting for approval in GitHub.");
    githubButtons();
  } catch (error) {
    githubPending = false;
    githubMessage(String(error), true);
    githubButtons();
  } finally {
    byId("github-connect").disabled = false;
  }
});

byId("github-open-device").addEventListener("click", async () => {
  try { await invoke("github_open_device_page"); }
  catch (error) { githubMessage(String(error), true); }
});
byId("github-cancel-device").addEventListener("click", async () => {
  await invoke("github_cancel");
  githubPending = false;
  byId("github-user-code").textContent = "";
  githubButtons();
  githubMessage("Authorization cancelled.");
});
byId("github-disconnect").addEventListener("click", async () => {
  try {
    await invoke("github_disconnect");
    githubConnected = false;
    githubPending = false;
    byId("github-user-code").textContent = "";
    githubButtons();
    githubMessage("GitHub disconnected.");
  } catch (error) {
    githubMessage(String(error), true);
  }
});

window.__TAURI__?.event?.listen?.("repoticker-github-auth", async event => {
  const status = event?.payload?.status;
  if (status === "connected" || status === "disconnected") {
    githubPending = false;
    byId("github-user-code").textContent = "";
    await refreshGithub();
  } else if (["expired", "denied", "failed", "cancelled"].includes(status)) {
    githubPending = false;
    byId("github-user-code").textContent = "";
    githubButtons();
    githubMessage(status === "failed" ? "GitHub authorization failed. Try again."
      : "GitHub authorization " + status + ".", status !== "cancelled");
  }
});

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
  updateLanguagePicker();
  renderRoots();
  message("");
  updateApply();
  await refreshGithub();
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
function updateLanguagePicker() {
  byId("language-trigger").firstChild.textContent =
    draft.language === "ru" ? "Русский " : "English ";
  for (const option of byId("language-options").querySelectorAll("[role=option]")) {
    option.setAttribute("aria-selected", String(option.dataset.value === draft.language));
  }
}
function closeLanguagePicker() {
  byId("language-options").hidden = true;
  byId("language-trigger").setAttribute("aria-expanded", "false");
}
byId("language-trigger").addEventListener("click", () => {
  const open = byId("language-options").hidden;
  byId("language-options").hidden = !open;
  byId("language-trigger").setAttribute("aria-expanded", String(open));
});
for (const option of byId("language-options").querySelectorAll("[role=option]")) {
  option.addEventListener("click", () => {
    if (!draft || saving) return;
    draft.language = option.dataset.value;
    updateLanguagePicker();
    updateApply();
    closeLanguagePicker();
    byId("language-trigger").focus();
  });
}
document.addEventListener("pointerdown", event => {
  if (!event.target.closest(".language-picker")) closeLanguagePicker();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLanguagePicker();
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
