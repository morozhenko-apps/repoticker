# Mode B: canonical GitHub origin parsing and enrolled native browser opening

Production `dev` baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Sources: `crates/repoticker-core/src/git.rs` blob `5b92830d50e9a3d9a97487e3b78454bf3e64de55`, `crates/repoticker-core/tests/github_remote.rs` blob `1611c2ce00eaed1e6547ead0c9c4bce3dbeb5d77`, `apps/desktop/src-tauri/src/main.rs` blob `5ab66298bcaa50668a228d0ef62b99aecb17d134`. Prepared parent `e216df14a0da0d9f24553494043b4e32540f0629`.

**Mode B Stage 3–8 partial review only.** A native browser launch and actual clipboard/window permissions require an integration/OS boundary. Source-reading JavaScript assertions are not execution of native `AppHandle` commands.

## Three native Rust integration tests verified line-by-line

- `canonicalizes_supported_https_scp_and_ssh_github_remotes`: real `github_remote_to_browser_url` accepts precisely the tested HTTPS `.git`, SCP `.git` and SSH no-`.git` spellings, and returns the same exact canonical `https://github.com/morozhenko-apps/repoticker`. This does not establish every mixed-case, space or suffix variant.
- `rejects_untrusted_hosts_credentials_extra_paths_and_url_tricks`: exact input cases that all return `None`: github.com.evil.example, HTTPS username, query, fragment, extra path component, dot-dot traversal, encoded slash, repository name only `.git`, SCP lookalike host, SSH non-git username, file, javascript, missing repository, empty input.
- `resolves_real_local_git_origin_without_network_or_worktree_changes`: real local initialized repository with absent origin returns error; adding a GitHub SCP origin returns exact GitHub URL; changing origin to GitLab returns error. No live GitHub request or desktop browser launch is performed.

`tests/repo-open-github.test.mjs` provides two **static source-contract tests**, confirming `enrolled_repository` and `github_origin_url` are called before launch; these tests inspect Rust source text rather than exercising native browser/error paths.

## Every relevant branch and proof

| Function | Executable conditions/outcomes | E and remaining |
| --- | --- | --- |
| `github_remote_to_browser_url` | Trim leading/trailing whitespace; exact prefix HTTPS/SCP/SSH github.com vs arbitrary/unsupported input | E three supported and hostile examples; ? padded input, mixed-case URL scheme/host, port, trailing root slash |
| `github_remote_to_browser_url` | Two exact nonempty path segments; reject missing owner/repo, any third segment, query/fragment masquerading as name, empty or multiple slashes | E missing repository/third segment/query/fragment; ? zero-length owner, terminal slash, extra slash before query |
| `github_remote_to_browser_url` | Optional single `.git` suffix strip; remaining repo is not empty, `.` or `..`; owner/name ASCII alnum / underscore / dash / dot only | E canonical .git and .git-only rejected, traversal/encoded slash; ? names `.`, `..`, Unicode, `.git.git`, leading/trailing dot and length; no maximum owner/repo name enforced by this helper |
| `github_remote_to_browser_url` | Success returns canonical HTTPS GitHub URL with exactly selected two components; no original URL or query propagated | E exact canonical output and malicious input rejection; ? subdomain tricks and username lookalikes in every prefix variant |
| `github_origin_url` | `verified_checkout` false/error -> deny before reading origin; read origin config succeeds/fails; parsing accepted/rejected -> URL/error | E existing checkout missing/GitHub/GitLab remote; ? removed or externally replaced checkout, Git config error or malformed origin |
| `enrolled_repository` (main.rs) | Native `read_config` error vs resolved allowlisted canonical checkout using configured ignore names; no path outside current roots | E real core enrollment tests and JS source checks; ? native Tauri command actual read/lookup failure and changing registration during selection |
| `open_repository_on_github` | `spawn_blocking` success or join error; reject unauthorized/non-GitHub origin; native OS browser launch success or failure | Source-only for native command; no actual browser process, fake external launcher needed |
| `launch_browser` (main.rs) | Platform-specific `xdg-open`/`open`/`explorer.exe`, spawn success/failure, no arbitrary WebView-provided URL | Static source call path; OS actual launch and return-code/exit-state ownership untested |
| `open_repository_folder` | Enrollment first, then platform native file manager; invalid/valid path and spawn failure | Source-only native integration; must not accept arbitrary WebView filesystem path |
| `copy_repository_path` | Enrollment first, selected path UTF-8 or error; OS clipboard success/denied; no credential access | Source-only command; error masking and clipboard access need external adapter/physical test |

## Security boundaries and test design nuances

- A Git remote is user-controlled local Git configuration, but never becomes an arbitrary browser URL: only a strict verified `github.com` origin and two sanitized components pass.
- The native GitHub opener additionally revalidates enrollment; a valid external repo alone is not authorized. The core integration suite establishes root enforcement, not the native command with real config.
- `github_remote_to_browser_url` uses exact string prefix and ASCII component checks rather than a general URL parser. Tests should characterize both accepted and rejected noncanonical input without presuming URL parsing normalizes hostname or percent encodings.
- The current accepted names have no explicit length cap inside `github_remote_to_browser_url`; changing that may alter support for unusual legitimate Git identifiers. Do not mark it a confirmed exploit or silently change public behavior.
- `open_actions_job` is a *different* allowlist policy: only `https://github.com/{owner}/{repo}/actions/runs/{run}/job/{job}` with numeric ID characters. Do not assume the Git-origin parser alone authorizes Actions job URLs. The native Actions URL method is mapped separately in main IPC inventory.

## Positive + N1–N12

| Category | Status | Exact outstanding evidence |
| --- | --- | --- |
| Positive | E partial | Three Git origin canonical forms, real local origin; actual OS browser command untested |
| N1 | E partial | Malformed hosts/query/fragment/traversal tested; whitespace, Unicode, terminal slash and numeric/control variants |
| N2 | ? | Name component length and very long valid-looking GitHub path; no explicit cap contract |
| N3 | NA here | Origin parse and local Git config do not perform HTTP; OS browser spawn is N9 |
| N4 | E partial / ? | Repeated canonicalization deterministic; repeated OS browser command not executed |
| N5 | ? | External checkout removed, origin changed or enrollment modified between validation and browser launch |
| N6 | E partial | Missing/malformed remote and checkout; native config and process failure untested |
| N7 | E partial | Fixed supported host and enrollment; native command effective permission boundary pending |
| N8 | NA | No timestamp or locale-dependent branch; Unicode case is input validation |
| N9 | OS | Browser/file manager launch failure, Quit/hidden window, clipboard denied |
| N10 | E partial / ? | No arbitrary URL/secret browser launch in core; native stderr, full path and clipboard privacy |
| N11 | NA | No paid entitlement |
| N12 | E partial | Real Git config read; OS permission errors and removed checkout not covered at native handler |

## Stage 9 targeted tests, after global Stage 3–8 completion

- **GO1:** parameterized real Rust origin parser with all exact prefixes, lookalike subdomains, usernames/ports, Unicode/encoded separators, trailing slash, `.git` endings and component length boundaries; assert exact canonical value or None.
- **GO2:** temporary Git fixtures with absent/unsupported/changed/remapped origin and enrollment. Check zero browser activity for denied paths and no mutation to HEAD/worktree.
- **GO3:** native `AppHandle` with OS browser and clipboard adapters, verifying enrolled only, launch success/failure, no arbitrary URL/path and handling of revoked OS permissions.
- **GO4:** controlled change of selected checkout/origin/enrollment before launch; confirm authoritative revalidation semantics and no incorrect repo opened. Treat any policy change as potential security contract STOP FACTOR.
- **GO5:** independent native Actions job URL validation and resource link allowlist, never combine these with origin URL contract.

Mutation guards: widen accepted host, skip ASCII components, accept third segment, drop enrollment check, accept arbitrary WebView URL, ignore missing Git origin. Count only actual failing behavioral assertions.

No new source/test/CI/Worker/OS side effect occurred. Stage 3–8 remains PARTIAL globally.
