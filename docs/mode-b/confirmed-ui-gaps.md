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
**When:** double Fetch, Safe Sync on same repo while the first operation is active, then Quit/cancel while child is owned; release the barrier.
**Then:** no second Git mutation or forced push, exact busy/aborted outcome, only owned child group terminated, no dangling operation lock, local and remote refs unchanged except for independently permitted first operation. A non-mutating monitor event must not trigger another local scan.
**Mutations to kill:** remove busy lock, skip shutdown admission check, cancel the whole process set instead of owned children, allow concurrent Safe Sync to pick a switched branch.

**Isolation:** no real personal repos, no real GitHub push, no `sudo`, no Cloudflare. Use local temporary bare Git repositories and deterministic event barriers; retain one focused native acceptance for OS cancellation semantics.
