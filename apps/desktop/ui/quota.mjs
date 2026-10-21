import { buildQuotaDetails } from "./quota-details.mjs";
import { usageHeight } from "./quota-size.mjs";

const byId = id => document.getElementById(id);
const invoke = (name, args = {}) => window.__TAURI__.core.invoke(name, args);
function add(parent, tag, value, cls = "") {
  const node = document.createElement(tag);
  node.textContent = String(value);
  if (cls) node.className = cls;
  parent.append(node);
  return node;
}
function line(parent, label, value) {
  const row = add(parent, "div", "", "quota-line");
  add(row, "span", label, "quota-line-label");
  add(row, "span", value, "quota-line-value");
}
function paint(details) {
  const root = byId("quota-content");
  root.replaceChildren();
  add(root, "span", details.status, "quota-message");
  if (!details.connected) add(root, "span", details.message, "quota-message");
  else {
    for (const section of details.sections) {
      const block = add(root, "section", "", "quota-section");
      add(block, "div", section.title, "quota-section-title");
      for (const [label, value] of section.rows || []) line(block, label, value);
      for (const item of section.links || []) {
        const link = add(block, "a", item.label, "quota-job-link");
        link.href = item.url;
        link.rel = "noopener noreferrer";
        link.title = item.url;
        link.addEventListener("click", async event => {
          event.preventDefault();
          await invoke("open_actions_job", { url: item.url });
        });
      }
      if (section.message) add(block, "span", section.message, "quota-message");
    }
    add(root, "span", details.message, "quota-message");
  }
  // Small for disconnected state, expands only this *separate* popup when
  // there are more details. Main card always stays 390x122.
  // A disconnected tooltip is two short messages, not a scrollable 320px
  // panel. For richer connected data measure an unconstrained clone:
  // measuring the *existing* flex viewport feeds its previous size back
  // into window resizing and causes the balloon to grow indefinitely.
  let targetHeight = usageHeight(0, []);
  if (details.connected) {
    const probe = root.cloneNode(true);
    probe.removeAttribute("id");
    Object.assign(probe.style, {
      position: "fixed",
      visibility: "hidden",
      pointerEvents: "none",
      width: root.getBoundingClientRect().width + "px",
      height: "auto",
      maxHeight: "none",
      overflow: "visible",
      flex: "none",
      top: "0",
      left: "-10000px",
    });
    document.body.append(probe);
    const naturalHeight = probe.getBoundingClientRect().height;
    probe.remove();
    targetHeight = usageHeight(
      document.querySelector(".quota-header").getBoundingClientRect().height,
      [naturalHeight]
    );
  }
  void invoke("resize_usage_popup", { height: targetHeight }).catch(() => {});
}
// The hover balloon is its own Tauri WebView. Its event permission is
// deliberately scoped to usage-events.json rather than inherited from main.
let refreshId = 0;
function statusUnavailable(message) {
  paint({ connected: false, status: "Status unavailable", message, sections: [] });
}
async function refresh() {
  const id = ++refreshId;
  try {
    const snapshot = await invoke("get_snapshot");
    if (id !== refreshId) return; // Drop an older Git scan response.
    paint(buildQuotaDetails(snapshot.runner_state, snapshot.connected, snapshot.monitor_message));
  } catch {
    if (id === refreshId) {
      statusUnavailable("Cannot read GitHub Actions status. Reopen the balloon to retry.");
    }
  }
}
function subscribe(eventName) {
  const listen = window.__TAURI__?.event?.listen;
  if (typeof listen !== "function") {
    statusUnavailable("GitHub Actions updates are unavailable in this window.");
    return;
  }
  void Promise.resolve()
    .then(() => listen(eventName, refresh))
    .catch(() => {
      // Failed event permissions must never be displayed as a missing
      // GitHub authorization.
      refreshId++;
      statusUnavailable("GitHub Actions updates cannot be subscribed to.");
    });
}
subscribe("repoticker-usage-shown");
subscribe("repoticker-monitor-updated");
void refresh();
