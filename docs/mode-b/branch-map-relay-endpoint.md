# Mode B: native Relay endpoint and WebSocket URL branch audit

Production baseline: a3ba7fa30fc4c81890d3075f94142942d001cbf3.
Source: apps/desktop/src-tauri/src/relay_endpoint.rs, blob 6cb009d5b687f8663041749bc847cf322dca74c2.
Stage 3-8 documentation only. No live network call or newly executed test is claimed.

## Existing direct executable assertions

The Rust inline test only_canonical_public_https_origins_are_stored asserts lowercase DNS normalization and default HTTPS port 443, plus rejects empty HTTP/WS URLs, userinfo, path, query, fragment, loopback IPv4 and IPv6, localhost and .local, port 8443, backslash and terminal newline. The real Rust normalize_base_url is under test, not a mocked parser.

The Rust inline test websocket_url_contains_only_cursor_and_validated_origin confirms a WSS endpoint with cursor=12 and rejects u64::MAX. Neither test asserts zero, MAX_SAFE_INTEGER or +1 cursor, exact byte cap, or full IDNA/host normalization combinations.

## Production method branch inventory

| Source predicate | Real test evidence | Independent branches still open |
| --- | --- | --- |
| normalize_base_url initial raw empty, >512 bytes, whitespace, backslash, starts_with lowercase https | E for empty, HTTP/WS, slash, newline | Raw 513-byte input; tabs/Unicode leading or trailing whitespace; mixed-case scheme; UTF-8 byte vs char; valid 512-byte origin may not exist under DNS host size bounds |
| reqwest::Url::parse and host_str | E accepted DNS and assorted malformed strings | Invalid IDNA, broken percent-encodings, broken IPv6 brackets; host-absent branch may be unreachable given strict https prefix |
| parsed scheme differs from https | E indirectly initial protocol check | Secondary parsed.scheme guard appears defensive after https prefix, verify parser reachability |
| username nonempty or password present | E user:pass rejection | Username-only, password-only, empty-user credential syntax, percent-encoded separator |
| Query, fragment, non-root path | E for ordinary path, query, fragment | Empty query and fragment markers; multiple slashes; escaped separators; dot-path canonicalization |
| Explicit port not 443 | E default 443 and 8443 | 0, 80, 444, 65535, overflow, invalid syntax; parser may reject first |
| host parses as IP address | E loopback IPv4 and IPv6 rejected | Public IPv4, bracketed IPv6 global and IPv4-mapped IPv6; inspect actual Rust Url.host_str representation rather than assuming IP guard behavior |
| host has no dot, localhost or suffix .localhost/.local/.internal/.invalid/.test | E for localhost and .local | Other suffixes, nested domains, uppercase, trailing root-dot forms and IDNA normalization; actual Rust behavior of a trailing-dot reserved suffix remains unverified |
| format canonical base URL | E uppercase lowercase and default port | Idempotence, Unicode/punycode canonicalization, no query, credentials or fragment |
| websocket_url cursor above 9007199254740991 | E u64::MAX rejected | 0, 1, 9007199254740991 and 9007199254740992; error precedence with invalid base |
| websocket_url validated origin and fixed stream path | E exact WSS URL for cursor 12 | Canonicalized uppercase/443 inputs, rejection of invalid base for WSS, no credential or path retention |

The code has no network side effect. It does not independently verify that a DNS name resolves to a publicly routable IP. Do not infer a live SSRF from URL parsing. If a previously accepted host needs restriction and doing so affects persisted settings, apply the architectural STOP FACTOR before production changes.

## Positive and N1-N12

| Class | Status | Specific scope |
| --- | --- | --- |
| Positive | E partial | Valid public HTTPS and WSS cursor 12; idempotence pending |
| N1 | E partial / ? | Bad protocols and userinfo tested; escaped/normalized URL edge cases pending |
| N2 | E partial / ? | u64::MAX rejects; exact 512/513 byte and 2^53-1/+1 cursor limits not isolated |
| N3 | NA | No HTTP or socket IO |
| N4 | NA | Stateless pure validators |
| N5 | NA | No mutable shared data |
| N6 | E partial / ? | Malformed URL class tested; parser normalization uncertain |
| N7 | E partial / ? | IP/private suffix and origin constraints; IPv4-mapped host or trailing-dot syntax needs native evidence |
| N8 | NA | No time or locale behavior; IDNA is input validation |
| N9 | NA | No UI interruption |
| N10 | E partial | Credentials rejected from ordinary input; no secrets stored or logged |
| N11 | NA | No paid entitlement |
| N12 | NA | No storage interaction |

## Stage 9 test obligations and mutation guards (not implemented)

- RE1: table-driven raw UTF-8 size, whitespace, scheme, escaped separators; check error class. Avoid inventing an otherwise-valid 512-byte DNS origin if impossible.
- RE2: real Rust reqwest Url parsing of public IP, global and IPv4-mapped IPv6, suffixes, trailing dots, Unicode/IDNA and separate userinfo variants. Establish actual outcome before interpreting a security contract.
- RE3: WSS cursor at 0, 1, 9007199254740991, 9007199254740992 and u64::MAX; invalid base precedence; assert exact fixed path with numeric after.
- RE4: canonicalization idempotence and absence of credential, query, fragment or path in output.

Mutations to kill: skip HTTPS prefix or userinfo guard, omit path/query, change default port test, remove reserved suffix/IP checks, change cursor greater-than to greater-than-or-equal, bypass base normalization. If a mutant is killed only by parser failure unrelated to its target guard, record that instead of claiming independent coverage.

No runtime tests executed here. Native security acceptance and global Stage 3-8 review still open.
