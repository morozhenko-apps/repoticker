# Mode B: two confirmed UI interaction test specifications

Baseline source SHA `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. These are **Stage 9 planned cases**, not implemented code, because complete Stages 3–8 per-public-method maps remain unfinished.

## Q3: detached Quota popup stale kind vs locale and scope

Target actual `apps/desktop/ui/quota.mjs` `onUsageShown`, `applyHoverKind`, `refreshMonitorOnly`, `refreshLocale`. The existing `quota-mode-b.test.mjs` covers invalid kind and late locale independently; it does not assert a user switching task→billing→runners while the older `get_selected_kind`/locale/scope IPC is outstanding.

**Given:** trusted old organization snapshot, deferred first native kind read and locale read, a distinct new organization, separately controlled event callback queue (Promises, not timers).
**When:** rapid kind switches followed by account scope change and new valid monitor snapshot; release old native responses in reverse order.
**Then:** visible kind remains latest accepted user choice; old organization's numbers never reappear; untranslated provider exception text remains absent; no `get_snapshot` local Git scan; no duplicate API calls for abandoned owner; ignored old event does not clear trusted new state.
**Mutations to kill:** remove generation guard, let stale IPC call paint, fail to invalidate billing state on owner change, or replace latest-kind logic with first-completer-wins.

## A2: main card double Fetch and native Safe Sync contention

Source: `apps/desktop/ui/app.mjs`, Tauri `main.rs` Git admission/operation lock, core `git.rs`. Existing Rust tests cover ref safety and owned-child cancellation; JS static contracts verify route structure but do not exercise **two competing UI command dispatches with an active owned child and Quit**.

**Given:** two enrolled Git fixtures and native fake external command/process adapter with a barrier at child registration; actual command admission and domain Git decision logic must remain real, not mocked.
**When:** (a) double-click the real card Fetch button while Fetch is active; (b) separately dispatch two direct native Fetch requests; (c) queue Safe Sync during Fetch and repeat Safe Sync after a first successful push; (d) Quit/cancel while an owned child is registered; release the controlled barrier.
**Then:** (a) the second card click requests Cancel rather than starting a second Fetch; (b) the two native Fetch calls are serialized, not silently treated as one or automatically rejected with a busy error; (c) no overlapping Git mutation, a second Safe Sync re-inspects state and normally returns AlreadyCurrent after the first permitted push; (d) only the owned child group is terminated, no dangling operation lock, and no post-Quit Git mutation. Local/remote refs change only by separately permitted completed operation. A monitor-only event must not start another local scan.
**Mutations to kill:** remove busy lock, skip shutdown admission check, cancel the whole process set instead of owned children, allow concurrent Safe Sync to pick a switched branch.

**Isolation:** no real personal repos, no real GitHub push, no `sudo`, no Cloudflare. Use local temporary bare Git repositories and deterministic event barriers; retain one focused native acceptance for OS cancellation semantics.
