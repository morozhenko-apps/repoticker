# Generic self-hosted relay (planned)

This adapter will be deployable through Docker on a VPS, on any HTTPS/WebSocket-capable host, with the same versioned contract as the Cloudflare relay.

The implementation and Docker image do not exist yet. Do not expose a public webhook endpoint until signed-payload validation, downstream authentication, per-tenant isolation, storage limits and resume/reconciliation have integration tests.

See `docs/RELAY.md`.
