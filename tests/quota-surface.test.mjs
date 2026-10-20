import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { usageHeight, USAGE_MAX_HEIGHT, USAGE_MIN_HEIGHT } from "../apps/desktop/ui/quota-size.mjs";
const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const html = read("../apps/desktop/ui/index.html");
const ui = read("../apps/desktop/ui/app.mjs");
const usage = read("../apps/desktop/ui/quota.html");
const css = read("../apps/desktop/ui/quota.css");
const native = read("../apps/desktop/src-tauri/src/linux_surface.rs");
const conf = JSON.parse(read("../apps/desktop/src-tauri/tauri.conf.json"));

test("compact card is never resized or expanded to display a tooltip", () => {
  assert.equal(conf.app.windows.find(w => w.label === "main").height, 122);
  assert.equal(conf.app.windows.find(w => w.label === "usage").width, 340);
  assert.doesNotMatch(html, /id="quota-tooltip"/);
  assert.doesNotMatch(ui, /set_card_view.*quota/);
  assert.match(ui, /"show_usage_popup"/);
  assert.match(ui, /"hide_usage_popup"/);
  assert.match(ui, /createNativeDragGesture/);
  assert.doesNotMatch(ui, /event\.clientX|event\.screenX/);
});
test("tooltip is a standalone WebView and not a child of compact card", () => {
  assert.match(usage, /id="quota-content"/);
  assert.match(usage, /quota\.css/);
  assert.match(css, /overflow-y:auto/);
  assert.match(native, /fn install_usage_surface/);
  assert.match(native, /usage\.set_layer\(Layer::Overlay\)/);
  assert.match(native, /fn anchor_usage/);
  assert.match(native, /bottom\.saturating_add\(COMPACT_HEIGHT - USAGE_OVERLAP\)/);
});
test("usage height is based on content rows, never viewport scrollHeight", () => {
  assert.equal(usageHeight(18, [16, 34]), USAGE_MIN_HEIGHT);
  assert.equal(usageHeight(20, [16, 24, 35]), 139);
  assert.equal(usageHeight(20, Array.from({length: 30}, () => 24)), USAGE_MAX_HEIGHT);
  assert.equal(usageHeight(Number.NaN, [20]), USAGE_MIN_HEIGHT);
  assert.equal(usageHeight(20, [-1]), USAGE_MIN_HEIGHT);
  const quotaJs = read("../apps/desktop/ui/quota.mjs");
  assert.doesNotMatch(quotaJs, /root\.scrollHeight/);
  assert.match(quotaJs, /root\.children\]\.map\(child => child\.scrollHeight\)/);
  assert.match(quotaJs, /dismiss_usage_popup/);
  assert.match(read("../apps/desktop/ui/quota.html"), /class="quota-close"/);
});
test("usage overlay follows the same physical monitor as the main Layer Shell card", () => {
  assert.match(native, /monitor_at_window\(&gdk_window\)/);
  assert.match(native, /window\.set_monitor\(&monitor\)/);
  assert.match(native, /fn anchor_usage/);
  assert.match(read("../apps/desktop/src-tauri/src/main.rs"), /fn dismiss_usage_popup/);
  assert.match(ui, /"repoticker-usage-dismiss"/);
  const usage = conf.app.windows.find(w=>w.label==="usage");
  assert.equal(usage.height,118);
  assert.equal(usage.maxHeight,320);
});
