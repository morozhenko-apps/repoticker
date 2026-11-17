# Stage 3: first real SHA-verified TypeScript AST slice (2026-11-15)

**MODE B / partial Stage 3, not full inventory signoff.** Three immutable source files were read from GitHub at `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`, reconstructed locally byte-for-byte and checked with `git hash-object`. The installed TypeScript AST parser then inspected each source file. The scan does **not** evaluate application code.

| File and exact Git blob | Callable AST nodes | Noncallable class declarations | Previous registry rows | Missing |
| --- | ---: | ---: | ---: | ---: |
| `apps/relay-cloudflare/src/worker.mjs` / `b13759d89d6c93ace5b23bfe89345f796042143d` | 5 | 0 | 5 | 0 |
| `apps/relay-cloudflare/src/hub.mjs` / `30cea0f820e9862233baa768090c3e63772118b9` | 14 | 1 | 10 | **5** |
| `apps/relay-cloudflare/src/index.ts` / `088c8911793bfcb6802d1846fa708f229a8b0924` | 5 | 1 | 6 | 0 |
| **Total** | **24** | **2** | **21** | **5** |

## Exact missing AST positions and evidence ownership

| Path:line:column | Source callback | Evidence status and required outcome |
| --- | --- | --- |
| `hub.mjs:19:43` | Fallback `makePair = () => Object.values(new WebSocketPair())` | **P_HOST**: real Cloudflare WebSocketPair; the existing Hub fixture injects a fake external socket factory |
| `hub.mjs:21:8` | Fallback `socketResponse = client => new Response(...101...)` | **P_HOST**: real Cloudflare 101 WebSocket response; existing test fixture injects its own response adapter |
| `hub.mjs:46:26` | `rows.filter` allowlist predicate | **I_PARTIAL**: actual Hub history with real in-memory SQLite, verify revocation and foreign entries |
| `hub.mjs:46:83` | `rows.filter(...).map` minimal hint projection | **I_PARTIAL**: exact permitted response fields; no delivery, bearer or CI conclusions |
| `hub.mjs:54:45` | `storage.transactionSync(() => ...)` | **I_PARTIAL**: actual SQL BEGIN/COMMIT/ROLLBACK tested through real Hub method, including failed insert and rate budget rollback |

The two callbacks on **line 46** are separate callable AST nodes and are now represented by two numbered rows with identical exact source-line snippets; the column-based identities above distinguish them.

## Existing tests reviewed and independent test owners

`tests/relay-hub.test.mjs:11–70` creates `DatabaseSync(":memory:")` and wraps a genuine SQLite transaction while injecting only external Cloudflare-style socket/time adapters. `:73–104` exercises stored deliveries, history, cursor retention; `:212–220` asserts rollback of hint and rate-budget after SQL trigger failure; `:320+` covers allowlist changes. **The 8-successful / 9th-rejected WebSocket admission case is already tested** at `:118–122` with the real Hub and injected sockets, so do not count it as an uncovered pure branch.

Remaining independent branch cases: **HB-AST-01** Cloudflare default WebSocketPair and HTTP 101 response with host failures (P_HOST); **HB-AST-02** exact history allowlist/projection with mixed repositories and revocation (partial I); **HB-AST-03** SQLite transaction callback atomicity under bad insert, idempotent retry and rate cap (reuse existing E/I before proposing more tests); **HB-AST-04** native/host socket lifecycle distinct from already-tested 8/9 pure cap.

## Validation and scope

Executed: `node --check /mnt/data/modeb_ast_qa/reconcile_source_exact.mjs` (exit **0**); `node /mnt/data/modeb_ast_qa/reconcile_source_exact.mjs` (exit **0**); `git hash-object` independently for each exact source blob (three matches). The detailed local JSON report is `/mnt/data/modeb_ast_qa/source-exact-ast-first-slice.json`.

This was a **source-exact three-file AST slice**, not the full repository's `docs/mode-b/tools/ast-reconciliation.mjs` Git baseline workflow. The container cannot clone GitHub due to unavailable DNS. The Rust cfg, other JavaScript/TypeScript/Python/shell files and full source-branch coverage remain unverified. No application test suite, STABLE/FLAKY suite, CI, deployment, mutations, actual Keyring or OS integration was executed. No production defect is implied by an incomplete inventory. Stage 5 stays 810 `?`, 230 provisional `✖`, 0 `✔`, and Stage 9 remains blocked.
