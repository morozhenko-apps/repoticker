import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
