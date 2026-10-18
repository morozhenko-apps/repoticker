import { summarize } from "./model.mjs";
import { nextCardView } from "./view.mjs";

const emptySnapshot = {
  roots: [],
  repositories: [],
  errors: [],
  ci_running: null,
  ci_failed: null,
  connected: false
};

const byId = id => document.getElementById(id);
const invoke = (command, args = {}) => {
  if (!window.__TAURI__?.core?.invoke) {
    return Promise.reject(new Error("Launch RepoTicker from the desktop application."));
  }
  return window.__TAURI__.core.invoke(command, args);
};

let snapshot = emptySnapshot;
let busy = false;
let view = "compact";

function setActivity(message, isError = false) {
  const node = byId("activity");
  node.hidden = !message;
  node.textContent = message;
  node.classList.toggle("error", isError);
}

function addText(parent, tag, value, className = "") {
  const el = document.createElement(tag);
  el.textContent = String(value);
  if (className) el.className = className;
  parent.append(el);
  return el;
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
    addText(row, "span", root, "truncate");
    const remove = addText(row, "button", "×");
    remove.type = "button";
    remove.title = "Stop tracking this folder (files are not deleted)";
    remove.setAttribute("aria-label", "Remove " + root);
    remove.addEventListener("click", async () => {
      try {
        await invoke("remove_root", { root });
        setActivity("Folder removed from tracking. Files were not changed.");
        await refresh();
      } catch (error) {
        setActivity(String(error), true);
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
  const status = repo.dirty ? "●" :
    repo.ahead && repo.behind ? "⇅" :
    repo.behind ? "↓" + repo.behind :
    repo.ahead ? "↑" + repo.ahead :
    repo.upstream ? "✓" : "—";
  const indicator = addText(row, "span", status, "repo-delta");
  indicator.title = repo.sync_state;
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
    const shouldOpen = menu.hidden;
    hideRepoMenus();
    if (shouldOpen) {
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
    }
  });
  row.append(menu);
  return row;
}

function hideRepoMenus() {
  for (const menu of document.querySelectorAll(".repo-menu")) menu.hidden = true;
  for (const button of document.querySelectorAll(".repo-more")) {
    button.setAttribute("aria-expanded", "false");
  }
}

function render(next) {
  snapshot = next;
  const metrics = summarize(next);
  byId("connection").textContent = "Local Git · Manual mode";
  byId("metric-repos").textContent = String(metrics.repositoryCount);
  byId("metric-behind").textContent = String(metrics.behind);
  byId("metric-dirty").textContent = String(next.repositories.filter(repo => repo.dirty).length);
  byId("repo-count").textContent = String(metrics.repositoryCount);
  byId("ci-running").textContent = next.ci_running == null ? "CI —" : "CI " + next.ci_running;
  byId("runner-status").textContent = "Runners —";
  byId("fetch-all").disabled = busy || !metrics.repositoryCount;
  byId("sync-all").disabled = busy || !metrics.repositoryCount;

  renderRoots(next.roots || []);
  const list = byId("repo-list");
  list.replaceChildren();
  if (!metrics.repositoryCount) {
    addText(list, "p", next.roots?.length
      ? "No valid checkouts in enrolled folders."
      : "Use Settings to add a local repository folder.", "empty");
  } else {
    for (const repo of next.repositories) list.append(makeRepoRow(repo));
  }

  if (next.errors?.length) setActivity(next.errors.join(" · "), true);
}

async function refresh() {
  try {
    render(await invoke("get_snapshot"));
  } catch (error) {
    setActivity(String(error), true);
  }
}

function displayResults(results) {
  const panel = byId("results-panel");
  const list = byId("results-list");
  list.replaceChildren();
  const counts = {};
  for (const item of results) {
    counts[item.status] = (counts[item.status] || 0) + 1;
    addText(list, "p", (item.path.split(/[/\\]/).at(-1) || "Root") + ": " + item.message, "result-line");
  }
  const summary = Object.entries(counts).map(([key, total]) => total + " " + key).join(" · ");
  setActivity(summary || "Nothing to update.", Boolean(counts.error));
  panel.hidden = !results.length;
}

async function runGitAction(operation, repoPath = null) {
  if (busy) return;
  busy = true;
  byId("fetch-all").disabled = true;
  byId("sync-all").disabled = true;
  setActivity(operation === "fetch" ? "Fetching remote references…" : "Checking safe fast-forward eligibility…");
  try {
    const results = await invoke("perform_git_action", { operation, repoPath });
    displayResults(results);
    await refresh();
  } catch (error) {
    setActivity(String(error), true);
  } finally {
    busy = false;
    byId("fetch-all").disabled = !snapshot.repositories.length;
    byId("sync-all").disabled = !snapshot.repositories.length;
  }
}

async function openView(target) {
  const desired = nextCardView(view, target);
  if (desired === view) return;
  try {
    // Resize before showing new content, mirroring rQuickShare's drawer model.
    await invoke("set_card_view", { view: desired });
    view = desired;
    const card = byId("card");
    card.dataset.view = view;
    byId("repo-drawer").hidden = view !== "repos";
    byId("roots-editor").hidden = view !== "settings";
    byId("show-repos").setAttribute("aria-pressed", String(view === "repos"));
    byId("show-repos").title = view === "repos" ? "Hide repositories" : "Show repositories";
    byId("settings").setAttribute("aria-pressed", String(view === "settings"));
    if (view !== "repos") hideRepoMenus();
  } catch (error) {
    setActivity("Could not change card size: " + String(error), true);
  }
}

byId("settings").addEventListener("click", () => openView("settings"));
byId("show-repos").addEventListener("click", () => openView("repos"));
byId("add-root-form").addEventListener("submit", async event => {
  event.preventDefault();
  const input = byId("root-path");
  try {
    await invoke("add_root", { root: input.value });
    input.value = "";
    setActivity("Folder enrolled.");
    await refresh();
  } catch (error) {
    setActivity(String(error), true);
  }
});
byId("refresh").addEventListener("click", refresh);
byId("fetch-all").addEventListener("click", () => runGitAction("fetch"));
byId("sync-all").addEventListener("click", () => runGitAction("safe_pull"));
byId("close-results").addEventListener("click", () => {
  byId("results-panel").hidden = true;
  if (!byId("activity").classList.contains("error")) setActivity("");
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && view !== "compact") {
    hideRepoMenus();
    openView(view);
  }
});

window.__TAURI__?.event?.listen?.("repoticker-reset-view", () => {
  view = "compact";
  byId("card").dataset.view = "compact";
  byId("repo-drawer").hidden = true;
  byId("roots-editor").hidden = true;
  byId("show-repos").setAttribute("aria-pressed", "false");
  byId("show-repos").title = "Show repositories";
  byId("settings").setAttribute("aria-pressed", "false");
  hideRepoMenus();
});

window.__TAURI__?.event?.listen?.("repoticker-git-action-finished", async event => {
  if (event.payload?.Ok) displayResults(event.payload.Ok);
  else if (event.payload?.Err) setActivity(event.payload.Err, true);
  await refresh();
});

refresh();
