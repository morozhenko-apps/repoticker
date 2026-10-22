# RepoTicker v0.2.0 — release notes draft (NOT PUBLISHED)

> Prepared from `dev` on 2026-10-21. **Draft only**. This is not the
> content of an existing GitHub release or installer, and publication
> is blocked on [release readiness](RELEASE_0_2_0.md).

## New in v0.2.0

### GitHub Actions in the desktop tray
Connect an account via GitHub App Device Flow and securely retain credentials
in the operating system credential store. The compact RepoTicker card now
shows organization self-hosted runner counts and Actions running/queued job
totals across monitored repositories.

Hover over **Runners** to see `Runners · Total`, Online, Busy, Idle, Offline
and last checked time. Hover over **Tasks** to see running jobs assigned to
each monitored self-hosted runner, a GitHub-hosted jobs summary, queued job
totals in the heading and last checked time. Hover over **ⓘ** for separate
organization and personal account billing usage reports where permitted.

The monitor refresh interval adapts to repository count (typically 2–7
minutes). Billing reports are cached for 10 minutes. Denied, incomplete
or unavailable data are not misrepresented as zero.

### Safer GitHub connection controls
Authorize through the official browser Device Flow, verify the public
one-time code and confirm the account in Settings. OK confirms the
connection and refreshes the visible monitor; Cancel invalidates pending
Device Flow or revokes only a new unconfirmed connection. Selecting a
different Monitor account becomes effective upon confirmation.

The app never distributes a GitHub App secret or exposes OAuth access
and refresh tokens to WebView JavaScript. Billing is optional, read-only,
and does not authorize modifying GitHub workflows.

### KDE Wayland improvements
A native relative-pointer implementation gives stable dragging of the
anchored tray card, and a separate non-focusable, pointer-pass-through
GTK Layer Shell surface renders hover panels without resizing the
390×122 compact card. The developer's KDE physical workflow is accepted.

## Preserved behavior

Local Git functionality remains manual: Fetch updates remote-tracking refs;
Safe pull is permitted only for clean, behind, upstream-tracking branches
and uses `git merge --ff-only` against previously fetched refs.
There is no unattended background Git mutation and no required cloud service.

## Known limitations and release gates

- **GitHub hosted free balance** is not inferred from gross billing-SKU
  consumption; a remaining-free-minutes value may be unknown.
- **Offline/limited GitHub APIs:** missing permissions or incomplete
  result pagination can leave some counters unknown. Live 401/403/429,
  refresh/revocation and failure-path acceptance remain open in issue #4.
- **Linux upgrade:** local DEB upgrade from installed v0.1.0 to
  v0.2.0 succeeded on KDE; signed-repository APT upgrade remains
  untested until publication. Restart/credential persistence and
  uninstall lifecycle are separately pending.
- **Windows:** a buildable unsigned NSIS installer exists, but real
  Windows installation/tray/auth acceptance is not yet evidenced.
- **macOS:** not shipped.
- **Billing:** organization/personal reports are monthly and do not
  prove free allowance usage or remaining included minutes.

### Deferred to v0.3.0

On KDE Wayland, the new GitHub monitor may initially show `Not connected`
despite existing credentials, then populate local repositories and finally
runner/task counts in separate delayed phases. This has been reported by
the owner and deferred to
[startup issue #12](https://github.com/morozhenko-apps/repoticker/issues/12).
No cause or exact latency has yet been measured. It is a known
first-load presentation/performance issue, not a claim that credentials
were lost. The 0.2.0 GTK height/cursor/Worker UI fixes passed source CI;
their updated physical GTK warning log and exact card geometry must be
verified separately before release admission.

## Availability

Not yet available to download as `v0.2.0`. The latest published
release remains `v0.1.0`; do not link a future tag, announce a date
or advertise upgrade instructions until the protected release gate
and physical checks succeed.
