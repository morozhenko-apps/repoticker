import { nextCardView, syncReadyCommitCount } from "./view.mjs";
import { createNativeDragGesture } from "./native-drag.mjs";
import { startGithubMonitoring } from "./github-monitor.mjs";
import { compactStatus } from "./status-metrics.mjs";
import { cardLocale, cardText, metricAccessibleLabel } from "./card-i18n.mjs";
import { mergeMonitorPresentation, reconcileScanPresentation } from "./monitor-presentation.mjs";
import { placeRepoMenu } from "./repo-menu.mjs";
import { hoverFallbackText } from "./hover-fallback.mjs";
import { localeDirection } from "./locale-catalog.mjs";
import { createScanRefreshQueue } from "./scan-refresh.mjs";

const emptySnapshot = {
  roots: [], repositories: [], errors: [],
  ci_running: null, ci_queued: null, runners_online: null,
  connected: false
};
const byId = id => document.getElementById(id);
const invoke = (command, args = {}) => {
  if (!window.__TAURI__?.core?.invoke) {
    return Promise.reject(new Error("Launch the desktop application to use Git."));
  }
  return window.__TAURI__.core.invoke(command, args);
};
const traceStartup = stage => {
  // Only native allowlisted labels are emitted when the user explicitly opts in.
  // Fire and forget so diagnostics never block first render.
  void invoke("trace_startup_stage", { stage }).catch(() => {});
};
traceStartup("card.start");
let firstSnapshotReady = false;
let firstMonitorReady = false;
let monitorRevision = 0;
let monitorRequest = 0;
let snapshot = emptySnapshot;
let cardLanguage = "en";
let lastMetricStatus = compactStatus(null);
let busy = false;
let fetchCancelling = false;
let view = "compact";
let progress = null;
let idleTimer = null;
let cardVisible = false;
const IDLE_MS = 15_000;
const AUTO_HIDE_EVENTS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];
function cancelAutoHide() {
  if (idleTimer !== null) { clearTimeout(idleTimer); idleTimer = null; }
}
function armAutoHide() {
  cancelAutoHide();
  // Only the compact card is transient. An open Repos drawer must never
  // disappear while users inspect repositories or perform operations.
  if (!cardVisible || view !== "compact" || quotaExpanded) return;
  idleTimer = setTimeout(async () => {
    try { await invoke("hide_card"); resetView(); }
    catch (error) { showError(error); }
  }, IDLE_MS);
}
for (const eventName of AUTO_HIDE_EVENTS) {
  document.addEventListener(eventName, armAutoHide, { passive: true });
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelAutoHide();
  else armAutoHide();
});

function showError(message) {
  const node = byId("notice");
  node.textContent = String(message);
  node.hidden = false;
}
function clearError() {
  byId("notice").hidden = true;
  byId("notice").textContent = "";
}
function addText(parent, tag, value, className = "") {
  const el = document.createElement(tag);
  el.textContent = String(value);
  if (className) el.className = className;
  parent.append(el);
  return el;
}
const repoMenu = byId("repo-menu");
const repoDrawer = byId("repo-drawer");
let menuAnchor = null;
let menuRepoPath = null;

function hideRepoMenus(restoreFocus = false) {
  const previouslyFocused = menuAnchor;
  repoMenu.hidden = true;
  menuRepoPath = null;
  menuAnchor = null;
  document.querySelectorAll(".repo-more[aria-expanded='true']").forEach(button => {
    button.setAttribute("aria-expanded", "false");
  });
  if (restoreFocus && previouslyFocused?.isConnected) previouslyFocused.focus();
}

function showRepoMenu(button, repoPath) {
  const alreadyOpen = menuAnchor === button && !repoMenu.hidden;
  hideRepoMenus();
  if (alreadyOpen) return;
  menuAnchor = button;
  menuRepoPath = repoPath;
  repoMenu.hidden = false;
  const position = placeRepoMenu(
    button.getBoundingClientRect(),
    repoDrawer.getBoundingClientRect(),
    repoMenu.getBoundingClientRect()
  );
  repoMenu.style.left = position.left + "px";
  repoMenu.style.top = position.top + "px";
  repoMenu.style.width = position.width + "px";
  button.setAttribute("aria-expanded", "true");
  repoMenu.querySelector("button")?.focus();
}

for (const [key, operation] of [
  ["fetch", "fetch"],
  ["safeSync", "safe_sync"],
  ["openGithub", "open_github"],
  ["openFolder", "open_folder"],
  ["copyPath", "copy_path"]
]) {
  const item = addText(repoMenu, "button", cardText(cardLanguage, key));
  item.dataset.localeKey = key;
  item.type = "button";
  item.setAttribute("role", "menuitem");
  item.addEventListener("click", async () => {
    const path = menuRepoPath;
    hideRepoMenus();
    if (!path) return;
    const nativeActions = {
      open_github: "open_repository_on_github",
      open_folder: "open_repository_folder",
      copy_path: "copy_repository_path"
    };
    if (Object.hasOwn(nativeActions, operation)) {
      try {
        await invoke(nativeActions[operation], { repoPath: path });
      } catch (error) {
        showError(error);
      }
    } else {
      void runGitAction(operation, path);
    }
  });
}

repoMenu.addEventListener("keydown", event => {
  const items = [...repoMenu.querySelectorAll("button")];
  const current = items.indexOf(document.activeElement);
  let target = null;
  if (event.key === "ArrowDown") target = items[(current + 1) % items.length];
  if (event.key === "ArrowUp") target = items[(current + items.length - 1) % items.length];
  if (event.key === "Home") target = items[0];
  if (event.key === "End") target = items[items.length - 1];
  if (target) {
    event.preventDefault();
    target.focus();
  }
});

document.addEventListener("pointerdown", event => {
  if (!repoMenu.hidden &&
      !repoMenu.contains(event.target) &&
      !event.target.closest(".repo-more")) hideRepoMenus();
});
byId("repo-list").addEventListener("scroll", () => hideRepoMenus(), { passive: true });
window.addEventListener("resize", () => hideRepoMenus());

function makeRepoRow(repo) {
  const row = document.createElement("div");
  row.className = "repo-row";
  row.title = repo.path;
  row.dataset.repoPath = repo.path;
  addText(row, "span", repo.name, "repo-name");
  addText(row, "span", repo.branch, "repo-branch");
  const current = !repo.dirty && !repo.ahead && !repo.behind && repo.upstream;
  const symbol = repo.dirty ? "●" :
    repo.ahead && repo.behind ? "⇅" :
    repo.behind ? "↓" + repo.behind :
    repo.ahead ? "↑" + repo.ahead :
    current ? "✓" : "—";
  if (progress) {
    if (progress.active?.has(repo.path)) {
      row.classList.add("is-running");
    } else if (progress.done?.has(repo.path)) {
      row.classList.add("is-finished");
      if (progress.errors?.has(repo.path)) row.classList.add("is-failed");
    }
  }
  const indicator = addText(row, "span", symbol, "repo-delta");
  indicator.title = repo.sync_state;
  indicator.classList.toggle("is-current", Boolean(current));
  indicator.classList.toggle("is-dirty", Boolean(repo.dirty));
  indicator.classList.toggle("is-behind", !repo.dirty && repo.behind > 0 && !repo.ahead);

  const button = addText(row, "button", "⋯", "repo-more");
  button.type = "button";
  button.title = cardText(cardLanguage, "gitOperations");
  button.setAttribute("aria-label", cardText(cardLanguage, "gitOperationsFor", repo.name));
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "repo-menu");
  button.addEventListener("click", () => showRepoMenu(button, repo.path));
  return row;
}

function updateActionState() {
  const hasRepos = snapshot.repositories.length > 0;
  const eligible = syncReadyCommitCount(snapshot.repositories);
  const isRunning = busy || (progress && progress.phase !== "finish");
  const fetching = progress?.operation === "fetch" && progress.phase !== "finish";
  byId("fetch-all").disabled = fetchCancelling ||
    (isRunning && !fetching) || (!isRunning && !hasRepos);
  byId("fetch-all").title = cardText(cardLanguage, fetching ? "fetchCancel" : "fetchTitle");
  byId("sync-all").disabled = isRunning || eligible === 0;
  for (const [operation, id] of [["fetch", "fetch-all"], ["safe_sync", "sync-all"]]) {
    const button = byId(id);
    const active = progress?.operation === operation;
    button.classList.toggle("is-working", active);
    if (active) {
      const pct = progress.total
        ? Math.round(100 * progress.completed / progress.total) : 100;
      button.querySelector(".action-label").textContent =
        operation === "fetch" ? cardText(cardLanguage, fetchCancelling ? "stopping" : "cancel") : pct + "%";
    } else {
      button.querySelector(".action-label").textContent =
        cardText(cardLanguage, operation === "fetch" ? "fetch" : "safeSync");
    }
  }
  const count = byId("pull-indicator");
  count.textContent = eligible ? "⇅" + eligible : "⇅";
  count.classList.toggle("has-commits", eligible > 0);
  byId("sync-all").title = eligible
    ? cardText(cardLanguage, "syncReady", eligible)
    : cardText(cardLanguage, "syncUnavailable");
}

/* A single noninteractive native balloon follows three independent hover
 * targets. Serialize native show/hide IPC; only the last requested kind wins.
 */
const hoverTargets = {
  runners: byId("runner-status"),
  tasks: byId("ci-tasks"),
  billing: document.querySelector(".quota-anchor"),
};
let quotaExpanded = false;
let hoveredKind = null;
let visibleKind = null;
let quotaQueue = Promise.resolve();
let triggerMonitorRefresh = null;

function setActiveTooltip(kind) {
  for (const [name, node] of Object.entries(hoverTargets)) {
    node.setAttribute("aria-expanded", String(name === kind));
    node.dataset.open = String(name === kind);
  }
}

function resetQuota() {
  hoveredKind = null;
  visibleKind = null;
  quotaExpanded = false;
  setActiveTooltip(null);
  void invoke("hide_usage_popup").catch(() => {});
}

function setQuotaOpen(kind = null) {
  hoveredKind = kind;
  quotaQueue = quotaQueue.then(async () => {
    const wanted = cardVisible ? hoveredKind : null;
    if (wanted === visibleKind) return;
    if (wanted) {
      await invoke("show_usage_popup", { kind: wanted });
      if (!cardVisible || hoveredKind !== wanted) {
        // The final queued callback will show the newest target.
        if (!hoveredKind || !cardVisible) await invoke("hide_usage_popup");
        visibleKind = null;
        quotaExpanded = false;
        setActiveTooltip(null);
        return;
      }
      visibleKind = wanted;
      quotaExpanded = true;
      setActiveTooltip(wanted);
      cancelAutoHide();
    } else {
      await invoke("hide_usage_popup");
      visibleKind = null;
      quotaExpanded = false;
      setActiveTooltip(null);
      armAutoHide();
    }
  }).catch(error => {
    visibleKind = null;
    quotaExpanded = false;
    setActiveTooltip(null);
    showError(error);
  });
  return quotaQueue;
}

// A real hover/focus proves this WebView is currently shown even if the
// window-shown event was delivered before its listener was registered.
for (const [kind, anchor] of Object.entries(hoverTargets)) {
  const enter = () => {
    cardVisible = true;
    void setQuotaOpen(kind);
  };
  anchor.addEventListener("mouseenter", enter);
  anchor.addEventListener("mouseleave", () => {
    if (hoveredKind === kind) void setQuotaOpen(null);
  });
  anchor.addEventListener("focusin", enter);
  anchor.addEventListener("focusout", () => {
    if (hoveredKind === kind) void setQuotaOpen(null);
  });
}


const manualIndicator = { runners: byId("runner-status"), tasks: byId("ci-tasks") };
for (const [kind, node] of Object.entries(manualIndicator)) {
  node.addEventListener("click", () => {
    if (node.getAttribute("aria-busy") === "true") return;
    node.setAttribute("aria-busy", "true");
    clearError();
    // Independent GitHub metric refresh; no local Git scanning.
    void triggerMonitorRefresh?.(true, kind);
  });
}
function monitorRefreshState(kind, active) {
  if (kind === "all") {
    for (const node of Object.values(manualIndicator))
      node.setAttribute("aria-busy", String(active));
  } else {
    manualIndicator[kind]?.setAttribute("aria-busy", String(active));
  }
  updateMetricAccessibleNames();
}
function updateHoverFallbacks() {
  // WebView2's built-in title is a reliable minimum when the dedicated
  // unmanaged Windows balloon is not painted. KDE retains its rich native
  // detached balloon without duplicate browser tooltips.
  const windows = navigator.userAgent.includes("Windows");
  for (const [kind, node] of Object.entries(hoverTargets)) {
    if (windows) node.title = hoverFallbackText(kind, snapshot, cardLanguage);
    else node.removeAttribute("title");
  }
}
function updateMetricAccessibleNames() {
  for (const [kind, node] of Object.entries(manualIndicator)) {
    const busy = node.getAttribute("aria-busy") === "true";
    node.setAttribute("aria-label",
      metricAccessibleLabel(cardLanguage, kind, lastMetricStatus, busy));
  }
}
function setCardLanguage(language) {
  const next = cardLocale(language);
  if (next === cardLanguage) return;
  cardLanguage = next;
  document.documentElement.lang = cardLanguage;
  document.documentElement.dir = localeDirection(cardLanguage);
  repoDrawer.setAttribute("aria-label", cardText(cardLanguage, "repositories"));
  repoMenu.setAttribute("aria-label", cardText(cardLanguage, "repositoryActions"));
  document.querySelector(".status-strip").setAttribute("aria-label",
    cardText(cardLanguage, "githubMetrics"));
  document.querySelector(".quota-anchor").setAttribute("aria-label",
    cardText(cardLanguage, "billing"));
  for (const item of repoMenu.querySelectorAll("[data-locale-key]"))
    item.textContent = cardText(cardLanguage, item.dataset.localeKey);
  byId("runner-status").querySelector(".metric-caption").textContent =
    cardText(cardLanguage, "runners");
  byId("ci-tasks").querySelector(".metric-caption").textContent =
    cardText(cardLanguage, "tasks");
  byId("fetch-all").querySelector(".action-label").textContent =
    cardText(cardLanguage, "fetch");
  byId("sync-all").querySelector(".action-label").textContent =
    cardText(cardLanguage, "safeSync");
  byId("show-repos").querySelector(".action-label").textContent =
    cardText(cardLanguage, "repos");
  byId("hide-card").querySelector(".action-label").textContent =
    cardText(cardLanguage, "hide");
  byId("show-repos").title = cardText(cardLanguage,
    view === "repos" ? "hideRepos" : "showRepos");
  byId("hide-card").title = cardText(cardLanguage, "hideCard");
  updateActionState();
  updateMetricAccessibleNames();
  updateHoverFallbacks();
}
function renderMonitorMetrics(state) {
  const status = compactStatus(state);
  lastMetricStatus = status;
  updateMetricAccessibleNames();
  updateHoverFallbacks();
  byId("runners-total").textContent = status.total;
  byId("runners-online").textContent = status.online;
  byId("runners-offline").textContent = status.offline;
  byId("tasks-running").textContent = status.running;
  byId("tasks-queued").textContent = status.queued;
}
function traceMonitorReady() {
  if (!firstMonitorReady && snapshot.runner_state != null) {
    firstMonitorReady = true;
    traceStartup("card.monitor_ready");
  }
}
function render(next) {
  hideRepoMenus();
  const previousCount = snapshot.repositories.length;
  snapshot = next;
  if (view === "repos" && previousCount !== next.repositories.length) {
    void invoke("set_card_view", {
      view: "repos", repositoryCount: next.repositories.length
    }).catch(showError);
  }
  setCardLanguage(next.language);
  renderMonitorMetrics(next.runner_state);
  const list = byId("repo-list");
  list.replaceChildren();
  if (!next.repositories.length) {
    addText(list, "p", next.roots?.length
      ? cardText(cardLanguage, "noValidRepos")
      : cardText(cardLanguage, "addRoot"), "empty");
  } else {
    for (const repo of next.repositories) list.append(makeRepoRow(repo));
  }
  updateActionState();
  if (next.errors?.length) showError(next.errors[0]);
}
const refreshSnapshot = createScanRefreshQueue({
  // Capture the monitor revision at the START of each native scan.
  // The projection keeps newer remote-only metrics while local Git is read.
  scan: async () => {
    const revision = monitorRevision;
    const next = await invoke("get_snapshot");
    return { revision, next };
  },
  publish: ({ revision, next }) => {
    render(reconcileScanPresentation(next, snapshot, revision, monitorRevision));
    if (!firstSnapshotReady) {
      firstSnapshotReady = true;
      traceStartup("card.snapshot_ready");
    }
    traceMonitorReady();
  },
  onError: showError
});
function refresh() {
  return refreshSnapshot();
}

// Monitoring changes only the native in-memory presentation cache. A full
// Git status scan would rebuild every repo row and block remote status.
async function refreshMonitor() {
  const request = ++monitorRequest;
  try {
    const remote = await invoke("github_monitor_snapshot");
    // Ignore older IPC replies if multiple events arrived together.
    if (request !== monitorRequest) return;
    snapshot = mergeMonitorPresentation(snapshot, remote);
    monitorRevision++;
    renderMonitorMetrics(snapshot.runner_state);
    traceMonitorReady();
  } catch (error) {
    showError(error);
  }
}
function consumeResults(results) {
  // Successful fetch and fast-forward must never generate a permanent log panel
  // or a duplicate "N fetched" line. Real Git state is the success indicator.
  const errors = results.filter(item => item.status === "error");
  if (errors.length) {
    showError(cardText(cardLanguage, "gitErrors", errors.length) + errors[0].message);
  }
}
async function cancelActiveFetch() {
  if (fetchCancelling) return;
  fetchCancelling = true;
  updateActionState();
  try {
    const accepted = await invoke("cancel_git_fetch");
    if (!accepted) fetchCancelling = false;
  } catch (error) {
    fetchCancelling = false;
    showError(error);
  }
  updateActionState();
}
async function runGitAction(operation, repoPath = null) {
  if (busy) return;
  busy = true;
  progress = { operation, total: 0, completed: 0, path: "", phase: "begin", active: new Set(), done: new Set(), errors: new Set() };
  clearError();
  updateActionState();
  try {
    const result = await invoke("perform_git_action", { operation, repoPath });
    consumeResults(result);
    await refresh();
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
    progress = null;
    fetchCancelling = false;
    updateActionState();
    render(snapshot);
  }
}
function resetView() {
  resetQuota();
  view = "compact";
  byId("card").dataset.view = "compact";
  byId("repo-drawer").hidden = true;
  byId("show-repos").setAttribute("aria-pressed", "false");
  byId("show-repos").title = cardText(cardLanguage, "showRepos");
  hideRepoMenus();
}
async function openView(target) {
  if (quotaExpanded) await setQuotaOpen(false);
  const desired = nextCardView(view, target);
  if (desired === view) return;
  try {
    await invoke("set_card_view", {
      view: desired, repositoryCount: snapshot.repositories.length
    });
    view = desired;
    armAutoHide();
    byId("card").dataset.view = view;
    byId("repo-drawer").hidden = view !== "repos";
    byId("show-repos").setAttribute("aria-pressed", String(view === "repos"));
    byId("show-repos").title = cardText(cardLanguage,
      view === "repos" ? "hideRepos" : "showRepos");
    if (view !== "repos") hideRepoMenus();
  } catch (error) {
    showError(cardText(cardLanguage, "cannotResize") + error);
  }
}
byId("show-repos").addEventListener("click", () => openView("repos"));
byId("hide-card").addEventListener("click", async () => {
  try { await invoke("hide_card"); resetView(); }
  catch (error) { showError(error); }
});
byId("fetch-all").addEventListener("click", () => {
  if (progress?.operation === "fetch" && progress.phase !== "finish") {
    void cancelActiveFetch();
  } else if (!busy) {
    void runGitAction("fetch");
  }
});
byId("sync-all").addEventListener("click", () => runGitAction("safe_sync"));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !repoMenu.hidden) {
    event.preventDefault();
    hideRepoMenus(true);
    return;
  }
  if (event.key === "Escape") {
    if (quotaExpanded) { void setQuotaOpen(false); return; }
    if (view !== "compact") openView(view);
    else byId("hide-card").click();
  }
});
window.__TAURI__?.event?.listen?.("repoticker-git-progress", event => {
  const payload = event.payload;
  if (!payload || !["fetch", "safe_pull", "safe_sync"].includes(payload.operation)) return;
  if (!progress || progress.operation !== payload.operation) {
    progress = { operation: payload.operation, active: new Set(), done: new Set(), errors: new Set() };
  }
  progress.total = payload.total;
  progress.completed = Math.max(progress.completed || 0, payload.completed);
  progress.path = payload.path;
  progress.phase = payload.phase;
  if (payload.phase === "start") progress.active.add(payload.path);
  if (payload.phase === "complete") {
    progress.active.delete(payload.path);
    progress.done.add(payload.path);
    if (payload.status === "error") progress.errors.add(payload.path);
  }
  if (payload.phase === "finish") {
    fetchCancelling = false;
    // Clear after native tray operations finish; GUI invocations clear in finally.
    if (!busy) progress = null;
  }
  updateActionState();
  // Only paint changed row; do not reconstruct the entire list or reset its scroll.
  document.querySelectorAll(".repo-row").forEach(row => {
    const path = row.dataset.repoPath;
    row.classList.toggle("is-running", !!progress?.active?.has(path));
    row.classList.toggle("is-finished", !!progress?.done?.has(path));
    row.classList.toggle("is-failed", !!progress?.errors?.has(path));
  });
});
window.__TAURI__?.event?.listen?.("repoticker-card-hidden", () => {
  hideRepoMenus();
  cardVisible = false;
  cancelAutoHide();
  resetQuota();
  stopDragging();
});
window.__TAURI__?.event?.listen?.("repoticker-card-shown", () => {
  cardVisible = true;
  armAutoHide();
});
window.__TAURI__?.event?.listen?.("repoticker-reset-view", () => {
  resetView();
  clearError();
  refresh();
});
// A saved locale must repaint controls immediately even if the local Git
// snapshot is still scanning an expanded drawer.
let appliedLocaleRevision = 0;
function refreshCardConfiguration() {
  const revision = ++appliedLocaleRevision;
  void invoke("get_settings_config").then(config => {
    if (revision !== appliedLocaleRevision) return;
    if (typeof config?.language === "string") setCardLanguage(config.language);
  }).catch(() => {});
  void refresh();
}
window.__TAURI__?.event?.listen?.("repoticker-config-changed", refreshCardConfiguration);
window.__TAURI__?.event?.listen?.("repoticker-monitor-updated", refreshMonitor);
window.__TAURI__?.event?.listen?.("repoticker-github-auth", refreshMonitor);
window.__TAURI__?.event?.listen?.("repoticker-github-scope-changed", refreshMonitor);
window.__TAURI__?.event?.listen?.("repoticker-git-action-finished", async event => {
  if (event.payload?.Ok) consumeResults(event.payload.Ok);
  else if (event.payload?.Err) showError(event.payload.Err);
  progress = null;
  await refresh();
});
// The persisted locale can be shown before slow local Git discovery.
 // A later authoritative Git snapshot wins over a stale config-only reply.
void invoke("get_settings_config").then(config => {
  if (firstSnapshotReady || typeof config?.language !== "string") return;
  setCardLanguage(config.language);
}).catch(() => {});
refresh();
triggerMonitorRefresh = startGithubMonitoring({
  invoke, event: window.__TAURI__?.event, onError: showError,
  onStage: traceStartup, onRefreshState: monitorRefreshState
});

/* GTK Layer Shell receives physical Wayland relative-pointer events directly.
   The WebView only owns the gesture start/end, never motion coordinates. */
const dragSurface = byId("card");
const dragGesture = createNativeDragGesture({
  start: () => invoke("start_card_drag"),
  stop: () => invoke("stop_card_drag"),
  onError: showError
});
let activePointerId = null;

function stopDragging(event = null) {
  if (event?.pointerId != null && event.pointerId !== activePointerId) return;
  const id = activePointerId;
  if (id === null) return;
  activePointerId = null;
  dragGesture.end(id);
  if (dragSurface.hasPointerCapture(id)) {
    dragSurface.releasePointerCapture(id);
  }
}

dragSurface.addEventListener("pointerdown", event => {
  if (event.button !== 0 || !event.isPrimary ||
      event.target.closest("button,input,select,a,.status-hover,[role=button],.drawer,.rows,.repo-row,.repo-menu")) return;
  if (!dragGesture.begin(event.pointerId)) return;
  activePointerId = event.pointerId;
  dragSurface.setPointerCapture(event.pointerId);
});
dragSurface.addEventListener("pointermove", event => {
  if (event.pointerId === activePointerId && !(event.buttons & 1)) {
    stopDragging(event);
  }
});
dragSurface.addEventListener("pointerup", stopDragging);
dragSurface.addEventListener("pointercancel", stopDragging);
dragSurface.addEventListener("lostpointercapture", stopDragging);
