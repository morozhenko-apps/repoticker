# Cloudflare Relay (not implemented)

This directory reserves the first self-hosted Hybrid adapter.

Future operator-deployed architecture:
- GitHub webhook POST -> Worker HMAC-SHA256 verification.
- Worker -> Durable Object authenticated, tenant-scoped client WebSocket.
- Bounded delivery cursor/replay on reconnect; desktop periodically reconciles via GitHub REST.
- Secrets provisioned by operator in Cloudflare, not bundled with RepoTicker.

`src/index.ts` intentionally returns HTTP 501; it is **not a usable webhook**. There is no `wrangler.toml` or deployment automation yet to prevent accidental deployment of an inert endpoint. Implementation requires a security review, real signed webhook vectors and documented billing/limits.

See `docs/RELAY.md`.
