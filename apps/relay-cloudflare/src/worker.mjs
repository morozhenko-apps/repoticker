import { verifyGithubWebhookSignature } from "./webhook-verify.mjs";
import {
  BODY_LIMIT, allowedRepositories, boundedRequestBody, cursorFromUrl,
  validClientAuthorization, validDeliveryId, validatedWorkflowEvent
} from "./relay-protocol.mjs";

const fail = status => new Response(null, { status, headers: { "cache-control": "no-store" } });
const stub = env => env.RELAY_HUB.get(env.RELAY_HUB.idFromName("personal-v1"));

async function ingest(request, env, allowed) {
  if (typeof env.WEBHOOK_SECRET !== "string" || env.WEBHOOK_SECRET.length < 32)
    return fail(503);
  if (new URL(request.url).search) return fail(400);
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i
    .test(request.headers.get("content-type") || "")) return fail(415);
  const body = await boundedRequestBody(request, BODY_LIMIT);
  if (!body) return fail(413);
  if (!await verifyGithubWebhookSignature(body,
    request.headers.get("x-hub-signature-256"), env.WEBHOOK_SECRET)) return fail(401);
  const event = validatedWorkflowEvent(body, request.headers.get("x-github-event"), allowed);
  if (!event) return fail(422);
  if (event.kind === "ping") return fail(204);
  const delivery = validDeliveryId(request.headers.get("x-github-delivery"));
  if (!delivery) return fail(422);
  const outcome = await stub(env).fetch(new Request("https://relay.internal/ingest", {
    method: "POST", headers: {
      authorization: "Bearer " + env.RELAY_CLIENT_SECRET,
      "content-type": "application/json"
    }, body: JSON.stringify({ v: 1, delivery, repository: event.repository })
  }));
  return fail(outcome.status === 202 ? 202 : 503);
}

async function subscribe(request, env, upgrade) {
  if (!await validClientAuthorization(request.headers.get("authorization"),
    env.RELAY_CLIENT_SECRET)) return fail(401);
  // Native-only authenticated transport: browsers cannot supply Authorization.
  if (request.headers.has("origin") || request.headers.has("cookie")) return fail(403);
  const after = cursorFromUrl(request.url);
  if (after === null) return fail(400);
  if (upgrade && request.headers.get("upgrade")?.toLowerCase() !== "websocket")
    return fail(426);
  const target = new URL(upgrade ?
    "https://relay.internal/stream" : "https://relay.internal/changes");
  target.searchParams.set("after", String(after));
  const headers = { authorization: "Bearer " + env.RELAY_CLIENT_SECRET };
  if (upgrade) headers.upgrade = "websocket";
  return stub(env).fetch(new Request(target, { headers }));
}

export async function handleRelayRequest(request, env) {
  try {
    if (!env?.RELAY_HUB || !await validClientAuthorization(
      "Bearer " + env.RELAY_CLIENT_SECRET, env.RELAY_CLIENT_SECRET)) return fail(503);
    const allowed = allowedRepositories(env.ALLOWED_REPOSITORIES);
    if (!allowed) return fail(503);
    const path = new URL(request.url).pathname;
    // Await inside this catch boundary so DO failures yield a redacted 503.
    if (path === "/v1/github")
      return request.method === "POST" ? await ingest(request, env, allowed) : fail(405);
    if (path === "/v1/stream")
      return request.method === "GET" ? await subscribe(request, env, true) : fail(405);
    if (path === "/v1/changes")
      return request.method === "GET" ? await subscribe(request, env, false) : fail(405);
    return fail(404);
  } catch {
    // Never include provider payload, configuration, tokens or private names in errors.
    return fail(503);
  }
}
