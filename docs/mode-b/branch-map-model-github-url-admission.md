# Mode B: GitHub Actions browser URL trust and legacy summary projection

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`; `apps/desktop/ui/model.mjs` blob `b15f7e33ebbb6cb4c613243231781844eedc63ed` (43 source lines), three exports `summarize`, `safeRunUrl`, `safeActionsJobUrl`. Direct real-function tests:
- `tests/ui.test.mjs` blob `bf300041c320c013650ad1d60b3f492f0a5ce5c9`: **3 Node tests**, two call `summarize`, third calls `safeRunUrl` with valid canonical GitHub run, javascript:, attacker hostname, settings/secrets and undefined.
- `tests/quota-details.test.mjs` blob `d90673d3a1d6bc7f9d05b817d51dac49e874d070`: **8 Node tests**, one calls `safeActionsJobUrl` with normal job and six adversarial strings (javascript, attacker hostname, userinfo, settings/tokens, query, fragment).
- `tests/repo-row-indicator.test.mjs` exercises a **different module**, not `summarize` and not either URL method.

Sources and assertions inspected, not run this turn. Parent `1e05f561e92a4cbf19ea6ff19f1edae9d32d7446` in `audit/mode-b-testing`.

## Exact per-method branches and demonstrated assertions

| Method | Source decisions/outcomes | Existing E / unverified |
| --- | --- | --- |
| `summarize(snapshot)` repositories | Requires actual array, otherwise []; repositoryCount=array length, sum `Math.max(0, Number(repo.behind)||0)` | E {} -> 0 and [{behind:3},{behind:0}] -> 3. ? corrupt row null, Infinity/string/huge behind, negative, fractional; legacy result is not the modern monitor's confidence-aware metric |
| `summarize` runners | Requires array, onlineRunners only `online===true`, busyRunners only online AND busy===true | E two online (one busy) + one offline busy gives online=2, busy=1 |
| `summarize` CI | `ci_running`, `ci_failed` converted via Number, ||0, max 0 | E integer 2/1, missing->0; ? unknown/malformed/Infinity and unsafe integer. Do not apply `compactStatus` explicit unknown contract retroactively without understanding callers |
| `safeRunUrl` input | Non-string -> null; new URL parse failure -> null | E undefined and javascript scheme; ? malformed percent, embedded whitespace and url object |
| `safeRunUrl` origin | `https:` and exactly `github.com` hostname (WHATWG URL canonicalized) | E canonical and `github.com.evil.example` rejected; ? ftp/http, hostname case/IDN |
| `safeRunUrl` path | Regex `/^\/[^/]+\/[^/]+\/actions\/runs\/\d+\/?$/` | E valid /acme/widget/actions/runs/123 and wrong /settings/secrets rejected; ? 0/leading zeros, huge digits, dot components, percent encoding, optional trailing slash |
| `safeRunUrl` credentials/query/fragment | **Source fact:** unlike the job URL validator, this method does NOT check `parsed.username`, `password`, `search`, `hash` or `port` before returning `parsed.href` | **Not directly asserted** in reviewed tests. This is a security-contract discrepancy; whether browser opening of an exact GitHub run with userinfo/query is prohibited must be established before changing source. No exploit or leak is claimed |
| `safeActionsJobUrl` origin | Same exact HTTPS host **plus** reject port, username, password, query and fragment | E canonical and evil host, userinfo, query, fragment denied; ? custom port, password, uppercase canonical host |
| `safeActionsJobUrl` path | Exactly 7 normalized segments: safe owner, repo, literal actions/runs, digits run, literal job, digits job; dot/dotdot owner/repo denied | E valid, settings path invalid; ? dot/dotdot, double slashes, encoded traversal, leading-zero/0/huge run/job IDs |
| `safeActionsJobUrl` return | Return parsed.href after strict allowlist; catches invalid URL and returns null | E positive example; ? weird URL parsing and percent-encoded owner names |
| Independent browser transport | This module only projects URL text; actual Tauri `open_project_website` and external opener require separate native permission/evidence | S source, OS external opener not executed |

## Important source-derived security distinction and decision checkpoint

`safeRunUrl` is called a safe link but accepts **a broader URL shape** than `safeActionsJobUrl` according to source control flow. Its return value includes untouched query/fragment/userinfo from the parsed URL if the protocol/hostname/path checks pass. Conversely the job validator explicitly disallows those components and restricts owner/repo segments.

This divergence is **not a confirmed security vulnerability** without evidence about the run URL's caller, native/browser opener, attacker-controlled fields and established URL trust contract. Do not silently tighten `safeRunUrl` under Mode B. First run direct table-driven current-behavior tests against the actual exported method; then trace whether a returned string crosses a native opener trust boundary. Changing URL validation/allowed path shapes can be a material security or public contract decision requiring the AGENT.md STOP FACTOR.

Similarly, `summarize({})` returns zero for absent metrics, while modern `status-metrics.compactStatus` emits em dash for unknown coverage. These are **different legacy vs current projections**; no UI regression can be inferred until actual call graph establishes whether legacy summarize is used for authoritative current monitor display.

## Positive / N1–N12

| Class | Verified E / still missing |
| --- | --- |
| Positive | E real safe run/job URL and pure summary valid payload |
| N1 | E invalid scheme/host/path and undefined run; invalid job query/userinfo; ? malformed rows and percent escapes |
| N2 | E summary 0/2 runners; ? 0/leading-zero/MAX URL IDs and unsafe numeric counters |
| N3 | NA pure URL/summary no network; native browser opening external |
| N4 | NA pure result deterministic; repeat navigation caller external |
| N5 | NA pure functions; stale account scope belongs calling controller |
| N6 | E missing snapshot -> legacy zeros, ? corrupt arrays/invalid numeric values |
| N7 | E exact GitHub host and job strict fields; run userinfo/query/fragment acceptance source-only discrepancy |
| N8 | NA locale/time not parsed |
| N9 | OS browser opener permissions and actual navigation outside |
| N10 | ? userinfo query and raw URL reflection to opener; need explicit trust boundary |
| N11 | NA |
| N12 | NA no disk writes |

## Stage 9 after full Stage 3–8

- MD1: direct real `safeRunUrl` table (credentials, query, fragment, alternate port, dot/empty/percent owner segments, numeric ID max/0, optional slash, hostname case); **characterize existing behavior first**.
- MD2: direct `safeActionsJobUrl` table for same adversarial inputs, proving strict contrast and preventing permissive regression.
- MD3: pure `summarize` table for null/bad arrays, malformed repo/runners, negative/NaN/Infinity/2^53 counts, and confirm whether legacy result should ever be authoritative UI state.
- MD4: caller trace to native browser opener and product security policy; STOP FACTOR before behavioral change if URL shape changes supported public contract.
- MD5: physical OS browser invocation under approved URL, no action on invalid or redirected paths, separate from pure helper assertions.

Mutants: loosen HTTPS/hostname, accept job query/userinfo, reject every valid GitHub path, turn unknown legacy zeros into confident modern metrics, open opaque user-supplied host. No mutation runner executed. Overall Mode B Stage 3–8 PARTIAL and no application, test or CI changes.
