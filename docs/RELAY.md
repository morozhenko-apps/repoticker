# Self-hosted event relay (planned)

RepoTicker has two mutually selectable connection modes:
- **Simple:** polling only, built into desktop. Default.
- **Hybrid:** user-operated public HTTPS webhook receiver and authenticated event stream to the desktop, plus periodic authoritative REST reconciliation.

## Supported deployment targets (design)

**Cloudflare:** a Worker receives GitHub HTTP POSTs, verifies their HMAC-SHA256 signature over the raw body, and routes accepted events through a Durable Object maintaining authenticated WebSocket clients and a bounded resume window. The user deploys this themselves and supplies the relay URL to RepoTicker. No personal Cloudflare API token is handed to the desktop app for provisioning.

**Generic:** a Docker/VPS service on any host with HTTPS and WebSocket support, compatible with exactly the same relay envelope and authentication rules. SQLite or other durable journal is an implementation detail.

No production receiver or Docker image is available at the scaffold stage. The Cloudflare endpoint placeholder returns HTTP 501 rather than pretending to receive/deliver webhooks.

## Proposed minimal event envelope (subject to versioned contract tests)

```json
{
  "version": 1,
  "deliveryId": "github-delivery-id",
  "kind": "push | workflow_run | workflow_job",
  "repository": "owner/repo",
  "receivedAt": "UTC timestamp",
  "resourceId": "id"
}
```

Treat fields as hints; the client fetches authoritative API state. Do not forward raw webhook bodies or GitHub installation tokens to desktops.

## Security and recovery gates

1. GitHub endpoint always HTTPS. Verify the exact raw body via constant-time HMAC comparison, bounded payload size and delivery-id idempotency.
2. Separate webhook verification secret and downstream client credential; keep them in native secret storage or hosting secrets.
3. Authenticate WebSocket connections, isolate tenants/installations, cap memory and queue, define retention and reconnect cursor.
4. No automatic Git mutation from an untrusted event.
5. API polling is the automatic fallback if relay is unavailable. Resynchronize GitHub snapshots at startup, reconnect and a bounded interval.
6. Webhook deliveries may fail and GitHub does not promise automatic retry; status must not depend exclusively on a live stream.
7. Never publish sample values resembling real secrets.

## Future Cloudflare operator steps

After implementation and security verification: deploy `apps/relay-cloudflare` following its README, bind the Durable Object, configure webhook secret and client credentials through Cloudflare secrets, create GitHub webhook(s) for push/workflow_run/workflow_job, paste your HTTPS relay URL into RepoTicker, verify signed test deliveries, and test disconnect/resume. No automated infrastructure deployment from RepoTicker.
