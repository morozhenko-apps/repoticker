// Public versioned relay data validation. No GitHub OAuth or repository contents.
export const BODY_LIMIT = 65_536;
export const HISTORY_LIMIT = 128;
export const HISTORY_AGE_MS = 24 * 60 * 60 * 1000;
export const SOCKET_LIMIT = 8;
const REPO_COMPONENT = /^[A-Za-z0-9_.-]{1,100}$/;
const DELIVERY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET_MIN = 32;
const SECRET_MAX = 256;

export function canonicalRepository(value) {
  if (typeof value !== "string" || value.length > 201) return null;
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some(s => s === "." || s === ".." || !REPO_COMPONENT.test(s)))
    return null;
  return parts.join("/").toLowerCase();
}

export function allowedRepositories(raw) {
  if (typeof raw !== "string" || raw.length > 20_100 || !raw) return null;
  const names = raw.split(",");
  if (names.length < 1 || names.length > 100) return null;
  const authorized = new Set();
  for (const name of names) {
    const canonical = canonicalRepository(name.trim());
    if (!canonical || authorized.has(canonical)) return null;
    authorized.add(canonical);
  }
  return authorized;
}

export function validDeliveryId(value) {
  return typeof value === "string" && DELIVERY_ID.test(value) ? value.toLowerCase() : null;
}

export function parseCursor(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw !== "string" || !/^(0|[1-9][0-9]{0,15})$/.test(raw)) return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? number : null;
}

export function cursorFromUrl(url) {
  const uri = new URL(url);
  if (uri.search.length > 48) return null;
  const names = [...uri.searchParams.keys()];
  if (names.some(key => key !== "after") || names.length > 1) return null;
  return parseCursor(uri.searchParams.get("after"));
}

export function validatedWorkflowEvent(payload, eventName, allowlist) {
  if (eventName === "ping") return { kind: "ping" };
  if (eventName !== "workflow_run" || !(allowlist instanceof Set)) return null;
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload));
  } catch {
    return null;
  }
  // GitHub's queued workflow_run transition is called "requested", not "queued".
  // All accepted activities are advisory hints; none is a trusted CI result.
  const statuses = {
    requested: ["requested", "queued", "pending", "waiting"],
    in_progress: ["in_progress"],
    completed: ["completed"]
  };
  const action = value?.action;
  if (!Object.hasOwn(statuses, action) ||
      !statuses[action].includes(value.workflow_run?.status)) return null;
  const repository = canonicalRepository(value.repository?.full_name);
  if (!repository || !allowlist.has(repository)) return null;
  return { kind: "workflow_run." + action, repository };
}

export async function boundedRequestBody(request, limit = BODY_LIMIT) {
  if (!Number.isInteger(limit) || limit < 1 || limit > BODY_LIMIT) return null;
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader !== null &&
      (!/^[0-9]{1,12}$/.test(lengthHeader) || Number(lengthHeader) > limit))
    return null;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || size + value.byteLength > limit) {
        await reader.cancel().catch(() => {});
        return null;
      }
      size += value.byteLength;
      chunks.push(value);
    }
    if (lengthHeader !== null && size !== Number(lengthHeader)) return null;
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
    return output;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function validClientAuthorization(header, expectedSecret) {
  if (typeof expectedSecret !== "string" ||
      expectedSecret.length < SECRET_MIN || expectedSecret.length > SECRET_MAX ||
      typeof header !== "string" || !header.startsWith("Bearer ")) return false;
  const supplied = header.slice(7);
  if (supplied.length < SECRET_MIN || supplied.length > SECRET_MAX ||
      !/^[A-Za-z0-9_-]+$/.test(supplied) ||
      !/^[A-Za-z0-9_-]+$/.test(expectedSecret)) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expectedSecret))
  ]);
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < 32; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
