# Split status hover and billing access (2026-10-21)

Status: implementation plan on `feat/split-status-hover`, tracked in PR #6; PR #5 was closed without merge. Target `dev`, not `main`. Published `v0.1.0` remains immutable.

## User's current contract

The compact card remains 390x122 with its four Git operations. Replace three plaintext indicators with two hover targets and the informational billing icon:

- **Runners Total / Online / Offline**, with total gray, online green, offline red. The count source is the complete organization self-hosted runner inventory only; GitHub-hosted ephemeral runners are never counted. Unknown inventory yields `—`, not 0.
- **Tasks Running / Queued**, with running green and queued yellow; the standalone Queued field is removed. These are GitHub Actions *job* counts from the selected monitored repositories, including both GitHub-hosted and self-hosted.
- **Runners hover**: Total, Online, Busy, Idle, Offline.
- **Tasks hover**: active jobs by named self-hosted runner (GitHub supplies `runner_id` after assignment), compatible queued jobs *by labels* shown as candidates, not assigned queue. Include GitHub-hosted/unclassified totals separately; never claim a queued job belongs to a specific runner before the scheduler assigns it. Bounded visible rows, explicit overflow note if needed, and unknown values on partial coverage.
- **ⓘ hover**: only organization and personal free-allowance/usage status. Keep them distinct. Do not report plan minutes or available quota as real until authorized billing endpoints plus plan allowance are validated. Show clear instructions to obtain GitHub App permissions rather than silently escalating them.

Keep the existing standalone 340px, 118–320px hover-only, pointer-pass-through GTK Layer Shell WebView. One popup is reused for the three anchors, with a typed, sanitized view-kind event; stale hover callbacks must not flash another view. Never resize the main card, swallow clicks, or require mouse access to popup. Do not expose tokens or install new services.

## Security boundary: chosen architecture and billing constraints

Current publisher GitHub App grants Actions read and organization runner read; it does not have broader billing permissions. Current docs identify Organization Administration **read** and user Account Plan **read** as necessary. GitHub's billing usage summary REST endpoints are public preview; summary usage is **not** itself the free plan allowance or remaining concurrency. The organization permission affects all installations of the publisher-owned GitHub App; it is not scoped to a single tooltip or per-installation preference. Existing installation owners must approve permission changes, and personal Account Plan access requires user reauthorization.

**Decision 2026-10-21: A approved.** Extend the existing publisher GitHub App with organization `Administration: read` and personal-account `Plan: read`. Keep existing native Device Flow/KWallet refresh, never distribute an App secret. The owner must change the publisher App configuration in GitHub; existing installation owners must approve the permission update and users must reauthorize where required. Repository code alone cannot grant permissions.

### API and calculation boundaries (verified against GitHub REST docs on 2026-10-21)

- Use current consolidated, public-preview REST endpoints `GET /organizations/{org}/settings/billing/usage/summary?year=YYYY&month=M` and `GET /users/{user}/settings/billing/usage/summary?year=YYYY&month=M`. Legacy `/settings/billing/actions` endpoints were retired in 2025. The organization summary requires org administration read and an organization administrator. The user summary requires user Plan read.
- Obtain personal login and optional verified plan name from `GET /user`, projected natively to `login` and `plan.name` only. Do not request arbitrary profile fields.
- The user confirmed on 2026-10-21 that all three relevant permissions were **already configured** on the publisher GitHub App, including `Organization plan: read`. Do not ask them to reconfigure these settings. Code still needs to verify the current installation/token can use those permissions; owner approval and session refresh are separate from registration settings. Retrieve only `plan.name` via `GET /orgs/{org}`; keep it independent from organization usage collection.
- Only recognized **Free** (2,000 included minutes) and **Team** (3,000 included minutes) organization plan names may populate documented baseline allowances. Enterprise and unknown/legacy/custom plans remain unknown until an authoritative entitlement source confirms the applicable quota. Neither included allowances nor SKU gross usage establish remaining free minutes.
- Published allowance mapping (documentation, not account data): personal Free 2,000 minutes/month, Pro 3,000; organization Free 2,000, Team 3,000, Enterprise Cloud 50,000. Populate a personal allowance **only** after GitHub returns an unambiguous supported plan name. No plan guess from an account's name, public metadata or API error.
- Usage summaries expose `usageItems` by SKU, with `product`, `unitType`, `grossQuantity`, `discountQuantity`, etc. Those values are billing-SKU quantities, **not an authoritative count of free-plan minutes consumed**. Different OS/runner SKUs and additional billable products prevent naive arithmetic. Display only verified `Actions` minutes as `Reported usage` and keep `Free minutes used` and `Remaining` unknown until the API supports a defensible conversion, or an authoritative allowance-consumption figure is identified. `discountQuantity` is not proof of free usage.
- All collected usage is billed to the **repository owner** and separate for organization vs. personal account. Self-hosted and standard public repository runners do not use the included GitHub-hosted private-repository allowance. Do not claim quota exhaustion on mere job absence or 403.
- Native transport is HTTPS, fixed-origin, exact route allowlisting, bounded body, read-only projection; no raw billing JSON, identity details or tokens outside their necessary isolated layers. Billing views may receive only sanitized own-account plan name, month and aggregated Actions quantities. No repository attribution or payment details go into the WebView.
- Failure modes: missing permission/installation approval, non-admin user, unsupported/preview API, malformed/partial response, unknown plan, network failure and month boundary all yield explicit unavailable or stale values, never zero. Scope changes and disconnect invalidate cache. Billing refresh is bounded and never fires per mouse movement.
- Hover-only window remains pointer-pass-through, 340px and max 320px: keep organization/user readout compact, make any permission guidance available separately in Settings/docs. No new clickable elements or interactive scrolling inside popup.

### Planned implementation

1. Documentation-first decision and precise permission setup guidance (separate docs commit).
2. Strict native `github_api_get` route model for `/user` and consolidated org/user usage summary; sanitize projected data and negative-test endpoint/response validation. No App config write.
3. Pure `github-billing.mjs` collector: independent per-account results, validated month/scope, bounded refresh, fail closed. No free-minute subtraction from raw SKU quantities.
4. Inject billing state into the existing billing-only hover, preserve runner/task projection and visual geometry; add deterministic tests for permissions, invalid data, refresh and partial failures.
5. Run final stable GitHub Preflight once on code SHA, physical KDE/Keyring approval and exact account usage verification. No main merge or release before acceptance.

Rollback: revert native billing route and JS billing collector/UI commits; no new persistent token storage, database or migration.

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
- [x] Security architecture A selected on 2026-10-21.
- [ ] Native read-only billing implementation verified.
- [ ] GitHub App permission update and installation/user reapproval accepted physically.
