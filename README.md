# RepoTicker

**An open-source local Git companion for the system tray, with GitHub CI monitoring on the roadmap.**

RepoTicker is a lightweight Tauri 2 + Rust desktop app for developers managing multiple Git checkouts. It is local-first: no proprietary account or central service is required for the features available today.

## Implemented in v0.1.0 source

- Compact tray card with Fetch, Safe pull, Repos and Hide; independent Settings and About windows. On Linux the tray uses StatusNotifierItem (SNI), and KDE Wayland uses GTK Layer Shell for the anchored popup.
- Explicit enrollment of local directories, shallow discovery of their direct-child Git repositories, and per-repository inspection of branch, upstream, ahead/behind and dirty state.
- Manual Fetch of enrolled repositories, with up to four independent fetches in parallel, failure isolation and progress events. Fetch updates remote-tracking refs, not checked-out files.
- Manual Safe pull, operating **only on previously fetched refs**. Eligible clean upstream-tracking branches are advanced using Git fast-forward only; dirty, detached, ahead/diverged, unfinished or no-upstream branches are skipped. No automatic stash, rebase, reset or force operation.
- Persistent local settings, including enrolled roots, selected language preference and Linux popup anchor. Choosing a language does not yet translate the full interface.
- Desktop icon assets, package configurations and signed-APT release automation.

GitHub Actions runs/jobs, self-hosted runner occupancy, quota/billing data, authenticated polling, notifications and webhook relays **are not connected**. Their UI indicators remain unavailable rather than showing invented values. Automatic background fetch/pull is not implemented.

## Platform and release evidence

- **Linux:** local Ubuntu KDE Wayland DEB install/uninstall and AppImage startup were exercised during v0.1.0 acceptance. The popup still jitters when dragged; tracked in [Issue #2](https://github.com/morozhenko-apps/repoticker/issues/2). Other Linux desktop environments are not yet accepted.
- **Windows:** the Windows x64 NSIS installer was built and published by the tagged release workflow. Physical installation, tray and runtime acceptance on Windows are not yet verified.
- **macOS:** not currently shipped; notarization and signing prerequisites are outstanding.
- **Publishing:** the tagged `v0.1.0` pipeline completed successfully, uploaded signed APT metadata and release assets to R2, verified public readback and created a public GitHub Release. Independent end-user APT install/upgrade testing is still pending. See [release instructions](docs/RELEASE.md).

The first **published** release is [`v0.1.0`](https://github.com/morozhenko-apps/repoticker/releases/tag/v0.1.0), from immutable source commit `21f3b61d9774b931b57a4e3c83f61b2bcf2bb0ee`. [Tagged workflow #39319748009](https://github.com/morozhenko-apps/repoticker/actions/runs/39319748009) completed successfully on attempt 3 (2026-10-19).

## Build and test

Install Rust, Node.js 24, Git and the Tauri 2 native dependencies for your OS. On Ubuntu Linux the Tauri/WebKit development packages and `libgtk-layer-shell-dev` are required.

~~~sh
cargo fmt --all --check
cargo test -p repoticker-core
cargo clippy -p repoticker-core --all-targets -- -D warnings
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_release_*.py' -v
cargo check -p repoticker-desktop
cargo run -p repoticker-desktop
~~~

The signed-APT integration test requires `apt-utils`, `dpkg-dev`, `gnupg` and `gpgv`. CI installs those tools. `cargo run` does not install an OS package or register autostart.

On KDE, left-click the SNI tray icon to toggle the card; right-click for Open, Settings, Fetch all, Safe pull all, About or Quit. Enroll a directory such as `~/Documents/GitHub` in Settings and run Fetch before Safe pull.

## Documentation

- [Approved v0.1.0–v1.0.0 roadmap](docs/VERSION_ROADMAP_TO_1_0.md), including mandatory Mode B testing/coverage and the v0.9 release-candidate gate; this is a plan, not a published v1.0 binary.

- [Product contract](docs/PRODUCT.md) and [architecture](docs/ARCHITECTURE.md)
- [Current Git behavior](docs/GIT_PROVIDER.md), [roadmap](docs/ROADMAP.md) and [test strategy](docs/TEST_STRATEGY.md)
- [CI](docs/CI.md), [releases/APT signing](docs/RELEASE.md), [security](docs/SECURITY.md) and [planned webhook relay](docs/RELAY.md)

Apache License 2.0; see [LICENSE](LICENSE), [NOTICE](NOTICE) and [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports: [GitHub Issues](https://github.com/morozhenko-apps/repoticker/issues).
