import { nextCardView, pullReadyCommitCount } from "./view.mjs";
import { createNativeDragGesture } from "./native-drag.mjs";
import { buildQuotaDetails } from "./quota-details.mjs";

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
let snapshot = emptySnapshot;
let busy = false;
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
function hideRepoMenus() {
  document.querySelectorAll(".repo-menu").forEach(menu => { menu.hidden = true; });
  document.querySelectorAll(".repo-more").forEach(button => {
    button.setAttribute("aria-expanded", "false");
  });
}
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
  button.title = "Git operations";
  button.setAttribute("aria-label", "Git operations for " + repo.name);
  button.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "repo-menu";
  menu.hidden = true;
  for (const [label, operation] of [["Fetch", "fetch"], ["Safe pull", "safe_pull"]]) {
    const item = addText(menu, "button", label);
    item.type = "button";
    item.addEventListener("click", () => {
      hideRepoMenus();
      runGitAction(operation, repo.path);
    });
  }
  button.addEventListener("click", () => {
    const open = menu.hidden;
    hideRepoMenus();
    if (open) {
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
    }
  });
  row.append(menu);
  return row;
}

function updateActionState() {
  const hasRepos = snapshot.repositories.length > 0;
  const eligible = pullReadyCommitCount(snapshot.repositories);
  const isRunning = busy || (progress && progress.phase !== "finish");
  byId("fetch-all").disabled = isRunning || !hasRepos;
  byId("sync-all").disabled = isRunning || eligible === 0;
  for (const [operation, id] of [["fetch", "fetch-all"], ["safe_pull", "sync-all"]]) {
    const button = byId(id);
    const active = progress?.operation === operation;
    button.classList.toggle("is-working", active);
    if (active) {
      const pct = progress.total
        ? Math.round(100 * progress.completed / progress.total) : 100;
      button.querySelector(".action-label").textContent = pct + "%";
    } else {
      button.querySelector(".action-label").textContent =
        operation === "fetch" ? "Fetch" : "Safe pull";
    }
  }
  const count = byId("pull-indicator");
  count.textContent = eligible ? "↓" + eligible : "↓";
  count.classList.toggle("has-commits", eligible > 0);
  byId("sync-all").title = eligible
    ? eligible + " commits eligible for fast-forward (clean upstream branches)"
    : "No branches eligible for safe pull. Run Fetch to refresh remote refs.";
}
/* The quota panel is the existing ⓘ popup, now rendered INSIDE the
 * compositor-owned card instead of escaping the 122px compact viewport.
 * Keep the status strip and actions bottom-anchored and unchanged.
 */
const quotaAnchor = document.querySelector(".quota-anchor");
const quotaPanel = byId("quota-tooltip");
const quotaStrip = quotaAnchor.parentElement;
let quotaExpanded = false;
let quotaWanted = false;
let quotaQueue = Promise.resolve();

function resetQuota() {
  quotaWanted = false;
  quotaExpanded = false;
  quotaPanel.hidden = true;
  quotaAnchor.dataset.open = "false";
  quotaAnchor.setAttribute("aria-expanded", "false");
}

function setQuotaOpen(wanted) {
  quotaWanted = wanted;
  quotaQueue = quotaQueue.then(async () => {
    if (!cardVisible) { resetQuota(); return; }
    if (quotaWanted && !quotaExpanded) {
      // There is no free space above the status strip in compact mode.
      // The same native Wayland window is enlarged before showing content.
      if (view === "compact") {
        await invoke("set_card_view", { view: "quota" });
        if (!cardVisible || !quotaWanted) {
          if (cardVisible) await invoke("set_card_view", { view: "compact" });
          return;
        }
      }
      byId("repo-drawer").hidden = true;
      byId("card").dataset.view = "quota";
      quotaPanel.hidden = false;
      quotaExpanded = true;
      quotaAnchor.dataset.open = "true";
      quotaAnchor.setAttribute("aria-expanded", "true");
      cancelAutoHide();
    } else if (!quotaWanted && quotaExpanded) {
      quotaExpanded = false;
      quotaPanel.hidden = true;
      quotaAnchor.dataset.open = "false";
      quotaAnchor.setAttribute("aria-expanded", "false");
      if (cardVisible && view === "compact") {
        await invoke("set_card_view", { view: "compact" });
      }
      if (cardVisible) {
        byId("card").dataset.view = view;
        byId("repo-drawer").hidden = view !== "repos";
        armAutoHide();
      }
    }
  }).catch(showError);
  return quotaQueue;
}

// Hover on the shared status strip bridges the gap between the icon and
// the inline panel; focus inside panel links also keeps the popup open.
function quotaInteractionActive() {
  return quotaStrip.matches(":hover") || quotaPanel.matches(":hover") ||
    quotaAnchor.contains(document.activeElement) ||
    quotaPanel.contains(document.activeElement);
}
function dismissQuotaIfInactive() {
  if (!quotaInteractionActive()) void setQuotaOpen(false);
}
quotaAnchor.addEventListener("mouseenter", () => { void setQuotaOpen(true); });
quotaAnchor.addEventListener("focusin", () => { void setQuotaOpen(true); });
quotaStrip.addEventListener("mouseleave", event => {
  if (!quotaPanel.contains(event.relatedTarget)) dismissQuotaIfInactive();
});
quotaPanel.addEventListener("mouseenter", () => { void setQuotaOpen(true); });
quotaPanel.addEventListener("mouseleave", event => {
  if (!quotaStrip.contains(event.relatedTarget)) dismissQuotaIfInactive();
});
quotaAnchor.addEventListener("focusout", dismissQuotaIfInactive);
quotaPanel.addEventListener("focusout", dismissQuotaIfInactive);

function quotaLine(parent, label, value) {
  const line = addText(parent, "span", "", "quota-line");
  addText(line, "span", label, "quota-line-label");
  addText(line, "span", value, "quota-line-value");
}

function renderQuotaDetails(details) {
  const node = byId("quota-content");
  node.replaceChildren();
  addText(node, "span", details.status, "quota-message");
  if (!details.connected) {
    addText(node, "span", details.message, "quota-message");
    return;
  }
  for (const section of details.sections) {
    const block = addText(node, "span", "", "quota-section");
    addText(block, "span", section.title, "quota-section-title");
    for (const [label, value] of section.rows || []) quotaLine(block, label, value);
    for (const item of section.links || []) {
      const link = addText(block, "a", item.label, "quota-job-link");
      link.href = item.url;
      link.title = item.url;
      link.rel = "noopener noreferrer";
      link.addEventListener("click", async event => {
        event.preventDefault();
        try { await invoke("open_actions_job", { url: item.url }); }
        catch (error) { showError(error); }
      });
    }
    if (section.message) addText(block, "span", section.message, "quota-message");
  }
  addText(node, "span", details.message, "quota-message");
}

function render(next) {
  snapshot = next;
  const counts = next.runner_state?.counts;
  const online = counts?.busy != null && counts?.idle != null
    ? counts.busy + counts.idle : next.runners_online;
  const running = counts?.running ?? next.ci_running;
  const queued = counts?.queued ?? next.ci_queued;
  // Preserve the exact three existing indicators, order and presentation.
  byId("runner-status").textContent = online == null
    ? "Runners —" : "Runners " + online;
  byId("ci-running").textContent = running == null
    ? "Running —" : "Running " + running;
  byId("ci-queued").textContent = queued == null
    ? "Queued —" : "Queued " + queued;
  renderQuotaDetails(buildQuotaDetails(next.runner_state));
  const list = byId("repo-list");
  list.replaceChildren();
  if (!next.repositories.length) {
    addText(list, "p", next.roots?.length
      ? "No valid repositories found."
      : "Add a repository folder through the tray Settings.", "empty");
  } else {
    for (const repo of next.repositories) list.append(makeRepoRow(repo));
  }
  updateActionState();
  if (next.errors?.length) showError(next.errors[0]);
}
async function refresh() {
  try {
    render(await invoke("get_snapshot"));
  } catch (error) {
    showError(error);
  }
}
function consumeResults(results) {
  // Successful fetch and fast-forward must never generate a permanent log panel
  // or a duplicate "N fetched" line. Real Git state is the success indicator.
  const errors = results.filter(item => item.status === "error");
  if (errors.length) {
    showError(errors.length + " Git operation error(s): " + errors[0].message);
  }
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
  byId("show-repos").title = "Show repositories";
  hideRepoMenus();
}
async function openView(target) {
  if (quotaExpanded) await setQuotaOpen(false);
  const desired = nextCardView(view, target);
  if (desired === view) return;
  try {
    await invoke("set_card_view", { view: desired });
    view = desired;
    armAutoHide();
    byId("card").dataset.view = view;
    byId("repo-drawer").hidden = view !== "repos";
    byId("show-repos").setAttribute("aria-pressed", String(view === "repos"));
    byId("show-repos").title = view === "repos" ? "Hide repositories" : "Show repositories";
    if (view !== "repos") hideRepoMenus();
  } catch (error) {
    showError("Cannot resize card: " + error);
  }
}
byId("show-repos").addEventListener("click", () => openView("repos"));
byId("hide-card").addEventListener("click", async () => {
  try { await invoke("hide_card"); resetView(); }
  catch (error) { showError(error); }
});
byId("fetch-all").addEventListener("click", () => runGitAction("fetch"));
byId("sync-all").addEventListener("click", () => runGitAction("safe_pull"));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (quotaExpanded) { void setQuotaOpen(false); return; }
    if (view !== "compact") openView(view);
    else byId("hide-card").click();
  }
});
window.__TAURI__?.event?.listen?.("repoticker-git-progress", event => {
  const payload = event.payload;
  if (!payload || !["fetch", "safe_pull"].includes(payload.operation)) return;
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
window.__TAURI__?.event?.listen?.("repoticker-config-changed", refresh);
window.__TAURI__?.event?.listen?.("repoticker-git-action-finished", async event => {
  if (event.payload?.Ok) consumeResults(event.payload.Ok);
  else if (event.payload?.Err) showError(event.payload.Err);
  progress = null;
  await refresh();
});
refresh();

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
      event.target.closest("button,input,select,a,.quota-anchor,[role=button]")) return;
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
