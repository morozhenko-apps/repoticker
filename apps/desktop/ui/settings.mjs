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

const githubPhaseLabels = Object.freeze({
  idle: "Not connected. Uses secure device authorization.",
  requesting: "Requesting a new code from GitHub.",
  pending: "Waiting for GitHub approval.",
  awaiting_approval: "Waiting for GitHub approval. The application is checking at GitHub's required interval.",
  saving_credentials: "GitHub approved. Saving access securely in the system wallet.",
  connected: "GitHub authorized. CI monitoring is the next stage.",
  cancelled: "GitHub authorization cancelled.",
  denied: "GitHub authorization denied.",
  expired: "Verification code expired. Request a new code.",
  failed: "GitHub authorization failed."
});
const githubFailureLabels = Object.freeze({
  network: "GitHub request failed: network unavailable.",
  rate_limit: "GitHub rate limit exceeded.",
  authorization_rejected: "GitHub rejected the token exchange.",
  http_status: "GitHub returned an unsuccessful HTTP response.",
  invalid_response: "GitHub token response could not be validated.",
  credential_store: "Authorization reached the system wallet, but KWallet/Secret Service could not store the token.",
  invalid_credential: "Stored credential is invalid. Disconnect and reconnect.",
  not_connected: "GitHub credentials were not found.",
  expired: "GitHub authorization expired."
});

async function refreshGithub() {
  try {
    // Read native state, rather than assuming all cross-WebView events arrive.
    // This never makes a GitHub request or exposes a token to JavaScript.
    const auth = await invoke("github_auth_status");
    githubConnected = auth.connected === true;
    githubPending = !githubConnected &&
      ["requesting", "pending", "awaiting_approval", "saving_credentials"].includes(auth.phase);
    if (!githubPending) byId("github-user-code").textContent = "";
    githubButtons();
    const text = auth.reason && Object.hasOwn(githubFailureLabels, auth.reason)
      ? githubFailureLabels[auth.reason]
      : (githubPhaseLabels[auth.phase] || githubPhaseLabels.idle);
    githubMessage(text, auth.phase === "failed");
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

byId("github-copy-code").addEventListener("click", async () => {
  const code = byId("github-user-code").textContent;
  if (!githubPending || !code) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(code);
    githubMessage("Verification code copied.");
  } catch {
    githubMessage("Cannot access clipboard. Select the code and copy with Ctrl+C.", true);
  }
});

byId("github-check-status").addEventListener("click", () => {
  void refreshGithub();
});

window.addEventListener("focus", () => {
  if (githubPending) void refreshGithub();
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

window.__TAURI__?.event?.listen?.("repoticker-github-auth", () => {
  // Treat events as prompts to reconcile state, never as the sole source
  // of truth. This also catches wallet failures after browser approval.
  void refreshGithub();
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
