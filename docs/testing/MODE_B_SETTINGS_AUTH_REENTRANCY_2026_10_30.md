# Mode B: Settings GitHub authorization reentrancy

Date: 2026-10-30. Baseline: `b40b102ac7c5013bcf9216dcf6a99c6417b79ff4`.

## Confirmed prior quality gate

- [Preflight #41085107251](https://github.com/morozhenko-apps/repoticker/actions/runs/41085107251):
  **537/537 JavaScript tests passed**; Linux desktop, Rust format/core
  and Clippy succeeded.
- [Windows/KDE acceptance #41085107301](https://github.com/morozhenko-apps/repoticker/actions/runs/41085107301):
  both unpublished candidates completed successfully.
- V8 selected-source aggregate: **58.47% lines, 51.93% branches,
  47.64% functions**; `settings.mjs` **56.67% lines, 42.31%
  branches, 45.31% functions**. This is not full-product coverage.

## Source-derived failure modes

1. `github-connect` checks `githubPending` only. Between entering
   `github_begin` and receiving the public user code, the handler
   has `githubStarting=true` but can be reentered, issuing another
   native device-code request. This is a single-flight contract,
   not just a disabled-button presentation concern.
2. A native authorization status error after a successful Settings
   open sets `githubCheckFailed`, but the Apply guard does not
   consider that failure. A previously dirty unrelated draft
   could be committed while authorization state is unknown.
3. `refreshGithub` displays `String(error)` from an IPC rejection;
   error bodies are not a trusted UI message and may include native
   details. Initial Settings failure already uses a fixed safe label.
4. Following a failed Settings initialization, a later auth event
   could repaint Authorized from the wallet even though the
   configuration and draft are untrusted. The next successful
   explicit Settings refresh must be the only way to recover.

Possible causes evaluated: duplicate DOM event, disabled-button
bypass, native duplicate challenge, stale asynchronous status read,
UI-only dirty-state checks, and divergent error handlers. The
first two actionable causes are missing single-flight enforcement
and inconsistent status-failure gating.

## Acceptance tests

- **N5 single-flight:** defer the first native `github_begin`;
  firing Connect again must not make a second native call or change
  the user code. On resolving, one challenge becomes pending.
- **N5/N6 failed begin:** a rejected challenge remains disconnected
  and Cancel does not perform extra token inspection/revocation
  for an authorization attempt that never started.
- **N3/N5 wallet status error after open:** use a secret-bearing
  synthetic IPC rejection. The UI must expose only a fixed message,
  hide credential actions, disable Apply despite an unrelated
  dirty preference, and recover after a fresh successful status.
- **N5 startup failure isolation:** an auth event after failed
  initial config must not replace Connection unavailable or
  authorize any native write; explicit successful reopen recovers.

## Boundaries

Implement tests in the existing real-controller `node:test` fixture
with controlled promises, no polling or network. Minimal JS change
in `apps/desktop/ui/settings.mjs`, leaving native wallet/API,
user-code format, local settings persistence and all other
application products untouched.

Plan, tests, code and evidence in distinct commits. Push one safe
fast-forward to `dev`, then stop on CI. The new exact SHA has no
verified pass count or platform acceptance until its jobs complete.
Stage 12 remains open.
