import { buildHoverDetails, isHoverKind } from "./quota-details.mjs";
import { usageHeight } from "./quota-size.mjs";
import { createBillingCache } from "./github-billing.mjs";

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
  root.className = "quota-content kind-" + activeKind;
  const title = byId("quota-title");
  if (title) title.textContent = details.status;
  root.replaceChildren();

  if (!details.connected) add(root, "span", details.message, "quota-message");
  else {
    for (const section of details.sections) {
      const block = add(root, "section", "", "quota-section");
      add(block, "div", section.title, "quota-section-title");
      for (const [label, value] of section.rows || []) line(block, label, value);
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
let activeKind = "billing";
let currentSnapshot = null;
let billingState = null;
let billingScope = null;
let billingFetch = null;
let billingVersion = 0;
function invalidateBilling() {
  billingVersion++;
  billingCache.clear();
  billingState = null;
  billingFetch = null;
}
const billingCache = createBillingCache({
  get: path => invoke("github_api_get", { path }),
});
function statusUnavailable(message) {
  paint({ connected: false, status: "Status unavailable", message, sections: [] });
}
function paintSnapshot(snapshot) {
  paint(buildHoverDetails(snapshot.runner_state, activeKind, snapshot.connected,
    snapshot.monitor_message, billingState));
}
function scheduleBilling(snapshot) {
  if (activeKind !== "billing" || snapshot.connected !== true) return;
  const scope = snapshot.github_monitor_org || "";
  if (billingFetch?.scope === scope) return;
  const currentVersion = billingVersion;
  const request = billingCache.load(scope, true);
  billingFetch = { scope, request };
  void request.then(value => {
    if (currentVersion === billingVersion && billingScope === scope && value) {
      billingState = value;
      if (activeKind === "billing" && currentSnapshot?.connected)
        paintSnapshot(currentSnapshot);
    }
  }).catch(() => {
    // No raw provider error crosses into a tooltip.
    if (currentVersion === billingVersion && billingScope === scope) billingState = null;
  }).finally(() => {
    if (billingFetch?.request === request) billingFetch = null;
  });
}
async function refresh() {
  const id = ++refreshId;
  try {
    const snapshot = await invoke("get_snapshot");
    if (id !== refreshId) return;
    currentSnapshot = snapshot;
    const scope = snapshot.connected === true ? snapshot.github_monitor_org || "" : null;
    if (billingScope !== scope || !snapshot.connected) {
      invalidateBilling();
      billingScope = scope;
    }
    paintSnapshot(snapshot);
    scheduleBilling(snapshot);
  } catch {
    if (id === refreshId)
      statusUnavailable("Cannot read GitHub status. Reopen the balloon to retry.");
  }
}

function subscribe(eventName, handler = refresh) {
  const listen = window.__TAURI__?.event?.listen;
  if (typeof listen !== "function") {
    statusUnavailable("GitHub Actions updates are unavailable in this window.");
    return;
  }
  void Promise.resolve()
    .then(() => listen(eventName, handler))
    .catch(() => {
      // Failed event permissions must never be displayed as a missing
      // GitHub authorization.
      refreshId++;
      statusUnavailable("GitHub Actions updates cannot be subscribed to.");
    });
}
// Each entry switches its content before reading the new snapshot.
function onUsageShown(event) {
  if (isHoverKind(event?.payload)) activeKind = event.payload;
  void refresh();
}
subscribe("repoticker-usage-shown", onUsageShown);
subscribe("repoticker-monitor-updated");
subscribe("repoticker-github-auth", () => { invalidateBilling(); void refresh(); });
subscribe("repoticker-github-scope-changed", () => { invalidateBilling(); void refresh(); });
void refresh();
