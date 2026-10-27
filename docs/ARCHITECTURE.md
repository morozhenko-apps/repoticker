# RepoTicker architecture

RepoTicker combines local Git inspection, an optional GitHub read-only monitoring provider and a compact native desktop presentation.

The local Git provider operates on explicitly enrolled paths, performs bounded inspection and serializes mutations against the current state. A fetch is not a pull. A safe sync must remain conditional and must never force or hide a conflict.

The GitHub provider separates authorization, resource discovery, workflows, jobs and usage information. Unavailable permissions and rate limits are shown as unknown rather than guessed. Native secrets remain outside local configuration and web presentation.

A single logical operation should have one owner, stable progress reporting and a bounded lifetime. Never duplicate background polling merely because two presentation views need the same data.

Any relay or other network-facing extension must be explicitly opt-in and establish its own security and access boundaries. The ordinary local application does not require a proprietary remote service.

Linux and Windows use one logical product identity. Native user interface and installation behavior need platform-specific testing; a successful source compile does not establish end-user installation quality.
