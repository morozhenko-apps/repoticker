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
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css, /overflow-y:auto/);
  assert.match(css, /pointer-events:none/);
  assert.match(native, /fn install_usage_surface/);
  assert.match(native, /usage\.set_layer\(Layer::Overlay\)/);
  assert.match(native, /fn anchor_usage/);
  assert.match(native, /bottom\.saturating_add\(COMPACT_HEIGHT \+ USAGE_GAP\)/);
  assert.match(native, /const USAGE_GAP: i32 = 12;/);
});
test("usage height is based on content rows, never viewport scrollHeight", () => {
  assert.equal(usageHeight(18, [16, 34]), USAGE_MIN_HEIGHT);
  assert.equal(usageHeight(20, [16, 24, 35]), 139);
  assert.equal(usageHeight(20, Array.from({length: 30}, () => 24)), USAGE_MAX_HEIGHT);
  assert.equal(usageHeight(Number.NaN, [20]), USAGE_MIN_HEIGHT);
  assert.equal(usageHeight(20, [-1]), USAGE_MIN_HEIGHT);
  const quotaJs = read("../apps/desktop/ui/quota.mjs");
  assert.doesNotMatch(quotaJs, /root\.scrollHeight/);
  assert.match(quotaJs, /root\.cloneNode\(true\)/);
  assert.match(quotaJs, /details\.connected/);
  assert.match(quotaJs, /probe\.getBoundingClientRect\(\)\.height/);
  assert.doesNotMatch(quotaJs, /root\.children\]\.map\(child => child\.scrollHeight\)/);
  assert.doesNotMatch(quotaJs, /dismiss_usage_popup|repoticker-usage-hover/);
  assert.doesNotMatch(read("../apps/desktop/ui/quota.html"), /class="quota-close"/);
});
test("usage overlay follows the same physical monitor as the main Layer Shell card", () => {
  assert.match(native, /monitor_at_window\(&gdk_window\)/);
  assert.match(native, /window\.set_monitor\(&monitor\)/);
  assert.match(native, /fn anchor_usage/);
  assert.match(ui, /"hide_usage_popup"/);
  const usage = conf.app.windows.find(w=>w.label==="usage");
  assert.equal(usage.height,118);
  assert.equal(usage.maxHeight,320);
});

test("three separate hover targets share one pointer-pass-through WebView", () => {
  assert.match(ui, /for \(const \[kind, anchor\] of Object.entries\(hoverTargets\)\)/);
  assert.match(ui, /anchor\.addEventListener\("mouseenter"/);
  assert.match(ui, /anchor\.addEventListener\("mouseleave"/);
  assert.match(ui, /setQuotaOpen\(kind\)/);
  assert.doesNotMatch(ui, /popupHovered|closeGrace|quotaAnchor\.addEventListener\("click"/);
  assert.doesNotMatch(read("../apps/desktop/ui/quota.html"), /<button|quota-close/);
  assert.match(css, /pointer-events:none/);
});

test("native tooltip ignores pointer/focus and reports the actual surface backend", () => {
  assert.match(native, /set_keyboard_mode\(KeyboardMode::None\)/);
  assert.match(native, /set_pass_through\(true\)/);
  assert.doesNotMatch(read("../apps/desktop/src-tauri/src/main.rs"), /fn dismiss_usage_popup/);
  assert.match(read("../apps/desktop/src-tauri/src/main.rs"), /RepoTicker surface mode=/);
});

test("KDE Wayland forces native GDK selection before Tauri setup", () => {
  const rust = read("../apps/desktop/src-tauri/src/main.rs");
  assert.match(rust, /fn configure_gdk_for_native_wayland\(\)/);
  assert.match(rust, /std::env::set_var\("GDK_BACKEND", "wayland"\)/);
  assert.ok(rust.indexOf("configure_gdk_for_native_wayland();") < rust.indexOf("tauri::Builder::default()"));
  assert.match(rust, /XDG_SESSION_TYPE/);
  assert.match(rust, /WAYLAND_DISPLAY/);
});

test("the separate usage WebView can listen without inheriting main permissions", () => {
  const mainCapability = JSON.parse(read("../apps/desktop/src-tauri/capabilities/default.json"));
  const usageCapability = JSON.parse(read("../apps/desktop/src-tauri/capabilities/usage-events.json"));
  assert.deepEqual(mainCapability.windows, ["main"]);
  assert.deepEqual(usageCapability.windows, ["usage"]);
  assert.deepEqual(usageCapability.permissions, ["core:event:allow-listen"]);
  const quotaJs = read("../apps/desktop/ui/quota.mjs");
  assert.match(quotaJs, /subscribe\("repoticker-usage-shown", onUsageShown\)/);
  assert.match(quotaJs, /subscribe\("repoticker-monitor-updated", refreshMonitorOnly\)/);
  assert.doesNotMatch(quotaJs, /invoke\("get_snapshot"\)/,
    "usage popup must not trigger local repo discovery on any event");
  assert.match(quotaJs, /invoke\("github_monitor_snapshot"\)/);
  assert.match(quotaJs, /invoke\("get_monitor_scope"\)/);
  assert.match(quotaJs, /invoke\("get_settings_config"\)/);
  assert.match(quotaJs, /subscribe\("repoticker-config-changed", refreshLocale\)/);
  assert.match(quotaJs, /invoke\("get_usage_popup_kind"\)/);
  assert.match(quotaJs, /Status unavailable/);
  assert.doesNotMatch(quotaJs, /catch\s*\{\s*paint\(buildQuotaDetails\(null\)\)/);
});


test("GTK exact min/max height updates stay valid while growing and shrinking", () => {
  const helper = native.match(/fn set_exact_viewport_height\([\s\S]*?\n\}/)?.[0];
  assert.ok(helper, "one shared native geometry helper for card and usage");
  assert.match(helper, /if height > previous \{\s*viewport\.set_max_content_height\(height\);\s*viewport\.set_min_content_height\(height\)/);
  assert.match(helper, /\} else \{\s*viewport\.set_min_content_height\(height\);\s*viewport\.set_max_content_height\(height\)/);
  assert.match(native, /USAGE_HEIGHT\.load\(Ordering::Acquire\),\s*height,/);
  assert.match(native, /set_exact_viewport_height\(&viewport, CARD_HEIGHT\.load\(Ordering::Acquire\), height\)/);
});

test("Windows usage tooltip clips the WebView corner pixels on show and resize", () => {
  const win = read("../apps/desktop/src-tauri/src/windows_geometry.rs");
  const main = read("../apps/desktop/src-tauri/src/main.rs");
  const window = conf.app.windows.find(w => w.label === "usage");
  assert.equal(window.transparent, true);
  assert.equal(window.shadow, false);
  assert.match(css, /html,body \{[^}]*background:transparent/);
  assert.match(css, /border-radius:11px; clip-path:inset\(0 round 11px\)/);
  assert.doesNotMatch(css, /box-shadow/);
  assert.match(win, /fn CreateRoundRectRgn\(/);
  assert.match(win, /fn SetWindowRgn\(/);
  assert.match(win, /if attached == 0 \{[\s\S]*DeleteObject\(region\)/);
  assert.match(win, /On success Windows owns and frees HRGN/);
  const show = main.slice(main.indexOf("fn show_usage_popup("),
    main.indexOf("fn hide_usage_popup("));
  assert.match(show, /windows_geometry::clip_usage_popup\(&popup\)/);
  assert.ok(show.indexOf("windows_geometry::clip_usage_popup(&popup)") <
    show.indexOf("popup\n            .show()"));
  const resize = main.slice(main.indexOf("fn resize_usage_popup("),
    main.indexOf("fn hide_card("));
  assert.match(resize, /windows_geometry::clip_usage_popup\(&popup\)/);
  assert.match(resize, /if popup\s*\.is_visible\(\)/);
});


test("localized billing diagnostics are not needlessly clamped before native size limit", () => {
  const message = css.match(/\.quota-section > \.quota-message \{([^}]+)\}/)?.[1] ?? "";
  assert.match(message, /white-space:normal/);
  assert.match(message, /overflow-wrap:anywhere/);
  assert.doesNotMatch(message, /line-clamp|-webkit-box|overflow:hidden/);
  assert.match(css, /\.quota-content \{[^}]*min-height:0;[^}]*overflow:hidden/);
  assert.equal(usageHeight(20, [320]), USAGE_MAX_HEIGHT);
  assert.match(read("../apps/desktop/ui/quota.mjs"),
    /probe\.getBoundingClientRect\(\)\.height/);
  assert.match(css, /clip-path:inset\(0 round 11px\)/);
});
