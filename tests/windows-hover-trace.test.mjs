import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const app = read("apps/desktop/ui/app.mjs");
const native = read("apps/desktop/src-tauri/src/main.rs");

test("hover debugging is opt-in, single-read and stage-specific", () => {
  assert.match(app, /invoke\("ui_hover_debug_enabled"\)/);
  assert.match(app, /if \(!hoverDebugEnabled\) return/);
  assert.match(app, /invoke\("trace_ui_hover", \{/);
  assert.match(app, /traceHover\(null, "ready"\)/);
  assert.match(app, /traceHover\(kind, "pointer-enter"\)/);
  assert.match(app, /traceHover\(kind, "enter"\)/);
  assert.match(app, /traceHover\(kind, "leave"\)/);
  assert.match(app, /traceHover\(wanted, cardVisible \? "queue-visible" : "queue-hidden"\)/);
  assert.match(app, /traceHover\(wanted, "show-ipc"\)/);
  assert.match(app, /traceHover\(null, "ipc-error"\)/);
});

test("native hover trace cannot echo user-defined strings or secret values", () => {
  const body = native.slice(native.indexOf("fn trace_ui_hover("),
    native.indexOf("// Authoritative selected view survives"));
  assert.match(body, /if !ui_hover_debug_enabled\(\) \{\s*return;/);
  assert.match(body, /let kind = match kind\.as_str\(\)/);
  assert.match(body, /let stage = match stage\.as_str\(\)/);
  assert.match(body, /"none" => "none"/);
  assert.match(body, /"pointer-enter" => "pointer-enter"/);
  assert.match(body, /_ => return/);
  assert.match(body, /RepoTicker hover trace: seq=\{sequence\} stage=\{stage\} kind=\{kind\}/);
  assert.doesNotMatch(body, /token|repository|path|secret|credential/i);
});

test("native show command traces its entry before any popup lookup or positioning", () => {
  const start = native.indexOf("fn show_usage_popup(");
  const end = native.indexOf("fn hide_usage_popup(");
  const body = native.slice(start, end);
  const entry = body.indexOf("RepoTicker usage popup IPC received");
  const lookup = body.indexOf('get_webview_window("main")');
  assert.ok(entry !== -1 && lookup !== -1 && entry < lookup);
  assert.match(native, /ui_hover_debug_enabled,\s*trace_ui_hover,/);
});

test("Windows target cannot compile away the unmanaged usage popup show path", () => {
  const body = native.slice(native.indexOf("fn show_usage_popup("),
    native.indexOf("fn hide_usage_popup("));
  assert.match(body, /#\[cfg\(target_os = "linux"\)\]\s*let use_unmanaged_popup = !linux_surface::enabled\(\);/);
  assert.match(body, /#\[cfg\(not\(target_os = "linux"\)\)\]\s*let use_unmanaged_popup = true;/);
  assert.match(body, /#\[cfg\(target_os = "linux"\)\]\s*if !use_unmanaged_popup \{\s*linux_surface::show_usage\(&app\)\?;\s*\}/);
  assert.match(body, /if use_unmanaged_popup \{\s*let card = app/);
  assert.match(body, /popup\s*\.show\(\)/);
  assert.match(body, /windows_geometry::raise_usage_popup\(&popup\)/);
  assert.doesNotMatch(body,
    /#\[cfg\(target_os = "linux"\)\]\s*if linux_surface::enabled\(\)\s*\{[\s\S]*?\}\s*else\s*\{/);
  assert.ok(body.indexOf("if use_unmanaged_popup {") < body.indexOf('get_webview_window("main")'));
  assert.ok(body.indexOf('get_webview_window("main")') < body.indexOf(".show()"));
});
