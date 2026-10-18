# RepoTicker

**Lightweight, open-source Git and CI companion for the system tray.**

RepoTicker is a planned cross-platform desktop utility for keeping local Git repositories and GitHub Actions in sight, without a full dashboard.

**Status:** local Git Provider prototype is implemented: explicit root enrollment, shallow discovery, local status, fetch and manual safe fast-forward pull. GitHub Actions monitoring, relay delivery, automatic background sync and released packages are **not implemented**. Windows/macOS and physical KDE Wayland UI acceptance are pending.

## Scope

- Compact tray card, dense expandable repository list, totals in the bottom footer, context menu.
- Git fetch and explicit safe fast-forward-only pull after checking local state.
- GitHub Actions run/job status, self-hosted runner occupancy and optional usage information.
- Open the exact GitHub workflow run in a browser; no in-app log viewer.
- Two modes: **Simple** (polling, default) and **Hybrid** (opt-in self-hosted webhook relay + reconciliation polling).
- Linux, Windows and macOS are targets, not verified release claims. No paid features or central RepoTicker service. The Linux Tauri tray API does not report primary clicks, so the initial shell uses the **Open card** context-menu fallback until a native adapter is implemented.

## Repository layout

- `crates/repoticker-core`: dependency-free Git decision engine and native Git process adapter, with temporary bare-remote integration tests.
- `apps/desktop`: Tauri 2 shell and dependency-free web card.
- `apps/relay-cloudflare`: deployment placeholder for a user-managed Worker.
- `apps/relay-selfhost`: future generic Docker/VPS relay.
- `docs`: product and security contracts, implementation roadmap, CI, test strategy.

## Build and test

Install a recent Rust toolchain; building the Tauri shell also needs the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
cargo fmt --all --check
cargo test -p repoticker-core
cargo clippy -p repoticker-core --all-targets -- -D warnings
node --test tests/*.test.mjs
cargo run -p repoticker-desktop
```

`cargo run` is for desktop development; it does **not** install autostart, packages, webhook infrastructure, or background services. Right-click the tray icon and choose **Open card** on Linux. Open Settings (gear), enroll a directory such as `~/Documents/GitHub`, then Fetch or Safe pull via the toolbar, per-repository `…` menu, or the tray context menu. Sync is **manual only**; it will never run merely because the app starts. The card lists actual local Git state. GitHub/runner/quota values are unavailable rather than invented.

See [Git Provider behavior and limitations](docs/GIT_PROVIDER.md), [product](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [CI](docs/CI.md), [security](docs/SECURITY.md), [relay](docs/RELAY.md) and [tests](docs/TEST_STRATEGY.md).

## Contributing / license

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT, see [LICENSE](LICENSE).
