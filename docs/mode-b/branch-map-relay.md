# Mode B: verified relay branch/evidence map and gaps

Exact baseline: \`5b07a3273a27516af8ceb793f0d427a1bada964b\`.
Coverage terms here: **E** means an actual source execution and assertion
exists in the inspected Node suite; **P** means a known missing decision
outcome to implement; **S** means only source/packaging contract,
not runtime behavior. This is a **Relay-domain branch map only**, not
a claim that full-repository Stage 4 or Stage 12 is complete.

## Function-by-function decisions and mapped evidence

| Source API or business rule | Branches / outcomes that must differ | Existing behavioral assertion(s) | Remaining coverage |
| --- | --- | --- | --- |
| \`canonicalRepository\` | string/non-string; short/overlong; exactly two path components vs traversal, empty and malformed; casefold | \`relay-protocol\`; \`mode-b-relay-protocol\` | E; audit Unicode near 201-boundary |
| \`allowedRepositories\` | absent/type/too-long; list 1/100/101; scoped/unscoped; duplicate casefold; malformed/global wildcard | \`relay-protocol\`; \`mode-b-relay-protocol\` | E |
| \`isAllowedRepository\` | missing or wrong Set, invalid repo, exact permission, owner wildcard, cross-owner denial | \`relay-protocol\`; \`mode-b-relay-protocol\` | E |
| \`validDeliveryId\` | exact UUID/malformed and uppercase canonicalization | both protocol suites | E |
| \`parseCursor\` | absent defaults zero; 0/1; max safe; unsafe; malformed/negative/leading zero | both protocol suites | E |
| \`cursorFromUrl\` | no params, one cursor; duplicate/unknown/long/malformed query | both protocol suites | E; explicitly test URI >48 characters |
| \`validatedWorkflowEvent\` | signed ping; workflow_run known activity/status pairs; unknown event; invalid JSON/UTF8; cross-owner; strip conclusion and payload | both protocol suites | E |
| \`boundedRequestBody\` | missing reader, empty/exact/over-limit; malformed/mismatched Content-Length; chunk overflow; stream error | both protocol suites | P: non-byte chunk, failed reader cancel and no-body nonzero length; do not change implementation to fit assertion |
| \`validClientAuthorization\` | 31/32/256/257; bad charset/header/secret, correct/mismatch; concurrent calls | both protocol suites | E; external crypto failure needs redaction at route layer |
| \`verifyGithubWebhookSignature\` | HMAC exact raw bytes; malformed header/body/secret; tampered bytes and changed secret | \`relay-webhook-signature\` | E |
| \`handleRelayRequest\` | missing Worker bindings; wrong route/method; 503 redaction; authenticated GET/WSS; signed POST, caught rejected DO promises | \`relay-worker\`, \`mode-b-relay-worker\` | E; first discovered defect fixed by awaited route dispatch |
| Worker \`ingest\` | invalid method/query/type/secret/body size/signature/event/delivery; valid ping/no DO; valid 202; DO returns other status, rejects | \`relay-worker\`, \`mode-b-relay-worker\` | E |
| Worker \`subscribe\` | authorization/Origin/Cookie; invalid cursor; upgrade required; bounded forwarded URL/headers; DO reject and concurrent cursors | \`relay-worker\`, \`mode-b-relay-worker\` | E |
| \`RelayHubController.constructor\` | schema init and SQL; WebSocketAutoResponse defined+supported vs absent; socket adapters | \`relay-hub\` SQLite fixture, Worker dry-run entry | P: actual auto-response constructor branch and failed database initialization |
| \`RelayHubController.history\` | cursor ahead/stale/missing, 24h exact boundary, 128 entry cap, revoked allowlist, monotonic high watermark | \`relay-hub\` | E; P: time rollback behavior and empty history with far-future cursor |
| \`RelayHubController.ingest\` | duplicate delivery, 120th accepted/121st denied; minute rollover; retention; SQL rollback, multi-request concurrency | \`relay-hub\` SQLite fixture | E; P: backward clock admission remains bounded |
| \`RelayHubController.broadcast\` | no hint; healthy/backpressured socket at exactly 65536/65537; send throws; isolate other subscribers | \`relay-hub\` | P: empty hint has no side effects; failed socket.close inside error catch |
| \`RelayHubController.fetch\` | 401/503 auth/config, ingest 413/400/422/429/202, GET 400/404/405, WSS upgrade 426, socket cap 429, hint/reset/ready | \`relay-hub\` | P: malformed JSON 400 and independently bad v, delivery, missing repository each 422 with zero DB writes |
| \`RelayHubController.webSocketMessage\` | ping/pong vs all other client commands closed | \`relay-hub\` | E |
| \`RelayHubController.webSocketClose\` | readyState=OPEN forwards code/reason; already closed does nothing | No matching runtime test identified | P: both state outcomes and callback cleanup contract |
| Cloudflare \`RelayHub\` adapter and default fetch | class constructor delegates to controller; fetch/message/close calls forwarded correctly | \`relay-webhook-signature\` source-contract + Worker dry run; not runtime adapter invocation | P: adapter delegation integration, or explicit acceptance that bundle-only proof is insufficient |

## Planned concrete cases after full-repo Stages 3–8

1. \`GivenNoReaderWithClaimedContentLength_WhenBounding_ThenFailClosed\` (N1/N6/N7).
2. \`GivenNonByteStreamChunk_WhenBounding_ThenRejectWithoutUnhandledCancellation\` (N1/N2/N3).
3. \`GivenLongQuery_WhenParsingCursor_ThenRejectWithoutPrivateReplay\` (N2/N7).
4. \`GivenAutoResponseSupport_WhenConstructingHub_ThenInstallPingPongExactlyOnce\` (N5/N6).
5. \`GivenMalformedJSONAndInvalidInternalSchema_WhenHubIngests_ThenRejectWithoutWrites\` (N1/N6/N7).
6. \`GivenEmptyOrThrowingSocket_WhenBroadcasting_ThenNoLeakAndHealthySocketReceives\` (N3/N5).
7. \`GivenOpenOrClosedSocket_WhenWebSocketCloses_ThenDoNotDoubleClose\` (N4/N5).
8. \`GivenBackwardWallClock_WhenRateAndHistoryAdvance_ThenNoBudgetBypass\` (N2/N8).
9. \`GivenCloudflareAdapterCallbacks_WhenInvoked_ThenDelegateOnlyToRealController\` (N4/N9).

These are *outstanding behavior contracts*, not placeholders or waived cases.
If a case reveals a product defect, follow the project root-cause protocol;
the test must not be softened. No test implementation is authorized until
the **full** Stage 3 inventory, Stage 4 branch map, Stage 5 cell matrix,
Stage 6 interactions, Stage 7 estimates and Stage 8 coverage map are
finished, as required by the operator's mode B SSOT.

## Relay interaction matrix (to expand at repository scope)

| Independent dimensions | Meaningful combinations and expected state |
| --- | --- |
| Allowlist exact/owner wildcard/revoked × signed event allowed/denied | 202 minimal hint vs 422 before DO; revoked history invisible |
| Native auth correct/wrong × Browser Origin/Cookie | native WSS allowed; browser claim rejected 403; invalid bearer 401 |
| Cursor fresh/stale/forward × retention age 0/24h/>24h × 128 capacity | bounded replay or reset; no private stale hint |
| Repeated delivery × 120/min budget × same/new minute | one cursor, no extra budget for duplicates; 121st fail 429 |
| SQLite success/failed insert × broadcast normal/throw/backpressure | atomic SQL rollback, healthy subscribers continue |
| Webhook secret/candidate missing × Worker variables missing/present | fail-closed 401/503; do not erase private configurations |
| WebSocket on/offline × REST reconciliation/cooldown | REST remains authoritative, relay hint never concludes CI result |

N11 is **not applicable** (RepoTicker has no entitlement or purchase
logic); no 'paid/free' fabricated test is appropriate. N12 explicitly
applies to durable SQL writes; N8 applies to wall-clock age and budget.

## Mutation review obligations

Test changes in these business guards must kill at least one assertion:
\`>=120\` to \`>120\`, \`>65536\` to \`>=65536\`,
\`HISTORY_AGE_MS\` comparison, allowlist \`||\` to \`&&\`,
signature verification removed, unauthorized browser accepted, 401/403
inverted, revision ID ignored, duplicate budget incremented, 24h
expiry extended and SQL transaction removed. Do not claim mutation kills
until actually executed or the test's asserted effect is explicitly proven.
