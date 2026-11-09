import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../apps/desktop/ui/settings.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../apps/desktop/ui/settings.css", import.meta.url), "utf8");
const settings = readFileSync(new URL("../apps/desktop/ui/settings.mjs", import.meta.url), "utf8");

test("KDE account row aligns selected GitHub account with Disconnect", () => {
  assert.match(html, /<div id="github-monitor-scope-row" class="github-account-row" hidden>/);
  assert.match(html, /id="github-account-name"[^>]*readonly disabled/);
  assert.match(html, /id="github-monitor-scope"[^>]*hidden/);
  assert.match(html, /id="github-disconnect"[^>]*hidden/);
  assert.doesNotMatch(html, /id="github-account-status"/);
  assert.match(css, /\.github-account-row \{[^}]*display: flex;[^}]*align-items: center/);
  assert.match(css, /\.github-account-row input, \.github-account-row select \{[^}]*height: 34px/);
  assert.match(html, /<div class="github-repo-heading">[\s\S]*?<label for="github-repo-mode" data-i18n="Monitor repositories">Monitor repositories<\/label>\s*<select id="github-repo-mode">/);
  assert.match(css, /\.github-grid \{[^}]*grid-template-columns: 1fr 1fr;[^}]*gap: 7px 10px/);
  assert.match(css, /\.github-grid input, \.github-grid select \{[^}]*height: 34px/);
  assert.match(css, /\.github-repo-heading \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*column-gap: 10px/);
  assert.match(css, /\.github-repo-heading select \{[^}]*width: 100%;[^}]*height: 34px/);
  assert.doesNotMatch(css, /\.github-repo-heading select \{[^}]*width: 165px/);
});

test("Settings preserves keyboard-accessible native CI selector and shared checkboxes", () => {
  assert.match(html, /<select id="ci-notification-mode">/);
  for (const value of ["off", "failures", "successes", "both"])
    assert.match(html, new RegExp('<option value="' + value + '"'));
  assert.match(settings, /byId\("ci-notification-mode"\)\.addEventListener\("change"/);
  assert.match(settings, /configChanges\.ciNotificationMode = draft\.ciNotificationMode/);
  assert.doesNotMatch(html, /ci-failure-notifications/);
  const base = css.match(/\.autostart-controls input\[type="checkbox"\],\s*\.github-repo-choice input\[type="checkbox"\] \{([^}]+)\}/)?.[1];
  assert.ok(base, "Autostart and selected repositories keep their checkbox style");
  for (const rule of [
    /-webkit-appearance: none/, /appearance: none/, /width: 16px/,
    /height: 16px/, /margin: 0/, /padding: 0/, /background-position: center/,
    /background-size: 12px 12px/
  ]) assert.match(base, rule);
  assert.match(css, /\.autostart-controls input\[type="checkbox"\]:checked,\s*\.github-repo-choice input\[type="checkbox"\]:checked \{[^}]*background-image: url\("data:image\/svg\+xml/);
  assert.match(css, /\.autostart-controls input\[type="checkbox"\]:focus-visible,\s*\.github-repo-choice input\[type="checkbox"\]:focus-visible \{[^}]*outline:/);
  assert.match(css, /\.ci-alert-controls label \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*column-gap: 10px/);
  assert.match(css, /\.ci-alert-controls select \{[^}]*min-width: 0;[^}]*width: 100%;[^}]*height: 34px/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test("KDE alignment fix does not alter settings confirmation or popup geometry", () => {
  assert.match(html, /id="apply-settings"/);
  assert.match(html, /id="cancel-settings"/);
  assert.match(html, /id="github-repo-controls"[^>]*hidden/);
  assert.match(css, /\.github-repo-controls\[hidden\]/);
  assert.match(css, /\.settings-shell \{[^}]*height: 100%/);
  assert.match(settings, /configChanges\.ciNotificationMode = draft\.ciNotificationMode/);
});

test("KDE GitHub selects have zero block padding and CSS-owned centered closed controls", () => {
  const control = css.match(/\.github-grid select,\s*\.github-account-row select,\s*\.github-repo-heading select,\s*\.ci-alert-controls select \{([^}]+)\}/)?.[1];
  assert.ok(control, "All three visible GitHub selectors share one text-painting contract");
  for (const rule of [
    /-webkit-appearance: none/, /appearance: none/,
    /box-sizing: border-box/, /height: 34px/, /line-height: 32px/,
    /padding: 0 32px 0 12px/,
    /background-position: right 11px center/
  ]) assert.match(control, rule);
  assert.match(css, /\.github-grid select:focus-visible,\s*\.github-account-row select:focus-visible,\s*\.github-repo-heading select:focus-visible,\s*\.ci-alert-controls select:focus-visible/);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*\.github-grid select/);
  // Real HTML selects and their native options remain, not a scripted proxy.
  for (const id of ["github-monitor-scope", "github-connection-mode", "github-repo-mode", "ci-notification-mode"]) {
    assert.match(html, new RegExp('<select id="' + id + '"'));
  }
  assert.doesNotMatch(html, /role="combobox"/);
});


test("Settings scrolls vertically when repository selections expand beyond the window", () => {
  const conf = JSON.parse(readFileSync(
    new URL("../apps/desktop/src-tauri/tauri.conf.json", import.meta.url), "utf8"));
  const win = conf.app.windows.find(w => w.label === "settings");
  assert.ok(win, "Settings window exists");
  assert.deepEqual([win.width, win.minWidth, win.maxWidth], [660, 660, 660]);
  assert.deepEqual([win.height, win.minHeight, win.maxHeight], [720, 720, 720]);
  assert.equal(win.resizable, false);
  assert.match(css, /\.settings-shell \{[^}]*height: 100%;[^}]*overflow-y: auto;/);
  assert.match(css, /\.settings-footer \{[^}]*position: sticky;[^}]*bottom:/);
  assert.match(css, /\.block\.github \{[^}]*overflow: visible;/);
  assert.match(css, /\.github-repo-list \{[^}]*overflow-y: auto;/);
});

test("One opt-in CI result selector remains without diagnostic UI or IPC", () => {
  const rust = readFileSync(new URL(
    "../apps/desktop/src-tauri/src/ci_notifications.rs", import.meta.url), "utf8");
  const main = readFileSync(new URL(
    "../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  assert.doesNotMatch(html, /ci-test-notification|ci-notification-permission/);
  assert.doesNotMatch(settings, /ci_notification_test|ci_notification_permission|ciNativePermission|ciTestRunning/);
  assert.doesNotMatch(rust, /ci_notification_test|ci_notification_permission|notification_test_enabled/);
  assert.doesNotMatch(main, /ci_notifications::ci_notification_test|ci_notifications::ci_notification_permission/);
  assert.match(main, /ci_notifications::ci_run_notify,/);
  assert.match(rust, /app\.notification\(\)\.permission_state\(\)/);
  assert.match(html, /id="ci-notification-mode"/);
  assert.match(settings, /configChanges\.ciNotificationMode = draft\.ciNotificationMode/);
});

test("All-repositories helper text hides without losing selected-mode guidance", () => {
  assert.match(html, /id="github-repo-status"[^>]*role="status" hidden/);
  assert.match(settings, /byId\("github-repo-status"\)\.hidden = !show;/);
  assert.match(settings, /Repository list unavailable\. Existing selection is preserved/);
  assert.match(settings, /Select at most 100 repositories/);
});


test("L10N-20 Settings layouts accommodate long language names and full footer errors", () => {
  const language = css.match(/\.language-picker \{([^}]+)\}/)?.[1] ?? "";
  const trigger = css.match(/#language-trigger \{([^}]+)\}/)?.[1] ?? "";
  assert.match(html, /data-value="pt"[^>]*>Português \(Portugal\)<\/button>/);
  assert.match(language, /width: max-content/);
  assert.match(language, /min-width: 126px/);
  assert.match(language, /max-width: min\(230px, 55vw\)/);
  assert.match(trigger, /width: 100%/);
  assert.match(trigger, /white-space: normal/);
  assert.match(trigger, /overflow-wrap: anywhere/);
  assert.doesNotMatch(trigger, /(?:^|;)\s*width: 126px/);
  assert.match(css, /#language-trigger span \{ flex: 0 0 auto; \}/);
  assert.match(css, /#message \{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/);
  assert.match(css, /\.footer-buttons \{[^}]*flex: 0 0 auto;/);
  assert.match(css, /#language-options button \{[^}]*min-height: 34px; height: auto;[^}]*white-space: normal;/);
});

test("Arabic selectors mirror only translated controls, keeping technical account LTR", () => {
  const source = css.match(/\[dir="rtl"\] \.github-grid select:not\(\[dir="ltr"\]\),\s*\[dir="rtl"\] \.github-repo-heading select:not\(\[dir="ltr"\]\),\s*\[dir="rtl"\] \.ci-alert-controls select:not\(\[dir="ltr"\]\) \{([^}]+)\}/)?.[1] ?? "";
  assert.match(source, /padding: 0 12px 0 32px/);
  assert.match(source, /background-position: left 11px center/);
  assert.match(source, /text-align: right/);
  const defaultSelect = css.match(/\.github-grid select,\s*\.github-account-row select,\s*\.github-repo-heading select,\s*\.ci-alert-controls select \{([^}]+)\}/)?.[1] ?? "";
  assert.match(defaultSelect, /padding: 0 32px 0 12px/);
  assert.match(defaultSelect, /background-position: right 11px center/);
  assert.match(settings, /select\.dir = "ltr";/);
  assert.match(html, /id="github-monitor-scope"/);
  assert.match(html, /id="github-repo-mode"/);
  assert.match(css, /\.github-grid \[hidden\] \{ display: none; \}/);
});

test("Inline relay field is a single Settings form control with native Keyring-only persistence", () => {
  const native = readFileSync(new URL("../apps/desktop/src-tauri/src/relay_secret.rs", import.meta.url), "utf8");
  const main = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  assert.match(html, /id="relay-secret-mask" type="password"/);
  assert.match(html, /id="relay-remove-secret"[^>]*hidden/);
  assert.match(settings, /await invoke\("relay_stage_secret", \{ secret: field\.value \}\)/);
  assert.match(main, /relay_secret::relay_stage_secret,/);
  assert.match(native, /pub async fn relay_stage_secret\(/);
  assert.match(native, /impl Drop for SensitiveSecret/);
  assert.match(native, /fn settings_only\(window: &tauri::WebviewWindow\)/);
  assert.match(settings, /await invoke\("relay_commit_secret_draft"\)/);
});

test("Delivery controls have one purpose-ordered section with a single guide link", () => {
  const github = html.indexOf('<section class="block github">');
  const delivery = html.indexOf('<section class="block delivery">');
  assert.ok(github > 0 && delivery > github);
  assert.ok(html.indexOf('id="github-repo-controls"') < delivery);
  const mode = html.indexOf('id="github-connection-mode"');
  const worker = html.indexOf('id="github-worker-url"');
  const secret = html.indexOf('id="relay-secret-mask"');
  const status = html.indexOf('id="relay-connection-state"');
  const notice = html.indexOf('id="ci-notification-mode"');
  assert.ok(mode < worker && worker < secret && secret < status && status < notice);
  assert.match(html, /id="relay-worker-guide-link"/);
  assert.doesNotMatch(html, /relay-worker-source-link|relay-help|relay-secret-hint|openssl rand -hex 32/);
  assert.match(css, /\.relay-settings \{ margin-top: 10px; padding: 0; min-width: 0; \}/);
  assert.match(css, /\.settings-shell \{ gap: 0;/);
  assert.match(settings, /byId\("relay-settings"\)\.hidden = !hybridSelected/);
  assert.doesNotMatch(settings, /invoke\("relay_prompt_secret"/);
});
