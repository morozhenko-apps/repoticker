import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
import { LOCALE_ROSTER } from "../apps/desktop/ui/locale-catalog.mjs";

const read = name => readFileSync(new URL(name, import.meta.url), "utf8");
const rust = read("../apps/desktop/src-tauri/src/relay_transport.rs");
const main = read("../apps/desktop/src-tauri/src/main.rs");
const html = read("../apps/desktop/ui/settings.html");
const js = read("../apps/desktop/ui/settings.mjs");
const css = read("../apps/desktop/ui/settings.css");
const config = JSON.parse(read("../apps/desktop/src-tauri/tauri.conf.json"));

test("WSS emits safe, closed reason codes and does not print provider errors", () => {
  for (const reason of ["configuration", "scope", "github", "missing_secret",
    "credential_store", "invalid_url", "http_401", "http_403", "http_endpoint",
    "http_service", "timeout", "network", "tls", "protocol", "closed",
    "pending_changes"]) {
    assert.ok(rust.includes('"' + reason + '"'), reason);
  }
  assert.match(rust, /Error::Http\(response\) => http_failure_code\(response.status\(\).as_u16\(\)\)/);
  assert.match(rust, /Error::Io\(_\) => 15/);
  assert.match(rust, /Error::Tls\(_\) => 16/);
  assert.match(rust, /eprintln!\(\s*"RepoTicker relay: phase=fallback reason=\{\}"/);
  assert.doesNotMatch(rust, /eprintln!\([^;]*(?:bearer|secret\.as_str|endpoint\.as_str|error:\?)/i);
  assert.match(rust, /last_failure\.swap\(code, Ordering::AcqRel\) != code/);
  assert.match(rust, /pub fn relay_connection_diagnostics\(app: AppHandle\) -> RelayPhaseEvent/);
  assert.match(main, /relay_transport::relay_connection_diagnostics,/);
  assert.match(js, /invoke\("relay_connection_diagnostics"\)/);
});

test("WSS upgrade has explicit generic user agent and never disables TLS checks", () => {
  assert.match(rust, /HeaderValue::from_static\("RepoTicker\/1\.0"\)/);
  assert.match(rust, /request\.headers_mut\(\)\.insert\(AUTHORIZATION, header\)/);
  assert.match(rust, /header\.set_sensitive\(true\)/);
  assert.doesNotMatch(rust, /danger_accept_invalid_certs|danger_accept_invalid_hostnames/);
});

test("failure detail is visible inline and has no redundant tooltip", () => {
  assert.match(html, /id="relay-connection-detail"[^>]*hidden/);
  assert.match(js, /state\.title = ""/);
  assert.match(js, /detail\.textContent = showReason \? t\(reason/);
  assert.match(js, /relayPhase === "fallback"/);
  assert.match(css, /\.relay-connection-detail \{[^}]*font-size: 12px/);
  assert.doesNotMatch(js, /state\.title = t\("Worker connection does not verify/);
});

test("all 20 Settings languages include the user-facing native WSS failure reasons", () => {
  assert.equal(LOCALE_ROSTER.length, 20);
  for (const { code } of LOCALE_ROSTER) {
    for (const key of ["Settings", "Close",
      "Relay configuration is unavailable.",
      "GitHub monitoring account is not configured.",
      "GitHub authorization is unavailable.",
      "No relay secret is stored. REST monitoring is active.",
      "Cannot access the OS credential store.",
      "Worker URL is invalid.",
      "Worker rejected the client secret (HTTP 401).",
      "WebSocket upgrade blocked (HTTP 403).",
      "Worker WebSocket endpoint refused the upgrade.",
      "Worker failed the WebSocket upgrade (HTTP 5xx).",
      "Worker WebSocket connection timed out.",
      "Network connection to Worker failed.",
      "TLS handshake with Worker failed.",
      "WebSocket protocol error.",
      "WebSocket closed. Reconnecting.",
      "Relay changes are pending confirmation.",
      "Relay unavailable. REST monitoring is active."]) {
      const label = settingsText(code, key);
      assert.ok(label?.trim(), code + " missing " + key);
      if (code !== "en") assert.notEqual(label, key);
    }
  }
});

test("settings cannot minimize and keeps a draggable Close-only titlebar", () => {
  const window = config.app.windows.find(item => item.label === "settings");
  assert.equal(window.decorations, false);
  assert.equal(window.minimizable, false);
  assert.equal(window.maximizable, false);
  assert.deepEqual([window.minHeight, window.height, window.maxHeight], [600, 780, 800]);
  assert.match(html, /id="settings-close"[^>]*aria-label="Close"/);
  assert.match(js, /byId\("settings-close"\)\.addEventListener\("click", cancelSettings\)/);
  assert.match(js, /invoke\("start_settings_drag"\)/);
  assert.match(main, /fn start_settings_drag\(app: AppHandle\) -> Result<\(\), String>/);
  assert.match(main, /window\.start_dragging\(\)/);
  assert.match(main, /window\.set_size\(tauri::LogicalSize::new\(660\.0, height\)\)/);
});

test("credential Disconnect does not depend on network state or Settings loading", () => {
  const controls = js.split("function renderRelaySecretState()")[1]
    .split("async function refreshRelaySecretStatus")[0];
  assert.match(controls, /byId\("relay-remove-secret"\)\.disabled =\s*relaySecretBusy \|\| saving \|\| !configured/);
  const disconnect = controls.split('byId("relay-remove-secret").disabled =')[1];
  assert.ok(disconnect);
  assert.doesNotMatch(disconnect, /relayPhase|settingsLoading/);
  assert.match(js, /await invoke\("relay_clear_secret"\)/);
  assert.doesNotMatch(js, /draft\.connectionMode = "polling"/);
});
