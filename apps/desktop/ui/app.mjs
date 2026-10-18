import { summarize } from "./model.mjs";

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

function activity(message, isError = false) {
  const node = byId("activity");
  node.hidden = !message;
  node.textContent = message;
  node.classList.toggle("error", isError);
}

function toggleSection(buttonId, listId, label, countLabel) {
  const button = byId(buttonId);
  const list = byId(listId);
  const open = button.getAttribute("aria-expanded") !== "true";
  list.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  button.firstElementChild.textContent = (open ? "▾ " : "▸ ") + label;
  button.lastElementChild.textContent = countLabel;
}

function addText(parent, tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = String(text);
  if (className) element.className = className;
  parent.append(element);
  return element;
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
    remove.title = "Remove this root from RepoTicker (does not delete files)";
    remove.setAttribute("aria-label", "Remove " + root);
    remove.addEventListener("click", async () => {
      try {
        await invoke("remove_root", { root });
        activity("Root removed from tracking. Files were not changed.");
        await refresh();
      } catch (error) {
        activity(String(error), true);
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
  const delta = repo.dirty
    ? "●"
    : repo.ahead && repo.behind
      ? "⇅"
      : repo.behind
        ? "↓" + repo.behind
        : repo.ahead
          ? "↑" + repo.ahead
          : repo.upstream
            ? "✓"
            : "—";
  const indicator = addText(row, "span", delta, "repo-delta");
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
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      runGitAction(operation, repo.path);
    });
  }
  button.addEventListener("click", () => {
    const expand = menu.hidden;
    document.querySelectorAll(".repo-menu").forEach(existing => {
      existing.hidden = true;
    });
    document.querySelectorAll(".repo-more").forEach(existing => {
      existing.setAttribute("aria-expanded", "false");
    });
    menu.hidden = !expand;
    button.setAttribute("aria-expanded", String(expand));
  });
  row.append(menu);
  return row;
}

function render(next) {
  snapshot = next;
  const metrics = summarize(next);
  byId("connection").textContent = "GitHub Actions monitoring not configured";
  byId("repo-count").textContent = String(metrics.repositoryCount);
  byId("runner-count").textContent = "Unavailable";
  byId("git-summary").textContent = "↓ " + metrics.behind + " behind";
  byId("ci-running").textContent = "◷ CI —";
  byId("ci-failed").textContent = "× CI —";
  byId("fetch-all").disabled = busy || !metrics.repositoryCount;
  byId("sync-all").disabled = busy || !metrics.repositoryCount;

  renderRoots(next.roots || []);
  const list = byId("repo-list");
  list.replaceChildren();
  if (!metrics.repositoryCount) {
    addText(
      list,
      "p",
      next.roots?.length
        ? "No valid checkouts in enrolled folders."
        : "Add a local folder in Settings to discover repositories.",
      "empty"
    );
  } else {
    for (const repo of next.repositories) list.append(makeRepoRow(repo));
  }
  const errors = next.errors || [];
  if (errors.length) activity(errors.join(" · "), true);
}

async function refresh() {
  try {
    render(await invoke("get_snapshot"));
  } catch (error) {
    activity(String(error), true);
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
  const overview = Object.entries(counts).map(([key, value]) => value + " " + key).join(" · ");
  activity(overview || "Nothing to update.", Boolean(counts.error));
  panel.hidden = !results.length;
}

async function runGitAction(operation, repoPath = null) {
  if (busy) return;
  busy = true;
  byId("fetch-all").disabled = true;
  byId("sync-all").disabled = true;
  activity(operation === "fetch" ? "Fetching remote refs…" : "Checking safe fast-forward eligibility…");
  try {
    const results = await invoke("perform_git_action", { operation, repoPath });
    displayResults(results);
    await refresh();
  } catch (error) {
    activity(String(error), true);
  } finally {
    busy = false;
    byId("fetch-all").disabled = !snapshot.repositories.length;
    byId("sync-all").disabled = !snapshot.repositories.length;
  }
}

byId("toggle-repos").addEventListener("click", () => {
  toggleSection("toggle-repos", "repo-list", "Repositories", byId("repo-count").textContent);
});
byId("toggle-runners").addEventListener("click", () => {
  toggleSection("toggle-runners", "runner-list", "Runners", byId("runner-count").textContent);
});
byId("settings").addEventListener("click", () => {
  byId("roots-editor").hidden = !byId("roots-editor").hidden;
});
byId("add-root-form").addEventListener("submit", async event => {
  event.preventDefault();
  const input = byId("root-path");
  try {
    await invoke("add_root", { root: input.value });
    input.value = "";
    activity("Root enrolled.");
    await refresh();
  } catch (error) {
    activity(String(error), true);
  }
});
byId("refresh").addEventListener("click", refresh);
byId("fetch-all").addEventListener("click", () => runGitAction("fetch"));
byId("sync-all").addEventListener("click", () => runGitAction("safe_pull"));
byId("usage").addEventListener("click", () => {
  byId("usage-message").hidden = !byId("usage-message").hidden;
});
byId("close-results").addEventListener("click", () => {
  byId("results-panel").hidden = true;
});
window.__TAURI__?.event?.listen?.("repoticker-git-action-finished", async event => {
  if (event.payload?.Ok) displayResults(event.payload.Ok);
  else if (event.payload?.Err) activity(event.payload.Err, true);
  await refresh();
});

refresh();
