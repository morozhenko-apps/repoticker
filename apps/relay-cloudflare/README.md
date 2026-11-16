# Personal Cloudflare Relay (operator-managed, no deployment)

RepoTicker's optional Hybrid relay is implemented as a Cloudflare Worker plus
SQLite Durable Object with WebSocket hibernation. This is **not** a shared SaaS
service. Native desktop source and unpublished builds exist on `dev`, but
physical native acceptance and operator deployment are still pending. This is
not a ready-to-use hosted relay; do not deploy it as an app feature yet.


## Where to get the relay secret

**There is no GitHub code to obtain and no RepoTicker relay account.** This is
a *self-hosted, single-operator* relay. The operator generates an independent
secret for the native client, configures **the same value** as
`RELAY_CLIENT_SECRET` in their own Cloudflare Worker secret binding, and
enters the same secret in RepoTicker Settings. The secret must not be
included in a URL, repository file, screenshot or diagnostic log.

For example, on Ubuntu (prints a new 64-character base64url-compatible secret; protect the
terminal output and never paste it into tickets or GitHub source):

```sh
openssl rand -hex 32
```

The GitHub webhook uses a **different** `WEBHOOK_SECRET`; also configure
`ALLOWED_REPOSITORIES`. Once **separately approved** and deployed, enter your
Worker HTTPS origin in Settings (for example `https://your-worker.example`).
The webhook target on GitHub is `https://your-worker.example/v1/github` with
`workflow_run` events (activities `requested`, `in_progress`, and `completed`).
GitHub uses `requested`, not an action named `queued`, for a newly requested run. These values are not supplied automatically
by installing RepoTicker. Until the Worker is deployed and verified, keep
**Simple polling**. The selected CI notification type remains independent.

No Cloudflare deployment, secret upload, webhook registration or modification
of other cloud resources is authorized by this document.


## Get Worker source and deploy with Cloudflare's GitHub integration

A RepoTicker DEB/AppImage/NSIS installation does **not** install or host
a Worker. The desktop's Hybrid help includes direct, external-browser links:

- Worker source is located in this `apps/relay-cloudflare` directory.
- This README is the deployment guide. Use a tagged or otherwise reviewed source revision.

Choose a reviewed source revision before deployment. The Worker source tree
and your own deployed HTTPS Worker URL are separate things. Do not infer
production readiness from a development branch name.

In Cloudflare **Workers & Pages → Create application → GitHub**, select
`<your-github-namespace>/repoticker`. Cloudflare Workers Builds supports a
subdirectory as the root of this monorepo:

| Field | Setting |
| --- | --- |
| Worker name | `repoticker-relay` (same as the existing Cloudflare Worker and Wrangler) |
| Git repository | `<your-github-namespace>/repoticker` |
| Root directory | `apps/relay-cloudflare` |
| Production branch | A reviewed, separately controlled deployment branch; **not** the continuously updated `dev` |
| Build command | Leave blank |
| Deploy command | `npx wrangler@4.158.0 deploy` |
| Worker entry point | `src/index.ts` (already in `wrangler.toml`) |
| Durable Object binding | `RELAY_HUB`, class `RelayHub` |
| SQLite migration | `v1`, `new_sqlite_classes = ["RelayHub"]` |
| Worker URL | The operator-owned `https://<name>.<account>.workers.dev` or HTTPS custom domain |

In Cloudflare Workers Builds → **Build watch paths**, replace the default
Include `*` with `apps/relay-cloudflare/*`; leave Exclude empty.
These paths are relative to the Git repository root even when the Worker
root directory is `apps/relay-cloudflare`. An empty push or an exceptionally
large push can bypass watch-path filtering. No need to make empty commits
to trigger deployment once a real Worker file changes.

Cloudflare's **Configured API token unavailable** state must be repaired in
Worker → Settings → Builds → API token before any new commit can deploy.
A retry may also surface other issues. Check **Deployments → View build**
for the exact failure. Workers Builds' auto-generated token can include
broad R2 write privileges even though this relay uses no R2; review and
limit token permissions where supported.

A Git-linked Worker deploys automatically on updates to its configured
production branch. Keep reviewed staging and user releases separate; disable
unused preview deployments and check Durable Object quota and migration
support before selecting Save and Deploy. This guide does not authorize
mutations to any operator's Cloudflare resources.

Cloudflare's automatically generated Workers Builds deployment token may
include permissions for R2 even though this Worker does **not** use R2.
Review its effective scope before approving the Git integration; prefer a
separately reviewed least-privilege token where the account setup supports
it. Root-directory selection restricts which source gets built, **not** what
Cloudflare resources a powerful deployment credential can access.

The top-level `keep_vars = true` in `wrangler.toml` keeps runtime
variables configured through Cloudflare Dashboard when Wrangler publishes a
new version. This is essential for `ALLOWED_REPOSITORIES` if it was saved
as a Text variable: without it, a Git-connected `wrangler deploy` can
replace Dashboard variables with the bindings in source and cause HTTP 503.
Wrangler normally preserves encrypted Secret bindings independently. Keep
the allowlist private and prefer the Secret type for private repository scopes.
Do not move its value into `[vars]` or a tracked build file.

After Worker creation, configure **runtime Secret bindings**, not build
environment variables, under **Worker → Settings → Variables and Secrets**:

- `RELAY_CLIENT_SECRET`: generate a unique `openssl rand -hex 32` value;
  enter the **same** secret through RepoTicker Settings.
- `WEBHOOK_SECRET`: generate a **different** `openssl rand -hex 32` value;
  use it as GitHub's webhook signing secret.
- `ALLOWED_REPOSITORIES`: comma-separated exact repository identities
  (`owner/repo`) and/or explicitly authorized owner scopes (`owner/*`).
  For one operator's whole GitHub organization, use a single `owner/*`
  entry instead of editing the secret when a repository is created.
  A standalone `*` is never accepted; at most 100 entries are allowed.
  Treat nonpublic scopes as secrets.

For the entire organization, configure **one organization webhook** under
GitHub **Organization → Settings → Webhooks**, rather than one webhook per
repository. Organization hooks cover current and future organization
repositories. Select **Content type: application/json**, **Payload URL:**
`https://<your-worker-origin>/v1/github`, and the matching
`WEBHOOK_SECRET`. Subscribe to **Workflow runs** (`workflow_run`);
the relay accepts `requested`, `in_progress` and `completed`.
Do not paste `/v1/github` into RepoTicker Settings: enter the bare
`https://<your-worker-origin>` and the separately generated client secret.

A signed `ping` should return 204, and an accepted signed, allowlisted
workflow run delivery should return 202. Validate the native WSS connection,
GitHub REST reconciliation, overload/fallback and API-cooldown behavior before
declaring Hybrid accepted. GitHub does **not** automatically retry a failed
webhook. The current ingress rejects bodies larger than 64 KiB, so real
payload sizes require a separate security review. This Worker requires
neither R2 storage nor a GitHub admin token inside RepoTicker.

## Secrets and permitted repositories

Provide all three bindings as operator-owned Cloudflare **secrets**, never
commit them and never pass them as command-line arguments or store in the UI:

- WEBHOOK_SECRET: at least 32 characters, configured with the same value for
  GitHub's webhook secret.
- RELAY_CLIENT_SECRET: independent base64url-like (A-Z, a-z, 0-9, _ or -),
  length 32-256. Intended for native OS credential storage on the desktop.
- ALLOWED_REPOSITORIES: a comma-separated allowlist (maximum 100
  entries) of exact `owner/repo` identities and/or explicitly selected
  GitHub account/organization patterns `owner/*`. The owner pattern
  authorizes **all** repositories under that owner, including repositories
  created later. The global `*`, nested wildcards and malformed identities
  are rejected. A HMAC-valid webhook for another owner still fails closed.
  These identities may be private; do not commit them.

Wrangler config declares a single SQLite Durable Object, with no populated
secrets, routes or operator credentials. Deployment is deliberately manual.

## Protocol v1

HTTPS POST /v1/github checks GitHub's HMAC-SHA256 signature over the untouched
request bytes before any parsing. Signed workflow_run activities `requested`,
`in_progress`, and `completed` produce only a bounded repository invalidation
hint. GitHub signed ping returns 204.
Malformed/forged, unsupported and out-of-scope events are rejected.

Authenticated GET /v1/changes?after=<cursor> returns a bounded JSON replay
{ v:1, type:"batch", cursor, reset, hints:[...] }.
Authenticated WSS /v1/stream?after=<cursor> yields hint, reset and ready
frames. Clients pass the relay secret ONLY via Authorization: Bearer,
never URL query, cookies or WebView. The relay emits no workflow conclusions.
Clients must reconcile in GitHub REST. While the native WebSocket is online,
the desktop still performs a full reconciliation at least every 15 minutes;
runner capacity uses its established adaptive cadence. When disconnected,
normal 2–7 minute direct polling resumes. GitHub does not automatically
redeliver failed webhooks; HTTP 503 is not a retry guarantee. The journal contains at most 128
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
failover. The Worker does not require R2 or storage credentials for any other application.

See docs/RELAY.md for staged acceptance and explicit trust boundaries.
