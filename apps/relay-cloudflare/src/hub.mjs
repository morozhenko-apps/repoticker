import {
  HISTORY_LIMIT, HISTORY_AGE_MS, SOCKET_LIMIT, allowedRepositories,
  boundedRequestBody, canonicalRepository, cursorFromUrl,
  validClientAuthorization, validDeliveryId
} from "./relay-protocol.mjs";

const INGEST_LIMIT_PER_MINUTE = 120;
const fail = status => new Response(null, { status, headers: { "cache-control": "no-store" } });
const json = value => new Response(JSON.stringify(value), {
  status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" }
});

// One operator and one SQLite Durable Object. No tenant or arbitrary repository subscriptions.
export class RelayHubController {
  constructor(ctx, env, platform = {}) {
    this.ctx = ctx;
    this.env = env;
    this.now = platform.now || Date.now;
    this.makePair = platform.makePair || (() => Object.values(new WebSocketPair()));
    this.socketResponse = platform.socketResponse ||
      (client => new Response(null, { status: 101, webSocket: client }));
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS hints (cursor INTEGER PRIMARY KEY AUTOINCREMENT, delivery TEXT NOT NULL UNIQUE, repository TEXT NOT NULL, created_at INTEGER NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS rate_budget (minute INTEGER PRIMARY KEY, admitted INTEGER NOT NULL)");
    if (typeof WebSocketRequestResponsePair === "function" && ctx.setWebSocketAutoResponse)
      ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  history(after) {
    const now = this.now();
    const newest = this.sql.exec(
      "SELECT COALESCE(seq, 0) AS cursor FROM sqlite_sequence WHERE name = 'hints'"
    ).toArray()[0]?.cursor ?? 0;
    const oldest = this.sql.exec(
      "SELECT MIN(cursor) AS cursor FROM hints WHERE created_at >= ?", now - HISTORY_AGE_MS
    ).toArray()[0]?.cursor ?? null;
    const reset = after > newest ||
      (newest > after && (oldest === null || after < oldest - 1));
    const rows = reset ? [] : this.sql.exec(
      "SELECT cursor, repository FROM hints WHERE cursor > ? AND created_at >= ? ORDER BY cursor ASC LIMIT ?",
      after, now - HISTORY_AGE_MS, HISTORY_LIMIT
    ).toArray();
    const allowed = allowedRepositories(this.env.ALLOWED_REPOSITORIES);
    return {
      cursor: newest, reset,
      hints: rows.filter(row => allowed?.has(row.repository)).map(row => ({
        v: 1, type: "hint", cursor: row.cursor, repository: row.repository
      }))
    };
  }

  ingest(delivery, repository) {
    const now = this.now(), minute = Math.floor(now / 60_000);
    return this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM hints WHERE created_at < ?", now - HISTORY_AGE_MS);
      const existing = this.sql.exec(
        "SELECT cursor FROM hints WHERE delivery = ?", delivery
      ).toArray()[0];
      if (existing) return { accepted: true, hint: null };
      const usage = this.sql.exec(
        "SELECT admitted FROM rate_budget WHERE minute = ?", minute
      ).toArray()[0]?.admitted ?? 0;
      if (usage >= INGEST_LIMIT_PER_MINUTE) return { accepted: false, hint: null };
      this.sql.exec(
        "INSERT INTO rate_budget (minute, admitted) VALUES (?, 1) ON CONFLICT(minute) DO UPDATE SET admitted = admitted + 1",
        minute
      );
      this.sql.exec("DELETE FROM rate_budget WHERE minute < ?", minute);
      this.sql.exec(
        "INSERT INTO hints (delivery, repository, created_at) VALUES (?, ?, ?)",
        delivery, repository, now
      );
      const cursor = this.sql.exec(
        "SELECT cursor FROM hints WHERE delivery = ?", delivery
      ).toArray()[0].cursor;
      this.sql.exec(
        "DELETE FROM hints WHERE cursor NOT IN (SELECT cursor FROM hints ORDER BY cursor DESC LIMIT ?)",
        HISTORY_LIMIT
      );
      return { accepted: true,
        hint: { v: 1, type: "hint", cursor, repository } };
    });
  }

  broadcast(hint) {
    if (!hint) return;
    const data = JSON.stringify(hint);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        if (socket.bufferedAmount > 65_536) { socket.close(1008, "backpressure"); continue; }
        socket.send(data);
      } catch {
        try { socket.close(1011, "delivery error"); } catch {}
      }
    }
  }

  async fetch(request) {
    if (!await validClientAuthorization(
      request.headers.get("authorization"), this.env.RELAY_CLIENT_SECRET)) return fail(401);
    const allowlist = allowedRepositories(this.env.ALLOWED_REPOSITORIES);
    if (!allowlist) return fail(503);
    const { pathname } = new URL(request.url);
    if (pathname === "/ingest" && request.method === "POST") {
      const raw = await boundedRequestBody(request, 512);
      if (!raw) return fail(413);
      let item;
      try { item = JSON.parse(new TextDecoder().decode(raw)); } catch { return fail(400); }
      const repository = canonicalRepository(item?.repository);
      const delivery = validDeliveryId(item?.delivery);
      if (item?.v !== 1 || !repository || !allowlist.has(repository) || !delivery)
        return fail(422);
      const outcome = this.ingest(delivery, repository);
      if (!outcome.accepted) return fail(429);
      this.broadcast(outcome.hint);
      return fail(202);
    }
    if (request.method !== "GET") return fail(405);
    if (pathname !== "/stream" && pathname !== "/changes") return fail(404);
    const after = cursorFromUrl(request.url);
    if (after === null) return fail(400);
    if (pathname === "/changes") {
      const snapshot = this.history(after);
      return json({ v: 1, type: "batch", ...snapshot });
    }
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return fail(426);
    if (this.ctx.getWebSockets().length >= SOCKET_LIMIT) return fail(429);
    const snapshot = this.history(after);
    const [client, server] = this.makePair();
    this.ctx.acceptWebSocket(server);
    // Replay never represents an authoritative GitHub CI conclusion.
    if (snapshot.reset)
      server.send(JSON.stringify({ v: 1, type: "reset", cursor: snapshot.cursor }));
    else for (const hint of snapshot.hints) server.send(JSON.stringify(hint));
    server.send(JSON.stringify({ v: 1, type: "ready", cursor: snapshot.cursor }));
    return this.socketResponse(client);
  }

  webSocketMessage(socket, message) {
    if (message === "ping") socket.send("pong");
    else socket.close(1008, "unexpected message");
  }

  webSocketClose(socket, code, reason) {
    if (socket.readyState === 1) socket.close(code, reason);
  }
}
