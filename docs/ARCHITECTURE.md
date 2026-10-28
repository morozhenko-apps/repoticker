# RepoTicker architecture

RepoTicker combines local Git inspection, an optional GitHub read-only monitoring provider and a compact native desktop presentation.

The local Git provider operates on explicitly enrolled paths, performs bounded inspection and serializes mutations against the current state. A fetch is not a pull. A safe sync must remain conditional and must never force or hide a conflict.

The GitHub provider separates authorization, resource discovery, workflows, jobs and usage information. Unavailable permissions and rate limits are shown as unknown rather than guessed. Native secrets remain outside local configuration and web presentation.

A single logical operation should have one owner, stable progress reporting and a bounded lifetime. Never duplicate background polling merely because two presentation views need the same data.

Any relay or other network-facing extension must be explicitly opt-in and establish its own security and access boundaries. The ordinary local application does not require a proprietary remote service.

Linux and Windows use one logical product identity. Native user interface and installation behavior need platform-specific testing; a successful source compile does not establish end-user installation quality.

## Tray card presentation contracts

The borderless main card provides dragging only from noninteractive surfaces, with primary-button pointer input. Repository rows, the action buttons, and Runners/Tasks/Billing hover targets remain interactive and must not initiate dragging.

The three status indicators share one separate, read-only, pointer-through native usage window. On Windows the popup must appear ahead of the always-on-top card without stealing focus; use operating-system window ordering rather than relying on the browser's unstyled `title` tooltips. Failed show or positioning operations must be observable without exposing account, repository or credential details. Only opt-in diagnostic logs may include nonsecret window geometry.

The card's WebView must not show the browser's built-in context menu on right click. The explicit per-repository ellipsis menu and native tray context menu are separate features and must remain available.

When no repositories are enrolled, center the empty-state message horizontally without adding height or changing the drawer's bottom anchoring. Native Windows and KDE hover, z-order, layout and uninstall behavior require actual platform acceptance; source tests cannot establish visual correctness.
