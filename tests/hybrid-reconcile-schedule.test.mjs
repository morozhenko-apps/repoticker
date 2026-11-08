import test from "node:test";
import assert from "node:assert/strict";
import {
  REFRESH_MS, HYBRID_FULL_RECONCILE_MS, startGithubMonitoring
} from "../apps/desktop/ui/github-monitor.mjs";

const settle = async () => {
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
};

function harness({ initialPhase = "polling", nativePhaseRead = null,
  resultFactory = null, nativeCooldownSeconds = 0 } = {}) {
  const events = new Map();
  const calls = [];
  const collections = [];
  const clock = { ms: 1_000_000 };
  let scheduled = null;
  let phase = initialPhase;
  const sample = () => ({
    scope: { organization: "team", repositories: ["team/repo"] },
    coverage: { jobs: true, runners: true, running: true, queue: true },
    counts: { running: 1, queued: 0, busy: 1, idle: 0 },
    errors: [],
    runners: [], runningJobs: [], queuedJobs: [], waitingJobs: [],
    runningByLane: { selfHosted: [], githubHosted: [], unclassified: [] },
    queuedByLane: { selfHosted: [], githubHosted: [], unclassified: [] },
    checkedAtTasks: "2026-11-08T13:00:00Z",
    checkedAtRunners: "2026-11-08T13:00:00Z"
  });
  const invoke = async (command, args = {}) => {
    calls.push({ command, args });
    switch (command) {
      case "relay_connection_status":
        return nativePhaseRead ? nativePhaseRead() : phase;
      case "github_auth_status": return { connected: true };
      case "get_monitor_selection": return {
        github_monitor_org: "team", github_monitor_repositories: ["team/repo"],
        ci_notification_mode: "off"
      };
      case "github_monitor_publish": return null;
      case "github_api_cooldown_seconds": return nativeCooldownSeconds;
      default: throw Error("Unexpected IPC: " + command);
    }
  };
  const refresh = startGithubMonitoring({
    invoke,
    event: { listen(name, callback) { events.set(name, callback); } },
    schedule(callback, interval) {
      assert.equal(interval, REFRESH_MS);
      assert.equal(scheduled, null, "Only one periodic timer may exist");
      scheduled = callback;
    },
    now: () => clock.ms,
    collect: async ({ kind }) => {
      collections.push({ kind, at: clock.ms });
      return resultFactory ? resultFactory(kind) : {
        state: sample(), repositoryCount: 1, failure: null, reason: null
      };
    }
  });
  return {
    clock, calls, collections, refresh,
    async ready() { await settle(); },
    async tick(deltaMs) {
      clock.ms += deltaMs;
      assert.equal(typeof scheduled, "function");
      scheduled();
      await settle();
    },
    async hint(kind) {
      events.get("repoticker-relay-reconcile")?.({ payload: { kind } });
      await settle();
    },
    async phase(next) {
      phase = next;
      events.get("repoticker-relay-state")?.({ payload: { phase: next } });
      await settle();
    },
    kinds() { return collections.map(row => row.kind); }
  };
}

test("Given Simple polling When two minutes elapse Then continue full REST snapshots", async () => {
  const app = harness();
  await app.ready();
  assert.deepEqual(app.kinds(), ["all"]);
  await app.tick(60_000);
  assert.deepEqual(app.kinds(), ["all"]);
  await app.tick(60_000);
  assert.deepEqual(app.kinds(), ["all", "all"]);
});

test("Given native online Hybrid When time advances Then runners remain fresh and full CI uses 15-minute safety bound", async () => {
  const app = harness({ initialPhase: "online" });
  await app.ready();
  assert.equal(HYBRID_FULL_RECONCILE_MS, 900_000);
  assert.deepEqual(app.kinds(), ["all"]);
  await app.tick(120_000);
  assert.deepEqual(app.kinds(), ["all", "runners"]);
  await app.tick(120_000);
  assert.deepEqual(app.kinds(), ["all", "runners", "runners"]);
  await app.tick(660_000);
  assert.deepEqual(app.kinds().at(-1), "all");
  assert.equal(app.collections.at(-1).at, 1_000_000 + HYBRID_FULL_RECONCILE_MS);
});

test("Given frequent Hybrid task hints When time advances Then tasks cannot starve full REST or runner reads", async () => {
  const app = harness({ initialPhase: "online" });
  await app.ready();
  for (let i = 0; i < 11; i++) {
    await app.tick(100_000);
    await app.hint("tasks");
  }
  const later = app.collections.filter(item => item.at > 1_000_000);
  assert.ok(later.some(item => item.kind === "runners"),
    "task hints may not starve independent runner metrics");
  assert.ok(later.some(item => item.kind === "all" &&
    item.at >= 1_000_000 + HYBRID_FULL_RECONCILE_MS),
    "task hints may not postpone the mandatory full REST reconciliation");
});

test("Given online-to-fallback transition When WebSocket is lost Then reconcile immediately and restore short polling", async () => {
  const app = harness({ initialPhase: "online" });
  await app.ready();
  await app.tick(60_000);
  assert.deepEqual(app.kinds(), ["all"]);
  await app.phase("fallback");
  assert.deepEqual(app.kinds(), ["all", "all"]);
  await app.tick(120_000);
  assert.deepEqual(app.kinds(), ["all", "all", "all"]);
});

test("Given connecting or polling native phase When timer advances Then keep the short full REST schedule", async () => {
  for (const phase of ["connecting", "polling", "fallback"]) {
    const app = harness({ initialPhase: phase });
    await app.ready();
    await app.tick(120_000);
    assert.deepEqual(app.kinds(), ["all", "all"], phase);
  }
});

test("Given native phase IPC failure When monitor starts Then fail safe to direct polling", async () => {
  const app = harness({ nativePhaseRead: async () => { throw Error("native unavailable"); } });
  await app.ready();
  await app.tick(120_000);
  assert.deepEqual(app.kinds(), ["all", "all"]);
});

test("Given late native phase snapshot When newer fallback event arrives Then stale snapshot cannot restore online mode", async () => {
  let resolvePhase;
  const app = harness({
    nativePhaseRead: () => new Promise(resolve => { resolvePhase = resolve; })
  });
  await app.ready();
  assert.equal(typeof resolvePhase, "function");
  await app.phase("online");
  await app.phase("fallback");
  assert.deepEqual(app.kinds(), ["all", "all"]);
  resolvePhase("online");
  await settle();
  await app.tick(120_000);
  assert.deepEqual(app.kinds(), ["all", "all", "all"]);
});

test("Given a burst of two task hints When burst gate coalesces Then a trailing task reconciliation is not lost", async () => {
  const app = harness({ initialPhase: "online" });
  await app.ready();
  await app.hint("tasks");
  assert.deepEqual(app.kinds(), ["all", "tasks"]);
  app.clock.ms += 10_000;
  await app.hint("tasks");
  assert.deepEqual(app.kinds(), ["all", "tasks"]);
  await app.tick(20_000);
  assert.deepEqual(app.kinds(), ["all", "tasks", "tasks"],
    "trailing hint should be reconciled at the next periodic tick");
});

test("Given an incomplete full REST snapshot When online Then do not stretch recovery to 15 minutes", async () => {
  const app = harness({
    initialPhase: "online",
    resultFactory: () => ({
      state: null, repositoryCount: 1, failure: "unavailable", reason: "Unavailable"
    })
  });
  await app.ready();
  await app.tick(120_000);
  assert.deepEqual(app.kinds(), ["all", "all"]);
});

test("Given GitHub cooldown When fallback forces a read Then no rate-limit bypass occurs", async () => {
  let count = 0;
  const app = harness({
    initialPhase: "online",
    nativeCooldownSeconds: 180,
    resultFactory: () => {
      count++;
      if (count === 1) return {
        state: null, repositoryCount: 1,
        failure: "rate_limited", reason: "Rate limited"
      };
      return {
        state: {
          scope: { organization: "team", repositories: ["team/repo"] },
          coverage: { jobs: true, runners: true },
          counts: { running: 1, queued: 0, busy: 0 }, errors: []
        }, repositoryCount: 1, failure: null, reason: null
      };
    }
  });
  await app.ready();
  await app.phase("fallback");
  assert.equal(count, 1, "fallback must not bypass the active GitHub cooldown");
  await app.tick(120_000);
  assert.equal(count, 1);
  await app.tick(120_000);
  assert.equal(count, 2, "recovery resumes after cooldown with the ordinary cadence");
});

test("Given unknown native phase When online Then conservatively revert to full REST and never trust a status payload", async () => {
  const app = harness({ initialPhase: "online" });
  await app.ready();
  await app.phase("unrecognized");
  await app.tick(120_000);
  assert.deepEqual(app.kinds(), ["all", "all", "all"]);
  assert.equal(app.calls.some(item => item.command === "ci_run_notify"), false);
});
