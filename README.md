# RepoTicker

**Lightweight, open-source Git and CI companion for the system tray.**

RepoTicker is a planned cross-platform desktop utility for keeping local Git
repositories and GitHub Actions in sight, without a full dashboard.

**Status:** early scaffold. No real Git synchronization, GitHub monitoring,
webhook delivery, or desktop release is implemented yet.

## Product contract

- Compact tray card and context menu, inspired by the interaction model of
  rQuickShare, with short repository rows and summary metrics at the bottom.
- Local repository discovery, safe fetch and fast-forward-only pull.
- GitHub Actions run/job states and self-hosted runner occupancy.
- Open the relevant GitHub page in a browser for logs and details.
- Two delivery modes: **Simple Polling** and **Hybrid** (self-hosted webhook
  relay plus reconciliation polling).
- Cloudflare Worker and generic self-hosted relay are optional, user-operated
  infrastructure. No hosted RepoTicker account or paid features.
- Native integration on Linux, Windows and macOS is the product goal. Actual
  platform support must be verified independently.

See [product scope](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md),
[roadmap](docs/ROADMAP.md), [CI](docs/CI.md), and [relay](docs/RELAY.md)
for the development baseline.

## Development

Planned Rust core and Tauri 2 desktop shell. Check CI for verified capabilities;
do not treat an accepted build as evidence that Git synchronization or real
GitHub monitoring works.

```sh
cargo fmt --all --check
cargo test -p repoticker-core
cargo clippy -p repoticker-core --all-targets -- -D warnings
```

The desktop shell uses a dependency-free HTML/CSS/JavaScript card prototype.
No remote credentials, API tokens or webhook secrets belong in source control.

## License

MIT. See [LICENSE](LICENSE).
