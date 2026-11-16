# Mode B: Quota WebView and native OAuth/Keyring evidence crosswalk

**Audit contract:** the operator's `AGENT.md` Section 8.1 selects **MODE B — Testing**. Its mandatory Stage 3–8 inventory/branch/negative/interaction/coverage gates precede Stage 9 test implementation, and all ordinary STABLE/FLAKY suite execution is deferred to Stage 11. This is **source-and-existing-test evidence migration**, not a run or a complete coverage result.

Baseline immutable `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; audit parent `cca117342370338dbc1c2fa913c223391d64d05f`.

| Real production subject | Exact source blob | Test source opened | Test ownership |
| --- | --- | --- | --- |
| `apps/desktop/ui/quota.mjs` | `d43ce98c8a8b000d7f344b39fe3f55b4b142e4d5` | `tests/quota-mode-b.test.mjs` `4c5b8eadc240fcb3de61652885c7d3d0b5d60e6f` | 10 real dynamically imported controller test bodies |
| `apps/desktop/src-tauri/src/github_native.rs` | `30e0f93a14f603b29720c0be0c5b128fae836196` | 4 actual `#[test]` bodies in same Rust file (lines 241–299) | Pure credential record, finite field, expiry and form evidence; no Keyring or HTTP executed |
| `apps/desktop/src-tauri/src/github_session.rs` | `fa0754cf19a9480c7adefd5e3679d22e8a58aaf5` | 7 `#[test]` bodies in same Rust file (lines 493–647) | 6 call actual methods/validation/state, 1 checks hardcoded terminal reason labels only (lines 533–544); **not** an AppHandle/Keyring/HTTP test |

**Counting discipline:** 21 reviewed case bodies across these three sources, **20** directly execute the production subject/its actual state helpers and **one** examines only fixed reason literals. Neither source-count nor prior CI baseline proves Stage 11 outcomes. `tests/quota-surface.test.mjs` supplies CSS/source structure contracts and some genuine `quota-size` tests, **not** additional tests of `quota.mjs`. Separate `tests/mode-b-billing-auth-races.test.mjs` exercises the imported billing cache and notification tracker and must be owned by those helper modules, not falsely counted as direct Quota controller coverage.

## Stage 4: exact source-to-assertion crosswalk

### Quota WebView controller: real imported module and fake-only external Tauri

`tests/quota-mode-b.test.mjs:44–153` builds a synthetic document and native IPC/event adapters, then at `:117` imports the **real** `quota.mjs?mode-b-` URL. Tests exercise actual module closure state and event callbacks. This is direct E of the JS controller, **not** proof of native WebView permissions, compositor geometry, actual GitHub transport, real WSS or Keyring.

| Real source guard/line | Existing exact test assertion and observed result (E) | Still P or OS |
| --- | --- | --- |
| `quota.mjs:117–127 selectedOrganization` casefold/mismatch | `quota-mode-b:155`: same Team/team returns configured Team; team-old vs team-new returns empty scope; configured-only and monitored-only accepted; no old-org billing API GET | P Unicode/untrusted org name, both nonstrings, mixed normalized identities and a late native scope change |
| `:156–191 refresh` request revision | `quota-mode-b:182`: old deferred initial monitor IPC reply arrives after new monitor event; visible Tasks 5/2 persists, old 1/0 cannot overwrite; no `get_snapshot` | P late *rejected* initial read after newer success; scope and kind changes between first/second IPC, event listener failure |
| `:196–218 refreshMonitorOnly` exception path | `quota-mode-b:201`: after known 5/2, failed current monitor read yields Status unavailable, fixed message, raw native exception absent; `:269`: initial denied read recovers after trusted event to 4/2 | P two overlapping monitor events with late failure; unauthorized scope vs stale previous billing state |
| `:136–155 scheduleBilling` generation/account | `quota-mode-b:216`: team-old billing response blocked, new team-new usage 222 shows, late old 111 never appears; no full Git scan | P same-scope multiple events avoid duplicate billing GET; old rejected request must not erase newer good scope |
| `:112 statusUnavailable / :149–151 billing failures` redaction | `quota-mode-b:253`: synthetic provider exception marker never rendered, unavailable shown; no `get_snapshot` | P unusual provider Error objects/hostile names inserted through actual DOM text sink; real remote error/redirect semantics |
| `:156–191 refresh` invalid account scope | `quota-mode-b:285`: configuredOrg numeric 0 refuses any provider GET, fixed unavailable state; corrected scope event resumes org GET | P invalid arrays/proxy objects, contradictory prior scope on reauthorization |
| `:170 nativeKind / :251 applyHoverKind` rejection/recovery | `quota-mode-b:303`: rejected native popup-kind IPC yields bounded unavailable, then event recovers to Tasks 2/0 | P unknown-but-resolved kind, sequential usage-shown rapid toggles, stale kind response reverting newest hover |
| `:222–232 refreshLocale` fallback and revision | `quota-mode-b:318`: failed locale IPC falls back EN, retains trusted 4/1 and does not GET provider; `:336`: delayed old pt read cannot override newer ru and Cyrillic Tasks label | P all 20 locales and RTL multi-state UI + failure racing an auth event |
| `:13–25 add/line` text-only display | **I** through actual popup rendering; tests :253 verify raw transport errors cannot enter visible text | P adversarial provider name with HTML-looking markup, `dir=auto` and number `dir=ltr` in real synthetic DOM; physical native tooltip |
| `:234–248 subscribe` listener unavailable/rejected | **P** no inspected test of exact missing-event/permission-rejection branch | Must display finite unavailable state, invalidate outstanding reply, no bogus GitHub auth loss; host Tauri capability acceptance |

### Native GitHub OS credential and HTTP adapter: pure E versus external P

| Source guard/method | Inspected E in actual Rust `github_native.rs` tests | P/OS |
| --- | --- | --- |
| `:21 device_challenge_fields` only public client_id | Inline `:241`: assert exact one-element client_id form | Native HTTPS request body and fixed host, disabled redirects; no outbound secret |
| `:48 CredentialRecord Debug` redaction | Inline `:248`: JSON round-trip retains exact fake access/refresh strings, Debug contains neither secret marker | Native logger and IPC/event sinks; surprising Unicode formatting |
| `:60 from_lease` checked_add/expiry ordering | Inline `:277`: `u64::MAX` issuedAt returns BadResponse and refresh lifetime shorter than access rejected | Successful exact expiry +1, equality, independent overflow of access vs refresh |
| `:80 decode` schema | Inline `:260`: malformed/missing JSON, version 2, empty refresh, inverted expiry are CorruptCredential | zero access expiry, equal expiries, wrong type, duplicate/unknown keys, payload cap |
| `:100–129 NativeCredentialStore::entry/load/replace/clear` | No direct OS Keyring invocation in four inline tests | O3 real external-adapter deny/no-entry/invalid record and idempotent removal, KDE/Windows physical vault |
| `:138–225 GithubOAuthHttp::new/submit/begin/poll/refresh` | Only the pure form helper has E; parser helpers covered separately | Fixed HTTPS endpoints, redirect refusal, 8191/8192/8193 streaming byte cap, 401/403/429/5xx, DNS/TLS/timeout, invalid UTF-8 and body redaction |

### Native GitHub authorization session: manager E does not equal AppHandle E

| Real branch/guard | E actual `github_session.rs` inline Rust assertion | Native P/OS |
| --- | --- | --- |
| `:117–153 public_error/reason_category` redacted finite errors | Tests `:493` nine error kinds yield no private token prefixes or token URL; `:609` six exact public label/message pairs | Exhaustive other HTTP statuses and emitted Tauri event payloads |
| `:388–395 valid_user_code` strict 9 ASCII uppercase/digits | `:515` accepts ABCD-1234 and WDJB-MJHT; rejects seven wrong length, lowercase, token-like, separator/space cases | Actual clipboard command `:401` success/error and OS permission; UTF-8/NUL, byte-length variants |
| `:46–82 manager.progress/set_progress` | `:547` starts idle, rejects duplicate progress, updates phase and redacted reason | Poisoned progress mutex, actual no-duplicate event emitter |
| `:55–64 invalidate/active` generation | `:576` old epoch invalidated sequentially, `:585` channel-controlled worker old epoch false after newer begin | Genuine `github_begin` / HTTP/poll/Keyring interleavings and delayed notification |
| Hardcoded four terminal failure reason literals | `:533` checks char shape on **inline literal strings**, not invocation of `poll_authorization` | Do **not** use this test as evidence for actual reason publication from GitHub provider state |
| `:219 github_auth_status` vault read and status projection | Only state helpers called in existing tests | Actual no credential, expired credential, locked vault and whether false-connected + previous connected phase can disagree (AS3 hypothesis) |
| `:249 github_begin / :286 poll_authorization` | Real `GitHubAuthManager` atomic epoch and Core `DeviceSession` separately tested | No real command; AS1 stale HTTP error on previous generation and AS2 check-before-publish terminal race **unconfirmed**; avoid changing auth semantics |
| `:416 github_disconnect` and `:433 github_access_token_with_cache` | Pure manager version tests, source shows vault_gate for both and cache generation snapshot | Native vault read/write and ETag rotation under same lock, denied delete/read, new vs old account, no JS exposure of private getter |
| `:155 publish_with_reason` and `:174 publish` | `set_progress` E only | Tauri emit rejection, relay restart once on connected/disconnected, no raw credential in events or debug |
| `:474 github_open_device_page` | No real platform test | KDE xdg-open/Windows shell fixed device URL and launch failure |

**Architectural STOP boundary:** changing credential persistence, status semantics or auth generation handling based only on AS1/AS2/AS3 suspicion is not allowed. Characterize actual outcomes with controlled HTTP and vault-adapter barriers; if a fix changes authorization/storage/public contract, present 2–4 options before production implementation. The current audit has **not** reproduced a native OAuth defect.

## Stage 5: Positive and N1–N12 local applicability

| Category | Quota JS controller | Native OAuth HTTP/Keyring | Native auth session |
| --- | --- | --- | --- |
| Positive | E real UI model/events, P host | E pure record/form, P external | E pure phase/epoch, P commands |
| N1 | E bad scope and kind IPC; P hostile names | E malformed JSON, P bad HTTP body | E invalid copy code, P OS clipboard |
| N2 | E stale/unknown, P limits and 20 locales | E overflow, P 8192/8193, expiry = boundary | E epoch order, P timeout/deadline and exact now |
| N3 | E synthetic native/provider errors, P hosted provider | P network status/TLS/timeout/429 | P poll/begin/refresh external failures |
| N4 | E stale request discard, P repeat same-scope billing coalescing | P retry token rotation/delete | E duplicate progress; P repeated native Connect/Cancel |
| N5 | E old/new event ordering; P multiple overlapping events | P OS vault concurrent operations | E pure atomic epoch; P HTTP/Keyring/emit races |
| N6 | E contradictory owner provenance; P nested malformed runner_state NM1 | E six corrupt persisted JSON values | P expired/corrupt vault and stale progress |
| N7 | E no old-scope billing; P real native capability | E public client-id only; P HTTP endpoint/redirect | E exact public copy code, P effective Tauri JS command allowlist |
| N8 | E pt/ru stale locale order; P RTL/time | E checked overflow; P real expiry timing | E epoch state; P fake clock and old/new authorization expiry |
| N9 | P physical tooltip lifecycle | P OS wallet/browser prompt and Quit | P native clipboard and app close |
| N10 | E provider raw error not displayed; P real DOM injection/provider text | E Debug redaction, P real logs/Keyring | E finite messages; P Tauri event/secret projection |
| N11 | NA | NA | NA |
| N12 | P native cache/host, no local disk inside quota.mjs | P denied/locked Keyring | P Keyring and ETag consistency |

No broad Stage 5 `✔` is warranted: each relevant file contains E and P/OS outcomes. Separately, current Stage 5 global NA assignments must be reviewed on actual ownership, **not** rewritten from this local checklist.

## Stage 6–8 explicit independent next cases

- **Q1:** actual Quota controller with absent/rejected Tauri event listener, late healthy monitor response, no false GitHub auth status.
- **Q2:** same-scope repeated billing events and rejected old request with newer scope and rapid kind toggles; assert exact native `github_api_get` counts and visible data.
- **Q3:** all supported locales/RTL and provider-name injection rendered through `textContent`, no HTML nodes or raw provider exception in view.
- **ON1:** real `CredentialRecord` exact equality and overflow table and corrupt stored schema; existing positive and failure branches not recounted.
- **ON2:** actual native OAuth HTTP adapter with external wire stub, 8191/8192/8193 bodies, redirects, transport failures, bounded error strings and pinned endpoint.
- **ON3:** real credential store adapter with injected OS keyring success/NoEntry/denied/corrupt plus readback and no partial token-pair write.
- **AS1–AS3:** source-derived stale error/terminal publication and expired status inconsistencies; **diagnostic hypothesis only** pending controlled native command-seam reproduction.
- **AS4–AS6:** token+ETag atomic generation, vault lock + disconnect/relogin and Tauri command permission boundary.
- **O3 host:** native KDE KWallet and Windows Credential Manager OS acceptance must be recorded separately from inline Rust tests.

**Stage 8 decision:** only E/P/OS hyperlinks and precise remaining work may be migrated. Stage 5 stays **810 `?`, 230 `✖`, zero `✔`**, Stage 3 AST completeness open, all 12 stages not complete. Mode B coverage is not 100%, and test-run counts are unchanged. No source, tests, CI or credentials touched.
