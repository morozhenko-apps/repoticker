# Mode B: GitHub ETag cache exact branch and assertion reconciliation

Production baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`; source `apps/desktop/src-tauri/src/github_etag_cache.rs` (blob `174c7f880b5b2fc1e3be1d652582e1265eccbc55`). Prepared parent: `47797013b0d484c49f356de70d629f5f5da8491a`.

**Scope:** Stage 3–8 source-level analysis, not newly executed test coverage or Stage 9 production change. The cache holds process-local allowlisted JSON and ETags; auth/scope generations must prevent replay.

## Exact evidence: 13 real inline Rust tests inspected

| Existing test(s) | Hard assertions actually present |
| --- | --- |
| `only_matching_conditional_entry_can_supply_304` | Missing entry returns None; weak ETag is saved; same path/tag yields projected JSON; a distinct page path returns None. |
| `generation_change_blocks_in_flight_and_old_cached_private_data`; `multiple_invalidation_generations_reject_every_prior_snapshot` | Invalidate increments generation, clears ETags, blocks prior 304 and rejected save even across multiple generations. |
| `late_http_200_does_not_replace_newer_cache_value`; `mode_b_late_unconditional_200_cannot_evict_newer_conditional_value` | Old in-flight unconditional/conditional 200 cannot evict a newer cached ETag/projection for the same path. |
| `concurrent_auth_invalidation_rejects_delayed_old_generation_reply` | Real Rust thread barrier yields old generation only after invalidate and new save; rejected old save and exact new projection asserted. |
| `different_paths_and_tags_never_share_conditional_private_data`; `mode_b_stale_conditional_reply_cannot_replay_after_logout_and_new_login` | Same ETag on different paths is isolated; identical path and tag across auth epochs cannot replay old account JSON. |
| `cap_and_etag_validation_prevent_unbounded_or_malformed_cache` | 65th distinct item evicts first from 64-entry FIFO; malformed/unquoted/newline ETags and too-large JSON never enter; billing excluded. |
| `invalid_conditional_tag_evicts_old_projection_instead_of_reusing_it` | Four malformed tags and None delete an older same-path cache item rather than retaining stale projection. |
| `projected_json_at_exact_maximum_is_allowed_but_one_byte_over_is_not` | Exact 65536 serialized bytes accepted; 65537 evicts same-path ETag; value is real `serde_json::Value`. |
| `billing_path_is_never_reused_as_an_etag_even_with_valid_headers`; `mode_b_billing_disallows_etag_even_when_cache_holds_same_tag_elsewhere` | Billing API paths remain uncached even with valid ETags shared by another eligible endpoint. |

The assertions use real native cache logic. Their previous CI success is baseline only; no fresh compile or mutation run here.

## Production methods, predicates and independent outcomes

| Method | Distinct executable outcomes | Evidence and remaining obligation |
| --- | --- | --- |
| `valid_etag` (private) | Optional exact `W/` prefix; raw and tag lengths; leading/trailing double quotes; all bytes ASCII graphic, including no control/non-ASCII | **E partial** newline, Unicode, unquoted; **?** 0/1/2 and 127/128/129 UTF-8 bytes, weak-tag prefix at boundary, CR/tab/DEL and malformed leading `W/` |
| `cacheable` (private) | Path contains exact `/settings/billing/` => false; other strings => true | **E** exact billing, ordinary path; **?** case sensitivity and segment boundary, without reinterpreting allowlisted endpoint rules |
| `GitHubETagCache::snapshot` | Mutex normal/poison; billing bypass vs eligible path; path absent/present; copy ETag + current generation | **E** normal/cache/billing path; **?** poison, clone alias and identical-looking path variants |
| `unchanged` | Generation equality or inequality; Mutex normal/poison | **E** difference after invalidate; **?** equal current snapshot and poisoned mutex |
| `not_modified` | Auth/scope generation mismatch; lookup ETag None; entry missing; path mismatch; tag mismatch; success returning cloned projected JSON | **E** generation, absent, wrong path, identical tag across accounts; **?** same path with tag switched after lookup, caller cannot mutate cache via returned clone |
| `invalidate` | Mutex normal/poison; wrapping generation increment and clear all 0..64 entries | **E** 1 and 2 invalidations; **?** poison and literal wrapping u64 MAX state (private test fixture), full 64-entry purge |
| `save` | Wrong generation => false/no write; same epoch but newer item ETag != lookup => true/no overwrite; matching etag => remove old entry | **E** old generation false and old concurrent 200 ignored; **?** same-gen same-path out-of-order 304+200 with changed tag, empty cache and absent old entry |
| `save` | `etag=None` or malformed => true after eviction; valid ETag required | **E** None and malformed; **?** individual ETag length and weak prefix boundaries |
| `save` | Non-cacheable billing OR JSON serialized size >65536 / defensive serialization failure => true after eviction | **E** billing and exact 65536/65537; **?** cached→billing-like same path eligibility transition is not a real endpoint migration, avoid fake case; `Value` serialization failure is defensive/unreachable with valid JSON Value |
| `save` | Exactly 64 active entries pops front before insert, else push; stores cloned value | **E** 65th entry evicts oldest; **?** update existing first item vs recency ordering and defensive clone after caller mutation |
| Shared mutex | Poisoned lock recovered via `into_inner()` on all public methods | **?** direct deterministic native poison tests; use no sleeps |
| Cross-account path/tags | Returned projected private payload must match path, tag and auth generation | **E partial** two-epoch identical tags/path and barriers; **?** overlapping same-generation stale `not_modified` then new save, changed ETag and different path plus re-login |

## Positive / N1–N12 evidence matrix for this module

| Category | Status | Exact gaps or applicability |
| --- | --- | --- |
| Positive | E partial | Normal save, read and 304 have real tests; clone and equal-generation paths incomplete |
| N1 | E partial / ? | Unquoted/non-ASCII tags tested; empty/one-byte/weak-prefixed and malformed control bytes remain |
| N2 | E partial / ? | 64/65 entries, 65536/65537 bytes tested; 128/129-byte ETag and near-boundary weak tag not measured |
| N3 | NA | Cache itself performs no HTTP; failed REST network is a separate native API adapter |
| N4 | E partial / ? | Idempotent same-path save and stale same-gen write after old lookup need independent assertions |
| N5 | E partial / ? | Channel-based generation race exists; poison, parallel 304/200 and clone-on-read mutation missing |
| N6 | E partial | Malformed ETag removes stale entry, invalidation clears private JSON |
| N7 | E partial | Prevents cached private JSON escaping wrong path/account; cacheable path still relies on upstream API route allowlist |
| N8 | NA | No wall clock, locale or timestamp; generation overflow is N2 correctness, not DST |
| N9 | NA | No UI/window transitions in this cache; auth revoke is N5/7 |
| N10 | E partial | Private data excluded on scope generation and billing; cloned projection and poison behavior pending |
| N11 | NA | GitHub Actions billing is informational; RepoTicker has no paid entitlements |
| N12 | ? | In-memory poison recovery, no file/database disk I/O |

## Stage 9 case design, only after global Stage 3–8 completion

- **ET1 (N1/N2):** table-driven valid/weak/unquoted/invalid ETag inputs around 0/1/2 and 127/128/129 bytes; verify return and cache state, including poison-free unchanged state when invalid.
- **ET2 (N4/N5/N10):** same-generation overlapping `snapshot`, `save` and `not_modified` with old/new ETags plus changed JSON. Check that late old responses never restore stale content and returned values are detached clones.
- **ET3 (N4/N5):** multiple writes to same path vs FIFO capacity 64/65, removal+append order and old lookup behavior; include independent path key despite identical ETag.
- **ET4 (N5/N12):** deterministic poisoned-mutex recovery across `snapshot`, `save`, `not_modified`, `unchanged`, `invalidate`; synchronization via channels, no timing assumptions.
- **ET5 (N2):** generation `u64::MAX` wrap needs a module-local private fixture or classification of practical unreachability, never unrealistic public API assertion.

Mutation guards: remove generation check; compare ETag using only path; reverse `!=` in `save`; allow billing; shift 65536 to 65535 or 65537; allow 65 entries; discard clone; skip invalid ETag eviction. Every asserted mutation must fail a real behavior test. No mutation was executed.

**Boundary:** No change to GitHub credential handling, OAuth, IPC, production source, CI or Cloudflare. Stage 3–8 are still PARTIAL globally.
