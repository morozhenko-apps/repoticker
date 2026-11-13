# Mode B: protected signing subkey provisioning and isolated GPG passphrase shell contracts

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, audit parent `2a9849dc857c1594955dfae2e56b02b2ce7a572a`.
Subjects:
- `scripts/provision_apt_key.sh` blob `165782c8dbc32c520509a6b9c7c61f23a54401e4` (82 lines), **privileged key custody script**, not safe to execute against an owner's home or live GitHub Environment.
- `scripts/verify_signing_passphrase.sh` blob `1af6a8173779f48e7465b1a4a037278b80ff3cd2` (49 lines), isolated public-signature verification of subkey export.

Real test source `tests/test_release_provisioning.py` blob `0e212acbfe11a2bdf7ced65aeb266a77a8fc7a08` (2 Python tests): one actual subprocess integration fixture with **temporary synthetic GPG key and signing subkey**, correct/wrong passphrase and corrupt private key stdin, **skips if GPG tools unavailable**; one source-string test checking `verify_signing_passphrase.sh` text occurs before both `gh secret set` commands. `tests/test_release_signing.py` validates the separate Python `verify_signing_key.py` inventory in a synthetic fixture (mapped in `branch-map-apt-signing-authority.md`). No GitHub Secrets API, private backup, protected environment mutation or real production signing key touched. No tests executed during this doc pass.

## Isolated `verify_signing_passphrase.sh` branch mapping

| Condition / side effect | Actual source policy | E direct vs ? missing |
| --- | --- | --- |
| args | exactly two, 40 hex expected primary fingerprint and nonempty passphrase file; bad exit 2 | ? missing/extra, 39/40/41 hex, unreadable/missing/empty file, no GPG work |
| tools | require gpg/gpgconf/gpgv/python3, exit 1 if missing | ? each executable missing through isolated PATH |
| isolation | `mktemp -d`, fresh 0700 GNUPGHOME, `trap EXIT` gpg-agent kill and tmp removal | E temporary GPG execution; ? permission/error path and artifact cleanup after failure |
| secret-subkey import | GPG reads exported secret subkeys from stdin, rejects corrupt/invalid import with fixed public message | E corrupt export exits nonzero; ? empty stdin and valid full-primary secret export |
| key inventory | Invoke real `verify_signing_key.py` with fresh inventory/fingerprint, no full primary secret | E happy path through actual CLI; negative primary-present/expired extra subkey test remains ? |
| detached signing | `gpg --clearsign --digest-algo SHA256` using exact fingerprint and passphrase-file; wrong passphrase => fixed error | E synthetic wrong/correct password assertions |
| signature verify | `gpgv --keyring "$tmp/public.gpg" "$tmp/InRelease"` checks signed Release with isolated public export | E correct cryptographic round trip; ? fake failing `gpgv`, file corruption after signing |
| stdout/secret | Only fixed success after all steps; command diagnostics redirected on import/sign/verify, caller never prints passphrase | E wrong-passphrase stderr fixed; ? captured stderr/stdout no secret canary and process-list provenance |
| cleanup failures | best-effort `gpgconf ... || true` does not mask required signature failure; `rm -rf` applies **only isolated mktemp path** | S; ? mktemp failure, invalid HOME/TMPDIR and trap failure |

## `provision_apt_key.sh` real step and abort mapping

| Barrier | Intended enforced ordering | Existing assertion / unresolved |
| --- | --- | --- |
| fingerprint | 40 hex argument required; no destructive operations for invalid format | S; ? bad input shell execution with fake tools and explicit zero secret writes |
| dependencies | gh/gpg/base64 required before any key access | S; ? missing each tool |
| backup path | exact `$HOME/morozhenko/secrets/RepoTicker` **must already be mounted**; refusal to create a local lookalike if absent | S; ? temp HOME and absent backup refuse, do not create directory |
| GH auth and environment | `gh auth status`, then `gh api repos/.../environments/apt-release` preflight; **source does not verify actual environment reviewer protection policy**, only existence/name | S; ? auth/API denial and no later secret write |
| local full secret | `gpg --list-secret-keys` requires sec; backup filename includes UTC date and first 12 chars fingerprint, must not already exist | S; ? missing secret, existing backup no overwrite, wrong date/fingerprint |
| backup passphrase | prompt twice with `read -rs`; length >=16 and exact equality; reject before private export | S; ? 15/16/17, mismatch, EOF, newline, secret not echoed |
| encrypted backup | export full secret from local keyring through AES256 symmetric encryption, no plaintext full key file written; store public exports/keyring/fingerprint with chmod 600/644 | S; ? GPG encrypt failure/partial backup and chmod failure, no falsely successful receipt |
| signing passphrase | second prompt nonempty, temp dir, trap to clear key_pass, stream `gpg --export-secret-subkeys` through real passphrase verifier | **S source order**: verifier appears before GH secret writes; **not** proved by actual script execution |
| GH secret mutation | **only after** success, set signing-subkey-base64 then signing passphrase, then fingerprint variable, all scoped to repo + `apt-release` | Source inspection; ? secret 1 write success then secret 2 failure leaves partial remote state; live GitHub mutation **forbidden** without release authorization |
| scope custody | exports only subkey-only material to CI, stores encrypted full primary in mounted owner's backup, not GitHub | S and GPG verifier tests. Protected environment settings and manual reviewer enforcement external |

## Architectural and testability restrictions

1. **Never execute `provision_apt_key.sh` in the current agent environment against actual HOME, Google Drive mount, GPG keys or GitHub Secrets.** It is operationally destructive/sensitive. Direct safety testing requires a disposable simulated HOME, synthetic keys, mock `gh` executable that cannot access network, fake GPG backend where appropriate, and controlled stdin. Do not run live `gh secret set`.
2. A verified subkey/passphrase does **not** prove the `apt-release` environment has required reviewers; current source checks environment existence only. That is an external owner gate, not an inferred YAML guarantee.
3. Provisioning may leave an encrypted backup and public files when later key validation fails, and may partially update external GitHub Secrets if the later write fails. This is a **source-derived non-atomic transaction risk**, not a reproduced defect or permission to add unapproved destructive rollback.
4. A live release key rotation requires an architectural policy for safe retry/rollback and key custody; do not silently change secret mutation semantics or CI environment rules under Mode B.
5. The verifier's `trap` isolates its own temp dir. GPG primary private material is not tested for absence solely by asserting the string `export-secret-subkeys` in provisioning; real `verify_signing_key.py` checks imported inventory for `sec #` / signing `ssb +` and rejects full primary secret.

## Positive / N1–N12

| Class | Evidence / open |
| --- | --- |
| Positive | E real temporary GPG sign+verify with correct passphrase when dependencies available; provision script only source |
| N1 | E wrong key passphrase and invalid key bytes; ? invalid provision args/EOF/mismatch/backup path |
| N2 | ? 39/40/41 fingerprint, passphrase 15/16/17, duplicate backup, timestamp filename |
| N3 | ? GH auth/environment API failure, no live CI/provider calls in fixture |
| N4 | ? re-provision repeated fingerprint and partial remote secret update after failure |
| N5 | ? simultaneous operator runs and backup filename collisions |
| N6 | E corrupt export rejected; ? invalid old GPG inventory and stale backup |
| N7 | E subkey-only import/sign, primary offline; external GH environment reviewer settings unknown |
| N8 | S UTC filename day; ? timezone boundary, date command failure |
| N9 | ? interactive EOF/abort and terminal no echo |
| N10 | S passphrase not printed, GPG stdout/stderr redirected; ? actual log canary |
| N11 | NA |
| N12 | ? missing mounted dir, full disk, chmod/encrypted backup fail, cleanup trap |

## Stage 9 boundary tests after global Stage 3–8

- APS1: executable verifier wrong args, bad/empty passphrase, corrupt GPG and successful synthetic sign+verify, wrong signing-only key capability with temporary GNUPGHOME.
- APS2: safety harness for actual provisioning shell with **isolated fake `gh`** and synthetic backup path; negative barrier table with zero `gh secret set` invocations until all preconditions pass.
- APS3: encrypt backup into isolated temp dir with dummy synthetic key and controlled passphrases, confirm no plaintext full secret, chmod and hash identity; never expose user key.
- APS4: fake second GH secret failure, record external partial state and non-false success message; architecture STOP FACTOR if automatic rollback/atomic rotation requirement arises.
- APS5: owner-only external GitHub `apt-release` reviewers/signing key custody checks and real APT consumer acceptance in release; not auto-executed.

Mutation kills: send full-primary secret, skip passphrase verification, accept wrong checksum/signature, allow backup directory auto-create, use shorter backup passphrase, set GitHub Secrets before key check, hide GH API failure, print private passphrase. Existing real GPG tests cover a subset; no mutation test run and Stage 3–8 global PARTIAL.
