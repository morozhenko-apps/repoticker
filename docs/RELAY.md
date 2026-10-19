# Optional GitHub webhook relay (planned)

**No production GitHub webhook receiver, authenticated WebSocket stream or Docker/VPS relay is implemented in v0.1.0.** Local Git management works entirely without these services, and the future Simple GitHub REST mode is designed to work without a relay.

**Important distinction:** `infra/download-worker` is an **implemented, read-only Cloudflare R2 file distribution Worker** for DEB/AppImage/Windows assets and signed APT. It does not receive GitHub webhooks, store repository events or implement Hybrid mode. See [RELEASE.md](RELEASE.md).

## Future connection modes

- **Simple:** desktop -> authenticated GitHub REST API -> local reconciled state; no inbound ports. Planned, not currently active.
- **Hybrid:** GitHub webhook -> user-operated HTTPS endpoint -> authenticated event stream to desktop -> authoritative REST reconciliation. Optional, never mandatory.

## Proposed deployment targets

**Cloudflare:** a distinct Worker receives GitHub HTTP POSTs, validates raw-body HMAC-SHA256, limits payload size and routes verified event hints through a Durable Object with authenticated WebSocket clients and a bounded resume cursor.

**Generic:** an interoperable Docker/VPS implementation using HTTPS and WebSocket. Its durable journal is an internal decision, but wire format, replay and isolation must match the Cloudflare implementation.

Neither target is a currently supported live webhook service. No Cloudflare credentials should enter the desktop to provision a relay.

## Candidate envelope (not yet a frozen wire contract)

~~~json
{
  "version": 1,
  "deliveryId": "github-delivery-id",
  "kind": "workflow_run",
  "repository": "owner/repo",
  "receivedAt": "UTC timestamp",
  "resourceId": "id"
}
~~~

Possible kinds include `push`, `workflow_run` and `workflow_job`. The client treats all relay messages as hints and reconciles authoritative state from GitHub API; raw webhook bodies and GitHub installation tokens should not be relayed to desktops.

## Security and recovery acceptance

1. Verify exact raw request bytes against GitHub HMAC with constant-time comparison; reject invalid secrets/signatures, malformed or oversized input.
2. Deduplicate deliveries by ID, handle replay/out-of-order events, and enforce bounded retention and retries.
3. Separate GitHub webhook secret and downstream client credentials; authenticate each client, use TLS, and isolate distinct installations/tenants.
4. Cap open connections, pending messages and storage to limit abuse.
5. Resume from a cursor where possible, then reconcile full GitHub API snapshots on startup/reconnect and periodic checkpoints.
6. Never execute a Git operation as a direct consequence of an untrusted webhook event.
7. Fallback to rate-limit-aware REST polling when relay is unavailable.

## Future operator experience

After implementation and security acceptance, the user will deploy an independent relay (Cloudflare DO or Docker/VPS), configure GitHub webhook events and secrets, enter the relay URL into RepoTicker, and verify signed deliveries, disconnect/resume and access revocation. No automated infrastructure deployment from the desktop is planned.
