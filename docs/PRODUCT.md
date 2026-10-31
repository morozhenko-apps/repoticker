# RepoTicker product contract

RepoTicker is a local-first tray companion for developers working with multiple Git repositories and GitHub projects.

## Compact view and repository list

The compact card displays actionable Git and workflow information without duplicating the application name. A searchable repository drawer expands upwards while keeping the card anchored. Each row identifies a repository and its current status, with progress shown without replacing the repository name with transient success messages.

## Local Git behavior

Only user-enrolled roots are scanned. RepoTicker reports branch, upstream, tracked and untracked modifications, ahead/behind counts and unfinished operations from Git's actual state. Fetch updates remote-tracking metadata; it doesn't modify checked-out files.

Conservative sync is permitted only where the state is understood and an operation can be completed without discarding work. Never force-push, stash, rebase, reset, create an upstream or resolve a conflict automatically. Dirty, divergent, detached, incomplete and unconfigured repositories must remain visible and require user action.

## GitHub monitoring

Where the user has authorized GitHub access, RepoTicker can present workflows, jobs and runner occupancy. Unknown or unavailable information is never fabricated as success or zero use. Notifications must be deduplicated and should not overwhelm the user with repeated status messages.

The app must not turn GitHub read access into repository-write authorization implicitly. Credential handling belongs to the OS credential store, not local logs or the WebView.

## Desktop behavior

Tray activation, card positioning, hiding/reopening, search, keyboard navigation, status announcements and window focus follow the host operating system. Settings must apply changes transactionally. Notifications are optional and user-controlled.

The current implementation and test suite are authoritative for fine-grained Git state transitions; this document does not enumerate dated test runs or internal machine observations.
