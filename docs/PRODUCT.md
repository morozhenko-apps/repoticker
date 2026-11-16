# RepoTicker product

RepoTicker lives in the desktop system tray. It provides a compact overview of local Git repositories and optional GitHub activity.

## Local Git

Users explicitly enroll local folders. RepoTicker shows repository, branch, upstream, local-change and ahead/behind status. In the per-repository status cell, nonzero local ahead/behind counts take precedence over the last verified CI outcome; the conservative global Safe Sync counter still counts only eligible operations. Fetch updates remote-tracking references without editing the working tree. Safe synchronization checks Git state and declines operations that would need a merge, rebase, stash, force push or conflict resolution.

The repository list can be expanded and searched. Manual Git actions show progress and an outcome for each repository. The app does not silently schedule unattended repository changes.

## GitHub monitoring

An optional GitHub Device Flow connection can show authorized workflow jobs, self-hosted runners, account/repository scopes and usage summaries. Incomplete provider data remains unavailable or unknown rather than a fabricated zero. Users can select native notifications for newly observed successful runs, failed runs, both or neither (off by default); the first successful monitor snapshot establishes a silent baseline, including after a provider outage.

GitHub access requires account permission and a network connection. Settings shows the authorized monitoring account and a Disconnect action on one row. A complete inventory containing one eligible account needs no redundant account picker or reconfirmation; multiple accounts require an explicit selection before changing the monitoring scope. An already authorized and unchanged connection must not need OK. RepoTicker does not host CI jobs or change GitHub repository permissions.

Settings maintains a persistent footer outside the scrollable form so
the confirmation and cancellation controls remain visible when sections
expand or the available window height is restricted. A switch to Simple
polling is committed only after the Worker origin and its Keyring
credential are verifiably cleared; Cancel does not modify them.

## Platforms and preferences

The undecorated Settings and About windows must remain visually separable
from similarly colored backgrounds in light, dark, and high-contrast themes.
Both use one shared theme-aware, one-pixel inside-viewport perimeter, without
resizing the windows, adding an OS titlebar, changing scroll geometry or
intercepting pointer events. Titlebar dragging, Close and keyboard behavior
remain unchanged.

Linux DEB/AppImage and Windows NSIS are supported distribution formats. The Windows installer is unsigned. Preferences are stored locally; GitHub credentials remain in the operating system's credential service. The product is free and open source under Apache 2.0.
