import test from "node:test";
import assert from "node:assert/strict";
import { createNativeDragGesture } from "../apps/desktop/ui/native-drag.mjs";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

test("gesture signals native start/end without WebView coordinate motion", async () => {
  const calls = [];
  const errors = [];
  const gesture = createNativeDragGesture({
    start: async () => { calls.push("start"); return true; },
    stop: async () => { calls.push("stop"); },
    onError: error => errors.push(error)
  });
  assert.equal(gesture.begin(5), true);
  assert.equal(gesture.begin(6), false);
  await settle();
  gesture.end(4); // Unrelated pointer cannot terminate this gesture.
  assert.deepEqual(calls, ["start"]);
  gesture.end(5);
  await settle();
  assert.deepEqual(calls, ["start", "stop"]);
  assert.deepEqual(errors, []);
});

test("release while start is pending always queues stop after start", async () => {
  const start = deferred();
  const calls = [];
  const gesture = createNativeDragGesture({
    start: () => { calls.push("start"); return start.promise; },
    stop: () => { calls.push("stop"); },
    onError: error => { throw error; }
  });
  gesture.begin(1);
  await settle();
  gesture.end(1);
  assert.deepEqual(calls, ["start"]);
  start.resolve(true);
  await settle();
  assert.deepEqual(calls, ["start", "stop"]);
});

test("rapid consecutive gestures serialize native ownership of the seat", async () => {
  const first = deferred();
  const calls = [];
  let count = 0;
  const gesture = createNativeDragGesture({
    start: () => {
      calls.push("start");
      return ++count === 1 ? first.promise : Promise.resolve(true);
    },
    stop: () => { calls.push("stop"); },
    onError: error => { throw error; }
  });
  gesture.begin(10);
  await settle();
  gesture.end(10);
  gesture.begin(11);
  await settle();
  assert.deepEqual(calls, ["start"]);
  first.resolve(true);
  await settle();
  assert.deepEqual(calls, ["start", "stop", "start"]);
  gesture.end(11);
  await settle();
  assert.deepEqual(calls, ["start", "stop", "start", "stop"]);
});

test("native start failure does not leak a held gesture", async () => {
  const errors = [];
  const gesture = createNativeDragGesture({
    start: () => Promise.reject(new Error("relative-pointer unsupported")),
    stop: () => {},
    onError: error => errors.push(error.message)
  });
  gesture.begin(1);
  await settle();
  assert.equal(gesture.begin(2), true);
  gesture.end(2);
  await settle();
  assert.ok(errors.includes("relative-pointer unsupported"));
});

test("native bridge and UI must not retain old WebView movement IPC", async () => {
  const { readFileSync } = await import("node:fs");
  const app = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
  const rust = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
  const backend = readFileSync(new URL("../apps/desktop/src-tauri/native/wayland_relative_drag.c", import.meta.url), "utf8");
  assert.doesNotMatch(app, /move_card|cardDrag|event\.clientX|event\.screenX/);
  assert.doesNotMatch(rust, /fn move_card|fn persist_card_position/);
  assert.match(backend, /zwp_relative_pointer_manager_v1_get_relative_pointer/);
  assert.match(backend, /wl_fixed_to_double/);
  assert.match(backend, /gdk_wayland_device_get_wl_pointer/);
});
