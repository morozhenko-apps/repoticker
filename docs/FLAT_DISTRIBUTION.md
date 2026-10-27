# Flat R2 distribution

## Approved contract (2026-10-27)

Mode A. The owner approved replacing the download Worker, nested APT/release
layout and full remote snapshots with CFVigil's flat public distribution.
The owner confirmed there are no existing users, so no transitional release
or legacy APT compatibility layer is required. Preserve already published
objects, Git tags, signing identities, application versions and native behavior.

The existing `app-dist` R2 Custom Domain serves `dist/RepoTicker/` directly.
Only platform directories are used: versioned Linux packages and checksums,
`Packages`, `Packages.gz`, signed `InRelease` and the public archive keyring
share `linux/`; genuine Windows installers use `windows/`. Root `latest.json`
points to immutable platform URLs. Do not advertise unsupported platforms.
The signed flat APT source uses the `linux/` URI and distribution `./`.
Its `Filename: ./PACKAGE.deb` references the exact same object as direct HTTPS.
No `pool/`, `dists/`, `releases/v...`, `by-hash/`, remote `snapshots/`,
`latest` binary copies, GitHub Release binary attachments or download Worker.
Local isolated staging directories are temporary verification inputs.

## Publication invariants and rationale

Validate package identities, exact file inventory, checksums, archive key and
signed index before writes. Upload immutable files once, verify private and
public body size/SHA256, then update both flat indexes, signed InRelease,
and finally schema-checked latest.json. Errors never authorize cleanup or a
success receipt. Existing serialization and tag/mainline/environment approval
gates remain. Signed-by and signature/hash verification are never weakened.
Flat indexes omit by-hash: a concurrent APT reader may fail a hash check during
a metadata switch and safely retry; no incorrect package is accepted.
R2 credentials are separate repository secrets deliberately scoped to the
shared app-dist bucket; directory names are not an IAM boundary. Never upload
private keys, debug data or private build artifacts into this public bucket.
Keep existing nonbrowser APT/curl security exceptions; no new WAF/rate policy.
CORS for a browser website and actual live route retirement are operational
cutover gates, not properties proven by source tests.

## Plan and recoverable milestones

1. [x] Analyze guides, source, branch ownership, current CFVigil reference,
   publication contracts and credential names. Use an isolated short-lived
   branch because dev is concurrently active. No shared working tree edits.
2. [x] Record owner decisions, risks, validation and rollback before code.
3. [ ] Implement flat signed APT generation/verification and R2 publication;
   preserve native package validation, explicit dependencies and trust checks.
4. [ ] Adapt tagged CI, refresh/enrollment and text-only release metadata;
   remove retired Worker sources/workflows and obsolete snapshot-only logic.
5. [ ] Adapt existing tests to the approved format and add meaningful
   ordering, direct/APT byte identity, tamper, conflict and public-readback
   regressions. Run normal suites only at the final validation gate.
6. [ ] Final stable release-contract suites and workflow/static checks once;
   record commands, outcomes, known-flaky separation and external limitations.
   Publish through a reviewed dev-targeted PR after refreshing concurrent dev.

Validation covers positive flat APT acquisition with an ephemeral test signer;
wrong-key/signature/index/package rejection; exact filenames and limits;
immutable conflicts/idempotency; failed public readback preventing promotion;
manifest ordering and source/tag admission. Mock only external R2/HTTP adapters.
No normal native GUI/device suites are required for unchanged native code;
mandatory repository CI remains gating. No production signing, version bump,
release tag, mainline promotion, credential mutation or R2 upload is performed
to test the refactor.

## Risks, cutover and rollback

Main risks: stale Worker routes blocking new URLs, wrong shared-bucket token,
index/manifest publication order, or incomplete GitHub artifact cleanup.
After source acceptance, retire only each product's exact Worker route and
Git-connected deployment before the first flat publication; preserve sibling
routes, DNS, bucket contents and signing keys. A repository-only deletion does
not disable a deployed Worker. Require explicit release authorization and
actual public byte checks before declaring operational completion.
Rollback source through the separate atomic documentation and executable
commits; restore only the product route if an operational cutover is later
rolled back. Never delete another product's R2 objects or rewrite published tags.
