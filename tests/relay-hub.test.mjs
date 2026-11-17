import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { RelayHubController } from "../apps/relay-cloudflare/src/hub.mjs";
import { HISTORY_AGE_MS } from "../apps/relay-cloudflare/src/relay-protocol.mjs";

const CLIENT = "RelayClientSecret01234567890123456";
const REPO = "team/repo";
const id = number => "00000000-0000-4000-8000-" + number.toString(16).padStart(12, "0");

function fixture() {
  const database = new DatabaseSync(":memory:");
  const sockets = [];
  const clock = { ms: 1_785_000_000_000 };
  const ctx = {
    storage: {
      sql: { exec(statement, ...parameters) {
        let rows = [];
        if (/^\s*SELECT\b/i.test(statement))
          rows = database.prepare(statement).all(...parameters);
        else if (parameters.length) database.prepare(statement).run(...parameters);
        else database.exec(statement);
        return { toArray: () => rows };
      } },
      transactionSync(callback) {
        database.exec("BEGIN IMMEDIATE");
        try {
          const outcome = callback();
          database.exec("COMMIT");
          return outcome;
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }
      }
    },
    getWebSockets: () => sockets,
    acceptWebSocket(socket) { sockets.push(socket); }
  };
  let lastServer = null;
  const hub = new RelayHubController(ctx, {
    RELAY_CLIENT_SECRET: CLIENT,
    ALLOWED_REPOSITORIES: REPO
  }, {
    now: () => clock.ms,
    makePair() {
      const server = {
        sent: [], closed: false, bufferedAmount: 0, readyState: 1,
        send(message) { this.sent.push(JSON.parse(message)); },
        close() { this.closed = true; }
      };
      lastServer = server;
      return [{ role: "client" }, server];
    },
    socketResponse: client => ({ status: 101, webSocket: client })
  });
  const auth = { authorization: "Bearer " + CLIENT };
  const ingest = (number, repository = REPO) =>
    hub.fetch(new Request("https://internal.invalid/ingest", {
      method: "POST", headers: auth,
      body: JSON.stringify({ v: 1, delivery: id(number), repository })
    }));
  const changes = (after = 0, headers = auth) =>
    hub.fetch(new Request("https://internal.invalid/changes?after=" + after, { headers }));
  const stream = (after = 0) =>
    hub.fetch(new Request("https://internal.invalid/stream?after=" + after, {
      headers: { ...auth, upgrade: "websocket" }
    }));
  return { hub, ingest, changes, stream, ctx, sockets, clock, database, env: hub.env,
    get lastServer() { return lastServer; } };
}

test("Given verified delivery When stored Then retry is idempotent and cursor never duplicates", async () => {
  const f = fixture();
  assert.equal((await f.ingest(1)).status, 202);
  assert.equal((await f.ingest(1)).status, 202);
  assert.equal((await f.ingest(2)).status, 202);
  const body = await (await f.changes()).json();
  assert.equal(body.v, 1);
  assert.equal(body.type, "batch");
  assert.equal(body.reset, false);
  assert.deepEqual(body.hints.map(row => row.cursor), [1, 2]);
  assert.ok(body.hints.every(row => row.repository === REPO));
  assert.doesNotMatch(JSON.stringify(body), /delivery|secret|conclusion|token/);
});

test("Given more than 128 webhook deliveries When querying stale cursor Then reset is required", async () => {
  const f = fixture();
  for (let i = 1; i <= 129; i++) {
    // Capacity is 120 deliveries per minute; test journal retention
    // across two legitimate minute buckets, never bypass rate limiting.
    if (i === 121) f.clock.ms += 60_000;
    assert.equal((await f.ingest(i)).status, 202);
  }
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM hints").get().count, 128);
  const stale = await (await f.changes(0)).json();
  assert.equal(stale.reset, true);
  assert.equal(stale.cursor, 129);
  assert.equal(stale.hints.length, 0);
  const fresh = await (await f.changes(1)).json();
  assert.equal(fresh.reset, false);
  assert.equal(fresh.hints.length, 128);
  assert.equal(fresh.hints[0].cursor, 2);
});

test("Given WebSocket subscriber When connected Then replay only bounded hints and accept no command", async () => {
  const f = fixture();
  await f.ingest(1);
  const connection = await f.stream(0);
  assert.equal(connection.status, 101);
  assert.deepEqual(f.lastServer.sent.map(message => message.type), ["hint", "ready"]);
  await f.ingest(2);
  assert.deepEqual(f.lastServer.sent.map(message => message.cursor), [1, 1, 2]);
  f.hub.webSocketMessage(f.lastServer, '{"type":"sync"}');
  assert.equal(f.lastServer.closed, true);
});

test("Given old journal and WebSocket cap When replaying Then no unbounded websocket state", async () => {
  const f = fixture();
  for (let i = 0; i < 8; i++) assert.equal((await f.stream()).status, 101);
  assert.equal((await f.stream()).status, 429);
  await f.ingest(1);
  // All retained rows expire; the durable AUTOINCREMENT high watermark
  // must survive deletion so an offline client receives reset.
  f.clock.ms += 86_400_001;
  const history = await (await f.changes()).json();
  assert.equal(history.reset, true);
  assert.equal(history.hints.length, 0);
  await f.ingest(2);
  assert.equal((await f.changes(1)).status, 200);
  assert.ok((await (await f.changes(1)).json()).hints.every(h => h.cursor > 1));
});

test("Given expired/unauthorized session or malformed internal hint Then deny with no durable writes", async () => {
  const f = fixture();
  const denied = await f.hub.fetch(new Request("https://internal.invalid/changes", {
    headers: { authorization: "Bearer incorrect" }
  }));
  assert.equal(denied.status, 401);
  assert.equal((await f.ingest(1, "other/repo")).status, 422);
  assert.equal((await f.hub.fetch(new Request(
    "https://internal.invalid/changes?after=1&after=2",
    { headers: { authorization: "Bearer " + CLIENT } }))).status, 400);
  const oversized = await f.hub.fetch(new Request("https://internal.invalid/ingest", {
    method: "POST", headers: { authorization: "Bearer " + CLIENT },
    body: "X".repeat(513)
  }));
  assert.equal(oversized.status, 413);
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM hints").get().count, 0);
});

test("Given excessive signed deliveries in one minute Then hard-cap writes and allow duplicate idempotence", async () => {
  const f = fixture();
  for (let n = 1; n <= 120; n++) assert.equal((await f.ingest(n)).status, 202);
  assert.equal((await f.ingest(121)).status, 429);
  assert.equal((await f.ingest(120)).status, 202);
  f.clock.ms += 60_000;
  assert.equal((await f.ingest(121)).status, 202);
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM rate_budget").get().count, 1);
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM hints").get().count, 121);
});

test("Given storage failure When inserting Then no success acknowledgment or phantom delivery", async () => {
  const f = fixture();
  f.database.exec("DROP TABLE hints");
  await assert.rejects(() => f.ingest(7));
});

test("Given subscriber with outdated cursor When reconnecting Then report reset before ready", async () => {
  const f = fixture();
  await f.ingest(1);
  await f.ingest(2);
  const response = await f.stream(999);
  assert.equal(response.status, 101);
  assert.deepEqual(f.lastServer.sent.map(frame => frame.type), ["reset", "ready"]);
  assert.equal(f.lastServer.sent[0].cursor, 2);
});

test("Given a repository revoked from allowlist When replaying Then old stored hints do not leak it", async () => {
  const f = fixture();
  await f.ingest(1);
  f.env.ALLOWED_REPOSITORIES = "team/other";
  const response = await (await f.changes()).json();
  assert.equal(response.cursor, 1);
  assert.deepEqual(response.hints, []);
});

test("Given owner-scope allowlist When ingesting/replaying Then permit new repo and hide revoked history", async () => {
  const f = fixture();
  f.env.ALLOWED_REPOSITORIES = "team/*";
  assert.equal((await f.ingest(1, "team/new")).status, 202);
  assert.equal((await f.ingest(2, "other/new")).status, 422);
  let batch = await (await f.changes()).json();
  assert.deepEqual(batch.hints.map(h => h.repository), ["team/new"]);
  f.env.ALLOWED_REPOSITORIES = "team/other";
  batch = await (await f.changes()).json();
  assert.deepEqual(batch.hints, [], "revocation also filters durable history");
  assert.equal((await f.ingest(3, "team/new")).status, 422);
});


test("Given concurrent duplicate deliveries When ingesting Then transaction grants one cursor and one rate admission", async () => {
  const f = fixture();
  const responses = await Promise.all(Array.from({ length: 24 }, () => f.ingest(11)));
  assert.ok(responses.every(response => response.status === 202));
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM hints").get().count, 1);
  assert.equal(f.database.prepare("SELECT admitted FROM rate_budget").get().admitted, 1);
  const result = await (await f.changes()).json();
  assert.deepEqual(result.hints.map(hint => hint.cursor), [1]);
});

test("Given failed SQL insert after budget increment When transacting Then roll back both hint and budget", async () => {
  const f = fixture();
  f.database.exec("CREATE TRIGGER deny_hints BEFORE INSERT ON hints BEGIN SELECT RAISE(ABORT, 'storage denied'); END");
  await assert.rejects(() => f.ingest(11));
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM hints").get().count, 0);
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM rate_budget").get().count, 0);
  f.database.exec("DROP TRIGGER deny_hints");
  assert.equal((await f.ingest(11)).status, 202);
  assert.equal(f.database.prepare("SELECT admitted FROM rate_budget").get().admitted, 1);
});

test("Given exact history age boundary When replaying Then include age limit and reset one millisecond later", async () => {
  const f = fixture();
  assert.equal((await f.ingest(9)).status, 202);
  f.clock.ms += HISTORY_AGE_MS;
  const atLimit = await (await f.changes(0)).json();
  assert.equal(atLimit.reset, false);
  assert.deepEqual(atLimit.hints.map(row => row.cursor), [1]);
  f.clock.ms += 1;
  const expired = await (await f.changes(0)).json();
  assert.equal(expired.reset, true);
  assert.deepEqual(expired.hints, []);
  assert.equal(expired.cursor, 1);
});

test("Given one backpressured subscriber When broadcasting Then close only it and notify healthy peers", async () => {
  const f = fixture();
  assert.equal((await f.stream(0)).status, 101);
  assert.equal((await f.stream(0)).status, 101);
  const [blocked, healthy] = f.sockets;
  blocked.bufferedAmount = 65_537;
  healthy.bufferedAmount = 65_536;
  assert.equal((await f.ingest(1)).status, 202);
  assert.equal(blocked.closed, true);
  assert.deepEqual(blocked.sent.map(message => message.type), ["ready"]);
  assert.equal(healthy.closed, false);
  assert.deepEqual(healthy.sent.map(message => message.type), ["ready", "hint"]);
  assert.equal(healthy.sent.at(-1).cursor, 1);
});

test("Given one throwing socket When broadcasting Then isolate send error and keep durable write committed", async () => {
  const f = fixture();
  assert.equal((await f.stream(0)).status, 101);
  assert.equal((await f.stream(0)).status, 101);
  const [broken, healthy] = f.sockets;
  broken.send = () => { throw Error("PRIVATE_SOCKET_FAILURE"); };
  assert.equal((await f.ingest(1)).status, 202);
  assert.equal(broken.closed, true);
  assert.equal(healthy.closed, false);
  assert.equal(healthy.sent.at(-1).cursor, 1);
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM hints").get().count, 1);
});

test("Given socket client messages When handling Then pong to ping and close arbitrary commands", async () => {
  const f = fixture();
  assert.equal((await f.stream(0)).status, 101);
  const socket = f.lastServer;
  const transmitted = [];
  socket.send = value => transmitted.push(value);
  f.hub.webSocketMessage(socket, "ping");
  assert.deepEqual(transmitted, ["pong"]);
  f.hub.webSocketMessage(socket, JSON.stringify({ type: "trigger-sync" }));
  assert.equal(socket.closed, true);
});

test("Given invalid durable requests When dispatching Then reject without writing records", async () => {
  const f = fixture();
  const authorization = "Bearer " + CLIENT;
  const checks = [
    [new Request("https://internal.invalid/ingest", { headers: { authorization } }), 404],
    [new Request("https://internal.invalid/missing", { headers: { authorization } }), 404],
    [new Request("https://internal.invalid/changes", {
      method: "POST", headers: { authorization }, body: "{}"
    }), 405],
    [new Request("https://internal.invalid/stream", { headers: { authorization } }), 426],
    [new Request("https://internal.invalid/changes?after=0&after=1", {
      headers: { authorization }
    }), 400],
    [new Request("https://internal.invalid/changes?after=1", {
      headers: { authorization: "Bearer wrong" }
    }), 401]
  ];
  for (const [request, code] of checks) {
    const response = await f.hub.fetch(request);
    assert.equal(response.status, code);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM hints").get().count, 0);
});

test("Given 512/513-byte signed-internal hint payloads When ingesting Then enforce exact DO bound", async () => {
  const f = fixture();
  const authorization = "Bearer " + CLIENT;
  const item = JSON.stringify({ v: 1, delivery: id(1), repository: REPO });
  assert.ok(item.length < 512);
  const exact = new Request("https://internal.invalid/ingest", {
    method: "POST", headers: { authorization },
    body: item + " ".repeat(512 - item.length)
  });
  assert.equal((await f.hub.fetch(exact)).status, 202);
  const large = new Request("https://internal.invalid/ingest", {
    method: "POST", headers: { authorization },
    body: item + " ".repeat(513 - item.length)
  });
  assert.equal((await f.hub.fetch(large)).status, 413);
  assert.equal(f.database.prepare("SELECT COUNT(*) AS count FROM hints").get().count, 1);
});

test("Given revoked runtime allowlist When reading Durable Object Then fail closed with no journal leak", async () => {
  const f = fixture();
  assert.equal((await f.ingest(1)).status, 202);
  f.env.ALLOWED_REPOSITORIES = "*/*";
  const response = await f.changes(0);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "");
});
