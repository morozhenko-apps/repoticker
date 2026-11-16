// Verify the original raw delivery bytes before parsing or acknowledging a webhook.
// This module performs no network, storage, logging or response handling.
const SIGNATURE = /^sha256=([0-9a-f]{64})$/;

export async function verifyGithubWebhookSignature(rawBody, signatureHeader, secret) {
  if (!(rawBody instanceof Uint8Array) ||
      typeof signatureHeader !== "string" ||
      typeof secret !== "string" || secret.length === 0) return false;
  const match = SIGNATURE.exec(signatureHeader);
  if (!match) return false;
  const signature = new Uint8Array(32);
  for (let index = 0; index < signature.length; index++)
    signature[index] = Number.parseInt(match[1].slice(index * 2, index * 2 + 2), 16);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  return crypto.subtle.verify("HMAC", key, signature, rawBody);
}
