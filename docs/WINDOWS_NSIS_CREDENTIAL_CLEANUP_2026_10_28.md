# Windows NSIS: explicit all-data uninstall removes GitHub credentials

**Mode A — Feature. Owner-approved 2026-10-27/28.** Branch: `dev`; do
not promote to `main`, tag, or publish. The owner selected the contract:
normal uninstall, upgrade and reinstall preserve GitHub authorization;
uninstall with **Delete the application data** checked must delete
RepoTicker's Windows Credential Manager entry as well as Tauri AppData.

## Baseline diagnosis

- The two platform application-data directories are managed by the
  upstream Tauri NSIS uninstall checkbox:
  `$APPDATA\${BUNDLEID}` and `$LOCALAPPDATA\${BUNDLEID}`.
- GitHub access/refresh tokens are stored in an **independent** Windows
  Credential Manager Generic credential by `keyring = 4.2.0`, feature
  `v1`, whose service and user keys are declared in
  `github_native.rs`: service
  `com.morozhenko.repoticker.github`, user
  `github-app-user-token-v1`. The Windows backend composes its
  target name as **user + "." + service**:
  `github-app-user-token-v1.com.morozhenko.repoticker.github`.
  Existing `NativeCredentialStore::clear` removes exactly this entry.
- Deleting AppData alone does not touch that OS-managed credential;
  Windows sign-in may therefore survive "delete all data".
- Upstream Tauri v2 NSIS template exposes
  `$DeleteAppDataCheckboxState` and `$UpdateMode` in
  `NSIS_HOOK_POSTUNINSTALL`, **after** the standard AppData deletion.
  Confirmed against its upstream installer.nsi (2026-10-28) and
  current Tauri installerHooks schema. No template fork needed.

## Contract and implementation

1. Configure `bundle.windows.nsis.installerHooks` to point to a
   self-contained `windows/credential-cleanup.nsh`.
2. In the **post-uninstall hook only**, require both:
   `$DeleteAppDataCheckboxState = 1` and `$UpdateMode <> 1`.
3. Call the Windows credential API directly:
   `CredDeleteW` on exactly one compiled-in target name,
   `CRED_TYPE_GENERIC=1`, `Flags=0`. Treat Windows
   `ERROR_NOT_FOUND=1168` as successful/idempotent cleanup. Do not
   enumerate or delete other credentials, secrets, keychains, registry
   entries, or GitHub grants. Never log a token or pass it to a child
   process/shell.
4. On any other Windows error, do not claim cleanup success: report a
   nonsecret warning; ensure a nonzero uninstaller exit code on failure.
   A reinstall/upgrade must **not** execute the cleanup branch.
5. Keep the app identifier, username/service, stored credential
   schema, runtime disconnect logic and Linux behavior unchanged.

## Test and rollback

- Source contract test: exact target matches
  `KEYRING_USER + "." + KEYRING_SERVICE`; hook only runs postuninstall
  under the two guards; uses direct `CredDeleteW`; refuses broad
  matches and keeps installers/reinstall hooks untouched.
- Package candidate: Windows NSIS must build successfully and include
  the hook. Run existing JS/Rust/Python preflight at the stable gate.
- **Physical Windows QA:** With a disposable GitHub authorization,
  (a) upgrade preserves sign-in, (b) regular uninstall + reinstall
  preserves sign-in, (c) uninstall with checkbox set + reinstall
  shows unauthenticated state, (d) a second all-data uninstall with
  no credential succeeds, (e) unrelated Credential Manager entries
  remain. Confirm single user/same logon identity.
- No CI worker has access to the operator's Windows Credential Manager.
  Static tests and a compiled NSIS are evidence of implementation,
  **not** evidence of actual credential deletion on that machine.
- Rollback removes hook configuration and hook file; no saved schema
  migration or token overwrite is involved. A real deletion cannot be
  undone; user reauthorizes GitHub via the existing device flow.

## Scope boundary

This feature **removes only the locally persisted access+refresh
credential**. It does **not** remotely revoke any previously issued
GitHub OAuth grant. Do not automatically trigger unrelated network
actions during uninstallation. Existing Windows tooltip and localization
acceptance issues are out of scope.

**State:** implemented in `dev`; automated validation and physical
Windows acceptance pending. Hook is included by `tauri.conf.json` and
covered by `tests/windows-nsis-credential-cleanup.test.mjs`.
No real user's token was read, deleted, or exposed during development.


## Operator Windows observation

The owner reported that a physical Windows full uninstall with **Delete the application data** checked successfully removed the RepoTicker credential. This is partial operator-reported acceptance of the explicit-delete path, not proof that upgrade and regular-uninstall retention, idempotent repeat removal, unrelated credentials and all error paths have passed. No credentials were inspected or transferred in this report.
