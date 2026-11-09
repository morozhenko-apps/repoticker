# RepoTicker architecture

RepoTicker uses Tauri 2 with a Rust native desktop layer, a WebView interface and a shared Rust Git core. The app is designed for manual, local-first Git workflows and read-only GitHub monitoring.

## Local Git domain

The core inspects explicitly enrolled repository roots through installed Git. Git operations are bounded and evaluate current branch, upstream, working-tree and remote-ref state before mutation. Fetch and safe synchronization are separate actions. Safe Pull uses fast-forward-only behavior, and pushing must not bypass the remote state or Git hooks.

## Native desktop

Rust owns native windows, system tray, Git processes, OS notifications, settings persistence, platform autostart and secure credential access. The interface presents snapshots and user commands without direct access to credential material or arbitrary filesystem/network privileges.

## GitHub integration

GitHub Device Flow, token handling, HTTPS requests, response validation, permissions, pagination, rate limiting and conditional caching are owned by the native layer. Only bounded projected data is sent to the interface. Workflows, jobs, runners and usage data retain independent completeness states so unavailable API information is never treated as zero.

Settings separates the GitHub credential from the selected monitoring installation. A complete one-account installation inventory may initialize an absent monitoring scope automatically only for a previously authenticated session; an in-progress new Device Flow remains provisional until Settings OK so Cancel can revoke its new credential. Existing matching scopes are never rewritten on open. Multiple or incomplete inventories cannot be treated as proof of a unique account; an explicit scope change remains a draft until OK. Account data and Disconnect occupy one row; avoid duplicate authorized-status fields. Late inventory responses and failed account writes must not fabricate an active monitoring scope.


## Relay authorization scope

The operator's `ALLOWED_REPOSITORIES` secret accepts exact GitHub
`owner/repo` entries or a deliberate `owner/*` entry for one GitHub
account/organization. There is no global wildcard. All paths are
canonicalized and bounded; signed webhook HMAC and raw-body validation
remain mandatory, and Worker/DO ingress, historic replay and broadcast
must use the same authorization predicate. An owner-level entry explicitly
trusts **all** current and future repositories owned by that account;
it is not equivalent to the user's narrower desktop monitoring selection.
The desktop still verifies scope through GitHub REST. A single
organization-level `workflow_run` webhook can cover future repos
without GitHub credentials, org repo inventory or automated webhook
management in the Worker.

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

## Relay status and safe Settings locking

The GitHub org webhook and the native authenticated WebSocket are separate
trust boundaries. A native `relay_connection_status` value of `online`
only proves that the desktop established its authenticated WSS connection
to the configured Worker. It **does not prove** GitHub webhook delivery,
valid `WEBHOOK_SECRET`, or a successful workflow event. Do not show a
"webhook healthy" indicator based on the native transport phase. Failed
GitHub webhook deliveries (including ping returning HTTP 401) must be
diagnosed separately in GitHub's Recent Deliveries and the Worker ingress
HMAC validation. A stored Keyring bearer or configured URL is not proof
of a successful connection.

Settings subscribes once to the native `repoticker-relay-state` event and
reads the initial native status when opened. Ignore any late initial
read superseded by a newer event, and any result from an older Settings
open generation. Unknown/missing native IPC must never produce a connected
state. Display a clearly labeled Worker/WSS transport status in Hybrid
settings, with an accessible text label. On authenticated `online`
and when the current draft is exactly the persisted Hybrid URL with a
confirmed stored bearer, lock both the Worker URL and nonrevealable
credential mask. Leave the existing explicit Disconnect action available
(and transactional until OK). If the transport is `connecting`,
`fallback`, `polling` or unknown, unlock only the Worker URL so a user
can repair a failed endpoint; never enable viewing or changing a stored
credential in WebView. Do not auto-save edits or silently disable Simple
REST fallback.

Add regression tests for startup, transitions, late initial-state IPC,
draft URL edits, disconnected state and correct button/credential custody.
Localization must remain complete in all supported Settings locales.
Review exact-source Preflight and physical KDE/Windows Settings acceptance
before release. Keep the Worker ingress and client protocol unchanged
for this presentation-only feature.

## Relay failure classification and native Settings window

Relay transport must report only a closed set of non-sensitive failure reasons,
not raw HTTP bodies, URLs, bearer tokens, private repository names, headers
or provider error messages. Its native event and one initial status snapshot
should carry a synchronized phase and reason. Distinguish missing bearer,
Keyring failure, invalid endpoint, missing GitHub authorization/monitor scope,
HTTP 401/403/404/426/5xx, timeout/TLS/network and malformed WebSocket frames.
Use the HTTP response status from a failed WSS upgrade when available.
Record a single stable, non-secret diagnostic log line on a state/reason
transition, rather than emitting repeated logs for reconnection attempts.
Use an explicit generic desktop User-Agent for the native WebSocket handshake
so infrastructure does not classify it as an unidentified automation client.
Do not claim any particular class is the cause without native evidence.

The Settings status conveys which leg failed: desktop to Worker transport,
not GitHub webhook delivery. Remove the unrelated tooltip that only tells
users that a successful WebSocket cannot validate GitHub webhooks. A missing
Keyring secret must be distinguishable from an HTTP 401 rejection, and a
Cloudflare-side service health screenshot does not prove WSS success.
Keep independent REST CI polling fully available in Hybrid mode.

Stored Keyring credentials and current UI drafts remain distinct.
The Disconnect action must stay available whenever a stored secret exists,
regardless of transport health or source selection, and must only stage
removal until explicit Settings OK. A cancelled Settings session retains
the prior saved credential. Pending removal must never silently switch
the user's selected Hybrid source to Polling.

On desktops where the KDE server-side titlebar still displays window-manager
minimize controls despite Tauri minimizable=false, use a small application
titlebar with only a Close control, native authenticated window drag, and
Cancel-equivalent semantics for closing. Retain keyboard accessibility,
screen-reader labels and drafts-on-close cleanup. Size the Settings window
to show the whole normal form on common desktop work areas while clamping
to the monitor height on smaller screens; scrolling remains the fallback.
Do not make the window impossible to reposition or close on Wayland.

## Settings information architecture and acceptance criteria

Settings must prioritize direct tasks, use consistent field/control dimensions,
and avoid redundant explanatory text, duplicated authorization widgets and nested
card borders. Organize settings by purpose: General, Local repositories, GitHub
monitoring, Event delivery and CI notifications. Conditional Worker configuration
belongs inside Event delivery, not inside a nested GitHub credential panel.
A single external deployment-guide link is sufficient. Source retrieval and
credential generation belong in that guide, not inside the application.
Labels are visible and concise; help is supplied only when a user must
complete an unfamiliar external step. All interactive controls remain
keyboard accessible, properly labelled, and contrast-safe.

Use separate facts for the two relay legs: authenticated client-to-Worker WSS
and verified GitHub-to-Worker event delivery. Do **not** display a combined
healthy state from an online WebSocket alone, a stored bearer, or the
existence of past history. A quiet organization with no recent workflow
events is *unverified*, not necessarily broken. A health endpoint would
need to expose only bounded non-sensitive receipt metadata, authenticated
with the existing bearer. The UI must distinguish unknown/unavailable from
verified, and degrade to REST without hiding the selected Hybrid mode.

The owner explicitly selected inline masked relay-secret entry instead of a
second native dialog, superseding the native-only WebView boundary. One
candidate may reside briefly in the trusted Settings WebView and cross a
Settings-only IPC boundary exactly once at explicit OK. This is a conscious
confidentiality tradeoff: JavaScript memory cannot be wiped as reliably as
Rust-owned native buffers. Never send the candidate in events, URLs, logs,
browser storage, diagnostics or responses. Clear the input immediately after
staging; the Rust draft retains OS Keyring-only persistence and zeroization.

The deployed Worker currently exposes no authenticated receipt-health
metadata. Until a new authenticated health contract is reviewed and deployed,
desktop must report webhook verification as unknown, not infer it from an
online WebSocket.

## Distribution

Linux DEB/AppImage and Windows NSIS are assembled by the release workflow. A protected signing process produces Linux APT metadata and checks immutable downloads by byte size and SHA-256. The public application does not require a developer-operated backend to manage local repositories.
