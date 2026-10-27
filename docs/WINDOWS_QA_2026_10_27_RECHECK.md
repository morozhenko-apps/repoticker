# Windows QA follow-up — ae898645, 2026-10-27

Mode A — Feature/Refactor: seven operator-confirmed issues in Windows candidate at exact commit `ae8986450e2c1df21b3f343babc5a176fec23cca`. No main, tag, release or credential mutation authorized by this document.

Evidence: three operator screenshots show expanded repository drawer, EN card action `Fetch`, three **un-styled WebView2 browser-native `title` bubbles** anchored by the browser to the lower/right side of the pointer, with the billing bubble presenting `—` for all data. No proof of the separate `usage` Tauri popup's position, successful rendering, billing network response or permission. A previous code fallback explicitly sets a Windows `title` using `buildHoverDetails(..., null)`, which *cannot* produce billing values.

## Root causes, candidate checks, scope
1. Button wording: EN `Fetch` intentional, RU `fetch` also literally `Fetch`; all 18 additional locale cards have `Fetch`. Must localize UI action label while preserving technical Git semantics.
2. AppData wipe: GitHub OAuth access/refresh tokens are intentionally persisted in **Windows Credential Manager / OS keyring**, entry service `com.morozhenko.repoticker.github`, key `github-app-user-token-v1`, not Tauri AppData. Existing explicit `github_disconnect` deletes it. Automatic uninstall deletion would alter the security/credential lifecycle contract and is a STOP FACTOR: do not wipe or duplicate storage without the owner's choice. Current behavior must be explained; no secret dumped in logs.
3. Billing: the WebView2 `title` fallback always passes `null` as billing data and presents `—`. Real `quota.mjs` owns a cached, permission-gated remote billing fetch. Do not infer a quota, remaining amount or entitlement from the job counters; honor unknown and API permissions.
4–5. Popup direction/appearance: browser `title` placement and native theme cannot be controlled through app CSS. The rich Tauri usage popup already implements top-of-card placement, monitor work-area clamping and themed CSS. Remove the competing Windows `title` fallback, retain a single rich popup. On Windows arrange z-order after `show()` on the same existing window; do not add polling or arbitrary retry. Installed Windows acceptance still required; if the native popup remains invisible, get sanitized `REPOTICKER_UI_DEBUG` and OS window visibility evidence before another fix.
6. Compact card has 122px native height but content only accounts for 25px metric strip + 70px actions + 9/10px padding, leaving an additional 8px unused above metrics. Reduce compact height and top padding together; do not shrink expanded drawer or break bottom anchoring.
7. Settings OK with drawer expanded can block on `await refreshMonitorScopes()` after `github_set_monitor_org` already committed, preventing `close_settings`. Treat scope refresh as a nonblocking post-commit reconciliation; still surface failing mutations. Config locale should refresh immediately on card's `repoticker-config-changed` event, before potentially slow local Git snapshot. Preserve draft/Cancel semantics.

## Validation
- Static/source unit regression for title removal, native popup z-order show, locale button labels, top gap dimensions and immediate translated card refresh.
- Settings with expanded repositories, current locale switch RU→PT, click OK: Settings hides and card button labels change without another Fetch or forced GitHub request. Reopen: locale persists. Cancel leaves unchanged.
- Windows rich Runners/Tasks/billing: looks like KDE, anchored above and clamped side-to-side. No browser tooltip or focus theft. For billing, verify authoritative API values when permitted; otherwise explicit unavailable reason.
- No credential/keychain deletion until owner chooses uninstall contract; verify manual Disconnect separately.
- Preflight and unpublished Windows/Linux candidate after fixes. Source CI does not equal physical Windows PASS.

## Risks/rollback
Native popup may still be obscured on Windows because both card and popup are always-on-top; observable UI feedback is required. Reverting only the nonnative fallback is easy but would reveal the underlying defect rather than hiding it. Compact height changes affect Linux Wayland surface and Windows anchoring; tests must validate both. Never clear token storage or change the app ID.
