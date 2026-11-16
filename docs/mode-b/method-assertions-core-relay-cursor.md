# Mode B: Core relay parser and cursor assertion receipts

Production `crates/repoticker-core/src/relay.rs`, blob `16ece07fc1e2b065b76b69e22da471ece22b3325` at `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Classification parent `e12490add4d2d36b27264163f5118d02a2f95692`. No code execution during this documentation pass.

## Six methods and exact existing evidence

| Line | Real method | Evidence status | Existing proof and missing independent cases |
| ---: | --- | --- | --- |
| 23 | `valid_component` | I_PARTIAL | Called through parse_frame and RelayCursor::new for bad path, empty and accepted names. Missing exact 99/100/101-byte component table, dot/hidden-dot, Unicode, separator and control-character variants |
| 33 | `canonical_repo` | I_PARTIAL | Indirectly tested by canonical uppercase TEAM/Repo, duplicate case-insensitive selection, invalid traversal and cross-owner cases. Missing no slash, extra slash, empty owner/repo, whitespace, encoded slash and boundary-length cases |
| 47 | `parse_frame` | E_PARTIAL | Real direct tests accept hint/reset/ready, reject empty/2049 bytes, v2, negative/oversize cursor, extra security fields, invalid repo and batch type. Missing exact 2048-byte valid/invalid frame, malformed UTF-8, nonobject JSON, missing type/cursor, wrong JSON types, duplicate keys and precise error-code table |
| 89 | `RelayCursor::new` | E_PARTIAL | Real direct tests admit Team scope and all-repositories empty selection; reject different owner, duplicate canonical repositories and traversal. Missing 100/101 selection bound, cross-case owner length, whitespace and invalid account |
| 109 | `RelayCursor::cursor` | E_PARTIAL | Direct assertion after Reset(12); no initial-zero, replayed-hint, gap and Ready cursor transition checks independent of observe result |
| 113 | `RelayCursor::observe` | E_PARTIAL | Direct hints 1/replay 1/out-of-selection 2/gap 5, Reset 12, repeated Ready 12; all-repos monitor rejects other owner then admits own. Missing cursor 0, MAX, wrap/saturation, reset backward then prior hint, multiple Ready sequences, out-of-scope hint advances cursor, gap with disallowed repo and phase-state transitions |

## Positive and N1–N12 applicability

- **Positive E/I partial:** real frame parse and cursor state machine exercised in inline Rust unit tests, not a native WSS socket.
- **N1/N2 planned in addition to existing E:** JSON type/shape, malformed UTF-8, byte length 0/2048/2049, component 0/1/100/101, selection 0/100/101 and cursor 0/MAX/MAX+1.
- **N3 NA here:** network and transport faults belong to native relay transport, not the parser.
- **N4/N5 partial:** repeated hints, ready and reset observed; interleaved WebSocket callbacks vs native restart/authorization are separate integration obligations.
- **N6/N7/N10 partial:** extra fields and malformed payload rejection are covered in samples, but every independent parser arm and private-data exclusion still need a complete table. No raw event JSON should be treated as authoritative CI status.
- **N8 partial:** monotonic numeric cursor, no wall-clock or locale work in these functions. Saturation/restart state remains planned.
- **N9 NA for these pure methods:** app closure and socket teardown belong to native relay supervisor.
- **N11/N12 NA:** no monetization or storage side effects in the Core parser/cursor.

## Interaction and mutation targets

1. `parse_frame` must reject extra fields and invalid numeric cursor before any state mutation. Kill mutations removing exact object-size check, MAX_CURSOR filter, version check or canonical repo validation.
2. `RelayCursor::observe` must always reconcile on a gap, suppress a replay and not refresh tasks from an out-of-scope owner. Kill mutations changing `<= self.last`, `> last+1` to `>=`, ignoring selected repositories or omitting last advancement.
3. Reset can move the cursor backward by design; Ready is independent of Hint and may trigger a one-time ReconcileAll. Characterize reset-backward behavior without changing its persisted protocol semantics.
4. Join these pure tests with native `relay_transport.rs` fake-socket and real Rust supervisor tests. A JS mock event is not WSS authentication, TLS or Keyring acceptance.

Existing tests were inspected in source only; no STABLE/FLAKY gate, mutation run, native WSS, OS test or CI was executed. Stage 3–8 stay PARTIAL.
