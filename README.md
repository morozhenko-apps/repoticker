# RepoTicker

RepoTicker is a free, open-source desktop companion for keeping track of local Git repositories and GitHub activity. It lives in the system tray so you can check your work without opening a separate terminal or browser tab for every repository.

## Why I built it

I maintain multiple apps and experiments, often at the same time. Keeping every checkout up to date, remembering which repository has local changes and checking whether jobs are still running can turn into a surprisingly repetitive chore.

I wanted a single compact place to answer those questions. RepoTicker helps me see which repositories need attention, fetch updates when I ask it to and keep an eye on GitHub workflows, without turning ordinary Git work into an automated process I can't control.

## What it does

The tray card shows an overview of repository activity, with a searchable list you can expand when you need details. Add your local repository folders to see their branch, upstream relationship, local changes and synchronization status. The card stays small when you don't need the list, and progress is visible while an operation runs.

You can fetch changes across your repositories and use conservative sync actions for eligible clean branches. RepoTicker respects Git's state: it doesn't silently discard changes, force-push, stash, rebase or resolve conflicts behind your back. Repositories that need a decision are left for you to handle.

RepoTicker can also connect to GitHub to show workflow jobs, runner activity and relevant failures from one place. Notifications and optional views help you notice something worth checking without keeping the GitHub Actions page open.

Repository data stays on your computer, and account credentials are handled through the operating system's credential service. The app doesn't require its own hosted account.

## Platforms

RepoTicker is a desktop application for Linux and Windows.

## Feedback

If something doesn't work as expected, please [report a bug](https://github.com/morozhenko-apps/repoticker/issues) with your operating system, the behavior you saw and steps to reproduce it. Ideas that would make RepoTicker more useful are also welcome in Issues. Please remove personal paths, repository names, access tokens and private workflow details from shared logs.

The project is independently maintained. I welcome reports and suggestions, but don't accept outside pull requests or patches. Forks are permitted under the [Apache License 2.0](LICENSE); see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.
