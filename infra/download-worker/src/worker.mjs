// Read-only Cloudflare Worker for a dedicated RepoTicker R2 namespace.
const PREFIX = "/dist/RepoTicker/";
const paths = [
  /^releases\/v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\/(?:linux|windows)\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/,
  /^apt\/pool\/main\/r\/repoticker\/repoticker_(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)_amd64\.deb$/,
  /^apt\/dists\/stable\/InRelease$/,
  /^apt\/dists\/stable\/main\/binary-amd64\/Packages(?:\.gz)?$/,
  /^apt\/dists\/stable\/main\/binary-amd64\/by-hash\/SHA256\/[a-f0-9]{64}$/,
  /^apt\/repoticker-archive-keyring\.gpg$/
];

export function keyFor(rawUrl) {
  const url = new URL(rawUrl);
  if (!url.pathname.startsWith(PREFIX)) return null;
  const path = url.pathname.slice(PREFIX.length);
  if (!path || /%|\\|\.\.|\/\//.test(path)) return null;
  return paths.some(re => re.test(path)) ? "dist/RepoTicker/" + path : null;
}

function mime(key) {
  if (key.endsWith(".deb")) return "application/vnd.debian.binary-package";
  if (key.endsWith(".gpg")) return "application/pgp-keys";
  if (key.endsWith("Packages.gz")) return "application/gzip";
  if (key.endsWith(".sha256") || key.endsWith("InRelease") || key.endsWith("/Packages")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const key = keyFor(request.url);
    if (!key) return new Response("Not Found", { status: 404 });
    const object = await env.ARCHIVE.get(key);
    if (!object) return new Response("Not Found", { status: 404 });
    const headers = new Headers({
      "Content-Type": mime(key),
      "Cache-Control": key.endsWith("/InRelease") ? "no-store" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    });
    if (object.size != null) headers.set("Content-Length", String(object.size));
    if (object.httpEtag) headers.set("ETag", object.httpEtag);
    return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
  }
};
