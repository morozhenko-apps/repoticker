# RepoTicker documentation

RepoTicker is a free, local-first Git and GitHub activity companion for Linux and Windows.

- [Product](PRODUCT.md): user-visible workflows and what the app does.
- [Architecture](ARCHITECTURE.md): key components and data boundaries.
- [Security](SECURITY.md): credential handling, safe Git operations and reporting.
- [Verification](CI.md): tests, build validation and acceptance.
- [Release](RELEASE.md): published packages and verification.
- [Direction](ROADMAP.md): general product direction.

For installing and using the app, start with the [repository README](../README.md). For active defects or feature requests, use [GitHub Issues](https://github.com/morozhenko-apps/repoticker/issues). Historical test runs and development decisions belong in Git history and GitHub Actions, not in the public documentation tree.

## Public documentation boundary

Current documentation contains durable user instructions, security and
architecture contracts, CI requirements, release details and product direction.
Historic QA matrices, release-candidate receipts, incident investigations,
temporary rollout notes, exact internal runner information and intermediate
agent handoffs are not current product documentation. Retain those in Git
history and GitHub Actions rather than the published documentation tree.

Never commit live credentials, signing material, private repository identities,
personal paths, local user names or provider account identifiers. Avoid raw
network/provider errors and sensitive values in application diagnostic output.
Tests and native operator-acceptance evidence remain mandatory even if detailed
historical reports are no longer present in the current tree. Public security
reporting follows [the security guidance](SECURITY.md).

This policy is about the **current tree**, not Git history erasure. Removing a
tracked document does not unpublish its older commits. Any discovered live
credential must be revoked or rotated through its owner; do not treat an
ordinary documentation cleanup as secret remediation.
