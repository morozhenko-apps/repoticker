# RepoTicker security

RepoTicker is a local-first Git utility with optional GitHub read-only monitoring. Security reports should use [GitHub private vulnerability reporting](https://github.com/morozhenko-apps/repoticker/security/advisories/new) when available, or a private contact method. Do not publish exploits, credentials or sensitive logs in public Issues.

## Git safety

The app inspects repositories under explicitly enrolled folders. Fetch must not modify checked-out files. Safe synchronization refuses uncertain states: local changes, missing upstream, diverged history, unfinished Git operations and unsafe remote conditions. It does not silently stash, rebase, reset, force-push or override hooks. Users remain responsible for their own backups and Git permissions.

## Credentials and provider data

GitHub OAuth access and refresh tokens are handled by the native layer and stored with the operating system's credential service. They are not copied to WebView, saved as plaintext preferences, embedded in URLs or exposed in diagnostic messages.

GitHub API input/output is restricted to approved endpoints and bounded data. Permission errors, rate limits and incomplete inventories must not become an authoritative clean status or zero usage. RepoTicker does not require a developer-run login or repository hosting service.

## Local state and external services

Repository paths and status information are processed locally. Remote requests go to Git endpoints configured by the user or to GitHub when connected. The website, downloads and support pages have a separate privacy notice.

When filing a report, remove local paths, usernames, private repository identifiers, tokens, workflow contents and other personal data from logs or screenshots. For user-facing details, see the [Privacy Policy](https://morozhenko.com/repoticker/privacy-policy).
