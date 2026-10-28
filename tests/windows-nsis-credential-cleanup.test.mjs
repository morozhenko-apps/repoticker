import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const config = JSON.parse(read("apps/desktop/src-tauri/tauri.conf.json"));
const hook = read("apps/desktop/src-tauri/windows/credential-cleanup.nsh");
const credentialSource = read("apps/desktop/src-tauri/src/github_native.rs");
const sessionSource = read("apps/desktop/src-tauri/src/github_session.rs");

const service = credentialSource.match(/const KEYRING_SERVICE: &str = "([^"]+)"/)?.[1];
const username = credentialSource.match(/const KEYRING_USER: &str = "([^"]+)"/)?.[1];

test("NSIS uses the official post-uninstall hook without forking Tauri's template", () => {
  assert.equal(config.bundle.windows.nsis.installerHooks, "./windows/credential-cleanup.nsh");
  assert.ok(!config.bundle.windows.nsis.template, "upstream installer must remain in use");
  assert.deepEqual([...hook.matchAll(/^!macro (NSIS_HOOK_[A-Z]+)$/gm)]
    .map(match => match[1]), ["NSIS_HOOK_POSTUNINSTALL"]);
  assert.match(hook, /!macroend\s*$/);
  assert.doesNotMatch(hook, /NSIS_HOOK_PREINSTALL|NSIS_HOOK_POSTINSTALL|NSIS_HOOK_PREUNINSTALL/);
});

test("cleanup is gated on explicit delete-data consent AND never runs on upgrades", () => {
  const opening = hook.slice(hook.indexOf("!macro NSIS_HOOK_POSTUNINSTALL"),
    hook.indexOf("System::Call"));
  assert.match(opening, /\$\{If\} \$DeleteAppDataCheckboxState = 1/);
  assert.match(opening, /\$\{AndIf\} \$UpdateMode <> 1/);
  assert.equal((hook.match(/\$\{If\} \$DeleteAppDataCheckboxState = 1/g) ?? []).length, 1);
  assert.equal((hook.match(/\$\{AndIf\} \$UpdateMode <> 1/g) ?? []).length, 1);
  assert.doesNotMatch(hook, /\/UPDATE\b|ExecWait|Exec\b|CreateProcess|cmdkey|powershell|revoke/i);
});

test("deletion targets precisely the v1 Windows Credential Manager user.service entry", () => {
  assert.equal(service, "com.morozhenko.repoticker.github");
  assert.equal(username, "github-app-user-token-v1");
  const credentialTarget = username + "." + service;
  const calls = [...hook.matchAll(/System::Call 'advapi32::CredDeleteW\(w "([^"]+)", i (\d+), i (\d+)\) i \.r0'/g)];
  assert.equal(calls.length, 1, "one exact CredDeleteW call must exist");
  assert.deepEqual(calls[0].slice(1), [credentialTarget, "1", "0"]);
  assert.doesNotMatch(hook, /CredEnumerate|CredRead|TargetName.*\*|\/delete:|HKLM|DeleteRegKey|RmDir|RmDir \/r/);
  assert.match(credentialSource, /keyring::Entry::new\(KEYRING_SERVICE, KEYRING_USER\)/);
  assert.match(credentialSource, /entry\.delete_credential\(\)/);
});

test("missing credential is idempotent; other failures are visible and nonzero", () => {
  assert.match(hook, /GetLastError\(\)/);
  assert.match(hook, /\$1 <> 1168/); // Windows ERROR_NOT_FOUND
  assert.match(hook, /SetErrorLevel 1/);
  assert.match(hook, /MessageBox MB_OK\|MB_ICONEXCLAMATION/);
  assert.match(hook, /\$\{IfNot\} \$\{Silent\}/);
  assert.doesNotMatch(hook, /CredRead|AccessToken|refresh_token|access_token|CredentialBlob/);
});

test("normal Settings Disconnect remains the native credential deletion path", () => {
  assert.match(sessionSource, /pub async fn github_disconnect\(app: AppHandle\)/);
  assert.match(sessionSource, /delete_credential\(\)\.await\.map_err\(public_error\)/);
  assert.match(sessionSource, /publish\(&app, "disconnected"\)/);
  assert.equal(config.identifier, "com.morozhenko.repoticker");
});
