# Mode B: Cloudflare TypeScript Durable Object adapter, Worker entry and packaging trust boundary (L9)

Prepared parent `e6614f87d13ec176c2460249c404d2ee3eab215e`. Baseline production SHA `a3ba7fa30fc4c81890d3075f94142942d001cbf3`.
Sources:
- `apps/relay-cloudflare/src/index.ts` blob `088c8911793bfcb6802d1846fa708f229a8b0924`, 26 lines;
- `apps/relay-cloudflare/wrangler.toml` blob `753b0e8ed598351f1ee1c141b39d6ea021d0ad48`;
- `.github/workflows/relay-worker-dry-run.yml` blob `2531cde1e17a44c92ed573f5039414453d999580`;
- `tests/relay-webhook-signature.test.mjs` blob `02fc58716c076793b04d787e8d4e72191a9f4b53`;
- `tests/relay-worker-binding-retention.test.mjs` blob `b3814c78302b75e2d0c53b99045898f6e68d854b`.

**Stage 3–8 only. No Wrangler dry run, Cloudflare API call, deployments, credentials, bundled artifact execution or tests were performed during this review.**

## Existing evidence: source contract versus real adapter invocation

The `relay-webhook-signature` suite's packaging test reads the literal `index.ts` and `worker.mjs`, asserts text for `RelayHub extends DurableObject`, `handleRelayRequest` and raw HMAC verification, and checks no `console.log`, `console.error` or `access_token` in Worker router source. It does **not** import or instantiate `RelayHub`, run its methods, or load the emitted Wrangler bundle.

The four `relay-worker-binding-retention` tests read `wrangler.toml`, README and CI YAML as text:
- exactly one top-level `keep_vars=true` before any TOML tables;
- no literal operator allowlist/secrets, no `[vars]` section, `RELAY_HUB` binding and `new_sqlite_classes=["RelayHub"]`;
- deployment guide distinguishes dashboard runtime bindings from build environment;
- dry-run command `wrangler@4.158.0 deploy --dry-run`, disabled checkout credential persistence and no Cloudflare API token or `wrangler secret put` in CI YAML.

These are meaningful **static deployment configuration assertions (S)**, not evidence of successful host bundle execution or persistence of live operator secrets. The workflow has an actual Node SQLite test and Wrangler dry-run gate if run on `dev`, but neither was executed in this continuation. No Cloudflare API auth or deploy is authorized.

## Every entrypoint/adapter method and independent behavior

| Source method or construct | Actual production effect and branch | Evidence / missing acceptance |
| --- | --- | --- |
| Import `DurableObject` from `cloudflare:workers` | Resolve Cloudflare host runtime base; unsupported Node runtime cannot directly import package | S source declaration; **L9 host-compatible module loader needed** |
| `RelayHub.constructor(ctx,env)` | Call `super(ctx,env)` then create one real `RelayHubController(ctx,env)`; SQL schema setup and optional auto ping registration originate in real controller | E underlying controller initialization in Node SQLite fixture; **no RelayHub subclass construction test** |
| `RelayHub.fetch(request)` | Return exact Promise/Response from `this.hub.fetch(request)` with unchanged request identity; no extra authorization here | E underlying Controller.fetch; **L9 adapter delegation missing** |
| `RelayHub.webSocketMessage(socket,message)` | Forward exactly once with unchanged socket and string/ArrayBuffer; no separate parsing or exception swallow | E underlying Controller.webSocketMessage for string ping and invalid JSON; **L9 wrapper path untested**, binary case pending |
| `RelayHub.webSocketClose(socket,code,reason)` | Forward exact parameters to real `this.hub.webSocketClose`; controller's readyState=OPEN guard decides action | **L7 controller close and L9 wrapper delegation both missing** |
| `default.fetch(request,env)` | Delegate exact arguments to real `handleRelayRequest`, returning Promise<Response> without rewriting origin, status or headers | E `handleRelayRequest` independently; **L9 TypeScript default export function not invoked** |
| `wrangler.toml` deployment scope | Fixed Worker name `repoticker-relay`, src/index.ts, DO RELAY_HUB RelayHub and SQLite v1 migration, top-level keep_vars; no plaintext operator bindings | S 4 binding tests plus source review; ? parsed TOML/Wrangler bundle and actual migration in Cloudflare host |
| `relay-worker-dry-run.yml` triggers | Push only on dev for workflow/Worker/relay test paths, manual dispatch, contents:read, Node 26.13.0, Node `tests/relay-*.test.mjs`, Wrangler 4.158.0 dry-run, emitted nonempty JS check | S YAML/source; actual CI pass/unpassed not known here; note named `mode-b-relay-*.test.mjs` do **not** match `tests/relay-*.test.mjs` shell glob, so the dry-run job's test step does not automatically run those two suites. This is a source-derived CI coverage scope observation, not a new code change |
| Worker README | Operator-owned manual deployment, no GitHub repo token in worker, different client/webhook secrets, no R2 and no hosted acceptance yet | S docs, native external Cloudflare acceptance unperformed |

## L9 exact Stage 9 test contract (not implemented)

Use a stable Wrangler-compatible host simulator, or a checked TypeScript transformation that rewrites **only the external `cloudflare:workers` module import** while retaining the actual `RelayHub` class methods and real `RelayHubController`. No source-code regex instead of invocation. The imported public artifact must exercise:
1. Given an external host ctx/env, when constructor runs, then base DurableObject and real controller receive same references, and actual SQLite tables initialize once.
2. Given a private authenticated GET/POST request, when public `RelayHub.fetch` runs, then exactly one actual controller response appears with unchanged request and no alternate route.
3. Given ping, binary, arbitrary command, when `RelayHub.webSocketMessage` runs, then real Controller receives original socket+payload exactly once and closes/replies per policy.
4. Given OPEN/CLOSED sockets, when public `RelayHub.webSocketClose` runs, then real Controller sees original code/reason exactly once; OPEN closes once and CLOSED does not close again. This simultaneously covers L7 without mocking controller.
5. Given Worker request+env, when default `fetch` runs, then real `handleRelayRequest` returns the same public 202/401/404/503 contract, never bypassing raw signature or private bearer.
6. Given actual Wrangler entry, when `deploy --dry-run` compiles, then bundle is nonempty, DO class export and binding are retained and zero publishing/network side effects occur; this is a build check and does not replace executable 1–5 or a future physical Cloudflare acceptance.

## CI coverage interpretation and trust boundary

The dry-run workflow invokes `node --test tests/relay-*.test.mjs`, which matches `relay-hub.test.mjs`, `relay-worker.test.mjs`, `relay-protocol.test.mjs` and `relay-webhook-signature.test.mjs`. It does **not** match `tests/mode-b-relay-protocol.test.mjs` or `tests/mode-b-relay-worker.test.mjs` because their basenames begin `mode-b-`. As a result, no claim that the Worker-specific dry-run job itself gates all Mode B worker/protocol boundary cases is supported. The global stable suite may run the mode-b files through a separate command; inspect exact CI jobs before deciding a workflow change. **Do not alter CI/release gates in a Mode B docs commit.**

The `keep_vars` guard is tested structurally but not against a real dashboard-managed value. A Git-linked push to the configured production branch can deploy automatically; preserve separately controlled source refs and do not move `dev` until host side effects are explicitly reviewed.

## Positive + N1–N12 coverage for this public adapter

| Category | State | Open direct adapter behavior |
| --- | --- | --- |
| Positive | S / E delegatees | Constructor, fetch/message/close/default export must actually execute |
| N1 | E underlying / ? adapter | Wrong input types/ArrayBuffer and malformed request forwarded unchanged |
| N2 | E underlying / ? adapter | 512/513 body, 8/9 sockets, 120/121 rate and 128/129 history not separately retested through wrapper unless needed for glue |
| N3 | E underlying / ? adapter | Rejected host fetch and initialized SQL errors propagate to expected outer 503 |
| N4 | E underlying / ? | Repeated fetch/close and double host callbacks do not double-store/double-close |
| N5 | E underlying / ? | Concurrent DO calls and socket close while broadcast |
| N6 | S / ? | Invalid/broken Wrangler env, malformed migration, boot without SQL binding |
| N7 | S / ? | Actual exported Worker path does not bypass auth; binding is single operator |
| N8 | NA for adapter | Clock policy L8 belongs to SQLite controller, not this pass-through class |
| N9 | **L9** | Real Cloudflare callback and hibernation lifecycle; L7 attached |
| N10 | S / ? | No logged body in source, bundle/host error privacy acceptance |
| N11 | NA | No paid subscription |
| N12 | E underlying / ? | SQLite rollback tested in controller, DO host migration/storage failure untested |

**Mutation review**: delete `super`, construct an alternate hub, drop/request-convert args, swallow `fetch` errors, skip websocketClose callback, route default handler to an unauthenticated path, remove `keep_vars`, drop SQLite migration or alter dry-run to deploy. An executable test (or separate configuration assertion, as appropriate) must detect each change. Nothing was mutated in this inspection.

Global Stages 3–8 remain PARTIAL. No new executable tests, production source or Cloudflare deployment.
