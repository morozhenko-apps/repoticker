# Mode B verified assertions: Settings, Quota and Relay

Existing tests inspected against actual imported controller/DO business code and fake *external* IPC/SQLite/socket adapters. Source baseline `a3ba7fa30fc4c81890d3075f94142942d001cbf3`. No new suite execution. E_PARTIAL means some required outcomes are proven by existing behavioral assertions, not the whole scenario group.

| Group | Existing executable tests | Specific observed assertions | Still outstanding |
| --- | --- | --- | --- |
| S1 | tests/settings-github-confirm.test.mjs:2476 Late native status read cannot override a newer WebSocket transition; 2677 Settings focus re-reads native WebSocket state when previous event was missed; 2935 saved Hybrid/missing secret | An old async native ONLINE read after a newer fallback event does not promote online; actual later online event disables editable URL; focus recovers missed live phase; stored-secret absence is fallback with blank password. | Native OS Keyring read failure and stale *two reopened window generations* remain unproven. |
| S2 | tests/settings-github-confirm.test.mjs:2046 Cancel secret is draft; 2066 OK stage/save/commit; 2121 failed commit; 2646 false removal acknowledgment; 2816 stage denied; 2839 config save denied; 2864 concurrent OK | No write on Cancel; stage precedes commit and close; denied stage never invokes save; denied config save retains draft and no native commit; failure retains retryable secret; double OK exactly one stage/save/commit/close; acknowledged but unremoved credential keeps Settings open. | Real Keyring failures require native integration; every ordered write boundary and rollback of previously persisted nonsecret config still need exact reconciliation. |
| Q1 | tests/quota-mode-b.test.mjs:155 conflicting owner provenance; 216 prior-account billing arriving late cannot replace newer scope billing | Old owner billing 111 returned after new owner billing 222: popup retains 222 and not 111; no local Git get_snapshot; owner mismatch refuses unsupported scope. | Stale *failure* arriving after new successful scope and simultaneous auth loss not explicitly asserted. |
| Q2 | tests/quota-mode-b.test.mjs:201 failed monitor-only IPC reports unavailable; 253 raw billing transport exception never appears; 269 native monitor denial recovers | After failed monitor IPC displays Status unavailable, never old confident counts; exception sentinel is absent from rendered popup, user sees sanitized unavailable; later trusted event can recover. | Listener registration rejection and repeated event delivery must be checked (distinct from native IPC rejection). |
| L6 | tests/relay-hub.test.mjs:237 one backpressured subscriber; 252 throwing socket | At 65,537 buffered bytes closes only blocked socket, 65,536 peer remains and receives hint; broken send throws but healthy peer receives hint, SQLite committed count=1. | Empty broadcast no side effects; socket.close itself throwing during failed send not covered. |
| L5 | tests/relay-hub.test.mjs:277 invalid durable requests; 298 512/513 byte bound; 320 runtime allowlist revoke | Wrong routes/methods, duplicate cursor, wrong bearer reject with exact 404/405/426/400/401, no SQL records; 512 bytes ingests, 513 returns 413; revoked allowlist yields 503 no-store empty body. | Malformed JSON, wrong internal v/delivery/repository individually 400/422 and zero DB writes not established by these cases. |

## Mutation sensitivity and limits

- S1: removing the stale-result generation gate would make old native status turn fallback into online.
- S2: removing `saving`/single-flight, moving native commit before config save, or closing on failed Keyring readback would violate explicit call-count and final-state assertions.
- Q1: losing scope/version guard would display 111 from the previous owner after 222 from the new owner.
- Q2: displaying a raw provider exception would expose a literal sentinel in the popup.
- L5: increasing body cap from 512 to 513 or accepting duplicate cursor/query would violate status and SQL count assertions.
- L6: changing backpressure threshold from >65536 to >=65536, or removing per-socket isolation, would close the healthy connection or prevent its hint.
- These are **predicted** mutation effects based on reviewed assertions; actual mutation runs have **not** been performed.

Uninspected branches and physical Keyring/KDE/Windows acceptance are still planned; no broad N-category completion is claimed.