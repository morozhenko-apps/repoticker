# Stage 3 AST reconnaissance (read-only)

Purpose: reconcile the *actual callable AST nodes* of JS/TS and Python production source against the 80-file `method-level-discovery.md` register using the immutable `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3` Git object.

This is an **inventory aid only**. It does not modify files, execute product tests, run CI or deploy. It does not attest to actual branch coverage or complete Stage 3. Rust `cfg`/FFI/macros, Bash and PowerShell are expressly `pending`, and the output of a function AST parse needs manual review for test-only helpers, one-line nested callables, overloaded declarations and stable source fingerprints.

Requirements: Node.js with `typescript` available either from the repository, the system global npm root, or `MODE_B_TYPESCRIPT_PATH`; Python 3 with stdlib `ast`; Git checkout containing the full immutable baseline object (the audit branch can be active).

Run from the **RepoTicker repository root**, not from a second agent's terminal:

```sh
node docs/mode-b/tools/ast-reconciliation.mjs --markdown > /tmp/repoticker-mode-b-ast.md
node docs/mode-b/tools/ast-reconciliation.mjs > /tmp/repoticker-mode-b-ast.json
```

If TypeScript is absent, install it in an agent-owned isolated directory and set `MODE_B_TYPESCRIPT_PATH` to its installed package path; **do not modify application dependencies or lockfiles** solely for this audit.

The script reads `git show <baseline>:<source-path>` and `git rev-parse <baseline>:<source-path>`, then computes exact source-line AST starts and compares those lines against numbered registry entries. The output contains source blob hashes and previously unindexed callable positions; existing registry syntax-only declarations are not automatically deleted. Treat same-line callables as ambiguous until column-aware reconciliation. The generated Markdown/JSON reports belong in a reviewed audit evidence document only after their actual results are examined.

**Validation performed during authoring:** `node --check` returned 0, and an isolated two-file Git fixture with one JS arrow, one object method and one Python lambda returned three missing AST nodes (exit 0). These diagnostics did **not** read or execute RepoTicker source/tests.

## Updated AST matching and interpretation (2026-11-15)

The implementation now records source `line:column` for each JS/TS/Python callable and checks each recorded inventory line's exact source text, unescaping the Markdown `\\|` notation only. It reports these fields in **JSON**:

| Output | Meaning | May close Stage 3? |
| --- | --- | --- |
| `missing` / `missingCallableNodes` | AST callable without an available numbered row at its source line, including an extra callable on a line with one registered row | **No**. A concrete discrepancy needing ownership |
| `ambiguities` / `sameLineAmbiguities` | Multiple AST callables share a registered line; position-only matching cannot decide exact method identity | **No**. Review line, column and owner |
| `unmatchedRegistry` / `registryRowsWithoutCallable` | Numbered inventory entry without an AST callable at that line | **No**. May be an intentionally recorded class/data/call-site declaration |
| `sourceDrift` / `literalDrift` | Registered snippet does not match the immutable blob source line (aside from Markdown escaped pipe) | **No**. Review outdated/incorrect entry |
| `positionalMatches` / `provisionalPositions` | Same-line registry/AST count can be paired positionally | **No**. Not identity-, branch- or test-verified |

The output remains `astCompleteness: PARTIAL` even when all counted mismatches are zero. Rust `cfg`/FFI/test modules, Bash and PowerShell are still pending parser support. The JSON report is the authoritative machine-readable output; the Markdown report is a human review queue and can be lengthy.

**Diagnostic validation disclosure:** the matching algorithm was implemented and checked locally with `node --check` (exit 0) and an isolated two-file Git fixture containing multiple JavaScript/Python functions on one line, a JS object method, a noncallable registry row and an escaped Markdown pipe. The fixture yielded three unmatched AST callables, two same-line ambiguities, one noncallable registry row and zero literal drift. After intentionally changing a registered literal it yielded one drift entry. These checks were performed against a **local matching implementation with equivalent logic**, not by running the GitHub-published file from a real RepoTicker checkout. They are **not** product tests, AST coverage or Stage 11 evidence. Re-run `node --check` and the full immutable baseline scan against the *exact current committed file* on an authorized checkout before trusting any global discrepancy totals.

**Remaining Mode B gates:** Rust parser/cfg + test-exclusion reconciliation, shell and PowerShell entrypoints, complete anonymous native/UI callback census, AST-to-branch mapping for all applicable methods, Positive/N1–N12 coverage and OS/HOST evidence before Stage 9.
