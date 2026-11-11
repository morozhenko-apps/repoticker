# Mode B release-delta test inventory and gate

This is the finite pre-release Mode B expansion for the 1.0.0 desktop
candidate and its newly integrated operator-owned Hybrid relay.
It preserves the existing architecture and does not authorize release,
Cloudflare deployment, signing, tag changes or `main` promotion.

## Source and execution scope

- Repository: `morozhenko-apps/repoticker`, base `b4e6a0311fc716929218db80c45c0b4d7b469bea`.
- Tooling: Node 26.13.0 `node --test tests/*.test.mjs` and
  `node --experimental-test-coverage --test
  --test-coverage-include='apps/desktop/ui/*.mjs' tests/*.test.mjs`;
  Rust `cargo test --locked -p repoticker` and
  `cargo test --locked -p repoticker-core`; Python release contracts
  `python3 -m unittest discover -s tests -v`.
- Required CI: Preflight stable JS, Rust, Clippy and Python; separate
  unpublished Linux/Windows desktop acceptance; native installed KDE
  smoke. The full established stable suite already covers Git safety,
  REST monitoring, billing/quota, notification deduplication, localization,
  CI signatures and release metadata. These are not intentionally retested
  by a redundant new fixture.
- Newly targeted business invariants: Worker validates all bindings
  before handling routes; HTTPS bearer is native-only; webhook signatures
  precede durable storage; no workflow result is trusted from a hint;
  durable cursors and rate limits are monotone and idempotent; credentials
  are never printed or persisted in config; Settings Cancel is draft-only;
  Hybrid and polling confirmations persist exactly the selected mode;
  WebSocket phase is native truth; frame and footer are visible and inert.
- `corrupted double-linked list` appeared on the KDE operator terminal
  between two runs of the installed QA candidate. This is an **unresolved
  native-memory-safety release blocker**: the source, process and point
  of failure are not yet proven. Do not classify it as harmless. Investigate
  via coredump/journal and native exit reproduction on the installed
  binary; JS/Worker unit tests cannot close that gate.

## Stages, rollback, and source ownership

1. Inventory core executable branches, adverse paths and interaction
   combinations against existing tests (this file).
2. Add deterministic data-driven real-module tests to separate new
   Mode B suites. Use no live network, production credentials or clock sleeps.
3. Review assertion mutation sensitivity (boundary flips, early dispatch,
   bypassed auth, state leaks and failed atomic writes).
4. Execute the complete applicable STABLE suite **once at final gate**;
   execute only an explicitly documented known-FLAKY suite separately
   (there is no established flaky group in this release-delta scope).
5. Use one exact-source remote Preflight and unpublished desktop acceptance;
   stop checking CI when triggered and collect owner-provided completion.
6. Complete operator KDE lifecycle/crash evidence before any production decision.

Rollback: revert the test implementation commit separately from this
documentation; no runtime change or hosted deployment is part of Mode B.

## Full release-delta artifact inventory and branch map

| Artifact / public surface | Risk | Existing coverage and branch obligations | New Mode B level / scenarios |
| --- | --- | --- | --- |
| `relay-protocol.mjs`: `canonicalRepository`, `allowedRepositories`, `isAllowedRepository` | High, auth scope | Valid exact/wildcard; invalid type/length/components, duplicate and owner boundaries | Unit: min/max component, list cardinality, casing, wildcard intersections, invalid types |
| `relay-protocol.mjs`: `parseCursor`, `cursorFromUrl`, `validDeliveryId` | High, private replay | Missing/valid/invalid cursor, duplicate or unknown query, malformed delivery | Unit: exact safe integer and numeric format boundaries |
| `relay-protocol.mjs`: `validatedWorkflowEvent` | High, forged CI hints | Known actions/status pairs, rejected event, bad UTF-8/JSON, unauthorized repo | Unit: all invalid action/status pairs, extra-result field ignored |
| `relay-protocol.mjs`: `boundedRequestBody` | High, resource exhaustion | Header/stream/length/body limit and reader failure | Unit: boundary 0/1/max/max+1, mismatched header, chunked overflow, invalid limit |
| `relay-protocol.mjs`: `validClientAuthorization` | Critical, bearer | Header prefix, secret format, constant-size digests, length and mismatch | Unit: exact 31/32/256/257, invalid type/charset and whitespace |
| `worker.mjs`: `handleRelayRequest`, `ingest`, `subscribe` | Critical, public ingress | Missing bindings, method, signature, content type, browser origin/cookie, bearer, cursor, DO failure | Integration: config fail-closed, route/method matrix, forwarding, 503 no-cache, 401/403/413/415/422/426 |
| `hub.mjs`: `history`, `ingest`, `broadcast`, `fetch`, WS callbacks | High, durable replay | Idempotence, transactional rate budget, age/cap, replay, socket cap, revocation | Integration SQLite: boundary age, socket backpressure, failed broadcast isolation, rollback, wire method reject |
| `relay_endpoint.rs`, `relay_transport.rs` native WSS | Critical, live fallback | Valid URL, finite failure codes, TLS checking, restart and cursor parsing, exponential backoff | Native tests via existing Rust gate and source contract; installed WSS state transition remains operator smoke |
| `relay_secret.rs` Keyring stages, commit, wipe | Critical, credentials | Valid base64url, OS store errors, cancellation, settings window restrictions, volatile draft, zeroization | UI contract: no write before OK, recovery after failures, no secret in logs; native OS store integration operator smoke |
| `main.rs` config serialization, `save_settings`, `close_settings`, startup/quit | High, persisted mode and native exit | Polling clears old origin, Hybrid requires valid URL, restart, fallback; native window close and operation shutdown | Settings IPC integration, persisted mode and credential interactions; glibc crash investigation remains open |
| `settings.mjs` mode, URL, Keyring, reconnect, focus, open/close, save, cancel | Critical, user-visible | Hundreds of real-controller fixture scenarios for transitions, races, errors and retries | UI contract: rapid edit, missed-open, interleaved native phase, rejected cleanup and no leak |
| `settings.html/css`, `window-frame.css`, `about.html` | Medium, accessible layout | Fixed footer outside scroll, theme-aware outline, disabled click-through | Structural/UI contract plus KDE physical visual and scroll smoke |
| `webhook-verify.mjs` | Critical, webhook authenticity | SHA-256 signature valid, missing, malformed and forged | Existing security tests retained; worker boundary ensures no DO call before signature |
| `github_session.rs` and REST monitoring | High, independent fallback | OAuth, scope, bounded pages, REST rate gate and failure reasons | Existing stable suites; no relay hint may grant GitHub authority |
| `CI`, `install_qa_linux.sh`, release contracts | Critical, provenance | Exact source SHA, checksum, correct DEB, no same-version stale executable, signatures | Existing stable contract and manual installed-KDE evidence |

The table enumerates the release-delta code and every external integration
that can affect the new behavior. Untouched git/domain, runner and billing
logic retain their established separate Mode B suites and remain part of
the complete stable gate. This table is not a claim of 100% project-wide
branch coverage.

## Positive + N1–N12 test matrix

Legend: **C** existing covered, **P** additional planned, **NA**
inapplicable to this artifact (rationale follows). Each row includes
explicit coverage or a recorded gap; no implicit passes.

| Artifact | Positive | N1 | N2 | N3 | N4 | N5 | N6 | N7 | N8 | N9 | N10 | N11 | N12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Protocol names/allowlist | C | P | P | NA | C | NA | P | P | NA | NA | C | NA | NA |
| Protocol cursor/delivery | C | P | P | NA | C | NA | P | P | NA | NA | C | NA | NA |
| Protocol events/body | C | P | P | NA | NA | P | P | P | NA | P | C | NA | NA |
| Protocol bearer | C | P | P | NA | NA | P | NA | P | NA | NA | C | NA | NA |
| Worker public routes | C | P | P | P | C | P | P | P | NA | P | P | NA | P |
| Durable hub / WS | C | P | P | P | C | P | P | P | NA | P | C | NA | P |
| Native relay/Keyring | C | C | C | C | C | P | C | C | NA | P | C | NA | P |
| Settings UI/IPC | C | C | C | C | C | P | C | C | C | P | C | NA | C |
| Settings/About layout | C | C | P | NA | NA | P | NA | C | C | P | NA | NA | NA |
| Installed native lifecycle | C | NA | NA | C | P | P | C | C | NA | P | P | NA | P |
| Installer/release provenance | C | C | C | C | C | C | C | C | NA | C | C | NA | C |

NA rationale: numeric/locale inputs are absent from repository identities,
bearer validation, hub and app shutdown where shown; monetization (N11)
is outside the Hybrid relay and handled by existing billing tests; direct
network/storage do not occur in pure protocol validators; no user-interruption
path exists in stateless name/cursor helpers. The actual UI has N8 via the
20-locale suite, while Worker timestamps are monotonic millisecond boundaries
(N2), not calendar/localized presentation.

## Meaningful interaction matrix

| Initial state | User/native interference | Expected |
| --- | --- | --- |
| Polling / no secret | rapid Hybrid URL/key edits then polling | no Keyring mutation; save no-op unless independent setting changes |
| Polling / no secret | Hybrid OK then native socket online before Settings reopened | persisted Hybrid, masked secret and online status without app restart |
| Hybrid / secret | Disconnect only then OK | remains Hybrid; no secret; REST fallback with reason |
| Hybrid / secret | Change to Simple then Cancel | original URL/secret/config unchanged |
| Hybrid / secret | Simple OK plus readback failure | fail closed, no claim of completed cleanup |
| Hybrid / saved URL | native fallback/online events while editing a new URL | old endpoint cannot lock new draft; user edit retained |
| Hidden Settings | missed opened event then focus | full config and Keyring refresh, not only phase |
| Active Settings | ordinary focus while editing | no draft reset; phase refreshed |
| Worker ingress | missing allowlist or secret plus a valid request | 503 without DO access or secret disclosure |
| Worker ingress | browser Origin/cookie with otherwise valid bearer | 403, no DO access |
| Durable hub | duplicate delivery at cap plus minute rollover | no duplicate cursor, rate budget only for new deliveries |
| Durable hub | expired history or revoked owner | no replay of private old hints; reset when necessary |
| Native shutdown | normal quit, repeated quit, active WSS / pending Keyring | no heap corruption, no unwanted termination of unrelated processes (currently unverified) |

## Mutation review and completion rules

- If allowlist parsing accepts a global wildcard, duplicates or invalid
  component, a test must fail.
- If bearer minimum/maximum boundary, prefix or charset changes, a test must fail.
- If a WebSocket subscription bypasses browser restrictions, 401/403 and
  absence-of-DO-call assertions must fail.
- If a webhook reaches DO before verification or preserves result/secret
  fields, an assertion must fail.
- If the durable cursor repeats, a rate-budget rollback leaks or a
  backpressured socket blocks healthy subscribers, a test must fail.
- If changing a Settings draft changes Keyring before OK, if polling
  retains a secret, or if an old native phase locks a modified URL,
  an assertion must fail.
- If the persistent footer enters the scrollbox or overlay intercepts
  pointer input, a structural test must fail.
- Native glibc heap corruption requires actual process/core evidence and
  cannot be certified absent by source assertions.

## Mode B executable test expansion receipt

55 deterministic test cases have been added or extended in five suites.
Each case directly tests a real exported validation/worker/hub method or the
real Settings controller under an IPC contract fixture. The socket, SQLite
clock, OS Keyring and Tauri IPC are external dependencies; no production
business-rule implementation is mocked.

| Test suite | New cases | Primary categories |
| --- | ---: | --- |
| `tests/mode-b-relay-protocol.test.mjs` | 17 | N1, N2, N3, N5, N6, N7, N10, positive |
| `tests/mode-b-relay-worker.test.mjs` | 16 | N1, N2, N3, N5, N6, N7, N10, positive |
| `tests/relay-hub.test.mjs` (added cases) | 9 | N2, N3, N5, N7, N12 |
| `tests/settings-github-confirm.test.mjs` (added cases) | 8 | N4, N5, N6, N9, N12 |
| `tests/mode-b-window-layout.test.mjs` | 5 | N2, N7, N8, N9, positive |
| **Total** | **55** | |

One primary classification per new case (cross-cutting assertions also
cover other categories): Positive 4, N1 6, N2 9, N3 4, N4 1, N5 5,
N6 5, N7 11, N8 1, N9 3, N10 2, N11 0, N12 4.
N11 does not apply to the relay release delta: RepoTicker does not grant
entitlements via this Worker; existing billing/quota tests remain part of
STABLE. No tests were marked skipped to suppress defects.

Existing Mode B suites continue to protect OAuth, GitHub REST, CI state,
runner and billing invariants and will execute in the full STABLE gate.
The source branch map remains risk-scoped; exact project-wide branch
coverage is **not** being claimed.

The unexecuted manual native shutdown test is tracked as
[release blocker #23](https://github.com/morozhenko-apps/repoticker/issues/23).
Physical KDE acceptance already demonstrated Relay `online` transitions
and polling cleanup, but it has *not* closed the allocator-integrity risk.

## Mode B defect found by stable preflight

Exact-SHA Preflight #43040145163 on
`6f3ca7f4e0ed85993a936eaf57dca1f11a29e8a4`
reported two failing JS tests in `mode-b-relay-worker.test.mjs`:

- A Durable Object `fetch` rejection during signed webhook ingestion surfaced
  `PRIVATE_HUB_FAILURE` instead of returning a redacted HTTP 503.
- The same rejected fetch on authenticated private changes escaped the
  handler instead of returning HTTP 503 with `cache-control: no-store`.

Root cause: `handleRelayRequest` returns unawaited promises from
`ingest()` and `subscribe()` inside a synchronous `try/catch`.
An asynchronous rejection occurs after control exits that `try` block,
so the error handler never receives it. The existing 503 fallback is the
defined contract. Fix: `return await` each async route dispatch so the
rejection is observed by the existing catch. Do not change test expectations,
webhook verification, authentication, Worker public routes or response
payloads. The existing two Mode B tests are the regression gate.
The Worker CI dry-run is not a deployment; no production credentials or
bindings are to be touched.

The KDE host reported `No coredumps found` for
`coredumpctl --no-pager list /usr/bin/repoticker`. This only rules out a
currently retrievable dump under that exact executable filter; the earlier
`corrupted double-linked list` line remains unattributed. Issue #23 is
still open. Journal metadata and process identity are the next diagnostic,
not a release gate waiver.

## Validation status and acceptance evidence

- Source review: docs, JS test files, signatures and referenced modules
  inspected. Test JavaScript syntax was checked statically in isolated V8;
  no runtime network, SQLite or OS Keyring execution was available locally.
- Required final STABLE gate: **NOT EXECUTED** as of this receipt. The
  project CI shall run Node26.13.0 JS tests, Rust unit/Clippy/compile and
  Python release contracts on the exact candidate SHA.
- Known-FLAKY suite: none classified in the release-delta inventory;
  no tests were silently moved to a flaky group.
- Native KDE and Windows package QA: requires separate exact-SHA artifacts,
  checksums and operator acceptance. Browser and native surface tests
  cannot substitute for physical compositor checks.
- Hosted Worker/prod deployment: NOT ATTEMPTED. Dashboard variable
  retention (`keep_vars`) must be resolved before any redeploy.
- Production promotion: BLOCKED until stable gates pass, native crash
  report #23 is triaged, and the owner explicitly authorizes release.

**Release gate**: pending final complete STABLE run,
Windows artifact acceptance, KDE user smoke and **corrupted double-linked
list root-cause evaluation**. `keep_vars` is separately required before
any future Cloudflare Worker redeploy; this Mode B suite must not deploy
the Worker or change its configuration.