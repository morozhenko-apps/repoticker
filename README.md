# RepoTicker

An open-source, local-first Git and GitHub CI companion for the system tray.
Tauri 2 + Rust; no proprietary account or mandatory central service.
Apache-2.0: [LICENSE](LICENSE), [NOTICE](NOTICE), [contributions](CONTRIBUTING.md).

## Published baseline and active development

[v0.2.0](https://github.com/morozhenko-apps/repoticker/releases/tag/v0.2.0) was
published on 2026-10-22 from `c16c435078133929c7bf640b7c25eb52074d0f1c`.
See its [delivery evidence](docs/RELEASE_0_2_0.md) and
[retained release notes](docs/RELEASE_NOTES_0_2_0.md). The original v0.1 release,
tags and signed assets remain immutable.

`dev` contains overlapping v0.3/v0.4/v0.5 work beyond the published binary.
These are work buckets, not automatic releases. Start at the
[current handoff](docs/ROADMAP.md#current-development-handoff-2026-10-24);
[version allocations](docs/VERSION_ROADMAP_TO_1_0.md) retain final L10N-20,
v0.9 Mode B and public-v1 acceptance requirements.

## Implemented source and its limits

- Compact tray card, separate Settings/About, enrolled roots and bounded shallow
  Git discovery; branch/upstream/ahead/behind/dirty inspection and operation progress.
- Explicit Fetch, plus **unreleased dev Safe sync**: clean strictly-behind branches
  use offline fast-forward-only pull; clean strictly-ahead branches use conservative
  pinned ordinary non-force push. Dirty/diverged/detached/unfinished/no-upstream
  states are skipped. Remote/path/race limits stay in the [Git contract](docs/GIT_PROVIDER.md).
  No automatic stash/rebase/reset, upstream creation or background sync.
- GitHub App Device Flow, native OS keyring, bounded read-only runner/Actions
  monitoring, separate hover views and opt-in billing summaries. Unknown/partial
  coverage stays unknown; reports do not establish actual free allowance.
- Dev adds opt-in native CI failure alerts (OFF by default) and initial EN/RU
  card, Settings, About and GitHub tooltip presentation. Provider-owned names
  remain unchanged. Test-alert acceptance does not prove real failure delivery;
  full 20-language translation/context audit is still unfinished.
- Autostart, unattended sync and webhook relay retain their separate decision/
  conditional gates. See [v0.5](docs/DEVELOPMENT_0_5_0.md) and [relay](docs/RELAY.md).

## Platform and release evidence

KDE/Linux has scoped owner observations and signed-APT publication evidence.
Each dated receipt retains its geometry, lifecycle, wallet and native limitations;
new dev UI or pipeline success does not imply physical acceptance. Windows NSIS
packaging is distinct from real installer/runtime acceptance; macOS is not shipped.
APT candidate visibility is distinct from an observed upgrade/uninstall transaction.
[Release/signing policy](docs/RELEASE.md) and [CI](docs/CI.md) own exact gates.

## Build and test

Use Rust, Node.js 24, Git and platform Tauri 2 dependencies. Ubuntu desktop
compilation requires WebKit/GTK and `libgtk-layer-shell-dev`; release-contract
fixtures require APT/GPG tools. Keep the committed Cargo.lock intact.

~~~sh
cargo fmt --all --check
cargo test --locked -p repoticker-core
cargo clippy --locked -p repoticker-core --all-targets -- -D warnings
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_release_*.py' -v
cargo check --locked -p repoticker-desktop
~~~

To launch the source build explicitly: `cargo run -p repoticker-desktop`.
This is separate from testing; housekeeping does not install packages, open a
wallet, enroll or synchronize user repositories, or register autostart.
[Testing strategy](docs/TEST_STRATEGY.md) separates stable source checks,
known-flaky evidence, physical platform acceptance and full Mode B.

## Documentation

- [Document catalog](docs/README.md): every retained guide, release and test map.
- [Current handoff/history](docs/ROADMAP.md), [version roadmap](docs/VERSION_ROADMAP_TO_1_0.md).
- [v0.3](docs/DEVELOPMENT_0_3_0.md), [v0.4](docs/DEVELOPMENT_0_4_0.md), [v0.5](docs/DEVELOPMENT_0_5_0.md) work-bucket evidence.
- [Product](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md).
- [GitHub App](docs/GITHUB_APP.md), [hover/billing](docs/SPLIT_HOVER_BILLING.md), [native monitor acceptance](docs/MONITOR_BALLOON_ACCEPTANCE.md).

Bug reports: [GitHub Issues](https://github.com/morozhenko-apps/repoticker/issues).
See CONTRIBUTING for private security reporting and upstream contribution policy.

## Historical root links

The [complete previous README](docs/ROADMAP.md#imported-root-readme-before-october-24-housekeeping)
remains in chronological history. Compatibility anchors preserve old bookmarks:

<a id="implemented-in-v010-source"></a>

- [Implemented in v0.1.0 source](docs/ROADMAP.md#implemented-in-v010-source)
