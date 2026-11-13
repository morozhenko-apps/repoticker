# Mode B: native CI notification admission, deduplication and OS delivery

Production SHA: a3ba7fa30fc4c81890d3075f94142942d001cbf3. Source: apps/desktop/src-tauri/src/ci_notifications.rs, blob 08fb76fcad75bf91be341275fa8b463ef65a5948. Prepared documentation parent: 265b2a98ece1c2274c521b1643687704758d1c09.
Stage 3–8 method/branch and executable assertion review only. No new notifications were delivered, no native permission was modified, no tests were run.

## What the two real Rust tests establish

- notification_templates_are_complete_and_preserve_run_identity: a 20-locale catalog, supported locale IDs, nonempty and branded titles, nonempty localized permission/state/delivery errors, one occurrence of each of three placeholders in both success/failure body templates, successful substitution for one run ID/attempt/repository per locale, English fallback title/body for unknown locale.
- notification_delivery_is_opt_in_and_restricted_to_selected_scope: default Off refuses; Failures/Successes/Both filter conclusions, selected org case-insensitive and selected explicit repo; other org/repo, traversal, URI-like and nested path denied; run ID 0/>2^53-1 and attempt 0/>1_000_000 denied; empty selected repo list means all repositories in the selected org; missing selected org denies.

Both call real notification text or approved_scope logic. Neither creates a Tauri AppHandle, invokes ci_run_notify, acquires DeliveredAlerts mutex or calls a native notification service. Existing JS tracker tests independently cover silent baseline/dedup; they cannot certify native OS delivery or mutex behavior.

## Every production function and branch

| Surface | Real control-flow outcomes | Verified/remaining |
| --- | --- | --- |
| notification_catalog | OnceLock first initialization from bundled JSON, cached later reads, panic on invalid compiled catalog | E 20-locale catalog read; ? concurrency/init failure is build contract, malformed bundled locale should be caught by structural fixture before runtime |
| notification_error | Locale present vs EN fallback; permission/state/delivery string; unknown kind fixed text | E catalog errors nonempty; ? each returned error and fallback exact, unsupported kind path |
| notification_text | Locale vs EN fallback, success vs non-success template, repository/runId/attempt substitutions | E both result classes all 20 locales and EN fallback; ? escaping of maximum-length allowed ASCII repo, identity combination boundaries |
| DeliveredAlerts | Empty VecDeque by Default, Mutex lock success or poisoning error, bounded length 512 | Source only; ? 0/1/512/513 and failure path; no test calls native state |
| approved_scope: mode and numeric identity | Off/Failures/Successes/Both; allowed conclusion; run ID in 1..2^53-1 and attempt in 1..1_000_000 | E multiple outcomes; ? 1/max-safe successful id and 1/max attempt, other malformed conclusion strings |
| approved_scope: repository | split owner/name; both valid_name; reject dot/double dot, nested slash, selected org case-insensitively; selected list empty or exact repo matching case-insensitively | E other org, different repo, traversal, case-insensitive acceptance, empty selected list; ? empty strings, 100/101 byte name, punctuation variants, duplicate-case selected entries |
| ci_run_notify: platform | Non-Linux/Windows return Ok(false); Linux/Windows continue | ? compile/runtime platform path; a cfg! check alone is not native delivery proof |
| ci_run_notify: read config | read_config fails before permission, dedup or OS send; later read may become stale if settings change | ? denied/corrupted settings, mode/scope change between read and send (separate native race; no defect claimed) |
| ci_run_notify: admission | not approved => Ok(false), before OS permission or lock | E approved_scope helper only; ? real native command makes zero OS calls on disallowed scope |
| ci_run_notify: permission | PermissionState::Granted required; denied/error => localized failure | ? denied, prompt state, runtime service failure; must not report delivery or consume dedup |
| ci_run_notify: mutex | poison => localized state error; healthy lock serializes duplicate delivery | ? deterministic poison, two simultaneous same-fact calls, no double show, no partial state |
| ci_run_notify: duplicate key | canonical lowercase repo + run_id + attempt + conclusion; existing returns false | ? case-insensitive duplicate, different attempt or conclusion, exact same ID after account switch; no raw provider fields |
| ci_run_notify: send success/failure | Builds native localized toast under lock, show success pushes key, returns true; failed show returns localized error and does not record delivery | ? one success and one failed-send retry, no key on failure, exact title/body; user permission failure separate |
| ci_run_notify: bounded history | push one key, if length >512 pop oldest; repeated old fact can be emitted again after eviction | ? 512/513 with FIFO behavior; source intentionally bounds memory, not a permanent dedup ledger |
| locale and privacy | Translates only known template and validated ASCII repository identity, numeric run id/attempt; no token or arbitrary provider string argument | E scope and locale templates, native command ?; ensure no sensitive raw errors or logs from notification service |

## Positive + N1–N12 scope matrix

| Category | Status | Meaningful missing branch |
| --- | --- | --- |
| Positive | E partial | Pure approval and string rendering; actual send/dedup untested |
| N1 | E partial | Invalid scope and names; exact 100/101-byte, missing/double-slash, invalid conclusion |
| N2 | E partial / ? | Invalid ID/attempt extremes tested; exact valid max, 512/513 ledger bound untested |
| N3 | NA | No HTTP performed by native notifier; provider event collection belongs to JS monitor |
| N4 | ? | Duplicate same and changed attempts, failed send then retry, bounded FIFO replay |
| N5 | ? | Two concurrent native calls, config/scope change, poisoned lock |
| N6 | ? | Corrupted read_config and invalid locale fallback at native command |
| N7 | E partial | Native approval guard tested; actual command permissions and config readback unverified |
| N8 | E partial | Twenty locale templates; no time/timezone conversion in this native module |
| N9 | OS | Denied OS permission, focus/interruption, Quit while notification pending |
| N10 | E partial / ? | Only validated repo + numeric run fields accepted; actual toast/log and OS service error privacy unverified |
| N11 | NA | No paid notification entitlement |
| N12 | ? / OS | Config read failure, poisoned in-memory mutex and native OS notification unavailable |

## Planned focused tests after full global Stage 3–8 sign-off

- CN1: exhaustive approved_scope table for mode, numeric 0/1/max/+1, 100/101-byte names, selection combinations; kill each guard and AND/OR mutation.
- CN2: notification_error and notification_text exact locale fallback/unknown kind/placeholder/identity checks across twenty catalogs; kill missing translation and wrong conclusion template.
- CN3: actual ci_run_notify with external injected notification provider, managed config and delivered-state adapter. Test permission granted/denied/error, config failure, successful send, failed send then retry and duplicate. Use the real admission/dedup business logic.
- CN4: deterministic channel/barrier two concurrent calls, injected poisoned mutex, 512/513 FIFO expiry, changed run attempt/conclusion; show only intended events. No time sleeps.
- CN5: actual KDE/Windows notification permission/service denied, normal and Quit lifecycle, translated display; OS acceptance is not replaced by fake backend.

Important interaction: the native command checks a snapshot of settings before the synchronous notification show. If an account switch occurs during the operation, it may need a generation/authorization invariant. Investigate through a deterministic real-command harness first; changing existing permission or notification persistence contract may require the architectural STOP FACTOR. No false leak or confirmed race claim is made here.

Mutation review planned: force mode true, remove run identity bound, erase owner check, skip permission, move key insertion before show, remove mutex, alter duplicate key, remove FIFO pop, leak unsupported error string. Each mutation needs an executable failing assertion.

No production logic, Tauri permissions, CI workflow, provider settings or generated tests were changed in this audit. Global Mode B remains PARTIAL.
