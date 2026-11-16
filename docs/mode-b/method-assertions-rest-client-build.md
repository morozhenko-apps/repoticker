# Mode B: native REST authorization and Wayland build method receipts

Production baseline `dev=a3ba7fa30fc4c81890d3075f94142942d001cbf3`. Audit parent `c123f08cb651dac2c8a0eca0ac9791fa90ea8fc9`. Exact source blobs: `apps/desktop/src-tauri/src/github_api.rs=842bb1ba94bfb31924093575ffec262f6e9f3e46` and `apps/desktop/src-tauri/build.rs=07f2494ee631d54af6353926bb6d50d16ece86e4`.

This document reconciles 11 previously unclassified lexical rows against actual source and [REST branch audit](branch-map-rest-client.md) / [build script branch audit](branch-map-native-build-script.md). `E_PARTIAL` signifies existing real direct Rust assertions, not current test execution or complete branches. Source-only workflow/JS regex checks are not direct native coverage.

## Stage 3–4 exact callable evidence

| File:line | Status | Evidence / planned independent branches |
| --- | --- | --- |
| `github_api.rs:26 GitHubRestClient::client` | E_PARTIAL | Inline Rust verifies same client object reused, no default Authorization header; initialize failure, redirect/timeout behavior via fake external transport still open |
| `github_api.rs:42 api_http_failure` | E_PARTIAL | Rust table verifies 401/403 rate/403 permission/404/429/502 finite errors; Retry-After with malformed value and reset-only interactions open |
| `github_api.rs:57 valid_name` | I_PARTIAL | Invoked by real `valid_path` test and identity projection; exact 0/1/100/101 bytes, dot-only, Unicode and forbidden separators not independently asserted |
| `github_api.rs:67 valid_utc_second_timestamp` | E_PARTIAL | Real Rust Gregorian UTC validation tests leap/century, invalid date/time, Z format; exact 0000/0001, 2100, byte length and malformed Unicode still open |
| `github_api.rs:106 valid_path` | E_PARTIAL | Rust accepts documented read routes and rejects unauthorized/query/encoded paths; exact 300/301 bytes, page 10/11, billing 2020/2100 years and first/last month need explicit tables |
| `github_api.rs:191 project_billing` | E_PARTIAL | Real Rust tests Actions minutes, quantity integer/fraction, negative/non-number rejection and private-field stripping; 500/501 items, 80/81 SKU, nonfinite and nested type cases pending |
| `github_api.rs:226 project` | E_PARTIAL | Real inline Rust tests allowlisted field projection, completed runs and dates; generic route 0/100/101 items, total_count invalid type, new canary paths and exact output keys still pending |
| `github_api.rs:361 github_api_get` | P_NATIVE | No direct Tauri AppHandle/HTTP test: path/cooldown before token, bearer+ETag, 304, 401/403/404/429/503, 2MiB cap, partial streams, auth generation change, stale older-200 response |
| `build.rs:3 execute` | P_NATIVE | Spawn absent/nonzero stderr/invalid UTF-8/trim output need isolated external fake process tests |
| `build.rs:17 compile_wayland_bridge` | P_NATIVE | OUT_DIR, pkg-config/scanner/cc/ar failure points, exact generated paths/link lines and no success on partial native build need fixture tests |
| `build.rs:79 main` | P_NATIVE | Linux gate vs non-Linux tauri_build path; historical successful CI builds not proof of injected missing tool paths |

## Stage 5 N1–N12, interactions and release risk

- **N1/N2:** source and prior real tests cover a subset of API route/field/date validation; missing exact count, URI and size boundaries above. Build helper tests must include missing executables and output paths.
- **N3/N4/N5:** actual native HTTP streaming/timeout/etag/backoff, retry and concurrent credential generation remain unverified; build script process errors are external tool I/O, not GitHub network.
- **N6/N7/N10:** malformed upstream JSON and route authorization map to pure tests; the authenticated native Tauri command is still pending. Avoid returning paths, bearer, provider body or private data in errors. CLI stderr in Cargo logs is a separate build-host information review.
- **N8:** UTC timestamp Gregorian rules have tests; runtime rate/clock and deadline races not certified. No business timezone in `build.rs`.
- **N9/N12:** native app termination during HTTP, Wayland toolchain executable and unwritable OUT_DIR remain test/OS gates.
- **N11:** NA: GitHub billing information is not RepoTicker monetization.
- **Interaction:** older HTTP 200 resolving after a newer request; stale OAuth token during a 304; simultaneous build output under separate OUT_DIR; Linux vs Windows packaging branch. All require source-exact controlled tests rather than source-regex checks.

### Stage 9 planned test families

`API1–API5` and `NB1–NB4` remain precisely owned by the two existing branch maps. This reconciliation does not authorize production API scope changes, error vocabulary changes or Wayland build shortcuts. Tests must use real subject logic, fake only external HTTP/OS process dependencies and perform the one final stable execution after all test changes.

No production files, tests, hosted infrastructure, CI, OS builds or release operations executed/changed. Stage 3–8 PARTIAL.
