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

**Remaining Mode B gates:** Rust parser/cfg + test-exclusion reconciliation, shell and PowerShell entrypoints, complete anonymous native/UI callback census, AST-to-branch mapping for all applicable methods, Positive/N1–N12 coverage and OS/HOST evidence before Stage 9.
