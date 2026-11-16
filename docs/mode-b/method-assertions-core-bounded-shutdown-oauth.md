# Mode B: Core bounded work, shutdown, sync and OAuth method assertion reconciliation

Source-equivalent production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Classification parent `01eadc7911f4cbfc8be927cf5984105eb8ac7581`. Exact source blobs: `bounded.rs=b41e0b9d9c2de13f4555e63f5378b409d82dad4a`, `shutdown.rs=a9d8147a71efe78efbd3dbd7ef0c5d6109aa4733`, `lib.rs=f653cd6ae873fdaaa5eeaabbccdd67766e8d7847`, `github_auth.rs=ad10c5133b61e0e82706e3c274b3e78dacd066eb`.

This pass maps **nine real callable methods** to existing Rust source-level assertions. `E_PARTIAL` means direct evidence in a test body, **not current execution success or complete branch coverage**. The existing inline test functions were not part of the nine unresolved lexical rows; they are not counted again as newly discovered production methods.

## Method-to-assertion receipts (Stage 3–4)

| Source method | Existing direct assertions | Missing independent outcome |
| --- | --- | --- |
| `bounded::bounded_map` | Five inline tests: 12 tasks/limit 4 with exact maximum active; empty queue; limit zero falls back to one; blocked worker does not stall later admissions; callbacks on caller thread with monotonic counters; worker panic propagates | Single task; limit > task count; `started` callback panic and `completed` callback panic; worker and callback failure with in-flight sibling workers; exact no-callback behavior on empty pending |
| `ShutdownSignal::begin` | Three Rust tests: atomic exactly-one owner across eight concurrent attempts; repeated begin false; queued Git admission refused after quit | Cross-boundary native Git registration and app shutdown under simultaneous OS Quit |
| `ShutdownSignal::is_requested` | Initial false, post-begin true, remains true after subsequent begin, serialized lock queue rejected | Native operation lock recheck under actual Tauri command admission |
| `classify_sync` | Eight Rust tests: no upstream; in-progress; dirty; diverged; ahead; behind; up-to-date; exact unsafe-condition precedence; u64 MAX counts | Explicit pairwise mixed block combinations and zero/one transitions; native `--ff-only` command is outside this pure policy method |
| `DeviceSession::new` | Invalid/phishing URL variants; code character/length invalid; 0/3601 expires or interval; min and max interval; time overflow; supported source URL | Codes length 31/32/33 with ASCII/Unicode mixed values, exact 3600 expiry, overflow on next_poll_at independently, malformed public URI variations |
| `DeviceSession::next_poll` | Wait vs Ready; exact five-second and slowdown deadlines; clock rollback; expiry at equality; terminal-state Stop | Interval equality after 3600-second limit; post-terminal clock rollback; `u64::MAX` saturating time on poll ready |
| `DeviceSession::receive` | Pending, slowdown, Authorized, AccessDenied, ExpiredToken, four Failed responses, expired challenge, late response after terminal and cancelled | Saturating multiple slowdown near u64 MAX, exact expiry minus one transition, response sequence pairwise for every terminal state |
| `DeviceSession::cancel` | Pending becomes Cancelled; repeated cancel idempotent; Authorized/Denied/Expired/Failed unchanged; late grant rejected | Cancellation exactly as pending timer becomes due via native adapter; no actual provider request cancellation proven |
| `TokenExpiration::decide` | Use/Refresh/Reauthorize, exact access margin, refresh expiry equality, MAX saturated time, stale refresh earlier than access | Refresh margin = MAX for valid far-future refresh lease; missing/invalid native token record outside Core policy |

## Positive/N1–N12 coverage judgment (Stage 5, partial)

| Category | Core source evidence / planned gap |
| --- | --- |
| Positive | E_PARTIAL: all nine real methods called directly; additional branch values and native effects remain |
| N1 | E_PARTIAL for OAuth URI/code fields; planned boundary/error tables for callbacks and invalid native callers |
| N2 | E_PARTIAL zero limit, MAX counts, OAuth 0/3601, token expiry; planned exact 1/32/3600 and saturating transitions |
| N3 | NA for these pure Core methods: no network or HTTP; native OAuth requests and Git adapter tracked separately |
| N4 | E_PARTIAL idempotent shutdown, repeated device cancel, pending/slowdown; planned duplicate delivery and native callback effects |
| N5 | E_PARTIAL concurrent bounded tasks, competing shutdown owner; real AppHandle/OS cancellation remains separate |
| N6 | NA for in-memory state only; native persisted token corruption tracked at adapter boundary |
| N7 | E_PARTIAL OAuth verification URL admission and conservative Git states; native authorization boundary tracked separately |
| N8 | E_PARTIAL fake integer time rollback and expiry margins; no locale or timezone dependency in these numeric epoch rules |
| N9 | E_PARTIAL cancellation/panic, OS interrupt and termination not yet verified |
| N10 | E_PARTIAL restricted verification URI; do not infer vault or diagnostic secret zero-leak from pure state rules |
| N11 | NA: no paid entitlements in RepoTicker |
| N12 | NA at this Core level: no storage I/O; native Keyring/filesystem failures remain separate |

## Stage 6–8 interaction and mutation obligations

- **Core concurrency:** start and complete callbacks must remain on the coordinator; max live workers must never exceed limit; replacement work launches even if the earliest worker hangs. Mutations: replace limit.max(1), drop start_next after completion, call completion on worker thread, swallow work panic.
- **Quit:** atomic begin has exactly one owner even under simultaneous callers. Mutations: separate load/store race, reset requested flag, skip the post-lock admission check at native boundary.
- **Sync:** precedence missing-upstream > in-progress > dirty > diverged > ahead > behind > up-to-date. Mutations: switch ahead/behind condition, allow pull with dirty worktree, reverse priority, change boundary >0 to >=0.
- **OAuth:** public user code and fixed GitHub verification URI must remain allowlisted; once expired/denied/cancelled/authorized, a late response cannot change the phase; slowdown never reduces a wait; refresh lease expiry outranks access-time usability. Mutations: loosen URL or character validation, remove checked_add, change `>= expires_at`, make terminal receive resurrect session, reduce slowdown interval, reorder refresh expiry guard.
- **Cross-module gap:** `DeviceSession` pure tests must be joined to real `github_session.rs` epoch, OS vault, API adapter and Tauri event tests before claiming native OAuth safety. `ShutdownSignal` pure tests likewise do not prove native Quit drains owned child processes.

No source edits, test additions, final gate, CI, OS acceptance or provider calls occurred. All nine rows are **E_PARTIAL**, Stage 3–8 global status **PARTIAL**.
