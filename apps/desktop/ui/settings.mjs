import { listAvailableInstallations } from "./github-installations.mjs";
import { settingsLocale, settingsText } from "./settings-i18n.mjs";
import { localeName, localeDirection } from "./locale-catalog.mjs";
import { repositorySelectionMessage } from "./locale-counts.mjs";
import { disableBrowserContextMenu } from "./browser-context-menu.mjs";

disableBrowserContextMenu(document);
// Settings are transactional: editing never writes on disk until Apply.
const byId = id => document.getElementById(id);
let uiLocale = "en";
const t = english => settingsText(uiLocale, english);
let lastGithubText = "";
let lastFormText = "";
function applySettingsLanguage(value) {
  uiLocale = settingsLocale(value);
  document.documentElement.lang = uiLocale;
  document.documentElement.dir = localeDirection(uiLocale);
  document.title = t("RepoTicker Settings");
  for (const item of document.querySelectorAll?.("[data-i18n]") ?? [])
    item.textContent = t(item.getAttribute("data-i18n"));
  for (const item of document.querySelectorAll?.("[data-i18n-placeholder]") ?? [])
    item.placeholder = t(item.getAttribute("data-i18n-placeholder"));
  for (const item of document.querySelectorAll?.("[data-i18n-aria]") ?? [])
    item.setAttribute("aria-label", t(item.getAttribute("data-i18n-aria")));
  byId("github-auth-message").textContent = t(lastGithubText);
  byId("message").textContent = t(lastFormText);
  if (draft) byId("autostart-status").textContent = draft.autostartEnabled === null
    ? t("Autostart unavailable") : "";
}


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
const traceStartup = stage => {
  void invoke("trace_startup_stage", { stage }).catch(() => {});
};
traceStartup("settings.start");

let original = null;
let draft = null;
let saving = false;
let githubPending = false;
let githubConnected = false;
let githubChecking = true;
let githubCheckFailed = false;
let settingsLoading = false;
let settingsInitFailed = false;
let settingsRefreshRevision = 0;
let githubStatusTimer = null;
let githubStatusBusy = false;
let selectedScope = null;
let githubScopeAtOpen = null;
let githubScopeTouched = false;
let githubWasConnectedAtOpen = false;
let githubStartedHere = false;
let disconnectPending = false;
let githubStarting = false;
let githubBeginRevision = 0;
let availableAccounts = new Map();
let repoInventory = [];
let repoInventoryComplete = false;
let repoInventoryReady = false;
let repoInventoryRevision = 0;
let selectedRepoNames = new Set();
let originalRepoNames = [];
let repoMode = "all";
let repoChoiceTouched = false;
let monitorScopesRevision = 0;

// Match native github_api::valid_name: ASCII-only, 1–100 bytes,
// with no relative path components.
const REPO_NAME = /^[a-zA-Z0-9_.-]{1,100}$/;
const validRepoName = name => REPO_NAME.test(name) &&
  name !== "." && name !== "..";
function normalizeRepoDraft() {
  return repoMode === "all" ? [] : [...selectedRepoNames].sort();
}
function updateRepoDirty() {
  repoChoiceTouched = JSON.stringify(normalizeRepoDraft()) !==
    JSON.stringify(originalRepoNames);
  updateApply();
}
function repoChoiceValid() {
  if (repoMode === "all") return true;
  if (selectedRepoNames.size === 0 || selectedRepoNames.size > 100) return false;
  if (!repoChoiceTouched) return true; // Preserve existing config if API is offline.
  return repoInventoryReady && [...selectedRepoNames].every(name =>
    repoInventory.includes(name));
}
function renderRepoChoices() {
  byId("github-repo-mode").value = repoMode;
  const list = byId("github-repo-list");
  const filter = byId("github-repo-filter");
  const show = repoMode === "selected";
  list.hidden = !show;
  filter.hidden = !show;
  list.replaceChildren();
  byId("github-repo-status").hidden = !show;
  if (!show) {
    byId("github-repo-status").textContent = "";
    return;
  }
  const query = filter.value.trim().toLowerCase();
  const visible = repoInventory.filter(name =>
    name.toLowerCase().includes(query));
  for (const name of visible.slice(0, 100)) {
    const label = document.createElement("label");
    label.className = "github-repo-choice";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = name;
    checkbox.checked = selectedRepoNames.has(name);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedRepoNames.add(name);
      else selectedRepoNames.delete(name);
      updateRepoDirty();
      renderRepoChoices();
    });
    const title = document.createElement("span");
    title.dir = "auto"; // GitHub repository names may contain mixed-script text.
    title.textContent = name;
    label.append(checkbox, title);
    list.append(label);
  }
  const unavailable = [...selectedRepoNames].filter(name =>
    !repoInventory.includes(name)).length;
  byId("github-repo-status").textContent = !repoInventoryReady
    ? t("Repository list unavailable. Existing selection is preserved.")
    : selectedRepoNames.size === 0 ? t("Choose at least one repository.")
    : selectedRepoNames.size > 100 ? t("Select at most 100 repositories.")
    : repositorySelectionMessage(uiLocale, {
      selected: selectedRepoNames.size,
      total: repoInventory.length,
      unavailable,
      complete: repoInventoryComplete,
      filterHasMore: visible.length > 100
    });
}

async function refreshRepoInventory() {
  const revision = ++repoInventoryRevision;
  const id = availableAccounts.get(selectedScope);
  const panel = byId("github-repo-controls");
  panel.hidden = !githubConnected || !id || !selectedScope;
  repoInventory = [];
  repoInventoryReady = false;
  repoInventoryComplete = false;
  renderRepoChoices();
  if (panel.hidden) return;
  try {
    const all = new Set();
    let complete = false;
    for (let page = 1; page <= 10; page++) {
      const payload = await invoke("github_api_get", { path:
        "/user/installations/" + id + "/repositories?per_page=100&page=" + page });
      if (!Array.isArray(payload?.repositories) ||
          payload.repositories.length > 100) throw Error("Invalid repository list");
      for (const item of payload.repositories) {
        const name = item?.full_name;
        // Native may project a null full_name from malformed provider
        // data. An incomplete page cannot be presented as exhaustive.
        if (typeof name !== "string") throw Error("Invalid repository list");
        const parts = name.split("/");
        if (parts.length === 2 &&
            parts[0].toLowerCase() === selectedScope.toLowerCase() &&
            validRepoName(parts[1])) all.add(name);
      }
      if (payload.repositories.length < 100) {
        complete = true;
        break;
      }
    }
    if (revision !== repoInventoryRevision) return;
    repoInventory = [...all].sort((a, b) => a.localeCompare(b));
    repoInventoryComplete = complete;
    repoInventoryReady = true;
  } catch {
    if (revision !== repoInventoryRevision) return;
    // Never erase a previously saved selection due to network failure.
    repoInventoryReady = false;
  }
  renderRepoChoices();
  updateApply();
}
byId("github-repo-mode").addEventListener("change", event => {
  if (!githubConnected || !selectedScope) return;
  repoMode = event.target.value === "selected" ? "selected" : "all";
  if (repoMode === "all") selectedRepoNames.clear();
  updateRepoDirty();
  renderRepoChoices();
});
byId("github-repo-filter").addEventListener("input", renderRepoChoices);

function clearMonitorScopes() {
  // Reject late inventory and repository requests after native disconnect.
  ++monitorScopesRevision;
  ++repoInventoryRevision;
  availableAccounts = new Map();
  repoInventory = [];
  repoInventoryReady = false;
  repoInventoryComplete = false;
  byId("github-monitor-scope-row").hidden = true;
  byId("github-repo-controls").hidden = true;
}

async function refreshMonitorScopes() {
  const revision = ++monitorScopesRevision;
  const row = byId("github-monitor-scope-row");
  row.hidden = !githubConnected;
  if (!githubConnected) {
    clearMonitorScopes();
    return;
  }
  try {
    // The same bounded, permission-aware installation inventory is used
    // by Settings and the background monitor; never assume page 1 is all.
    const [config, inventory] = await Promise.all([
      invoke("get_monitor_scope"),
      listAvailableInstallations(path => invoke("github_api_get", { path }))
    ]);
    if (revision !== monitorScopesRevision || !githubConnected) return;
    traceStartup("settings.installations_ready");
    const select = byId("github-monitor-scope");
    select.dir = "ltr"; // Account identifiers are not translated UI strings.
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("Choose account");
    select.append(placeholder);
    availableAccounts = new Map(inventory.items.map(item => [item.name, item.id]));
    const accounts = [...availableAccounts.keys()].sort();
    for (const name of accounts) {
      const option = document.createElement("option");
      option.value = name;
      option.dir = "auto";
      option.textContent = name;
      select.append(option);
    }
    if (githubScopeAtOpen === null) githubScopeAtOpen = config || "";
    const suggestion = config ||
      (inventory.complete && accounts.length === 1 ? accounts[0] : "");
    // An explicit draft selection must never be overwritten by a late
    // refresh; an incomplete listing does not prove a saved account gone.
    if (!githubScopeTouched) selectedScope = suggestion;
    select.value = accounts.includes(selectedScope) ? selectedScope : "";
    if (!inventory.complete) githubMessage(
      t("GitHub installation list incomplete. Some accounts may be unavailable."), true);
    await refreshRepoInventory();
    if (revision !== monitorScopesRevision || !githubConnected) return;
    updateApply();
  } catch {
    if (revision !== monitorScopesRevision || !githubConnected) return;
    githubMessage("GitHub authorized; cannot list available installations.", true);
  }
}

byId("github-monitor-scope").addEventListener("change", event => {
  selectedScope = event.target.value || "";
  githubScopeTouched = selectedScope !== (githubScopeAtOpen || "");
  // One monitored account at a time; changing it never retains the
  // previous account's private repository list.
  repoMode = "all";
  selectedRepoNames.clear();
  byId("github-repo-filter").value = "";
  updateRepoDirty();
  githubMessage("Press OK to confirm the monitoring account.");
  void refreshRepoInventory();
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
  lastGithubText = String(text);
  const element = byId("github-auth-message");
  element.textContent = t(String(text));
  element.classList.toggle("error", error);
}

function githubButtons() {
  const unknown = githubChecking || githubCheckFailed;
  byId("github-connect").hidden = unknown || githubConnected || githubPending;
  byId("github-disconnect").hidden = unknown || !githubConnected;
  byId("github-device-flow").hidden = !githubPending;
  if (!githubPending) byId("github-copy-code").textContent = t("Copy code");
  const status = githubChecking ? t("Checking connection...")
    : githubCheckFailed ? t("Connection unavailable")
    : githubPending ? t("Authorization pending")
    : disconnectPending ? t("Pending disconnect")
    : githubConnected ? t("Authorized") : t("Not connected");
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
  // Auth events cannot establish trust when Settings configuration is
  // still loading or its most recent initialization has failed.
  if (settingsLoading || settingsInitFailed) return;
  // Disconnect is an explicit uncommitted Settings draft. The native
  // credential intentionally still exists until OK, so an auth event
  // must not resurrect Authorized controls over the pending choice.
  // clearMonitorScopes already invalidates reads started before the draft.
  if (disconnectPending) return;
  const authRevision = ++monitorScopesRevision;
  try {
    // The initial auth status is already captured by Settings initialization.
    // Avoid a redundant second OS wallet read on cold open.
    const auth = knownAuth ?? await invoke("github_auth_status");
    if (authRevision !== monitorScopesRevision) return;
    githubChecking = false;
    githubCheckFailed = false;
    githubConnected = auth.connected === true;
    if (!githubConnected) clearMonitorScopes();
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
    if (authRevision !== monitorScopesRevision) return;
    clearMonitorScopes();
    githubChecking = false;
    githubCheckFailed = true;
    githubConnected = false;
    githubPending = false;
    stopGithubStatusUpdates();
    byId("github-user-code").textContent = "";
    githubButtons();
    // The IPC rejection is not a trusted display string.
    githubMessage("Connection unavailable", true);
  }
}

byId("github-connect").addEventListener("click", async () => {
  // Defend at the controller boundary, not just through a disabled DOM.
  if (githubPending || githubStarting || githubConnected || githubChecking ||
      githubCheckFailed || settingsLoading || settingsInitFailed || saving) return;
  byId("github-connect").disabled = true;
  githubStarting = true;
  const beginRevision = ++githubBeginRevision;
  githubStartedHere = true;
  updateApply();
  try {
    const challenge = await invoke("github_begin");
    // A dismissed or reinitialized Settings window cannot consume the
    // response of an older device-code request.
    if (beginRevision !== githubBeginRevision) return;
    // Only a public one-time USER code may enter the WebView.
    byId("github-user-code").textContent = challenge.userCode;
    githubPending = true;
    githubMessage("Waiting for approval in GitHub.");
    githubButtons();
    startGithubStatusUpdates();
  } catch {
    if (beginRevision !== githubBeginRevision) return;
    githubPending = false;
    githubStartedHere = false;
    // Native rejection text is not an authorized WebView diagnostic.
    githubMessage("GitHub authorization failed.", true);
    githubButtons();
  } finally {
    if (beginRevision === githubBeginRevision) {
      githubStarting = false;
      byId("github-connect").disabled = false;
      updateApply();
    }
  }
});

byId("github-copy-code").addEventListener("click", async () => {
  const code = byId("github-user-code").textContent;
  if (!githubPending || !code) return;
  try {
    await invoke("github_copy_user_code", { code });
    byId("github-copy-code").textContent = t("Copied");
    githubMessage("Verification code copied.");
  } catch {
    byId("github-copy-code").textContent = t("Copy code");
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
  ++githubBeginRevision;
  githubStarting = false;
  await invoke("github_cancel");
  stopGithubStatusUpdates();
  githubPending = false;
  byId("github-user-code").textContent = "";
  githubButtons();
  githubMessage("Authorization cancelled.");
});
byId("github-disconnect").addEventListener("click", () => {
  // Disconnect is destructive to the stored credential. Defer it until OK,
  // exactly like roots, language, scope and autostart.
  if (saving || !githubConnected) return;
  disconnectPending = true;
  stopGithubStatusUpdates();
  githubConnected = false;
  clearMonitorScopes();
  githubPending = false;
  byId("github-user-code").textContent = "";
  githubButtons();
  githubMessage("Disconnect will apply after OK.");
  updateApply();
});

window.__TAURI__?.event?.listen?.("repoticker-github-auth", () => {
  // Treat events as prompts to reconcile state, never as the sole source
  // of truth. This also catches wallet failures after browser approval.
  void refreshGithub();
});

function message(text, error = false) {
  lastFormText = String(text);
  byId("message").textContent = t(String(text));
  byId("message").classList.toggle("error", error);
}
function isDirty() {
  if (!original || !draft) return false;
  return original.language !== draft.language ||
    (original.autostartEnabled !== null &&
     original.autostartEnabled !== draft.autostartEnabled) ||
    original.ciFailureNotifications !== draft.ciFailureNotifications ||
    JSON.stringify(original.roots) !== JSON.stringify(draft.roots) ||
    JSON.stringify(original.ignoredChildNames) !== JSON.stringify(draft.ignoredChildNames);
}
function updateApply() {
  const authNeedsConfirmation = (githubConnected && githubStartedHere) || disconnectPending;
  byId("apply-settings").disabled =
    saving || settingsLoading || settingsInitFailed || githubCheckFailed ||
    githubStarting || githubPending || !repoChoiceValid() ||
    (githubScopeTouched && !!selectedScope && !availableAccounts.has(selectedScope)) ||
    !(isDirty() || authNeedsConfirmation || githubScopeTouched || repoChoiceTouched);
}
function displayRootPath(path) {
  // Windows canonical paths may use the verbatim namespace; keep that
  // canonical value for persistence and compare, but present a normal path.
  const slash = String.fromCharCode(92);
  const prefix = slash + slash + "?" + slash;
  if (!path.startsWith(prefix)) return path;
  const remainder = path.slice(prefix.length);
  return remainder.startsWith("UNC" + slash)
    ? slash + slash + remainder.slice(4) : remainder;
}

function renderRoots() {
  const list = byId("roots-list");
  list.replaceChildren();
  if (!draft.roots.length) {
    const label = document.createElement("p");
    label.textContent = t("No enrolled folders.");
    label.className = "hint";
    list.append(label);
  }
  for (const root of draft.roots) {
    const row = document.createElement("div");
    row.className = "root";
    const label = document.createElement("span");
    label.textContent = displayRootPath(root);
    label.dir = "ltr";
    label.title = displayRootPath(root);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = t("Remove");
    remove.addEventListener("click", () => {
      draft.roots = draft.roots.filter(item => item !== root);
      renderRoots();
      updateApply();
    });
    row.append(label, remove);
    list.append(row);
  }
}
function renderIgnoredChildren() {
  const list = byId("ignored-child-list");
  list.replaceChildren();
  if (!draft.ignoredChildNames.length) {
    const label = document.createElement("p");
    label.className = "hint";
    label.textContent = t("No additional folders excluded.");
    list.append(label);
  }
  for (const name of draft.ignoredChildNames) {
    const row = document.createElement("div");
    row.className = "root";
    const label = document.createElement("span");
    label.textContent = name;
    label.title = name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = t("Remove");
    remove.addEventListener("click", () => {
      draft.ignoredChildNames = draft.ignoredChildNames.filter(item => item !== name);
      renderIgnoredChildren();
      updateApply();
    });
    row.append(label, remove);
    list.append(row);
  }
}
byId("ignore-child-form").addEventListener("submit", event => {
  event.preventDefault();
  if (!draft || saving) return;
  const field = byId("ignored-child-name");
  const name = field.value.trim();
  if (!name || name === "." || name === ".." ||
      name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(name)) {
    message("Enter a single folder name without separators or control characters.", true);
    return;
  }
  if (draft.ignoredChildNames.length >= 100 &&
      !draft.ignoredChildNames.includes(name)) {
    message("You can exclude at most 100 child folder names.", true);
    return;
  }
  if (!draft.ignoredChildNames.includes(name)) {
    draft.ignoredChildNames.push(name);
    draft.ignoredChildNames.sort();
  }
  field.value = "";
  renderIgnoredChildren();
  message("");
  updateApply();
});
async function refresh() {
  const revision = ++settingsRefreshRevision;
  // Reopening the same WebView supersedes an older pending challenge.
  ++githubBeginRevision;
  settingsLoading = true;
  try {
    githubChecking = true;
    githubCheckFailed = false;
    githubButtons();
    githubMessage("Checking GitHub connection...");
    // Persistent form settings and native KWallet interrogation run independently.
    // Neither path triggers local Git discovery/inspection.
    const [snapshot, authAtOpen, autostartState] = await Promise.all([
      invoke("get_settings_config"), invoke("github_auth_status"),
      invoke("autostart_is_enabled").catch(() => null)
    ]);
    if (revision !== settingsRefreshRevision) return;
    settingsLoading = false;
    settingsInitFailed = false;
    traceStartup("settings.config_auth_ready");
    githubWasConnectedAtOpen = authAtOpen.connected === true;
    githubStartedHere = false;
    githubStarting = false;
    byId("github-connect").disabled = false;
    disconnectPending = false;
    githubScopeTouched = false;
    githubScopeAtOpen = snapshot.github_monitor_org || "";
    originalRepoNames = [...(snapshot.github_monitor_repositories || [])].sort();
    selectedRepoNames = new Set(originalRepoNames);
    repoMode = originalRepoNames.length ? "selected" : "all";
    repoChoiceTouched = false;
    selectedScope = null;
    original = {
      roots: [...(snapshot.roots || [])],
      language: snapshot.language || "en",
      ignoredChildNames: [...(snapshot.ignored_child_names || [])].sort(),
      ciFailureNotifications: snapshot.ci_failure_notifications === true,
      autostartEnabled: typeof autostartState === "boolean" ? autostartState : null
    };
    draft = {
      roots: [...original.roots],
      language: original.language,
      ignoredChildNames: [...original.ignoredChildNames],
      ciFailureNotifications: original.ciFailureNotifications,
      autostartEnabled: original.autostartEnabled
    };
    byId("ci-failure-notifications").checked = draft.ciFailureNotifications;
    byId("autostart-enabled").checked = draft.autostartEnabled === true;
    byId("autostart-enabled").disabled = draft.autostartEnabled === null;
    byId("autostart-status").textContent = draft.autostartEnabled === null
      ? t("Autostart unavailable") : "";
    applySettingsLanguage(draft.language);
    byId("root-path").value = "";
    updateLanguagePicker();
    renderRoots();
    renderIgnoredChildren();
    byId("ignored-child-name").value = "";
    message("");
    updateApply();
    await refreshGithub(authAtOpen);
  } catch {
    // Only the newest initialization attempt may change the dialog.
    if (revision !== settingsRefreshRevision) return;
    settingsLoading = false;
    settingsInitFailed = true;
    githubChecking = false;
    githubCheckFailed = true;
    githubConnected = false;
    githubPending = false;
    stopGithubStatusUpdates();
    clearMonitorScopes();
    githubButtons();
    // Native IPC failures can contain local paths or provider details.
    // Never echo arbitrary rejection text into the Settings WebView.
    githubMessage("Cannot initialize settings.", true);
    message("Cannot initialize settings.", true);
  }
}
byId("autostart-enabled").addEventListener("change", event => {
  if (!draft || saving || original?.autostartEnabled === null) return;
  draft.autostartEnabled = event.target.checked === true;
  updateApply();
});
byId("ci-failure-notifications").addEventListener("change", event => {
  if (!draft || saving) return;
  draft.ciFailureNotifications = event.target.checked === true;
  updateApply();
});
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

// The native OS picker only edits the Settings draft. OK persists; Cancel
// discards. One active selector prevents duplicate modal dialogs.
let rootBrowsePending = false;
byId("browse-root").addEventListener("click", async () => {
  if (!draft || saving || rootBrowsePending) return;
  rootBrowsePending = true;
  byId("browse-root").disabled = true;
  try {
    const selected = await invoke("select_repository_root");
    if (typeof selected === "string" && selected.trim()) {
      if (!draft.roots.includes(selected)) draft.roots.push(selected);
      byId("root-path").value = "";
      renderRoots();
      updateApply();
      message("");
    }
  } catch (error) {
    message(String(error), true);
  } finally {
    rootBrowsePending = false;
    byId("browse-root").disabled = false;
  }
});

// Ignored child folders are NAME-only exclusions shared by all enrolled
// roots. Picking a folder extracts its final segment, never stores a path.
let ignoredBrowsePending = false;
byId("browse-ignored-child").addEventListener("click", async () => {
  if (!draft || saving || ignoredBrowsePending) return;
  ignoredBrowsePending = true;
  byId("browse-ignored-child").disabled = true;
  try {
    const selected = await invoke("select_repository_root");
    if (typeof selected === "string") {
      const name = selected.replace(/[\\/]+$/, "").split(/[\\/]/).at(-1);
      if (!name || name === "." || name === ".." ||
          name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(name)) {
        throw Error("Invalid folder name");
      }
      if (!draft.ignoredChildNames.includes(name)) {
        if (draft.ignoredChildNames.length >= 100)
          throw Error("You can exclude at most 100 child folder names.");
        draft.ignoredChildNames.push(name);
        draft.ignoredChildNames.sort();
      }
      renderIgnoredChildren();
      updateApply();
      message("");
    }
  } catch (error) {
    message(String(error), true);
  } finally {
    ignoredBrowsePending = false;
    byId("browse-ignored-child").disabled = false;
  }
});

const languageTrigger = byId("language-trigger");
const languageList = byId("language-options");
const languageOptions = [...languageList.querySelectorAll("[role=option]")];

function updateLanguagePicker() {
  languageTrigger.firstChild.textContent = localeName(draft.language) + " ";
  for (const option of languageOptions) {
    option.setAttribute("aria-selected", String(option.dataset.value === draft.language));
    option.tabIndex = -1; // Focus is programmatic; never add two tab stops.
  }
}
function closeLanguagePicker(returnFocus = false) {
  const wasOpen = !languageList.hidden;
  languageList.hidden = true;
  languageTrigger.setAttribute("aria-expanded", "false");
  if (returnFocus && wasOpen) languageTrigger.focus();
}
function openLanguagePicker(position = "selected") {
  if (!draft || saving) return;
  languageList.hidden = false;
  languageTrigger.setAttribute("aria-expanded", "true");
  const selected = languageOptions.find(item => item.dataset.value === draft.language);
  const target = position === "first" ? languageOptions[0]
    : position === "last" ? languageOptions.at(-1) : selected || languageOptions[0];
  target?.focus();
}
languageTrigger.addEventListener("click", () => {
  if (!languageList.hidden) closeLanguagePicker(true);
  else openLanguagePicker();
});
languageTrigger.addEventListener("keydown", event => {
  if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    if (!draft || saving) return;
    event.preventDefault();
    openLanguagePicker(event.key === "Home" ? "first"
      : event.key === "End" ? "last" : "selected");
  }
});
languageList.addEventListener("keydown", event => {
  if (languageList.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeLanguagePicker(true);
    return;
  }
  if (event.key === "Tab") {
    closeLanguagePicker(); // Let browser advance to the next/previous control.
    return;
  }
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const current = languageOptions.indexOf(document.activeElement);
  const selected = languageOptions.findIndex(item => item.dataset.value === draft?.language);
  const index = current >= 0 ? current : Math.max(selected, 0);
  const next = event.key === "Home" ? 0
    : event.key === "End" ? languageOptions.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1)
        + languageOptions.length) % languageOptions.length;
  languageOptions[next]?.focus();
});
for (const option of languageOptions) {
  option.addEventListener("click", () => {
    if (!draft || saving) return;
    draft.language = option.dataset.value;
    // The selected locale is a draft. Neither this window nor the card,
    // native title, tooltips or tray change language before OK.
    updateLanguagePicker();
    updateApply();
    closeLanguagePicker();
    languageTrigger.focus();
  });
}
document.addEventListener("pointerdown", event => {
  if (!event.target.closest(".language-picker")) closeLanguagePicker();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !languageList.hidden) {
    event.preventDefault();
    closeLanguagePicker(true);
  }
});
byId("cancel-settings").addEventListener("click", async () => {
  if (saving) return;
  // Invalidate pending challenge continuations before the first await.
  ++githubBeginRevision;
  githubStarting = false;
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
  if (saving || settingsLoading || settingsInitFailed || githubCheckFailed ||
      githubPending || githubStarting || !repoChoiceValid() ||
      (githubScopeTouched && !!selectedScope && !availableAccounts.has(selectedScope)) ||
      !(isDirty() || githubScopeTouched || repoChoiceTouched ||
        (githubConnected && githubStartedHere) || disconnectPending)) return;
  saving = true;
  updateApply();
  try {
    const autostartChanged = original.autostartEnabled !== null &&
      draft.autostartEnabled !== original.autostartEnabled;
    const configChanges = {};
    if (original.language !== draft.language)
      configChanges.language = draft.language;
    if (original.ciFailureNotifications !== draft.ciFailureNotifications)
      configChanges.ciFailureNotifications = draft.ciFailureNotifications;
    if (JSON.stringify(original.roots) !== JSON.stringify(draft.roots))
      configChanges.roots = [...draft.roots];
    if (JSON.stringify(original.ignoredChildNames) !== JSON.stringify(draft.ignoredChildNames))
      configChanges.ignoredChildNames = [...draft.ignoredChildNames];
    if (Object.keys(configChanges).length) {
      await invoke("save_settings", configChanges);
    }
    if (githubConnected && (githubScopeTouched || repoChoiceTouched || githubStartedHere)) {
      // Commit the account selection only on explicit OK. Reapplying the
      // selection also sends repoticker-github-scope-changed to refresh
      // the running monitor/card while they remain visible.
      const repositories = normalizeRepoDraft();
      await invoke("github_set_monitor_org", {
        org: selectedScope || null, repositories
      });
      githubScopeTouched = false;
      githubScopeAtOpen = selectedScope || "";
      originalRepoNames = repositories;
      repoChoiceTouched = false;
      // The native scope-changed event refreshes the monitor/card.
      // A redundant network inventory fetch must not block closing Settings.
    }
    if (autostartChanged) {
      const actual = await invoke("autostart_set_enabled", {
        enabled: draft.autostartEnabled
      });
      if (actual !== draft.autostartEnabled)
        throw Error("System autostart registration could not be verified.");
      original.autostartEnabled = actual;
    }
    if (disconnectPending) {
      await invoke("github_disconnect");
      disconnectPending = false;
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
  void refresh();
});
void refresh();
