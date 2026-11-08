# Personal Cloudflare Relay (operator-managed, no deployment)

RepoTicker's optional Hybrid relay is implemented as a Cloudflare Worker plus
SQLite Durable Object with WebSocket hibernation. This is **not** a shared SaaS
service. The desktop native client and Settings Hybrid activation remain a
separate unfinished milestone; do not deploy this relay as an app feature yet.

## Secrets and permitted repositories

Provide all three bindings as operator-owned Cloudflare **secrets**, never
commit them and never pass them as command-line arguments or store in the UI:

- WEBHOOK_SECRET: at least 32 characters, configured with the same value for
  GitHub's webhook secret.
- RELAY_CLIENT_SECRET: independent base64url-like (A-Z, a-z, 0-9, _ or -),
  length 32-256. Intended for native OS credential storage on the desktop.
- ALLOWED_REPOSITORIES: a comma-separated exact allowlist of up to 100
  GitHub "owner/repo" identities. These may be private; do not commit them.

Wrangler config declares a single SQLite Durable Object, with no populated
secrets, routes or operator credentials. Deployment is deliberately manual.

## Protocol v1

HTTPS POST /v1/github checks GitHub's HMAC-SHA256 signature over the untouched
request bytes before any parsing. Signed workflow_run.completed events produce
only a bounded repository invalidation hint. GitHub signed ping returns 204.
Malformed/forged, unsupported and out-of-scope events are rejected.

Authenticated GET /v1/changes?after=<cursor> returns a bounded JSON replay
{ v:1, type:"batch", cursor, reset, hints:[...] }.
Authenticated WSS /v1/stream?after=<cursor> yields hint, reset and ready
frames. Clients pass the relay secret ONLY via Authorization: Bearer,
never URL query, cookies or WebView. The relay emits no workflow conclusions.
Clients must reconcile in GitHub REST. The journal contains at most 128
hints and 24h of active history; gaps require full REST reconciliation.
At most 8 simultaneous sockets and 120 new deliveries per minute are accepted
per personal relay.

## Validation and limits

Use the repository's pinned Node26 stable tests:

    node --test tests/relay-*.test.mjs

The WebSocket + SQLite tests exercise the real SQL statements against Node's
built-in in-memory SQLite via a Durable Object API adapter, not a remote
Cloudflare account. Before any real deployment, require Wrangler
typecheck/bundle validation and operator-reviewed Cloudflare DO quota,
secret rotation, WAF rate-limiting, webhook redelivery behavior and network
failover. Do not modify the shared rquickshare/repoticker/cfvigil R2 bucket.

See docs/RELAY.md for staged acceptance and explicit trust boundaries.
