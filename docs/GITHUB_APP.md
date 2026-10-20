# RepoTicker GitHub App registration

Status: GitHub App registered and installed by the publisher on 2026-10-20; live native login is still pending. The Rust core
Device Flow state machine exists; it is not yet a working GitHub login.

## One-time setup by the app publisher

Go to the GitHub organization settings -> Developer settings -> GitHub
Apps -> New GitHub App. A personal account can also own the app.

Settings:
- Name: RepoTicker or an available equivalent.
- Homepage: https://github.com/morozhenko-apps/repoticker
- Expire user authorization tokens: enabled.
- Enable Device Flow: enabled.
- Webhooks: disabled for the direct REST mode.
- Repository permissions for the planned read-only CI/Git companion:
  - Actions: Read-only (runs/jobs/logs/artifacts/workflows/cache).
  - Checks: Read-only (check runs and suites on commits/PRs).
  - Commit statuses: Read-only (external CI status contexts).
  - Pull requests: Read-only (PR context and checks).
  - Contents: Read-only (commits, workflow sources, tags and releases).
  - Deployments: Read-only (deployment/environment status).
  - Metadata: implicit Read-only.
- Organization permissions: Self-hosted runners: Read-only.
- **Additional opt-in permissions for accurate billing/limits:**
  Organization Administration: Read-only (organization billed usage,
  Actions cache/plan configuration; requires sufficient user/org rights);
  Account Plan: Read-only (individual account billed usage). These are
  broader privacy/administrative scopes, so enable with clear user
  approval and product explanation. Do not request them merely to count
  queued/running jobs.
- All remaining repository/organization/account permissions: No access.
  In particular, Actions Write, Administration Write, Contents Write,
  Pull requests Write, runner management Write, Secrets Write and
  Workflows Write are NOT approved for current/future read-only monitoring.
- Installation eligibility: Any account.
- OAuth callback URL: not required for Device Flow. Do not create a
  pretend callback endpoint or distribute the GitHub App client secret.

After registration, copy ONLY the public Client ID and App slug.
The Client ID is NOT the numeric App ID. Never send the client secret,
private key, user access token, installation token or refresh token.
The public Client ID can be compiled into a desktop release.

Install the GitHub App in the organization and grant access to the
selected repositories. Use the organization's own installation approval
policy. The signed-in user's permissions intersect with App permissions.
GitHub's organization self-hosted runner inventory requires the user
to be organization admin; otherwise runner capacity is unknown while
permitted repo job counts remain usable.

## End-user sign-in

An end user does NOT register a GitHub App or deploy Cloudflare Worker.
They click Connect in RepoTicker Settings, receive a one-time code and
enter it on https://github.com/login/device. Native code exchanges it
for a user token with server-enforced polling intervals. Access and
refresh tokens live only in the OS credential manager.

On Linux use Secret Service/KWallet, macOS Keychain and Windows Credential
Manager through a maintained, native credentials implementation.
Never store token strings in WebView JS, config.json, app logs, command
arguments or telemetry. Explicitly handle expired, revoked, denied and
rate-limited states. Device-flow refresh is supported without a client
secret and must atomically rotate the refresh token.

## Remaining implementation and acceptance

- [x] Register the publisher App under `morozhenko-apps`: public Client ID `Iv23liyFAFdT7NCSkpIj`, numeric App ID `5399579` (do not use numeric App ID in OAuth requests).
- [ ] Native HTTPS GitHub transport, bounded responses, server interval
      timer, cancellation, token refresh and OS credential store.
- [ ] GitHub Settings login / logout and chosen organization or repo scope.
- [ ] Authorized Actions collection with independent runner inventory.
- [ ] Verify real KDE sign-in, permission rejection, refresh, disconnect,
      stale/partial state and connected status on the existing tooltip.
- [ ] Run final CI and physical acceptance before new release.

Reference:
https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
https://docs.github.com/en/rest/actions/self-hosted-runners

## Future-readiness review and permission upgrade policy (2026-10-20)

This matrix covers current user-approved features and the P2-P4 roadmap:
read-only CI jobs, self-hosted runner status, PR/check/commit context,
tag/release/deployment metadata, cache/usage hints, optional webhook
relay, and local Git fetch/fast-forward operations. None of the latter
requires any GitHub API write permission: local Git uses the user's
existing Git credential helper separately from GitHub App auth.

For a later **optional Hybrid relay**, workflow_run and workflow_job
webhook subscriptions use existing Actions:read. Push subscriptions
can use existing Contents:read. Webhook delivery requires a separate
endpoint, signature validation and opt-in; enabling these permissions
does NOT deploy the relay or turn on webhooks automatically.

If a future product explicitly adds rerunning/cancelling/dispatching
workflow jobs, that is a DIFFERENT trust boundary requiring
Actions:write, UI confirmation and deliberate installation re-approval.
Likewise remotely opening/merging a pull request, publishing releases,
writing files or managing runners requires write permissions; do not
pre-authorize speculative mutation merely to save a Settings visit.

IMPORTANT: when the App publisher adds any new repository or
organization permission later, **each existing installation owner must
approve** the change before it becomes effective. New account-level
permissions require user reauthorization. This is a security feature
and cannot be bypassed by a broad initial permission list.

Read-only permission choices apply to all installations of the
publisher-owned GitHub App. Consequently an optional billing-related
Organization Administration:read is **not per-installation optional
merely because the RepoTicker UI hides billing**: enable it globally
only if broad administrative visibility is acceptable to future users,
or defer it until dedicated billing support is ready. User ownership
or admin rights are still required on individual endpoints. If
permissions are denied, show "Unavailable", not "0" or an invented
plan quota.

References:
https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps
https://docs.github.com/en/rest/billing/usage
https://docs.github.com/en/rest/actions/self-hosted-runners
https://docs.github.com/en/apps/maintaining-github-apps/modifying-a-github-app-registration

## Actual publisher registration (2026-10-20)

Public App Client ID: `Iv23liyFAFdT7NCSkpIj` (usable in Device Flow).
GitHub App ID: `5399579` (not an OAuth Client ID). Owner: `morozhenko-apps`.
Keep the product homepage as the reserved `https://morozhenko.com/en/repoticker/`;
the route does not yet exist in PersonalLanding and must be implemented
and deployed before treating the homepage as publicly live.

The publisher registered the App; this is not evidence that it has been
installed on all desired repositories, all read-only scopes were approved
or that any end user has completed authorization. Those are independent
runtime gates. The app secret/private key is never required for desktop
device authorization.

## Protocol implementation status (2026-10-20)

The GitHub App public Client ID and the strict Device Flow response
validation now exist in `apps/desktop/src-tauri/src/github_oauth_wire.rs`
and are checked in native Rust tests. This module is **test-only** while
the encrypted OS credential store and outbound TLS client are absent.
Raw access/refresh/device token strings are not sent to a WebView or
logged. A native runtime sign-in command must not be made available
until token storage, refresh and cancellation are implemented.

## Next implementation milestone

[Issue #4](https://github.com/morozhenko-apps/repoticker/issues/4) tracks native HTTPS/TLS, OS-native credential persistence, Device Flow refresh/rotation, authorized read-only REST and UI acceptance. The lockfile currently contains reqwest transitively without TLS support and has no credential store implementation. Regenerate `Cargo.lock` with Cargo when adding approved dependencies. Do not expose Connect in the product until both native transport and secure OS storage are operational and tested.

## Native sign-in implementation (dev, not yet physically accepted)

Native GitHub App device sign-in is implemented in Rust using bounded
HTTPS with automatic redirection disabled. The existing Settings window
now provides Connect, a visible short user code and an explicit "Open
GitHub" browser action, cancellation and Disconnect. Completion is
event-driven, and only sanitized statuses are emitted. Native
`github_access_token` is not registered for JavaScript IPC.

The access/refresh token pair, expiry times and record version are
stored together through the OS credential manager. On Linux the
KWallet-compatible Secret Service provider must be available and
unlocked. Failure to access it is an error, not permission to persist
secrets in `config.json`, shell, JavaScript, logs or temporary files.
The code checks GitHub's returned interval and `slow_down`, and rotates
both token strings as one keyring record on refresh.

The current Settings connection indicator confirms *locally persisted
authorization*, not availability of runners/jobs or successful access
to every selected organization. The main card's counters remain
unavailable pending the read-only REST collector integration. Live
authorization and KWallet on Alcotester require physical acceptance.

Implementation milestones and outstanding integration checks:
[Issue #4](https://github.com/morozhenko-apps/repoticker/issues/4).

## Device Flow approved in browser but not connected in app — diagnostic protocol (2026-10-21)

**Physical reproduction:** on Alcotester, Settings -> Connect shows a
valid `user_code`; `github.com/login/device` accepts it and opens
a browser success page. Settings continues displaying the code and does
not report `Authorized`. Retrying the consumed code shows an error
in GitHub (this is expected: device codes are single-use). This is a
failure of the *desktop continuation*, not proof that the user denied
authorization.

**Candidate causes, priority order:** server poll/token exchange returns
an error that is currently discarded; the pair was granted but the
Secret Service/KWallet credential write failed; Rust emitted a terminal
event but the Settings WebView missed or failed to handle it; the
background polling task stopped/timed out; the credential record
validator rejected GitHub's response; a session was invalidated while
the browser was in use. Do not assert one cause until the native stage
has been observed on the user's system.

**Approved nonarchitectural diagnostic correction:**
1. Keep GitHub Device Flow, OS keyring, and public authentication
   security boundary unchanged. No change to token storage format.
2. Track a **sanitized native flow stage** (pending, polling,
   awaiting approval, saving credentials, connected, denied, expired,
   cancelled, failed), together with a fixed reason category on failure
   (e.g. network, response validation, GitHub rejection, OS keyring
   write). Never forward HTTP bodies, device codes, access/refresh
   tokens or raw provider errors.
3. Expose the current stage through the existing read-only
   `github_auth_status` command and send matching Tauri events.
   Settings reconciles native state when opened, refocused or when
   user explicitly selects "Check status". It must not require
   receiving exactly one event nor busy-poll GitHub outside the
   server-advertised interval. Once browser verification succeeds,
   the original one-time code must never be reused.
4. Add a Copy code control (clipboard on an explicit user gesture).
   Failure to access the clipboard must produce a clear error and
   must not falsely claim copying succeeded. Only the public
   `user_code` may be copied; it is not a bearer token.
5. Regression tests cover native flow-state transitions and
   sanitized failure categories, no auth secrets in JS, and local
   state reconciliation via Settings. The GitHub App device challenge
   now sends only its public Client ID, as documented by GitHub; the
   extra OAuth App-style scope parameter has been removed. Do not
   alter native window geometry, the ⓘ hover balloon or counter
   positions.
6. Ask for a **fresh** GitHub device code on Alcotester and the
   displayed final flow stage/reason after one attempt. If approved
   but failed at keyring write, debug the OS Secret Service service
   separately, with no raw token dumps.

**Stop condition:** if this evidence establishes a material
authorization/security boundary change, require a separate explicit
decision. This diagnostic increment changes neither storage nor
granted scopes.

This section supersedes earlier generic statements that browser
approval alone proves a stored connection. The existing issue is
[Issue #4](https://github.com/morozhenko-apps/repoticker/issues/4).


**Implemented diagnostic increment on `dev`:**
- `c802b835` adds native flow stages, sanitized failure codes,
  read-only reconciliation of `github_auth_status`, focus/manual
  status refresh and Copy code. No token leaves the Rust boundary.
- `3093d3d`, `e125d7e`: correct Device Flow's GitHub App request
  to client_id only; distinguish known server rejection categories
  and cover request fields in tests.
- `cf82781e`: finish user-facing error reason strings in Settings.
- Final code gate: [Preflight #39513954626](https://github.com/morozhenko-apps/repoticker/actions/runs/39513954626)
  on SHA `8734947`; completion/physical confirmation still pending.
  Earlier temporary CI runs were superseded by formatting corrections.

**Current status:** physical root cause NOT confirmed yet. A fresh
authorization attempt must supply the final fixed phase/reason (or
safe diagnostic lines) to decide whether the problem is GitHub
exchange, missing Tauri event, or KDE Secret Service/KWallet write.
Do not retry a previously approved one-time code.
