import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { listAvailableInstallations } from "../apps/desktop/ui/github-installations.mjs";
import { settingsLocale, settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
import { localeName, localeDirection } from "../apps/desktop/ui/locale-catalog.mjs";
import { repositorySelectionMessage } from "../apps/desktop/ui/locale-counts.mjs";
import { disableBrowserContextMenu } from "../apps/desktop/ui/browser-context-menu.mjs";

const read = name => readFileSync(new URL(name, import.meta.url), "utf8");
const html = read("../apps/desktop/ui/settings.html");
const source = read("../apps/desktop/ui/settings.mjs");
const native = read("../apps/desktop/src-tauri/src/relay_secret.rs");
const main = read("../apps/desktop/src-tauri/src/main.rs");
const knownIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

test("one inline password field stages only on explicit OK", () => {
  assert.match(html, /id="relay-secret-mask" type="password"/);
  assert.doesNotMatch(html, /relay-configure-secret|relay-help|relay-secret-hint|relay-worker-source-link/);
  assert.match(source, /byId\("relay-secret-mask"\)\.addEventListener\("input"/);
  assert.match(source, /await invoke\("relay_stage_secret", \{ secret: field\.value \}\)/);
  assert.match(source, /field\.value = "";\s*relaySecretConfigured = true/);
  assert.doesNotMatch(source, /invoke\("relay_prompt_secret"/);
  assert.match(native, /pub async fn relay_stage_secret\(/);
  assert.match(main, /relay_secret::relay_stage_secret,/);
});

test("new secrets use native validation and are never saved as regular settings", () => {
  assert.match(native, /fn valid_secret\(value: &str\) -> bool/);
  assert.match(native, /settings_only\(&window\)\?/);
  assert.match(native, /let candidate = SensitiveSecret\(secret\)/);
  assert.match(native, /Some\(RelaySecretDraft::Set\(candidate\)\)/);
  assert.match(native, /impl Drop for SensitiveSecret/);
  assert.match(source, /await invoke\("relay_commit_secret_draft"\)/);
  assert.match(source, /if \(field\.type === "password" && field\.value\)/);
  assert.doesNotMatch(source, /configChanges\.(?:secret|token|relaySecret)/);
  assert.match(main, /fn close_settings\([\s\S]*?relay_secret::discard_draft\(&app\)/);
});

test("Cancel clears WebView candidate without writing Keyring", () => {
  const cancel = source.split('const cancelSettings = async () => {')[1]
    .split('byId("cancel-settings").addEventListener("click", cancelSettings);')[0];
  assert.match(cancel, /byId\("relay-secret-mask"\)\.value = ""/);
  assert.match(cancel, /await invoke\("close_settings"\)/);
  assert.doesNotMatch(cancel, /relay_stage_secret|relay_commit_secret_draft/);
});

test("a stored credential is represented by a fixed mask, never its real value", () => {
  assert.match(source, /mask\.value = "••••••••••••"/);
  assert.match(source, /mask\.readOnly = true/);
  assert.match(source, /mask\.type = "password"/);
  assert.match(source, /mask\.disabled = relaySecretBusy/);
  assert.match(native, /fn store_secret\(secret: &SensitiveSecret\)/);
  assert.match(native, /fn remove_secret\(\)/);
});

test("disconnect preserves the explicit Hybrid choice and stages Keyring removal", () => {
  const disconnect = source.split('byId("relay-remove-secret").addEventListener("click"')[1]
    .split('let saving = false;')[0];
  assert.match(disconnect, /await invoke\("relay_clear_secret"\)/);
  assert.doesNotMatch(disconnect, /draft\.connectionMode = "polling"/);
  assert.match(source, /relaySecretTouched && relaySecretConfigured === false/);
  assert.match(source, /if \(draft\.connectionMode !== "hybrid"\) return true/);
});

test("Simple polling deletion is staged and the native config erases Worker origin", () => {
  assert.ok(source.includes('function pollingNeedsRelayCleanup()'));
  assert.ok(source.includes('await invoke("relay_clear_secret")'));
  assert.ok(source.includes('const relayUrlForSave = simpleSelected ? "" : draft.relayUrl'));
  assert.ok(source.includes('if (simpleSelected) relaySecretConfigured = false'));
  assert.ok(main.includes('fn clear_relay_url_for_polling(config: &mut Config) -> bool'));
  assert.ok(main.includes('changed |= clear_relay_url_for_polling(config);'));
});

test("the separate popup is no longer invoked by the Settings UI", () => {
  assert.doesNotMatch(source, /relay_prompt_secret/);
  assert.match(html, /id="relay-worker-guide-link"/);
  assert.doesNotMatch(html, /id="relay-worker-source-link"/);
});
