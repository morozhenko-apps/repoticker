import test from "node:test";
import assert from "node:assert/strict";
import {
  REFRESH_MS, HYBRID_FULL_RECONCILE_MS, startGithubMonitoring
} from "../apps/desktop/ui/github-monitor.mjs";

const settle = async () => {
  for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));
};

function harness({ initialPhase = "polling", nativePhaseRead = null,
  resultFactory = null, nativeCooldownSeconds = 0,
  nativePublish = null } = {}) {
  const events = new Map();
  const calls = [];
  const collections = [];
  const clock = { ms: 1_000_000 };
  let scheduled = null;
  let phase = initialPhase;
  let authorized = true;
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
      case "github_auth_status": return { connected: authorized };
      case "get_monitor_selection": return {
        github_monitor_org: "team", github_monitor_repositories: ["team/repo"],
        ci_notification_mode: "off"
      };
      case "github_monitor_publish":
        return nativePublish ? nativePublish(args) : null;
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
    async shown() {
      const listener = events.get("repoticker-card-shown");
      assert.equal(typeof listener, "function", "The real monitor must register card-shown");
      listener({});
      await settle();
    },
    setAuthorized(value) { authorized = value; },
    async scopeChanged() {
      const listener = events.get("repoticker-github-scope-changed");
      assert.equal(typeof listener, "function", "The real monitor must register scope updates");
      listener({});
      await settle();
    },
    async disconnected() {
      const listener = events.get("repoticker-github-auth");
      assert.equal(typeof listener, "function", "The real monitor must register auth updates");
      listener({ payload: { status: "disconnected" } });
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

test("Given the card is shown repeatedly When REST throttle has not elapsed Then only a due full refresh starts", async () => {
  const app = harness();
  await app.ready();
  assert.deepEqual(app.kinds(), ["all"]);

  await app.shown();
  await app.shown();
  assert.deepEqual(app.kinds(), ["all"],
    "Showing the card must not force remote polling before its ordinary due time");

  app.clock.ms += 119_999;
  await app.shown();
  assert.deepEqual(app.kinds(), ["all"]);

  app.clock.ms += 1;
  await app.shown();
  assert.deepEqual(app.kinds(), ["all", "all"],
    "At the exact refresh boundary a non-forced card event starts one full read");
  assert.ok(app.calls.every(({ command }) =>
    !["run_git_operation", "fetch_all", "safe_pull", "safe_push"].includes(command)));
});

test("Given a REST collection is pending When the card is shown again Then no concurrent or trailing read is created", async () => {
  const state = {
    scope: { organization: "team", repositories: ["team/repo"] },
    coverage: { jobs: true, runners: true },
    counts: { running: 1, queued: 0, busy: 0, idle: 1 },
    errors: []
  };
  const success = { state, repositoryCount: 1, failure: null, reason: null };
  let attempt = 0;
  let finishSecond;
  const app = harness({
    resultFactory: () => {
      attempt++;
      if (attempt === 2) {
        return new Promise(resolve => { finishSecond = resolve; });
      }
      return success;
    }
  });

  await app.ready();
  app.clock.ms += 120_000;
  await app.shown();
  assert.equal(typeof finishSecond, "function");
  assert.equal(attempt, 2);

  await app.shown();
  await app.shown();
  assert.equal(attempt, 2, "Duplicate non-forced card events must not queue work");

  await app.hint("tasks");
  assert.equal(attempt, 2,
    "A forced hint while busy must be queued, never run a concurrent collector");

  finishSecond(success);
  await app.ready();
  assert.equal(attempt, 3,
    "Only the explicitly forced task hint may run after the pending full read");
  assert.deepEqual(app.kinds(), ["all", "all", "tasks"]);
});

test("Given native monitor publication rejects When the real queue recovers Then the next state is redacted and unknown", async () => {
  let attempts = 0;
  const delivered = [];
  const app = harness({
    nativePublish: args => {
      attempts++;
      if (attempts === 1)
        throw Error("PRIVATE_MONITOR_PUBLICATION_FAILURE_WITH_TOKEN");
      delivered.push(args);
    }
  });

  await app.ready();
  assert.equal(attempts, 2, "A rejected first publication must not poison its successor");
  assert.deepEqual(delivered, [{
    connected: true, runnerState: null, message: "GitHub Actions data unavailable."
  }]);
  assert.equal(app.collections.length, 0,
    "Failure during the initial native publication must not claim a completed REST collection");
  assert.equal(JSON.stringify(delivered).includes("PRIVATE_MONITOR_PUBLICATION_FAILURE"), false);
});

test("Given the old native publication rejects after disconnect When the queue drains Then only disconnected state is delivered", async () => {
  let rejectOld;
  let attempts = 0;
  const delivered = [];
  const app = harness({
    nativePublish: args => {
      attempts++;
      if (attempts === 1)
        return new Promise((resolve, reject) => { rejectOld = reject; });
      delivered.push(args);
    }
  });

  await app.ready();
  assert.equal(typeof rejectOld, "function", "The first real publish is pending");
  assert.equal(attempts, 1);

  await app.scopeChanged();
  app.setAuthorized(false);
  await app.disconnected();
  assert.equal(delivered.length, 0, "The newer result waits for the pending native call");

  rejectOld(Error("PRIVATE_STALE_ACCOUNT_ERROR_WITH_TOKEN"));
  await app.ready();

  assert.ok(delivered.length >= 1, "A revoked account must publish its cleared state");
  assert.ok(delivered.every(item =>
    item.connected === false && item.runnerState === null && item.message === null),
  "No stale connected publication or account metrics may survive the revocation");
  assert.equal(JSON.stringify(delivered).includes("PRIVATE_STALE_ACCOUNT_ERROR"), false);
  assert.ok(app.calls.every(({ command }) =>
    !["run_git_operation", "fetch_all", "safe_pull", "safe_push", "ci_run_notify"].includes(command)),
  "An auth event must never trigger Git operations or notifications");
});
