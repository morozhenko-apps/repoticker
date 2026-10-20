# Security principles and disclosure

RepoTicker intentionally does not require a proprietary backend or paid service.

## Local boundaries

- Use the user's installed Git without taking custody of Git remote credentials.
- Never log tokens, Authorization headers, raw webhook secret contents or private repository file data.
- Never execute network-supplied shell commands. Webhook inputs are event hints only.
- Perform auto pull only with clean tracked/untracked tree, upstream tracking, no unfinished Git operation and actual Git fast-forward-only; fail closed if a check is unavailable.
- Explicitly prevent repository discovery from crossing configured roots without permission; handle linked worktree .git files and ignore snapshots.
- Treat CI links as untrusted URLs; accept verified github.com Actions run URLs and open only on explicit user action.

## Cloud boundaries

- Use least-privilege GitHub scopes and OS credential stores.
- Webhook HMAC verification, replay protection, payload bounds, client auth, tenant isolation and bounded durable event history are mandatory before Hybrid can be enabled.
- Never embed Cloudflare account credentials in the desktop bundle.
- Make failed/auth-unavailable/stale states visible.

## Reporting

Please use GitHub's private vulnerability reporting mechanism if enabled, or contact the maintainer privately instead of publishing exploit details in a public issue. No security assurance is claimed for the unfinished relay placeholder.

## GitHub App Device Flow (under implementation)

Native Device Flow has no client secret; GitHub public Client ID is
publisher-controlled build metadata. The pure Rust core authorizer handles
only publicly visible verification code and timing metadata. The future
native HTTP adapter owns device_code and tokens, and all credentials must
be persisted exclusively through OS credential storage. No plaintext
fallback, token in logs, WebView, settings JSON, URL or error strings.
Future-oriented read-only scope may include Actions, Checks,
Commit statuses, Pull requests, Contents and Deployments at repository
level plus organization Self-hosted runners. Organization
Administration:read and Account Plan:read are separately considered for
billing endpoints, not silently treated as required for job monitoring.
None of these permissions authorizes modifying Actions runs or repositories. A runner-inventory 403 must not mask
permitted repository jobs. No requirement to deploy RunnerRouter.
