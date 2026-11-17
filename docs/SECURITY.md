# RepoTicker security

RepoTicker is a local-first Git utility with optional GitHub read-only monitoring. Security reports should use [GitHub private vulnerability reporting](https://github.com/morozhenko-apps/repoticker/security/advisories/new) when available, or a private contact method. Do not publish exploits, credentials or sensitive logs in public Issues.

## Git safety

The app inspects repositories under explicitly enrolled folders. Fetch must not modify checked-out files. Safe synchronization refuses uncertain states: local changes, missing upstream, diverged history, unfinished Git operations and unsafe remote conditions. It does not silently stash, rebase, reset, force-push or override hooks. Users remain responsible for their own backups and Git permissions.

## Credentials and provider data

GitHub OAuth access and refresh tokens are handled by the native layer and stored with the operating system's credential service. They are not copied to WebView, saved as plaintext preferences, embedded in URLs or exposed in diagnostic messages.

The optional operator-owned Hybrid relay has its own OS credential entry,
separate from GitHub authorization. A new relay secret
briefly resides in the trusted Settings WebView and crosses an allowlisted
Settings-only IPC call on explicit OK. This weakens the previous native-only
boundary; JavaScript memory cannot be reliably zeroized. Neither the
candidate nor the real stored secret may be revealed, logged, sent to a
URL or persisted in browser storage. The saved credential remains OS-only. Changes are held in a zeroizing
native-memory Settings draft and committed to the OS credential store only
after explicit Settings OK; Cancel and window close discard uncommitted values.
The secret is never stored in `config.json`, events, URLs or logs. The OS
credential store and regular configuration are separate persistence systems:
failed writes must not be presented as a successful Hybrid activation, and
REST fallback remains available. Explicit OK with Simple polling selected
removes the saved Worker origin and the separate relay Keyring credential;
Cancel does not. Since the config store and Keyring are independent,
failure to delete the credential after switching to polling must keep
Settings open for an explicit retry, never report successful cleanup and
never reconnect the relay. GitHub OAuth credentials are not affected.
Native Linux/Windows acceptance and real
webhook recovery must be verified before enabling Hybrid in a release.

GitHub API input/output is restricted to approved endpoints and bounded data. Permission errors, rate limits and incomplete inventories must not become an authoritative clean status or zero usage. RepoTicker does not require a developer-run login or repository hosting service.

## Local state and external services

Repository paths and status information are processed locally. Remote requests go to Git endpoints configured by the user or to GitHub when connected. The website, downloads and support pages have a separate privacy notice.

When filing a report, remove local paths, usernames, private repository identifiers, tokens, workflow contents and other personal data from logs or screenshots. For user-facing details, see the [Privacy Policy](https://morozhenko.com/repoticker/privacy-policy).

## Native diagnostics policy

Normal operation should not emit verbose hover, geometry or startup timing
traces. UI diagnostics are enabled only by an explicit
`REPOTICKER_UI_DEBUG=1` value; merely defining the variable (including
`0`) must not enable them. The separate startup and relay diagnostic flags
remain opt-in.

Native warnings may report a finite operation/stage identifier so a failed
action remains diagnosable, but must not interpolate arbitrary OS, Git,
network, provider or filesystem error strings into stderr. Redaction must not
change the action's return value, cancellation behavior, user-visible error
state or safe fallback path.

For implementation admission, check all native warning call sites for
variable error interpolation and guard unintended debug branches.
Use focused contract tests for these invariants and one applicable final
stable/CI gate after the complete change. Do not weaken existing relay
phase/error diagnostic contracts.
