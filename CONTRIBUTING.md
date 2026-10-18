# Contributing

RepoTicker welcomes bug reports and focused contributions. Please open an issue before major changes.

- Keep the application small, local-first and transparent about unavailable data.
- Do not add mandatory SaaS services or feature paywalls.
- Keep platform adapters isolated, with independent Linux/Windows/macOS checks.
- Add regression tests for changes to Git safety, credentials or relay trust boundaries.
- Run `cargo fmt --all --check`, `cargo test -p repoticker-core`, `cargo clippy -p repoticker-core --all-targets -- -D warnings` and `node --test tests/*.test.mjs` before proposing a PR.
- Target `dev` with small PRs; main is the reviewed stable snapshot.
- Never commit tokens, secrets, local credentials or privately retrieved repository contents.

Please do not claim platform compatibility without actual installed acceptance evidence.
