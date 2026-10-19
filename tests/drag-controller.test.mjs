import test from "node:test";
import assert from "node:assert/strict";
import { createCardDragController, dragCorrection } from "../apps/desktop/ui/drag.mjs";

function fixture({ deferApply = false } = {}) {
  const frames = new Map();
  const moves = [];
  const errors = [];
  const deferred = [];
  let lastFrame = 0;
  let saves = 0;
  const controller = createCardDragController({
    apply(dx, dy) {
      moves.push([dx, dy]);
      return deferApply ? new Promise(resolve => deferred.push(resolve)) : Promise.resolve();
    },
    persist: () => { saves++; },
    onError: error => errors.push(error),
    scheduleFrame(callback) {
      const id = ++lastFrame;
      frames.set(id, callback);
      return id;
    },
    cancelFrame: id => frames.delete(id)
  });
  return {
    controller, frames, moves, deferred, errors,
    get saves() { return saves; },
    frame() {
      const [id, callback] = frames.entries().next().value ?? [];
      assert.ok(callback, "expected a scheduled animation frame");
      frames.delete(id);
      callback();
    }
  };
}

test("anchor error is bounded and vanishes after compositor relocation", () => {
  assert.deepEqual(dragCorrection(100, 50, 125, 44), { dx: 25, dy: -6 });
  assert.deepEqual(dragCorrection(100, 50, 100, 50), { dx: 0, dy: 0 });
  assert.deepEqual(dragCorrection(100, 50, 400, -300), { dx: 150, dy: -150 });
});

test("window movement returning pointer to local anchor creates no oscillation", async () => {
  const f = fixture();
  assert.equal(f.controller.begin(1, 100, 50), true);
  f.controller.activate(1);
  f.controller.move(1, 120, 50);
  f.frame();
  await Promise.resolve();
  assert.deepEqual(f.moves, [[20, 0]]);
  f.controller.move(1, 100, 50);
  f.frame();
  assert.deepEqual(f.moves, [[20, 0]]);
  f.controller.end();
  await Promise.resolve();
  assert.equal(f.saves, 1);
});

test("only one IPC is sent in flight and stale pointer samples are discarded", async () => {
  const f = fixture({ deferApply: true });
  f.controller.begin(1, 40, 30);
  f.controller.activate(1);
  f.controller.move(1, 70, 25);
  f.frame();
  f.controller.move(1, 74, 25); // Before GTK has acknowledged the first update.
  assert.deepEqual(f.moves, [[30, -5]]);
  assert.equal(f.frames.size, 0);
  f.deferred.shift()();
  await Promise.resolve();
  assert.deepEqual(f.moves, [[30, -5]]);
  assert.equal(f.frames.size, 0);
  f.controller.move(1, 42, 30); // Fresh local sample after relocation.
  f.frame();
  assert.deepEqual(f.moves, [[30, -5], [2, 0]]);
  f.deferred.shift()();
  await Promise.resolve();
  f.controller.end();
  await Promise.resolve();
  assert.equal(f.saves, 1);
});

test("release while GTK update is in flight delays persistence until completion", async () => {
  const f = fixture({ deferApply: true });
  f.controller.begin(7, 100, 100);
  f.controller.activate(7);
  f.controller.move(7, 105, 102);
  f.frame();
  f.controller.end();
  assert.equal(f.saves, 0);
  assert.equal(f.controller.begin(8, 1, 1), false);
  f.deferred.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(f.saves, 1);
  assert.equal(f.controller.begin(8, 1, 1), true);
  f.controller.end();
});

test("cancel/hide before a frame cannot move or persist", async () => {
  const f = fixture();
  f.controller.begin(1, 10, 10);
  f.controller.activate(1);
  f.controller.move(1, 25, 10);
  assert.equal(f.frames.size, 1);
  f.controller.end();
  assert.equal(f.frames.size, 0);
  assert.equal(f.moves.length, 0);
  await Promise.resolve();
  assert.equal(f.saves, 0);
});

test("stale drag activation/movement cannot revive ended session", () => {
  const f = fixture();
  f.controller.begin(3, 10, 10);
  f.controller.end();
  f.controller.activate(3);
  f.controller.move(3, 300, 300);
  assert.equal(f.frames.size, 0);
  assert.equal(f.moves.length, 0);
});
