// Settings are transactional: editing never writes on disk until Apply.
const byId = id => document.getElementById(id);

/** Hybrid relay has no native transport or persistence in v0.2.
 * Its URL input is irrelevant to simple polling and cannot be enabled
 * until a supported connection mode is available in a future release. */
function syncWorkerControls() {
  const mode = byId("github-connection-mode");
  const worker = byId("github-worker-url");
  const available = !mode.disabled && mode.value === "hybrid";
  byId("github-worker-row").hidden = !available;
  worker.disabled = !available;
}
byId("github-connection-mode").addEventListener("change", syncWorkerControls);
syncWorkerControls();
const invoke = (command, args = {}) => window.__TAURI__?.core?.invoke(command, args) ??
  Promise.reject(new Error("Open settings in RepoTicker."));

let original = null;
let draft = null;
let saving = false;
let githubPending = false;
let githubConnected = false;
let githubChecking = true;
let githubCheckFailed = false;
let githubStatusTimer = null;
let githubStatusBusy = false;
let selectedScope = null;
let githubScopeAtOpen = null;
let githubScopeTouched = false;
let githubWasConnectedAtOpen = false;
let githubStartedHere = false;
let githubStarting = false;

async function refreshMonitorScopes() {
  const row = byId("github-monitor-scope-row");
  row.hidden = !githubConnected;
  if (!githubConnected) return;
  try {
    const [config, data] = await Promise.all([
      invoke("get_monitor_scope"),
      invoke("github_api_get", { path: "/user/installations?per_page=100&page=1" })
    ]);
    if (!Array.isArray(data.installations)) throw Error("Invalid GitHub installations");
    const select = byId("github-monitor-scope");
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose account";
    select.append(placeholder);
    const accounts = data.installations.map(i => i?.account?.login)
      .filter(name => typeof name === "string" && /^[a-zA-Z0-9_.-]+$/.test(name));
    for (const name of [...new Set(accounts)].sort()) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.append(option);
    }
    if (githubScopeAtOpen === null) githubScopeAtOpen = config || "";
    const suggestion = config || (accounts.length === 1 ? accounts[0] : "");
    if (!githubScopeTouched || !accounts.includes(selectedScope)) {
      selectedScope = suggestion;
      githubScopeTouched = false;
    }
    select.value = selectedScope || "";
    updateApply();
  } catch {
    githubMessage("GitHub authorized; cannot list available installations.", true);
  }
}

byId("github-monitor-scope").addEventListener("change", event => {
  selectedScope = event.target.value || "";
  githubScopeTouched = selectedScope !== (githubScopeAtOpen || "");
  githubMessage("Press OK to confirm the monitoring account.");
  updateApply();
});

function stopGithubStatusUpdates() {
  if (githubStatusTimer !== null) {
    clearInterval(githubStatusTimer);
    githubStatusTimer = null;
  }
}

// The timer polls only a native in-memory phase (no GitHub network calls,
// no keychain unlock). It is active only during Device Flow authorization.
function startGithubStatusUpdates() {
  if (githubStatusTimer !== null) return;
  githubStatusTimer = setInterval(async () => {
    if (!githubPending) {
      stopGithubStatusUpdates();
      return;
    }
    if (githubStatusBusy) return;
    githubStatusBusy = true;
    try {
      const phase = await invoke("github_flow_status");
      if (phase.status === "connected" ||
          ["denied", "expired", "failed", "cancelled", "disconnected"].includes(phase.status)) {
        stopGithubStatusUpdates();
        await refreshGithub();
      }
    } catch (error) {
      githubMessage(String(error), true);
    } finally {
      githubStatusBusy = false;
    }
  }, 1500);
}

function githubMessage(text, error = false) {
  const element = byId("github-auth-message");
  element.textContent = text;
  element.classList.toggle("error", error);
}

function githubButtons() {
  const unknown = githubChecking || githubCheckFailed;
  byId("github-connect").hidden = unknown || githubConnected || githubPending;
  byId("github-disconnect").hidden = unknown || !githubConnected;
  byId("github-device-flow").hidden = !githubPending;
  if (!githubPending) byId("github-copy-code").textContent = "Copy code";
  const status = githubChecking ? "Checking connection..."
    : githubCheckFailed ? "Connection unavailable"
    : githubPending ? "Authorization pending"
    : githubConnected ? "Authorized" : "Not connected";
  byId("github-connection-indicator").textContent = status;
  byId("github-account-status").value = status;
  updateApply();
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
  expired: "GitHub authorization expired.",
  client_credentials: "GitHub App client credentials were rejected.",
  grant_type: "GitHub does not accept this device authorization method.",
  unverified_email: "Verify the primary email address on your GitHub account.",
  github_rejected: "GitHub rejected this device code. Start a new authorization."
});

async function refreshGithub(knownAuth = null) {
  try {
    // The initial auth status is already captured by Settings initialization.
    // Avoid a redundant second OS wallet read on cold open.
    const auth = knownAuth ?? await invoke("github_auth_status");
    githubChecking = false;
    githubCheckFailed = false;
    githubConnected = auth.connected === true;
    githubPending = !githubConnected &&
      ["requesting", "pending", "awaiting_approval", "saving_credentials"].includes(auth.phase);
    if (!githubPending) byId("github-user-code").textContent = "";
    githubButtons();
    if (githubPending) startGithubStatusUpdates();
    else stopGithubStatusUpdates();
    const text = auth.reason && Object.hasOwn(githubFailureLabels, auth.reason)
      ? githubFailureLabels[auth.reason]
      : (githubPhaseLabels[auth.phase] || githubPhaseLabels.idle);
    githubMessage(text, auth.phase === "failed");
    if (githubConnected) await refreshMonitorScopes();
    updateApply();
  } catch (error) {
    githubChecking = false;
    githubCheckFailed = true;
    githubButtons();
    githubMessage(String(error), true);
  }
}

byId("github-connect").addEventListener("click", async () => {
  if (githubPending) return;
  byId("github-connect").disabled = true;
  githubStarting = true;
  githubStartedHere = true;
  updateApply();
  try {
    const challenge = await invoke("github_begin");
    // Only a public one-time USER code may enter the WebView.
    byId("github-user-code").textContent = challenge.userCode;
    githubPending = true;
    githubMessage("Waiting for approval in GitHub.");
    githubButtons();
    startGithubStatusUpdates();
  } catch (error) {
    githubPending = false;
    githubMessage(String(error), true);
    githubButtons();
  } finally {
    githubStarting = false;
    byId("github-connect").disabled = false;
    updateApply();
  }
});

byId("github-copy-code").addEventListener("click", async () => {
  const code = byId("github-user-code").textContent;
  if (!githubPending || !code) return;
  try {
    await invoke("github_copy_user_code", { code });
    byId("github-copy-code").textContent = "Copied";
    githubMessage("Verification code copied.");
  } catch {
    byId("github-copy-code").textContent = "Copy code";
    githubMessage("Cannot access system clipboard. Select the code and copy with Ctrl+C.", true);
  }
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
  stopGithubStatusUpdates();
  githubPending = false;
  byId("github-user-code").textContent = "";
  githubButtons();
  githubMessage("Authorization cancelled.");
});
byId("github-disconnect").addEventListener("click", async () => {
  try {
    await invoke("github_disconnect");
    stopGithubStatusUpdates();
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
  const authNeedsConfirmation = githubConnected && githubStartedHere;
  byId("apply-settings").disabled =
    saving || githubStarting || githubPending ||
    !(isDirty() || authNeedsConfirmation || githubScopeTouched);
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
  githubChecking = true;
  githubCheckFailed = false;
  githubButtons();
  githubMessage("Checking GitHub connection...");
  // Persistent form settings and native KWallet interrogation run independently.
  // Neither path triggers local Git discovery/inspection.
  const [snapshot, authAtOpen] = await Promise.all([
    invoke("get_settings_config"), invoke("github_auth_status")
  ]);
  githubWasConnectedAtOpen = authAtOpen.connected === true;
  githubStartedHere = false;
  githubStarting = false;
  githubScopeTouched = false;
  githubScopeAtOpen = snapshot.github_monitor_org || "";
  selectedScope = null;
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
  await refreshGithub(authAtOpen);
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
  if (saving) return;
  saving = true;
  updateApply();
  try {
    // A new Device Flow is provisional until OK. Cancel invalidates
    // polling before possibly deleting its newly acquired wallet credential.
    if (githubStartedHere || githubPending) {
      await invoke("github_cancel");
      stopGithubStatusUpdates();
      if (githubStartedHere) {
        const auth = await invoke("github_auth_status");
        if (auth.connected) await invoke("github_disconnect");
      }
    }
    githubStartedHere = false;
    githubPending = false;
    githubConnected = githubWasConnectedAtOpen && !githubStartedHere;
    byId("github-user-code").textContent = "";
    await invoke("close_settings");
  } catch (error) {
    message(String(error), true);
  } finally {
    saving = false;
    updateApply();
  }
});
byId("apply-settings").addEventListener("click", async () => {
  if (saving || githubPending || githubStarting ||
      !(isDirty() || githubScopeTouched || (githubConnected && githubStartedHere))) return;
  saving = true;
  updateApply();
  try {
    if (isDirty()) {
      await invoke("save_settings", {
        roots: [...draft.roots],
        language: draft.language
      });
    }
    if (githubConnected) {
      // Commit the account selection only on explicit OK. Reapplying the
      // selection also sends repoticker-github-scope-changed to refresh
      // the running monitor/card while they remain visible.
      await invoke("github_set_monitor_org", { org: selectedScope || null });
      githubScopeTouched = false;
      githubScopeAtOpen = selectedScope || "";
      await refreshMonitorScopes();
    }
    githubStartedHere = false;
    await invoke("close_settings");
  } catch (error) {
    message(String(error), true);
  } finally {
    saving = false;
    updateApply();
  }
});
window.__TAURI__?.event?.listen?.("repoticker-settings-opened", () => {
  void refresh().catch(error => {
  githubChecking = false;
  githubCheckFailed = true;
  githubButtons();
  githubMessage("Cannot initialize settings.", true);
  message(error, true);
});
});
void refresh().catch(error => message(error, true));
