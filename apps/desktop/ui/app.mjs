import { summarize } from "./model.mjs";
import { nextCardView, pullReadyCommitCount } from "./view.mjs";

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
function renderRoots(roots) {
  const list = byId("roots-list");
  list.replaceChildren();
  if (!roots.length) {
    addText(list, "p", "No folders enrolled.", "hint");
    return;
  }
  for (const root of roots) {
    const row = document.createElement("div");
    row.className = "root-row";
    addText(row, "span", root);
    const remove = addText(row, "button", "×");
    remove.type = "button";
    remove.title = "Stop tracking this folder; files are not deleted";
    remove.setAttribute("aria-label", "Remove " + root);
    remove.addEventListener("click", async () => {
      try {
        await invoke("remove_root", { root });
        await refresh();
      } catch (error) {
        showError(error);
      }
    });
    list.append(row);
  }
}
function makeRepoRow(repo) {
  const row = document.createElement("div");
  row.className = "repo-row";
  row.title = repo.path;
  addText(row, "span", repo.name, "repo-name");
  addText(row, "span", repo.branch, "repo-branch");
  const current = !repo.dirty && !repo.ahead && !repo.behind && repo.upstream;
  const symbol = repo.dirty ? "●" :
    repo.ahead && repo.behind ? "⇅" :
    repo.behind ? "↓" + repo.behind :
    repo.ahead ? "↑" + repo.ahead :
    current ? "✓" : "—";
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
  byId("fetch-all").disabled = busy || !hasRepos;
  byId("sync-all").disabled = busy || eligible === 0;
  const count = byId("pull-indicator");
  count.textContent = eligible ? "↓" + eligible : "↓";
  count.classList.toggle("has-commits", eligible > 0);
  byId("sync-all").title = eligible
    ? eligible + " commits eligible for fast-forward (clean upstream branches)"
    : "No branches eligible for safe pull. Fetch first to refresh remote refs.";
}
function render(next) {
  snapshot = next;
  // No invented GitHub counters. Unknown is distinct from zero.
  byId("runner-status").textContent = next.runners_online == null
    ? "Runners —" : "Runners " + next.runners_online;
  byId("ci-running").textContent = next.ci_running == null
    ? "Running —" : "Running " + next.ci_running;
  byId("ci-queued").textContent = next.ci_queued == null
    ? "Queued —" : "Queued " + next.ci_queued;
  renderRoots(next.roots || []);
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
    updateActionState();
  }
}
function resetView() {
  view = "compact";
  byId("card").dataset.view = "compact";
  byId("repo-drawer").hidden = true;
  byId("roots-editor").hidden = true;
  byId("show-repos").setAttribute("aria-pressed", "false");
  byId("show-repos").title = "Show repositories";
  hideRepoMenus();
}
async function openView(target) {
  const desired = nextCardView(view, target);
  if (desired === view) return;
  try {
    await invoke("set_card_view", { view: desired });
    view = desired;
    byId("card").dataset.view = view;
    byId("repo-drawer").hidden = view !== "repos";
    byId("roots-editor").hidden = view !== "settings";
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
byId("add-root-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await invoke("add_root", { root: byId("root-path").value });
    byId("root-path").value = "";
    clearError();
    await refresh();
  } catch (error) { showError(error); }
});
byId("fetch-all").addEventListener("click", () => runGitAction("fetch"));
byId("sync-all").addEventListener("click", () => runGitAction("safe_pull"));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (view !== "compact") openView(view);
    else byId("hide-card").click();
  }
});
window.__TAURI__?.event?.listen?.("repoticker-reset-view", () => {
  resetView();
  clearError();
  refresh();
});
window.__TAURI__?.event?.listen?.("repoticker-open-settings", () => openView("settings"));
window.__TAURI__?.event?.listen?.("repoticker-git-action-finished", async event => {
  if (event.payload?.Ok) consumeResults(event.payload.Ok);
  else if (event.payload?.Err) showError(event.payload.Err);
  await refresh();
});
refresh();
