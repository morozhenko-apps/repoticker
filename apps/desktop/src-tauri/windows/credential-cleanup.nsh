; RepoTicker: remove the application's own Windows Generic credential only
; when the user explicitly checks "Delete the application data".
;
; Tauri's bundled NSIS template defines DeleteAppDataCheckboxState and
; UpdateMode and inserts POSTUNINSTALL after removing the two AppData
; directories. Do not run this during upgrade/reinstallation.
;
; keyring v1 / windows-native-keyring-store target name:
;   KEYRING_USER + "." + KEYRING_SERVICE (github_native.rs)
; No CredRead, enumeration, shell processes, or network calls.

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
    ; CRED_TYPE_GENERIC = 1, Flags = 0. Delete only our exact target.
    System::Call 'advapi32::CredDeleteW(w "github-app-user-token-v1.com.morozhenko.repoticker.github", i 1, i 0) i .r0'
    ${If} $0 = 0
      System::Call 'kernel32::GetLastError() i .r1'
      ; ERROR_NOT_FOUND (1168) is expected when never connected or
      ; after a previous complete uninstall: cleanup is idempotent.
      ${If} $1 <> 1168
        DetailPrint "RepoTicker: GitHub credential cleanup failed (Windows error $1)."
        SetErrorLevel 1
        ${IfNot} ${Silent}
          MessageBox MB_OK|MB_ICONEXCLAMATION "RepoTicker could not remove its GitHub credential from Windows Credential Manager. Application files were removed, but the credential may remain. Remove the RepoTicker credential manually from Windows Credential Manager before sharing this Windows account."
        ${EndIf}
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend
