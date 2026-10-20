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
  const title = document.querySelector(".quota-header");
  const actualRows = [...root.children].map(child => child.scrollHeight);
  const targetHeight = usageHeight(title.offsetHeight, actualRows);
  void invoke("resize_usage_popup", { height: targetHeight }).catch(() => {});
}
async function refresh() {
  try {
    const snapshot = await invoke("get_snapshot");
    paint(buildQuotaDetails(snapshot.runner_state));
  } catch {
    paint(buildQuotaDetails(null));
  }
}
window.__TAURI__?.event?.listen?.("repoticker-usage-shown", refresh);
refresh();
