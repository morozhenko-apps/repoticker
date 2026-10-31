# RepoTicker product

RepoTicker lives in the desktop system tray. It provides a compact overview of local Git repositories and optional GitHub activity.

## Local Git

Users explicitly enroll local folders. RepoTicker shows repository, branch, upstream, local-change and ahead/behind status. Fetch updates remote-tracking references without editing the working tree. Safe synchronization checks Git state and declines operations that would need a merge, rebase, stash, force push or conflict resolution.

The repository list can be expanded and searched. Manual Git actions show progress and an outcome for each repository. The app does not silently schedule unattended repository changes.

## GitHub monitoring

An optional GitHub Device Flow connection can show authorized workflow jobs, self-hosted runners, account/repository scopes and usage summaries. Incomplete provider data remains unavailable or unknown rather than a fabricated zero. Users can opt into notifications for new eligible workflow failures.

GitHub access requires account permission and a network connection. RepoTicker does not host CI jobs or change GitHub repository permissions.

## Platforms and preferences

Linux DEB/AppImage and Windows NSIS are supported distribution formats. The Windows installer is unsigned. Preferences are stored locally; GitHub credentials remain in the operating system's credential service. The product is free and open source under Apache 2.0.
