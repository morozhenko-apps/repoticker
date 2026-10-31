# v0.2.0 RC follow-up — KDE AppImage UI and GTK sizing defects

## Historical RC scope

These are v0.2 candidate defect, root-cause, fix and physical-acceptance receipts.
The original "planned"/"main unchanged" header is dated prepublication context;
[v0.2 publication](RELEASE_0_2_0.md) and the
[current handoff](ROADMAP.md#current-development-handoff-2026-10-24) supersede its
queue role. Preserve all concrete KDE/GTK/geometry observations and limits; do
not infer cross-platform, upgrade or newer dev UI acceptance from this record.


Status: **MODE A — bugfix, planned (2026-10-22)**.
Branch: `dev`; published `v0.1.0` and `main` unchanged.
Trigger: owner physically ran local `RepoTicker_0.2.0_amd64.AppImage`
on KDE Wayland and reports usable startup plus repeated GTK CRITICAL,
help cursor on action buttons, misleading first-load authentication text,
apparent compact card height shift, and irrelevant Worker URL in polling mode.
This is **release candidate feedback**, not a new v0.3 feature.

## Source evidence / root cause checkpoints

1. `apps/desktop/ui/style.css` explicitly applies `cursor: help`
   to `.card button, .card input, .card select` as well as tooltip
   anchors (end-of-file rule). This directly explains action-button
   pointer shape; keep `help` only on interactive tooltip anchors.
2. `linux_surface.rs::resize_usage` and `apply_card_height`
   call `set_min_content_height(new)` before reducing/increasing the
   prior exact maximum. Whenever new min exceeds old max, GTK3 emits
   `gtk_scrolled_window_set_min_content_height` CRITICAL. The height
   contract must transition min/max while preserving `min<=max`
   at **every intermediate setter call**.
3. `MonitorCache::default` uses `connected=false, message=None` even
   before checking OS credentials; `startGithubMonitoring` publishes
   `connected=true` only **after** the potentially long account/repos/jobs
   reads. `quota-details.mjs::notReady` therefore incorrectly tells an
   already-authenticated user to connect during first loading.
   UI must distinguish `checking/connecting` from truly disconnected
   without treating credentials as connected until native auth says so,
   without exposing keyring secrets or changing persistent config.
4. Compact card geometry is fixed in native GTK to 390×122, but the
   CSS `.status-strip` uses `min-height:25px` and automatic
   content-driven height with dynamic numeric text. Fix the status
   strip's actual height to 25px and avoid vertical content-driven
   reflow. Native min/max geometry must still be the authoritative
   window size. The reported *few pixels of actual window growth*
   is **not confirmed** without GTK allocation diagnostics; if this
   persists, use the existing `REPOTICKER_UI_DEBUG` allocation
   measurements and identify the cause rather than guessing.
5. Settings HTML has a **disabled** `Simple polling / Hybrid webhook
   relay` selector and a **disabled** Worker URL. P3 relay is
   unimplemented (the Cloudflare prototype returns HTTP 501), and no
   connection mode/worker URL is persisted. It must not be deceptively
   enabled in v0.2. Hide the irrelevant Worker URL while the only
   available mode is Simple polling. When an actual relay is implemented
   in P3, the selected mode must own Worker URL visibility/enablement
   via an explicit implemented-and-authorized settings contract.

## Ordered implementation and acceptance

- [x] Fix GTK exact-height min/max transition for **main and usage**
      ScrolledWindows, preserving pointer-pass-through and async GTK
      resizing; add deterministic Rust/test contract evidence of order
      and the invariant.
- [x] Restrict CSS help cursor to Runners/Tasks/Billing hover controls;
      action buttons have clickable pointer/default disabled cursor.
- [x] Render native status `Checking GitHub connection…` until native
      auth check, followed by `Connecting to GitHub…` until a
      monitor result; disconnected prompt only after native evidence
      of no valid credential. Keep runners/tasks unknown until collected.
- [x] Fix compact status-strip exact height to avoid content-based
      reflow; do not claim physical GTK compositor dimensions changed
      unless measured.
- [x] Hide worker URL in unavailable Simple polling mode, keep Hybrid
      selector disabled. Do not add unimplemented relay wiring or
      introduce a persistent settings field.
- [x] Add focused stable Node behavior/source contract regression tests; Rust build/format checked at final CI gate.
- [x] Run final GitHub Preflight after implementation; verify
      Rust formatting, core tests, Node tests and Linux desktop compile.
      Physical AppImage/DEB KDE acceptance remains manual on Alcotester.
- [ ] Record final source SHA and evidence, request a new local AppImage
      run after the developer pulls `dev` and rebuilds. Do not promote
      `dev → main` or tag `v0.2.0` until real smoke is accepted.

Rollback: independent code commits per GTK size, card cursor/layout,
monitor loading presentation and unsupported Worker field. Documentation
commits are separate. No extra branch, released package or token mutation.

## Implementation checkpoint (2026-10-22)

Code changes are on `dev`:
- `linux_surface.rs`: the shared `set_exact_viewport_height` orders
  max/min setters according to grow/shrink; invoked for both card and
  usage surfaces.
- `style.css`: action buttons use pointer/default-disabled, help is
  restricted to actual status hover targets; the compact metric strip
  has an exact 25px row.
- `monitor_cache.rs`: native unchecked-auth startup gets the nonsecret
  display status "Checking GitHub connection...".
- `github-monitor.mjs`: after native auth succeeds and before remote
  collection finishes publishes "Connecting to GitHub..."; independently
  tracks completed collection so normal periodic refresh need not erase
  the existing snapshot. Schedulers/data collection are injectable for
  deterministic tests, while production behavior uses existing timers.
- `quota-details.mjs`: all three hover kinds expose Connecting while
  pending rather than instructing reauthorization.
- `settings.html` + `settings.mjs`: Worker URL is hidden/disabled in
  simple polling and can only show when an *enabled* hybrid selector is
  active. The shipped v0.2 selector remains disabled because relay is
  unimplemented; no data persistence or auth boundary changed.
- Focused regression tests updated in `tests/github-monitor.test.mjs`,
  `tests/quota-details.test.mjs`, `tests/settings-controls.test.mjs`,
  `tests/quota-surface.test.mjs` and `tests/ui-layout.test.mjs`.

CI progress: [Preflight #39825447714](https://github.com/morozhenko-apps/repoticker/actions/runs/39825447714)
compiled Rust and Linux desktop successfully but failed four Settings
authorization tests because their fixture hardcoded HTML control IDs
and did not include the newly added connection-mode control. This
failure was in the stale test fixture, not in any OAuth transition or
security assertion. The fixture now extracts its declared IDs from
the real `settings.html` (tests-only commits `bfcd1ae`, `18f400f`).
The complete current-source rerun is
[Preflight #39826251376](https://github.com/morozhenko-apps/repoticker/actions/runs/39826251376);
**its final status must be checked before claiming a green release
candidate**.
The user's initial AppImage was built before these changes and cannot
validate them. The described few-pixel change of *physical* GTK card
size still requires user measurement after a fresh build; source
inspection alone does not establish this was resolved.

## Physical GTK warning and geometry evidence (2026-10-22)

The owner rebuilt the 0.2.0 AppImage and ran it on KDE Wayland
with `REPOTICKER_UI_DEBUG=1`. In the recorded
`/tmp/repoticker-0.2.0-gtk.log`:
- `Gtk-CRITICAL|GLib-CRITICAL` count: **0**.
- Compact card: `requested=122 actual=390x122`.
- Expanded repository drawer: `requested=510 actual=390x510`.
- Layer Shell margins: `(211,100)` throughout the shown states.
- The last `resize: height=122` entry logged `allocated=1x1`
  while the transition was occurring; **no subsequent settled
  allocation is visible** in the excerpt, so this is not evidence of
  a lasting size change or proof of the final compact allocation.

**Accepted within the supplied sample:** disappearance of the
previous repeated GTK height-constraint CRITICAL messages and
correct compact and expanded allocation at the shown checkpoints.

**Still unverified from this sample:** button cursor shape,
end-of-cycle compact allocation, About version, OS keyring state
after app restart. The temporarily false `Not connected` and
staged slow startup are deferred by the owner to v0.3 issue #12,
not resolved by these GTK geometry fixes.

## Further installed DEB owner acceptance — 2026-10-22

Owner separately confirms running installed RepoTicker after upgrade
and restart: About `0.2.0`, KWallet/native GitHub remains `Authorized`
without another Device Flow, enrolled local repositories and selected
Monitor account remain present, and Runners/Tasks load eventually.
This confirms **persistent credentials in the normal case**, but
not negative/vault-locked token handling. Slower startup/temporary
misleading `Not connected` remains deferred to 0.3.0 issue #12.

## Final CI evidence

- Source commit: `18f400fa8191cb98e553efc8cc44c81386a6281a`
  (tests-only last code/test change).
- [Preflight #39826251376](https://github.com/morozhenko-apps/repoticker/actions/runs/39826251376):
  **SUCCESS 4/4** — Rust formatting, core tests and Clippy; Node UI and
  release-contract tests; Linux desktop compilation; aggregate gate.
- Earlier run #39825447714 failed only because a strict mock Settings
  DOM list had not included the new control. The fixture now derives IDs
  from actual HTML. All original authorization lifecycle assertions
  remain active; no tests were skipped/quarantined.
- **Still pending physical acceptance:** this CI is a compile/test
  result, not KDE Wayland or AppImage smoke. Rebuild from the current
  `dev`; verify zero Gtk-CRITICAL warnings when the hover panels change
  heights, cursor shapes, startup connection messages, Worker field
  visibility, and fixed compact GTK allocation. Do not change `main`
  or publish the tag before that validation.
