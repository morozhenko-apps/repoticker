# RepoTicker architecture

RepoTicker uses Tauri 2 with a Rust native desktop layer, a WebView interface and a shared Rust Git core. The app is designed for manual, local-first Git workflows and read-only GitHub monitoring.

## Local Git domain

The core inspects explicitly enrolled repository roots through installed Git. Git operations are bounded and evaluate current branch, upstream, working-tree and remote-ref state before mutation. Fetch and safe synchronization are separate actions. Safe Pull uses fast-forward-only behavior, and pushing must not bypass the remote state or Git hooks.

## Native desktop

Rust owns native windows, system tray, Git processes, OS notifications, settings persistence, platform autostart and secure credential access. The interface presents snapshots and user commands without direct access to credential material or arbitrary filesystem/network privileges.

## GitHub integration

GitHub Device Flow, token handling, HTTPS requests, response validation, permissions, pagination, rate limiting and conditional caching are owned by the native layer. Only bounded projected data is sent to the interface. Workflows, jobs, runners and usage data retain independent completeness states so unavailable API information is never treated as zero.

Settings separates the GitHub credential from the selected monitoring installation. A complete one-account installation inventory may initialize an absent monitoring scope automatically only for a previously authenticated session; an in-progress new Device Flow remains provisional until Settings OK so Cancel can revoke its new credential. Existing matching scopes are never rewritten on open. Multiple or incomplete inventories cannot be treated as proof of a unique account; an explicit scope change remains a draft until OK. Account data and Disconnect occupy one row; avoid duplicate authorized-status fields. Late inventory responses and failed account writes must not fabricate an active monitoring scope.


## Operator-owned Hybrid source and UI contract

Installed desktop clients must show where to obtain their optional
Cloudflare Worker, not imply that the Worker is bundled with a DEB.
Settings shows **fixed** links to the exact GitHub Worker source directory
and deployment guide, opened in the system browser through a settings-only
native allowlist, never via a WebView-provided arbitrary URL.
During QA these links point to `dev`; switch to the reviewed `main`
source and verify them before shipping Hybrid publicly.

Settings is nonselectable except text-entry fields, the displayed
`openssl rand -hex 32` command, and the GitHub Device Flow code whose
manual copy fallback must remain usable. The relay credential mask is
never selectable or revealable. Present relay field placeholders in the
normal UI font without excessive letter spacing; provide readable
help text contrast across light, dark and high-contrast themes.

## Distribution

Linux DEB/AppImage and Windows NSIS are assembled by the release workflow. A protected signing process produces Linux APT metadata and checks immutable downloads by byte size and SHA-256. The public application does not require a developer-operated backend to manage local repositories.
