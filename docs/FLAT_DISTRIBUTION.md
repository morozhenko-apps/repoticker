# Flat R2 distribution

**Current status:** source refactor is merged into dev and live download Worker
retirement is verified. Both exact routes/Workers are absent; existing public
objects and all sibling routes are preserved. Git disconnection and the RQS
app-dist token replacement are owner-confirmed. No new application release,
version/tag change or R2 object upload was performed.

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
3. [x] Implement flat signed APT generation/verification and R2 publication;
   preserve native package validation, explicit dependencies and trust checks.
4. [x] Adapt tagged CI, refresh/enrollment and text-only release metadata;
   remove retired Worker sources/workflows and obsolete snapshot-only logic.
5. [x] Adapt existing tests to the approved format and add meaningful
   ordering, direct/APT byte identity, tamper, conflict and public-readback
   regressions. Run normal suites only at the final validation gate.
6. [x] Final stable release-contract suites and workflow/static checks once;
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

## Implementation checkpoint before final execution

Flat producer, signed-catalog validation, same-object direct/APT mapping,
public-readback ordering, final manifest and receipt-gated exact CI archive
cleanup are implemented. Retired Worker deployment sources and Worker-only
tests/workflows are removed; their historical evidence remains in Git.
No product code, version, signing key, tag, protected mainline or live provider
state changed. Python source AST and Git whitespace checks pass. Normal
stable suites have not yet run; final execution is the next milestone.

Expected validation commands:
`python3 -m unittest discover -s tests -p 'test_release_*.py' -v`,
`node --test tests/*.test.mjs`, and pinned actionlint on the release workflow.
The APT fixture uses real GPG and a synthetic Debian package; publisher tests
use external S3/HTTP fakes. Hosted Preflight remains independently required.
All expected apt-release secret/variable names exist; the existing RepoTicker
R2 publisher already targets app-dist. Actual secret scope and live publishing
are not established by this source-only refactor.

## Local final validation evidence

Final STABLE gates passed: 35 Python release contracts; 309 Node tests. No failed or skipped tests
remain in those gates. Pinned actionlint v1.7.7, workflow policy where present,
and Git whitespace checks exit 0. No separately configured known-FLAKY group
exists in these affected Python/Node suites; no claim is made about unrelated
native stress/device behavior. Native source and release acceptance gates remain.

The initial final run exposed two test adaptation defects: a foreign-package
mutation accidentally replaced the new product name with itself, and a flat
APT request assertion omitted APT's explicit `/./` segment. Diagnostic review
considered no-op mutation, missing identity validation, stale signed index,
compressed-index mismatch, and obsolete URL expectations. The observed fixture
bytes and actual HTTP request log confirmed the first and last causes.
The mutation now asserts its input actually changes; the HTTP test requires
the exact flat InRelease and DEB URLs. Existing signature/byte assertions were
retained. Only the affected Python stable gates were repeated, both passed;
already-passing Node/workflow checks were not rerun without a source change.

Real isolated APT update/candidate/download verifies the same DEB bytes and
wrong-key/tamper rejection. S3/HTTP failures, immutable conflicts, conditional
publication, malformed signed catalogs, incomplete receipts and foreign GitHub
artifact provenance are tested without production access. No secret values,
production signing, R2 mutation, route retirement or release tag was used.
Hosted CI and final dev integration are the remaining source-delivery gates.

## Hosted source acceptance and integration (pre-cutover checkpoint)

PR [#18](https://github.com/morozhenko-apps/repoticker/pull/18) merged into
`dev` as `89901941cb56c3264af364d6149110d3de411fb5` after exact source
`1fa4a16c90ed8ebba3613c58255a2d1ba3e617e7` passed
[Preflight 40602808382](https://github.com/morozhenko-apps/repoticker/actions/runs/40602808382):
Rust formatting/core tests/Clippy, all 309 Node tests, all 35 Python release
contracts, Linux desktop compile and aggregate result succeeded. No required
check was bypassed, skipped, disabled or reclassified as flaky.

Source refactor is accepted. Operational retirement is still pending: the
read-only Cloudflare inventory confirms `repoticker-download` bound to
`app-dist`, exact route `https://download.morozhenko.com/dist/RepoTicker/*`,
route ID `29ce979516aa44b28d59bdda272da957`. The existing Custom Domain is
active. The current OAuth can inspect Worker/settings/routes but the Builds
triggers API returns 403 (authentication scope). An unauthenticated in-app
browser could not perform that fallback. The owner was asked to disconnect
the Worker Git build integration before scoped route/Worker removal, so an
old main push cannot restore the retired component. No provider mutation or
production upload was performed. Preserve existing R2 objects and sibling routes.

Rollback: revert the executable refactor commit and its documentation commits
if required; old production objects/tags and the recorded Worker deployment
are unchanged. The completed source milestone is separate from live cutover
and a future owner-authorized release.

## Verified operational cutover

After the owner confirmed both Git build connections were disconnected and
the rQuickShare R2 token was replaced, Wrangler 4.151.0 deleted only
`repoticker-download` and `rquickshare-download`; both commands exited 0.
Neither deletion used --force or changed bucket objects, signing keys, DNS,
WAF, unrelated Workers or any other application's configuration.

Independent post-deletion Cloudflare settings GET returns 404 for each Worker.
Zone routes changed from 13 to 11, exactly removing the two recorded product
routes. Every other route ID and field matches the immediate pre-cutover
baseline. The app-dist Custom Domain remains enabled. Public full-body GET
readback confirms unchanged Picturix latest.json (565 bytes), RepoTicker's
published InRelease (1,418 bytes) and v0.2.0 DEB checksum (94 bytes).

Picturix manifest SHA256:
`73a2d36a8a1e4b37ba9ddd05266f66323b9a763a845a9de45defbc88238b7fdc`.
RepoTicker historical InRelease SHA256:
`f0c129e8737c87e9126d1eb037aa4632bccf9e073f4d20427806e310f23141d9`.
This proves scoped routing retirement and preservation of those existing
public bytes; it does not claim that a new flat release has been published.

The earlier Builds API 403 remains a limitation of the agent's OAuth scope;
Git disconnection and token scope are owner-provided evidence, not an API
verification. GitHub keeps secret values encrypted. A future normal protected
release must still verify actual S3 permissions and full public byte readback.

Rollback remains scoped: revert the source refactor and recreate only the
product's former Worker/route from its retained Git source/config if needed.
The dedicated old rQuickShare bucket and all historical published R2 objects
were retained. No remote snapshot or alternate DEB copy is created by the
new pipeline. All task-owned command sessions exited; no watcher/server remains.
