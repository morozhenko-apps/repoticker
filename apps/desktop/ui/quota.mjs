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
      if (section.title) add(block, "div", section.title, "quota-section-title");
      for (const [label, value] of section.rows || []) line(block, label, value);
      if (section.message) add(block, "span", section.message, "quota-message");
    }
    if (details.message) add(root, "span", details.message, "quota-message");
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
/** Respect explicit Settings selection; auto-selected installation lives
 * in the validated native monitor snapshot, not necessarily in config. */
export function selectedOrganization(snapshot) {
  return snapshot?.github_monitor_org ||
    snapshot?.runner_state?.scope?.organization || "";
}
function paintSnapshot(snapshot) {
  paint(buildHoverDetails(snapshot.runner_state, activeKind, snapshot.connected,
    snapshot.monitor_message, billingState));
}
function scheduleBilling(snapshot) {
  if (activeKind !== "billing" || snapshot.connected !== true) return;
  const scope = selectedOrganization(snapshot);
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
    // A detached GTK Wayland WebView can miss a one-shot shown event.
    // Read the native selected view after the scan, not before, so a fast
    // hover transition during a slow Git scan cannot restore stale content.
    const snapshot = await invoke("get_snapshot");
    const nativeKind = await invoke("get_usage_popup_kind");
    if (id !== refreshId) return;
    if (isHoverKind(nativeKind)) activeKind = nativeKind;
    currentSnapshot = snapshot;
    const scope = snapshot.connected === true ? selectedOrganization(snapshot) : null;
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
// The Rust command both stores the selected kind and explicitly evaluates
// this callback in the relocated WebView. The event is a secondary path.
function applyHoverKind(kind) {
  if (!isHoverKind(kind)) return;
  if (activeKind === kind && currentSnapshot) return;
  activeKind = kind;
  if (currentSnapshot) {
    paintSnapshot(currentSnapshot);
    scheduleBilling(currentSnapshot);
  } else {
    void refresh();
  }
}
window.__repotickerSetHoverKind = applyHoverKind;

async function onUsageShown() {
  // An older queued event must never repaint a newer hover selection.
  try { applyHoverKind(await invoke("get_usage_popup_kind")); }
  catch { /* Failed reconciliation is not fabricated as billing data. */ }
}
subscribe("repoticker-usage-shown", onUsageShown);
subscribe("repoticker-monitor-updated");
subscribe("repoticker-github-auth", () => { invalidateBilling(); void refresh(); });
subscribe("repoticker-github-scope-changed", () => { invalidateBilling(); void refresh(); });
void refresh();
