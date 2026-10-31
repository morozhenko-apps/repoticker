# RepoTicker release requirements

Release artifacts are versioned and immutable. Linux APT is signed; Windows installers are treated according to their actual signing state, not as automatically trusted just because a build passed.

Release publication requires a reviewed source revision, the appropriate protected signing environment, platform package verification and explicit release authorization. Do not advance protected release branches, create version tags or write public artifacts merely to obtain a passing status.

The release publisher must verify the byte length and SHA-256 of public downloads before a release is considered complete. Temporary CI bundles are not permanent mirrors and may be removed only after verified external publication. A source test or upload acknowledgement alone does not prove download availability.

Signing credentials, account details, personal key backups, bucket names and operational recovery commands are managed privately. This public document intentionally contains no credential inventory or signing-custody details. The release workflow and signing scripts define executable implementation checks.
