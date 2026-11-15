# Mode B Stage 3: AST-to-register matching and false-confidence controls

**Status: corrective tool committed (2026-11-15); baseline parser execution and Stage 3 signoff still open.** Immutable source target: `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; existing candidate register: 728 provisional entries (719 numbered, nine non-method placeholders).

## Observed problem and competing causes

The current read-only `tools/ast-reconciliation.mjs` associates an AST callable with a registered source row **solely by line number** (`registered.has(x.line)`). A line containing two or more callable AST nodes is consequently counted as fully mapped if only one lexical row exists. It also reports only missing AST nodes, never registered source rows with no corresponding AST node or changed source literal. Those are confirmed limitations in the published tool, not evidence of a production bug.

Plausible explanations to distinguish in a source inventory:
1. Two or more real nested/inline closures begin on one source line, while the register contains one candidate.
2. Registered rows include classes, module/export/impl/type and other noncallable declarations.
3. Markdown escaping (e.g., `\|`) makes a correct registered snippet look different from source.
4. Multiline arrow functions start on a different line than their owning variable/property declaration.
5. Callback closures are intentionally excluded from the provisional lexical enumerator.
6. Python methods, lambdas and nested functions share source lines in compound expressions.
7. Rust cfg(test), macro and target-OS attributed declarations differ from plain source lexical candidates.

**Priority hypotheses: 1 and 2.** Preserve complete file/line/column evidence so neither a same-line double-count nor a noncallable candidate may silently be accepted as proof of test inventory completion.

## Required implementation contract

- Stay read-only: no writes to the repository, no test suites, no builds or CI. Output JSON or Markdown to stdout. Run only against the exact Git object of each source file; report blob ID and baseline SHA.
- Use a real AST for JS/TS and Python. Distinguish named functions, object/class methods, arrow/function expressions and anonymous callbacks. Treat a source line with multiple callable nodes and fewer registered rows as **ambiguous/unmatched**, not covered.
- Preserve separate queues for **AST callable not mapped**, **registered row with no callable on that line**, and **registry source text mismatch**. The latter two are review candidates, not automatically deletions: declarations and placeholders need independent classification.
- Normalise only the known Markdown pipe escape when comparing registry text to source; do not edit code or strip meaningful quotes/tokens.
- For every AST node, record `path@blob:line:column`, kind, name. For every numbered register row, record its own source line and literal. Include accurate exact-count diagnostics in the JSON report. A positional match is **provisional** until its declaration kind/name is reviewed.
- When a required parser is unavailable, emit `pending`; Rust cfg/FFI, shell and PowerShell are not AST-verified by this JS/Python tool.
- Fail fast on missing/moved baseline or missing required registry file; do not accidentally scan the current, mutable `dev` head.
- Diagnostic validation before commit: syntax check and an isolated Git fixture with (a) two functions on a single line plus one registered row, (b) a stale/noncallable registered row, (c) a Python nested lambda and (d) a Markdown-escaped pipe. All expected differences must appear. This diagnostic is **not** a RepoTicker application test, and it does not replace Stage 11.

## No architecture STOP or production change

This is test-inventory tooling that preserves product APIs, authorization, storage, CI and runtime behavior. Existing Stage 3–8 evidence numbers and the 810 unknown Stage 5 cells **must not change** merely because the diagnostic becomes more accurate. Stage 9 remains blocked until AST/cfg/exhaustiveness and all other gates are evidenced.

## Rollback / continuation

The tooling correction must be a separate atomic commit after this documentation decision. If an agent cannot run the full baseline locally, report the exact execution limitation and retain `AST baseline not run`; do not infer results from synthetic fixture diagnostics. An operator or later agent with an isolated checkout may run the tool and submit the machine-readable report for branch mapping.

## Implementation handoff (2026-11-15)

The correction was committed as `879bbe19489d7f4127c58451069a85f66cd2bd43` after this documentation plan. It adds per-node line/column evidence, reports same-line collisions and unmatched registry lines, and compares registered snippets to exact Git blobs. The synthetic diagnostic used an equivalent local script; the **committed file itself still requires a direct `node --check` and immutable baseline execution in the RepoTicker checkout**. No Stage 5 `✔` was asserted.
