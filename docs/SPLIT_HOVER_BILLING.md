# Split status hover and billing access (2026-10-21)

Status: implementation plan on `feat/split-status-hover`, based on the currently open unmerged PR #5. Target `dev`, not `main`. Published `v0.1.0` remains immutable.

## User's current contract

The compact card remains 390x122 with its four Git operations. Replace three plaintext indicators with two hover targets and the informational billing icon:

- **Runners Total / Online / Offline**, with total gray, online green, offline red. The count source is the complete organization self-hosted runner inventory only; GitHub-hosted ephemeral runners are never counted. Unknown inventory yields `—`, not 0.
- **Tasks Running / Queued**, with running green and queued yellow; the standalone Queued field is removed. These are GitHub Actions *job* counts from the selected monitored repositories, including both GitHub-hosted and self-hosted.
- **Runners hover**: Total, Online, Busy, Idle, Offline.
- **Tasks hover**: active jobs by named self-hosted runner (GitHub supplies `runner_id` after assignment), compatible queued jobs *by labels* shown as candidates, not assigned queue. Include GitHub-hosted/unclassified totals separately; never claim a queued job belongs to a specific runner before the scheduler assigns it. Bounded visible rows, explicit overflow note if needed, and unknown values on partial coverage.
- **ⓘ hover**: only organization and personal free-allowance/usage status. Keep them distinct. Do not report plan minutes or available quota as real until authorized billing endpoints plus plan allowance are validated. Show clear instructions to obtain GitHub App permissions rather than silently escalating them.

Keep the existing standalone 340px, 118–320px hover-only, pointer-pass-through GTK Layer Shell WebView. One popup is reused for the three anchors, with a typed, sanitized view-kind event; stale hover callbacks must not flash another view. Never resize the main card, swallow clicks, or require mouse access to popup. Do not expose tokens or install new services.

## Security boundary: STOP FACTOR on live billing collection

Current publisher GitHub App grants Actions read and organization runner read; it does not have broader billing permissions. Current docs identify Organization Administration **read** and user Account Plan **read** as necessary. GitHub's billing usage summary REST endpoints are public preview; summary usage is **not** itself the free plan allowance or remaining concurrency. The organization permission affects all installations of the publisher-owned GitHub App; it is not scoped to a single tooltip or per-installation preference. Existing installation owners must approve permission changes, and personal Account Plan access requires user reauthorization.

Do not modify App permissions, register new auth flows, request expanded tokens, invoke billing endpoints, or claim validated hosted minutes until the user selects an explicit security architecture:
- **A**: extend the single publisher GitHub App with organization Administration:read + user Plan:read. Pro: native token/keyring reused. Con: broad organization administrative visibility for every installation and explicit reapproval needed.
- **B**: leave base App least-privilege, add a separate opt-in narrowly scoped user token/billing integration. Pro: ordinary monitor users are not asked for organization Administration:read. Con: additional credential/account lifecycle and UX to secure, plus same organization-admin requirement.
Recommended: B for long-term least privilege. This affects auth/trust boundary, so implementation of live billing is blocked pending the user's decision. Static guidance and truthfully unknown fields are not blocked.

## Ordered work

1. Record contract/STOP factor in docs separately from executable changes.
2. Implement pure status/hover projections, safe partial-state mapping and queue compatibility; add focused negative tests.
3. Switch compact status to two styled hover targets and info icon, preserve the separate native popup, render view by trusted kind.
4. Add deterministic UI/resize/source tests for repeated hover transitions, empty/partial inventories, queued label ambiguity and bounded content. Do not call routine suites during implementation.
5. Final stable Node/Rust/Linux preflight once, then physical KDE acceptance of no clipping and correct hover target, colors, job attribution, last-selected org and tooltip lifetime.
6. Only after accepted, merge dev; no tag/main/release promotion without release gates.

## Completion evidence

- [ ] Rendering/hover implementation complete.
- [ ] Stable CI green.
- [ ] Physical KDE acceptance.
- [ ] Security architecture decided for authorized org/user billing.
