import { summarize } from "./model.mjs";

const emptySnapshot = {
  repositories: [],
  runners: [],
  ci_running: 0,
  ci_failed: 0,
  connected: false
};

const byId = id => document.getElementById(id);

function setToggle(buttonId, listId, open, label, countLabel) {
  const button = byId(buttonId);
  const list = byId(listId);
  list.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  button.firstElementChild.textContent = (open ? "▾ " : "▸ ") + label;
  button.lastElementChild.textContent = countLabel;
}

function draw(snapshot) {
  const metrics = summarize(snapshot);
  byId("connection").textContent = snapshot.connected ? "GitHub connected" : "GitHub not connected";
  byId("repo-count").textContent = String(metrics.repositoryCount);
  byId("runner-count").textContent = `${metrics.busyRunners} busy / ${metrics.onlineRunners} online`;
  byId("git-summary").textContent = `↓ ${metrics.behind} behind`;
  byId("ci-running").textContent = `◷ ${metrics.running} running`;
  byId("ci-failed").textContent = `× ${metrics.failed} failed`;

  const list = byId("repo-list");
  list.replaceChildren();
  if (!metrics.repositoryCount) {
    const message = document.createElement("p");
    message.className = "empty";
    message.textContent = "Repository discovery is not configured yet.";
    list.append(message);
  } else {
    for (const repo of snapshot.repositories) {
      const row = document.createElement("div");
      row.className = "repo-row";
      for (const value of [repo.name, repo.branch, repo.behind ? `↓${repo.behind}` : "✓", repo.ci]) {
        const cell = document.createElement("span");
        cell.textContent = String(value ?? "");
        row.append(cell);
      }
      list.append(row);
    }
  }

  const runners = byId("runner-list");
  runners.replaceChildren();
  if (!metrics.onlineRunners && !snapshot.runners?.length) {
    const message = document.createElement("p");
    message.className = "empty";
    message.textContent = "No runner data.";
    runners.append(message);
  } else {
    for (const runner of snapshot.runners) {
      const row = document.createElement("div");
      row.className = "repo-row";
      row.textContent = `${runner.name} · ${runner.online ? (runner.busy ? "busy" : "idle") : "offline"}`;
      runners.append(row);
    }
  }
}

async function refresh() {
  const invoke = window.__TAURI__?.core?.invoke;
  if (!invoke) {
    draw(emptySnapshot);
    return;
  }
  try {
    const snapshot = await invoke("get_snapshot");
    draw(snapshot);
  } catch {
    draw(emptySnapshot);
    byId("connection").textContent = "Local service unavailable";
  }
}

byId("toggle-repos").addEventListener("click", () => {
  const open = byId("toggle-repos").getAttribute("aria-expanded") !== "true";
  setToggle("toggle-repos", "repo-list", open, "Repositories", byId("repo-count").textContent);
});
byId("toggle-runners").addEventListener("click", () => {
  const open = byId("toggle-runners").getAttribute("aria-expanded") !== "true";
  setToggle("toggle-runners", "runner-list", open, "Runners", byId("runner-count").textContent);
});
byId("refresh").addEventListener("click", refresh);
byId("usage").addEventListener("click", () => {
  byId("usage-message").hidden = !byId("usage-message").hidden;
});

refresh();
