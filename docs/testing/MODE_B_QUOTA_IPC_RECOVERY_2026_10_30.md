# Mode B — detached quota popup startup/refresh error recovery

Baseline `a8818b245319a446ada368b3c6679ac7b04d8ca2`. Source and test-only plan, 2026-10-30.

## Verified evidence

[Preflight #41021607032](https://github.com/morozhenko-apps/repoticker/actions/runs/41021607032)
passed **518/518 JS tests** and all completed native Linux, Rust format,
core and Clippy jobs. The measured selected UI-source totals are
**60.40% lines, 55.32% branches, 48.24% functions**;
`quota.mjs` is **91.61% lines, 73.33% branches, 81.48% functions**.

The independent unpublished Windows/KDE candidate
[#41021606966](https://github.com/morozhenko-apps/repoticker/actions/runs/41021606966)
was **still running** when this plan was prepared. Do not push to
`dev` while it is active: its workflow cancels in-progress jobs on a
new push. Never infer success without explicit completion evidence.

## Remaining user-visible risk

The detached, pointer-pass-through `quota.mjs` controller has
multiple independent lightweight native IPC boundaries. Some
uncovered branches deal with invalid monitor configuration and native
reads. A failed read must show an explicit unknown state rather than
reuse old confident counts, while a corrected subsequent read should
recover without scanning any enrolled Git repository or displaying
raw native error text.

## Deterministic source tests (no production change planned)

1. Initial `github_monitor_snapshot` failure shows unavailable,
   redacts native error text and recovers on a subsequent
   `repoticker-monitor-updated` event.
2. Invalid native `get_monitor_scope` type prevents account-specific
   billing, shows unavailable, then recovers after a valid scope
   arrives via `repoticker-github-scope-changed`.
3. Failure of `get_usage_popup_kind` does not imply missing
   GitHub authorization and permits a subsequent monitor event
   to repaint the current trusted model.
4. Failure of `get_settings_config` for a language event uses
   English fallback but retains the validated monitor counts;
   never starts another GitHub billing request or local Git scan.
5. An older delayed settings language response cannot overwrite
   a more recently chosen language. Deterministic promise release
   controls event ordering without sleeps or polling.

Use the existing real WebView controller fixture in
`tests/quota-mode-b.test.mjs`. Extend only mock-native failure
injection and controlled promise release. No native code, permissions
or billing cache changes authorized by this test-only increment.

## Change discipline

- Docs plan first, tests and docs evidence in separate commits.
- Inspect exact diff and source paths. Run focused tests when possible
  locally, then a single normal CI gate *only after* the active
  unpublished Windows/KDE acceptance is complete.
- Keep pending commits outside `dev` until the active CI finishes.
  Do not create a lasting feature branch, rewrite `main`, release,
  or fabricate post-change coverage.
- Mode B Stage 12 remains open.
