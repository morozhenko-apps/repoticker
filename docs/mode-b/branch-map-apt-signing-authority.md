# Mode B: APT GPG signing authority validation and isolated subkey passphrase

Source baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Module `scripts/verify_signing_key.py` blob `69d2a50865e610fa0ea712362a7ea182dc615e99`, 44 source lines. The related `scripts/verify_signing_passphrase.sh` is exercised by `tests/test_release_provisioning.py`; separate shell line-by-line coverage remains open.
Prepared parent `87f5607bf1ffb46a9a4695a8b77774f339a91c31` on `audit/mode-b-testing`. No actual release signing credential was accessed.

## Actual executable tests inspected

- `tests/test_release_signing.py` blob `22b8452f75e3da34c470f61c75177aa459d9fb3c`, one Python test `test_subkey_only_authority`, calls the real `validate` with an artificial 40-hex-character primary fingerprint, a different signing subkey fingerprint, `sec` primary secret marker `#`, `ssb` marker `+`, and signing capability `s`. Asserts accepted fixture. Mutating primary marker to `+`, subkey marker to `#`, or expected fingerprint to another 40-hex value raises ValueError with matching reason. It **does not** execute the CLI or inspect an actual GPG inventory.
- `tests/test_release_provisioning.py` blob `0e212acbfe11a2bdf7ced65aeb266a77a8fc7a08`, two tests: if `gpg`/`gpgconf`/`gpgv`/bash/python available, creates temporary real key+signing subkey, exports subkeys, runs real `verify_signing_passphrase.sh` with wrong, correct and corrupt inputs. Separately static-checks provision script verifies passphrase **before** calling `gh secret set`; does **not** actually call `gh secret set`.
- `tests/test_release_apt_integration.py` builds/signs a separate real local APT fixture, covered in `branch-map-apt-signed-snapshot.md`. Neither suite touches the operator's real signing key.

## Every validation condition and expected separate outcome

| Function or command | Branch outcome | Evidence / open |
| --- | --- | --- |
| `validate(text,fingerprint)` fingerprint normalization | Uppercase expected input, require exactly 40 hexadecimal characters; invalid format ValueError | E mismatch between two syntactically valid 40-hex fingerprints; ? invalid length/nonhex/lowercase formatting |
| GPG inventory parsing | Split nonblank colon records, allow tags only `sec`, `ssb`, `fpr`, `uid`, `grp`; empty/unrecognized fails | E valid fixture, ? unknown tag/empty/extra uid or grp and malformed records |
| Secret-key record ordering | Exactly `sec,fpr,ssb,fpr` among key-related entries: one primary and one subkey; additional/duplicate secret keys rejected | E one valid sequence, ? extra subkey/missing primary/reordered/missing fpr |
| Offline primary custody | Primary record has length at least 15 fields and field 14 exactly `#`; full primary material `+` rejected | E `#` accepted and `+` rejected; ? truncated primary/no keygrip/other marker |
| Signing subkey usability | Subkey record field 14 `+`, capabilities field 11 lowercased contains `s`, length at least 15 | E valid signing subkey and stub marker rejection; ? `e`-only/expired/revoked flags, uppercase signing flag and malformed/truncated |
| Fingerprint linkage | Primary fingerprint field 9 matches expected; subkey fingerprint is 40 hex; subkey differs from primary | E a mismatched expected primary, ? malformed subkey, same primary/subkey fingerprint, absent fpr field |
| `main` CLI | Required listing file + fingerprint, actual text read, call validate, catch ValueError/IndexError/OSError and exit status 1 with reason | No CLI behavior tested by `test_release_signing`; missing file, unreadable file, truncated inventory and exact exit code remain ? |
| Signing passphrase shell | Import isolated subkey authority and verify correct passphrase; failure on wrong/corrupt input | E if GPG tools present; skip-aware evidence required; no operator credential |
| Provisioning order | Passphrase verification appears before two `gh secret set` calls | S source-order only; cannot claim GitHub Secrets never written on real invalid invocation without actual shell control-flow test |

## Independent trust interactions and caveats

- **Offline certification primary vs online signing subkey**: `sec:` marker `#` and `ssb:` marker `+` must coexist with exact matched fingerprints and signing capability; validation intentionally fails when primary secret bytes are present.
- **Whitespace/UID/group extra records**: `uid` and `grp` are accepted labels but do not replace required key sequence. A test that checks only presence of `sec` and `ssb` cannot kill reordered or duplicate-key mutants.
- **Wrong passphrase and key export**: shell integration tests real ephemeral keys; never use live GitHub secrets, owner keys or project signing fingerprint in tests or docs.
- **Malformed inventory**: `validate` accesses `primary_fpr[9]` and `subkey_fpr[9]` directly; a truncated record can raise IndexError instead of ValueError, and CLI catches both. Do not misstate this as an uncaught CLI path. No sensitive content should be echoed with error.
- **Correct marker ≠ cryptographic certificate verification**: text inventory predicate is a preflight; actual GPG signature verification of signed repository is an independent lower-level gate.

## Positive / N1–N12

| Class | Evidence / gap |
| --- | --- |
| Positive | E synthetic valid inventory, real ephemeral signing passphrase where tools exist |
| N1 | E wrong primary/subkey markers, fingerprint mismatch; ? malformed records, wrong flags and extra key |
| N2 | ? exact 39/40/41 hex chars, 14/15 record fields and duplicate keys |
| N3 | E real GPG CLI under tool availability; simulated GPG missing/failure/timeout ? |
| N4 | E deterministic `validate`; repeated provisioning and wrong passphrase retries ? |
| N5 | ? concurrent attempts to provision or rotate key during publication |
| N6 | E corrupt key export in shell integration; malformed old GPG inventory ? |
| N7 | E offline primary/no full secret, separate signing subkey; additional key authorization ? |
| N8 | NA in `validate`; actual cryptographic key expiry belongs to GPG/apt verification |
| N9 | NA |
| N10 | E fixture contains no real credentials; error-output redaction and GH secret mutation boundaries ? |
| N11 | NA |
| N12 | ? missing/unreadable inventory and ephemeral GPG home/passphrase file errors |

## Stage 9 after complete global mapping

- SK1: table invalid fingerprint lengths/chars/case and malformed, reordered, extra and truncated inventory records, direct `validate` and CLI redacted exit.
- SK2: sec `#` vs `+` and ssb `+` vs `#`, missing 's' capability, same/invalid subkey fingerprint, UID/grp presence. Assert accepted fixtures only when exact permitted sequence.
- SK3: real ephemeral GPG key with expired/non-signing/revoked subkey and invalid passphrase, if platform supports it, and preserve clear skip status for lacking tools.
- SK4: source shell ordering is supplemented by isolated fake `gh` executable that records allowed calls, ensuring no secret is written after failed verification; never touch operator GitHub account.
- SK5: failed preflight prevents APT publisher from any R2 call, separate from actual signed index readback test.
- Mutations: accept full primary secret, accept encryption-only subkey, allow duplicate keys, skip fingerprint linkage, allow same primary/subkey fingerprint, perform `gh secret set` before verification. Actual mutation kills await runnable tests.

Global Mode B Stage 3–8 PARTIAL; no production, shell, tests, secrets or published branches modified.
