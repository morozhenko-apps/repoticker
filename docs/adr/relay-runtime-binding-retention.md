# ADR: Preserve operator-owned runtime bindings during Worker deployment

## Context

The operator configures a personal Cloudflare Worker from a Git-connected
source tree. Its runtime requires `RELAY_HUB` plus three operator-provided
bindings: `RELAY_CLIENT_SECRET`, `WEBHOOK_SECRET`, and
`ALLOWED_REPOSITORIES`. None of the values belong in Git, build variables,
or CI logs.

When `wrangler deploy` uses a configuration without `[vars]`,
Cloudflare's normal source-of-truth reconciliation can replace Text
variables that were configured only in the Dashboard. Missing
`ALLOWED_REPOSITORIES` correctly fails closed with HTTP 503. A production
error is not a reason to make the allowlist optional or add a wildcard.

## Decision

- Set **`keep_vars = true` at the top level** of
  `apps/relay-cloudflare/wrangler.toml`, before the TOML binding tables.
  Wrangler must keep Dashboard-managed runtime Text variables during deploy.
- Never add actual secrets or private repository lists to `[vars]`, source
  files, package scripts, GitHub Actions or build logs.
- Keep `RELAY_HUB` and its SQLite migration explicitly source-controlled.
  Encrypted Secret bindings are retained by Cloudflare separately.
- Add source-level CI regression tests that require `keep_vars = true` and
  the absence of a tracked `[vars]` list. The tests must not query or
  modify hosted Cloudflare resources.
- Before the first deployment using this setting, an operator confirms the
  deployment target, connected Git branch and actual presence of the three
  runtime binding names in Cloudflare Dashboard. After deployment, verify
  those binding *names* remain and the authorized client reconnects.
- Do not automatically restore a missing secret or perform unattended
  deployments. Do not log secret contents or allowed repository names.

## Limits and rollback

`keep_vars` deliberately leaves ownership of Dashboard variables with the
operator; obsolete Dashboard variables are **not** removed by a source
revision. An operator must explicitly revoke them when appropriate. This
setting does not protect against a manual dashboard deletion, a different
deployment target, an old deployed revision without this setting or an
external deployment job.

The GitHub repository's CI remains source-only. A push may itself trigger a
Cloudflare Git-connected build on an operator-selected production branch.
Therefore the code change must not be published to that branch without the
operator explicitly authorizing the resulting deployment.

Relevant Cloudflare references:
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/configuration/secrets/
