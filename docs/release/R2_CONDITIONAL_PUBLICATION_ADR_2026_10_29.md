# ADR — conditional R2 writes and safe latest-pointer recovery

**Date:** 2026-10-29. **Mode A.** Baseline `8698a29ddb661de055474ade7bd712088c331596`.
**Decision:** owner approved resolving the two R2 release blockers
before the v1.0 candidate; retain flat signed APT distribution,
immutable versioned installer keys, and the existing `latest.json`
schema. This ADR changes release-writer behavior, not the public
read-only download contract. No release/tag/main/R2 write is authorized
during implementation.

## Evidence and root causes

R2's documented S3-compatible `PutObject` supports atomically
evaluated `If-None-Match: *` and `If-Match: "<etag>"`:
- https://developers.cloudflare.com/r2/api/s3/extensions/
- https://developers.cloudflare.com/r2/reference/consistency/
- https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html

**A — Immutable-object race:** current `upload` does
`HeadObject` followed by unconditional `upload_file`. Another
writer may create the same key between the two operations. Preflight
and SHA256 readback do not prevent overwriting an existing immutable
object. Fix the write itself, not merely the pre-read.

**B — Pointer lost update / uncertain outcome:** current mutable
`latest.json` is written unconditionally after APT, and public
readback happens afterward. A 403/404/stale CDN readback means
`no verified receipt`, not necessarily `no R2 mutation`.
Blind retry/rollback could overwrite another publisher. R2 S3
reads are strongly consistent, but cached custom-domain HTTP
reads may lag the bucket. Preserve both facts.

## Chosen architecture

1. Use bounded, single-request streamed `put_object` (source max
   350 MiB, below R2's single-part cap), with `ContentLength`,
   SHA256 metadata and existing MIME/cache policy. **Every new
   immutable key** uses `IfNoneMatch="*"`. A 412 or unknown
   network outcome fails closed; never retry with an unconditional
   overwrite. Existing same-SHA immutable content can be reused
   **only after full private readback**. Any metadata conflict
   refuses publication.
2. Mutable APT index writes use **IfMatch=<current ETag>** when
   replacing an existing object, or **IfNoneMatch="*"** when
   creating a new one. If ETag is missing/malformed, fail before
   write; a competing writer causes a 412 and fails closed.
   These per-object CAS conditions are *not* a cross-object APT
   transaction. The signed InRelease is still uploaded last among
   APT objects; apt clients validate its signature/hashes.
3. Capture the latest-pointer ETag **before** mutating APT indexes.
   `latest.json` uses that captured ETag for CAS. If the
   baseline was absent, use atomic create-once. If another
   publisher wins, reject with no success receipt; never
   overwrite by re-reading and using a newly observed ETag.
   A private R2 readback of an identical previously-published
   pointer allows a **same-byte, same-version rerun** to
   validate public visibility without rewriting that pointer.
4. On a public readback failure **after** private pointer upload,
   fail with no verified receipt; leave the local candidate
   manifest as inspection evidence. Never issue automated
   rollback. A subsequent protected rerun on the **same release
   SHA** may reconfirm the unchanged private pointer and public
   SHA/size; no forced pointer reupload. Cleanup remains gated
   strictly on a verified receipt. An unknown/competing pointer
   or changed bytes requires explicit owner reconciliation.
5. Keep existing `output` / `latest_path` collision and
   dangling-symlink protections, plus public HTTP 200 and
   full-body SHA/size validation. Do not leak S3 body, ETag
   headers, credential material or arbitrary upstream text
   into public receipts.

## Architectural limits, separated from solved invariants

The per-object CAS protocol protects individual immutable objects
and guards the latest-pointer lost update, but cannot turn the
three flat mutable APT keys into one atomic multi-key transaction.
The official protected tag workflow is serialized; other parties
with direct write permissions must not bypass that release
discipline. Future by-hash APT or an explicit globally
enforced single-publisher lease would be a **separate**
publication architecture decision. CDN caching and real edge
firewall acceptance also require deployment evidence; no
offline test can guarantee a public 200.

## Contract tests / mutation proof

- Fake S3 implementing conditional PutObject; assert 412 when
  a concurrent create or replacement wins, no clobber.
- Existing immutable same SHA is reused only with verified
  private bytes; missing SHA/ETag denies writes.
- Mutable indexes use IfMatch on replacement and IfNoneMatch
  on first write; missing/invalid ETag fails.
- Latest baseline is pinned *before* mutable writes, and
  conflict after snapshot denies the final write.
- Re-running with the same verified pointer does not
  rewrite its bytes; public readback failure emits no
  cleanup-authorizing receipt.
- Retain existing offline R2/receipt/manifest tests; run
  full Python release, Node, Rust and desktop checks once
  at final stable gate. Never claim CI success by source
  inspection.

**Rollback:** revert the isolated code+test commit (before
any real publication). Never revert a real immutable bucket
object, mutate main/tag, publish R2 or remove an old receipt
to make a failed attempt green.


## Implementation checkpoint — conditional R2 contract batch

**Staged code+test commit:** `014e4e23b6d5b34ff96cde6c164b96ae56fde8d7`.
**One production script:** `scripts/r2_release.py`.
**New offline contract cases:** 11; release R2 test methods 54 → 65.

Implemented:
- All new immutable objects use streamed single-part
  `put_object(IfNoneMatch="*")`; reused ones require an
  exact matching SHA metadata claim AND successful private
  full-body SHA256/size readback. A competing 412 or unknown
  network outcome is not converted into an overwrite.
- Mutable APT and pointer replacements use `IfMatch` of the
  previously read ETag; absent keys use conditional creation.
  Missing/malformed mutable ETags fail closed.
- `latest.json` is compared to a pointer baseline acquired
  **before any APT index upload**. An intervening remote
  pointer update blocks final promotion; a same-byte pointer
  can be verified again on a protected rerun without rewriting
  it. Public readback failure still emits no receipt and
  cannot authorize artifact cleanup.
- Existing public request identity, signed APT verification,
  immutable cache metadata, no-store index policy and private
  S3/full public readback assertions are retained.

**Exact fake tests:** conditional creation, 412 race on
immutable and mutable keys, ETag requirement, valid ETag CAS,
idempotent same-data recovery, pinned pointer comparison,
competing publisher injected after APT starts, and presence
of a privately committed pointer without a public receipt.
All 54 existing R2 test methods were kept; the offline fake
was upgraded to model R2's *atomic conditional PutObject*
rather than the earlier unconditional `upload_file`.

**Executed local checks:** verified the pinned version of boto3
(`1.43.18`) exposes `IfMatch`, `IfNoneMatch`,
`ContentLength` and streaming `Body` in its PutObject
service model. Staged sources were read back and inspected
for required guards and test declarations.

**Not executed:** complete Python unittest suite (current
container cannot fetch the full GitHub repository by DNS),
Node 24, Rust, fmt/Clippy, desktop compile and installed
KDE/Windows or 20-language independent review.
No CI run result is claimed; Preflight starts only when the
final code-containing `dev` ref is advanced and will not
be polled. Tests require exact-SHA execution to pass.

**Still a release risk, not silently waived:** per-key CAS
cannot atomically swap three flat APT keys as a group. The
official GitHub release workflow remains single-publisher
serialized and requires the protected release environment.
Anyone with direct independent R2 write access must not
publish outside that contract. Real custom-domain CDN
freshness and access/firewall behavior require actual public
readback; a verified private object alone is never a
public-release receipt. No live bucket was contacted here.

**Operational recovery:** if an edge error follows a committed
private latest pointer, the workflow fails without cleanup.
After diagnosing edge/access state, rerun the *same protected
release SHA* to verify the original pointer bytes and public
readback. A divergent pointer must never be force-overwritten
or rolled back automatically. Before public v1, require
verified CI and manual live publication evidence.

**Delivery:** plan doc commit, code/test commit and this
checkpoint are staged in one ancestor chain. One fast-forward
of `dev` only; no `main`, tag, GitHub Release or R2 write.
