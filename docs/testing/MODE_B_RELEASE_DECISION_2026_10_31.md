# RepoTicker v1.0.0 — risk-based Mode B exit and direct release decision

**Owner decision (2026-10-31):** Mode B is a finite, pre-release or
post-feature testing phase, **not** a recurring release pipeline stage.
Cover critical functional and security paths, then publish the release
when their required tests are green. A separately numbered release
candidate and a requirement to obtain 100% coverage of every trivial
or low-risk branch are **not** release prerequisites. This supersedes
contrary sequencing and test-volume language in earlier plans.
Normal mandatory GitHub Preflight, protected publication, integrity
checks and existing user-authorized platform acceptance still apply.

**Proposed release:** `v1.0.0` from `dev`. Latest executable source
SHA: `faa65f15a7b1a28e35598d632c712707476186de`.
A subsequent `docs:` commit may change the Git SHA but not the
tested executable tree; exact release workflow must still verify
the selected tagged main HEAD.

## Verified automated evidence

- [Preflight #41144112612](https://github.com/morozhenko-apps/repoticker/actions/runs/41144112612)
  `success`, exact last executable SHA. JavaScript 549 passed,
  0 failed, 0 skipped; Rust core 71 unit + 30 Git integration +
  3 remote/origin integration; Linux native Tauri 67 passed;
  Python release 97 passed; CI policy Python 6 passed.
  Rustfmt, locked Rust core, Clippy and Linux desktop compilation
  all completed successfully. These counts are different
  frameworks; do not report them as one measured coverage percentage.
- [Unpublished KDE/Windows acceptance #41144112562](https://github.com/morozhenko-apps/repoticker/actions/runs/41144112562)
  `success`: Linux DEB/AppImage and Windows NSIS candidate builds,
  Windows native Rust 71 passed, Windows Git-process subset 4 passed.
  Build success does not itself constitute physical installed acceptance.
- The JavaScript suite executed 12 named source-mutation regression
  cases M01–M12, all passed. This is targeted critical-invariant
  mutation evidence, **not** a whole-product mutation score.

## Critical risk sign-off

| Risk area | Evidence | Release verdict |
| --- | --- | --- |
| Git data safety | Rust `ff-only`, no upstream/dirty/diverged refusal, linked worktrees, submodules, hooks, pinning remote tip, push non-force, cancellation and owned process groups in passing core/integration and Windows-process suites | **Automated pass** |
| OAuth and wallet secrets | Native Device Flow/session/keyring tests, invalid response and token-expiry contracts, generation cancellation, no WebView secret projection; recent Settings failure/race tests passed in 549-case gate | **Automated pass** |
| REST, scopes and truthful counters | Native status/429/rate gate, permission vs throttle, ETag generation, bounded pagination, runner state, unknown vs zero, tenant scope, selected-repository case preservation | **Automated pass** |
| Settings and native lifecycle | Existing real-controller OK/Cancel, pending authorization, autostart default-OFF and platform candidate native/installer tests | **Automated pass** |
| Locales and privacy | 20-language roster/placeholder/static catalog tests, fixed error redaction and Arabic/data isolation contracts; owner acceptance recorded in issue #16 | **Automated pass plus owner attestation** |
| Distribution and updates | 97 passing Python tests for release/version, signed APT, GPG subkey constraints, immutable R2, race/CAS, readback/hash/size and rollback failure states | **Automated pass; live publication must still verify remote artifacts** |

## Explicit evidence limits (not test defects)

- Source-level JavaScript V8 branch coverage is partial; **do not
  claim 100%**. The agreed risk-based exit does not require an
  exhaustive release-candidate branch census.
- Platform and 20-locale issues #12–#16 were closed after explicit
  owner attestations on 2026-10-29; independent screenshot/hardware
  and native-speaker audit records are not reconstructed. Avoid
  repeating this owner testing without a reproduced defect.
- The protected `apt-release` GitHub environment and actual R2/APT
  public readback must independently succeed for the final **tagged**
  release. A source test cannot prove the live edge behavior.
- Windows NSIS is **unsigned**; that must be disclosed, not upgraded
  to a false signer assurance. macOS and optional unattended Git
  sync/hybrid relay are outside the stable product claim.
- Mode B is **closed for this release decision's critical-test scope**.
  No new critical failure is known from the checked SHA. This does
  not certify every unmeasured branch, nor does it bypass required
  protected publish and live artifact integrity.

## Direct-release sequence (no intermediate release candidate)

1. Review and fast-forward `dev` to `main` through the normal
   protected PR process without rewriting either history.
2. Check the exact resulting `main` SHA and mandatory Preflight;
   stable tests are already in Preflight and are not repeated ten times.
3. Create the immutable `v1.0.0` tag on **main HEAD only** and allow
   `.github/workflows/desktop-release-candidates.yml` to build and
   publish through the protected `apt-release` environment.
4. Require successful Linux and Windows packaging, GPG signed APT,
   immutable R2 uploads and verified public byte count/SHA-256,
   artifact cleanup receipt and text-only GitHub Release.
5. Announce completion **only after** the protected workflow and
   public readback succeed. If any mandatory release step fails,
   stop before claiming publication; investigate only that fault.
   Do not rewrite old tags or R2 artifacts.

**State at documentation:** Ready to request direct mainline
promotion, **not yet published**. No tag, protected environment,
or R2 mutation has been performed by this note.
