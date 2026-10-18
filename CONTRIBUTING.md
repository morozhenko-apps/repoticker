# Bug reports and forks

RepoTicker is developed and maintained by morozhenko apps.

## Report a bug

Bug reports, reproducible defects, platform compatibility findings and
security observations are welcome. Use GitHub Issues and the Bug report
template. Include operating system, application version, expected/actual
behavior and reproduction steps; sanitize paths, repository names, tokens,
access keys, usernames, and private CI logs.

Please report security vulnerabilities privately using GitHub's security
advisory reporting instead of exposing a working exploit or secret in Issues.

## Forking and code contributions

You may fork RepoTicker and independently maintain and distribute your work
subject to the repository's license. Preserve copyright/license notices as
required by that license. Do not misrepresent a fork as an official
morozhenko apps release.

The upstream maintainer currently does **not accept third-party code
contributions or feature PRs**. A GitHub pull request is not a commitment
to review, merge or support external work. Please do not open PRs expecting
code integration; use Issues for actionable bug reports instead.

## Development and release

Local tests: cargo fmt --all --check, cargo test -p repoticker-core,
cargo clippy -p repoticker-core --all-targets -- -D warnings,
node --test tests/*.test.mjs.

Do not report signed, notarized, or installer-level compatibility unless
tested on an actual target OS. Never put personal secrets in test fixtures.
