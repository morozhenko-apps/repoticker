# RepoTicker

RepoTicker is a free, open-source system-tray app for Linux and Windows. It keeps local Git status and GitHub activity in one compact place, without taking control of your repositories.

## Why I built it

I work on several projects at once. Checking which branch is behind, which checkout has local changes and whether GitHub Actions is still running gets repetitive. I wanted a small view I could open when needed, instead of keeping several terminals and browser tabs around.

RepoTicker does that job. Git operations still happen when I ask for them, not because an app decided to synchronize everything in the background.

## What it does

You can enroll your local Git folders, inspect each repository's branch, upstream, uncommitted changes and ahead/behind state, and search the list from the tray. Fetch updates remote references without touching checked-out files.

Safe Pull only fast-forwards eligible clean branches. Other synchronization actions respect Git's existing protections: no silent stash, rebase, force-push or conflict resolution. A repository with local changes, a diverged history or a missing upstream stays under your control.

An optional GitHub connection adds Actions workflow and job status, self-hosted runner activity, selected repository monitoring and opt-in failure notifications. You can inspect the activity without leaving the tray. GitHub Device Flow uses the operating system's credential store; RepoTicker does not need a separate developer account.

## Downloads

RepoTicker supports Linux (DEB and AppImage) and Windows (NSIS installer). The Windows installer is not code-signed. Check the published SHA-256 hashes before installing.

The [product page](https://morozhenko.com/en/repoticker/) has installation options. The [latest GitHub Release](https://github.com/morozhenko-apps/repoticker/releases/latest) contains release notes, while the [release manifest](https://download.morozhenko.com/dist/RepoTicker/latest.json) lists the published distribution files and hashes.

## Privacy and control

Local repository status and preferences remain on your computer. Git requests go to the remotes you configured; connected GitHub monitoring uses the permissions granted to your GitHub account. The application does not upload your repository contents to a developer-operated server. Opening the website or download links is separate browser activity.

See the [Privacy Policy](https://morozhenko.com/repoticker/privacy-policy) and [Terms of Use](https://morozhenko.com/repoticker/terms-of-use) for the data and service boundaries.

## Feedback

If something behaves unexpectedly, open a [GitHub issue](https://github.com/morozhenko-apps/repoticker/issues) with the OS, expected behavior and steps to reproduce it. Please remove credentials, private repository names, local paths and workflow details from screenshots and logs.

This is an independently maintained project. Bug reports and suggestions are welcome, but external pull requests and patches are not accepted. You can fork the project under its open-source license; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache License 2.0](LICENSE). Attribution is listed in [NOTICE](NOTICE).
