# Optional GitHub event relay

RepoTicker can use an operator-controlled Cloudflare Worker relay to receive
timely GitHub workflow-event hints. The existing GitHub REST monitoring remains
authoritative. Relay events cannot grant GitHub permissions or override local
Git state, repository enrollment or conservative synchronization rules.

## Trust boundaries

- The Worker verifies GitHub webhook signatures against the original request
  body before forwarding bounded event metadata.
- Only explicitly allowed repositories can contribute events. An operator
  provisions that allowlist privately; nonpublic identities are not committed.
- WebSocket clients authenticate with a separate high-entropy bearer
  credential over TLS. Webhook and client secrets are distinct.
- The native application owns its authenticated relay transport, reconnect,
  fallback and replay cursor handling. A delivery hint is not proof of a
  successful workflow or permission to mutate a repository.
- The saved relay secret is kept in the operating system's credential store,
  separately from GitHub OAuth. A newly entered credential briefly exists
  in the Settings WebView and an allowlisted native Settings draft before
  the user confirms OK. Cancel does not persist a draft credential.
- Credentials, provider payloads, private repository identifiers and relay
  origins must not appear in diagnostics, query strings, browser storage
  or issue attachments.

## Configuration and operations

This feature is optional. Normal GitHub polling works without a relay.
An operator independently manages their Worker deployment, secret rotation,
webhook permissions and provider costs. For configuration requirements and
example setup, see the [Cloudflare relay guide](../apps/relay-cloudflare/README.md).

On disconnection, invalid credentials, expired sessions, unavailable relay
or uncertain provider state, report a bounded reason and keep the safe REST
fallback. A local application failure must not silently mutate Git state.
Only a successful authorized Settings transaction may replace the persisted
connection mode or relay credential.

See [security](SECURITY.md) and [architecture](ARCHITECTURE.md) for durable
product contracts. Historical design notes and acceptance evidence remain
in Git history, not in the public operational guide.
