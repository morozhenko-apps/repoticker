import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { RelayHubController } from "../apps/relay-cloudflare/src/hub.mjs";

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
  for (let i = 1; i <= 129; i++)
    assert.equal((await f.ingest(i)).status, 202);
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
