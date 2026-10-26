# RepoTicker KDE/Windows follow-up — 2026-10-26

**Status:** source fixes, pending exact-source CI and physical acceptance.
No published `main`, release/tag or persistent config changes.

The operator's KDE screenshots show an orange generic "W" in native Settings
and About titlebars, while the About body renders the committed RepoTicker
stack/arrows icon. The Launch at login checkbox uses native GTK painting
but CI notifications use an explicit checkbox design. The OS exposes a
minimize affordance despite those small windows not needing it. Windows
still fails to display any of the three runner/task/billing hover windows.

## Possible causes, targeted checks and remedies

1. **Confirmed:** Native Tauri window icon is not explicitly assigned,
   independently of the tray and About HTML. GTK appears to use a generic
   fallback image. Attach the embedded `app_icon::tray_rgba()` image
   explicitly to the Settings and About native windows at setup. Do not
   replace committed image assets or silently blame icon caches.
**KDE/Wayland follow-up:** Tauri explicitly documents that
`app.enableGTKAppId` associates GTK windows with the application's
desktop identifier so Wayland compositors can select the correct icon.
This was previously unset. Keep the existing stable
`com.morozhenko.repoticker` identifier and enable GTK app identity,
in addition to the direct per-window icon assignment. It also uses
GTK's session bus single-instance registration, consistent with
RepoTicker's existing single-instance product invariant. If
KDE's installed .desktop filename does not match, inspect the
installed DEB manifest before changing the identifier.

2. **Confirmed:** Autostart has a separate native checkbox from the existing
   custom CI/repository checkboxes. Reuse one appearance/checked/focus/
   forced-colors CSS contract for all three.
3. **Confirmed:** Settings/About have `maximizable=false` but not
   `minimizable=false`; set both window metadata values.
4. **Strong Windows tooltip hypothesis:** Previously fatal
   `set_focusable(false)?` and `set_ignore_cursor_events(true)?`
   are platform hints which can fail before `popup.show()`. Neither
   may block showing an informational popup. Add status-only
   `REPOTICKER_UI_DEBUG` diagnostic points around show; keep errors
   visible without logging private repo data.
5. **Strong geometry hypothesis:** The detached popup's size changes
   after its initial placement, and Windows monitor work areas may differ
   from the 118 px initial bubble. Re-anchor after resize and clamp
   to monitor work area. Do not modify the native KDE Layer Shell path.
6. **Confirmed operator workflow issue:** `repo-ticker` is the
   Debian package/archive name, whereas the Cargo desktop target is
   `repoticker-desktop`. GitHub ZIP extraction directories are not
   installed app folders. Provide one GitHub SHA-pinned install helper,
   use a fresh folder for every artifact, verify SHA256 and locate the
   actual installed binary through `dpkg-query -L`. Avoid renaming the
   Windows installer binary or invalidating autostart during Gate 2.
7. A genuine outdated KDE hicolor cache remains possible, but is
   not established by the screenshots. Only consider refreshing it
   if the rebuilt, explicit window icon still shows the fallback.

## Recheck contract

- KDE: launch fresh binary, confirm titlebar icons and absence of
  minimize controls; three checkbox groups render identically. About
  HTML icon remains unchanged.
- Windows: hover **Runners**, **Tasks**, **billing ⓘ** and verify
  popup becomes visible with no focus theft or card auto-dismiss;
  verify monitor edge positioning after the popup changes height.
  A source or CI PASS is insufficient for Windows runtime PASS.
- Linux QA helper must not overwrite an existing archive extraction
  directory, accept a failed workflow or mismatched source SHA, or
  guess executable names. It must not modify Git branches.

**Diagnostic log gates:** `REPOTICKER_UI_DEBUG` records only static
popup kind and show-state labels. OS hint failures are logged as
sanitized platform error text; no provider payload, token or repo path
is included. A remaining missing Windows tooltip requires an operator
runtime observation with the new candidate.

Do not add OS-specific hacks to Git core, KWallet or CI monitor data.


## 2026-10-26 follow-up: two-language selector and missing Windows hover

**Current facts.** The full L10N-20 gate is explicitly documented in
[LOCALE_CONTEXT_AUDIT.md](localization/LOCALE_CONTEXT_AUDIT.md)
and is *not implemented*. The Settings HTML lists EN/RU, the JavaScript
translation catalogs contain only EN/RU and the native configuration
validator rejects all other locale codes. Do not create an apparently
working 20-language selector populated with untranslated English fallback.
The 20 validated bundles, parity checks and per-locale audits remain
issue #16, ahead of Mode B. This runtime batch does not claim L10N-20 PASS.

**Windows hover root-cause candidates**, in descending confidence:

1. Stale presentation state: `setQuotaOpen()` checks an event-maintained
   `cardVisible` boolean before issuing *any* native show IPC. A visible
   Windows WebView can receive pointer hover even when its previous
   `repoticker-card-shown` event listener was not ready/received. Treat an
   actual pointer-enter/focus-in as positive visibility evidence.
2. Native detached usage window still not visible, despite the Rust
   `show()` call returning success (WebView2/DWM composition, focus or
   placement). No physical evidence yet isolates the cause.
3. The native popup may initially appear then be hidden due to pointer
   event transitions or missed kind/race events.
4. Window may be placed outside the real work area on multi-monitor/DPI.
5. The hover window's own WebView may fail to initialize/update.
6. Busy/disabled metric buttons could suppress pointer events and keyboard
   focus during explicit manual refresh.

**Architectural choice for this scoped repair:** keep the existing
read-only, rich detached window for all OSs. Eliminate dependence on a
possibly stale show-event boolean when the OS demonstrably delivered
pointer/focus into the visible card. Provide a separate **read-only
native WebView title fallback** on all three metrics, derived only from
trusted, already fetched status (never exposing paths/tokens, never
inventing GitHub usage). This makes a meaningful status inspectable on
Windows even when the detached popup cannot be displayed. The fallback
is not a replacement for complete runner/job/billing details and does
not close the rich Windows hover acceptance.

**Scope and validation:** no Git/GitHub API calls for the fallback,
no persistent settings changes, no new filesystem/network permissions.
Test a missing shown-event, known/unknown counts, all three anchors,
and non-interference with click-to-refresh. Keep existing KDE hover
contract untouched and the complete 20-locale scope open. A successful
CI run is source evidence, not Windows runtime confirmation.
