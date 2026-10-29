import test from "node:test";
import assert from "node:assert/strict";
import { listAvailableInstallations } from "../apps/desktop/ui/github-installations.mjs";
import { collectForAccount } from "../apps/desktop/ui/github-monitor.mjs";

const entry = (id, login) => ({ id, account: { login } });

test("Mode B: empty and complete installation inventories retain truthful coverage", async () => {
  assert.deepEqual(await listAvailableInstallations(async () => ({
    installations: [],
  })), { items: [], complete: true });
  assert.deepEqual(await listAvailableInstallations(async path => {
    assert.match(path, /page=1$/);
    return { installations: [entry(1, "team"), entry(2, "other")] };
  }), { items: [{ id: 1, name: "team" }, { id: 2, name: "other" }], complete: true });
});

test("Mode B: one corrupt row cannot make a partial installation inventory appear complete", async () => {
  for (const invalid of [
    null, {}, { account: { login: "team" } },
    entry(0, "team"), entry(-1, "team"), entry(2 ** 53, "team"),
    entry(5, ""), entry(5, ".."), entry(5, "../admin"),
    entry(5, "bad/name"), { id: 5, account: {} },
  ]) {
    let calls = 0;
    await assert.rejects(
      listAvailableInstallations(async () => {
        calls++;
        return { installations: [entry(1, "good"), invalid] };
      }),
      /Invalid installations response/,
    );
    assert.equal(calls, 1, "do not continue to another page after corrupt data");
  }
});

test("Mode B: exact overlapping GitHub pages deduplicate without losing scope", async () => {
  const first = Array.from({ length: 100 }, (_, i) => entry(i + 1, "team" + (i + 1)));
  const pages = [];
  const result = await listAvailableInstallations(async path => {
    pages.push(path);
    return { installations: pages.length === 1 ? first :
      [entry(1, "TEAM1"), entry(101, "team101")] };
  });
  assert.equal(pages.length, 2);
  assert.equal(result.complete, true);
  assert.equal(result.items.length, 101);
  assert.deepEqual(result.items[0], { id: 1, name: "team1" });
  assert.deepEqual(result.items.at(-1), { id: 101, name: "team101" });
});

test("Mode B: duplicate installation ID or owner with different identity fails closed", async () => {
  for (const second of [entry(1, "other"), entry(2, "TEAM"), entry(1, "other-case")]) {
    await assert.rejects(
      listAvailableInstallations(async () => ({ installations: [entry(1, "team"), second] })),
      /Conflicting installations response/,
    );
  }
});

test("Mode B: malformed page cardinality and missing collection reject immediately", async () => {
  for (const response of [
    null, {}, { installations: null }, { installations: {} },
    { installations: Array.from({ length: 101 }, (_, i) => entry(i + 1, "name" + i)) }
  ]) {
    await assert.rejects(listAvailableInstallations(async () => response),
      /Invalid installations response/);
  }
});

test("Mode B: corrupt account inventory prevents any repository query", async () => {
  const calls = [];
  let collected = false;
  await assert.rejects(collectForAccount({
    get: async path => {
      calls.push(path);
      return { installations: [entry(1, "valid"), entry(2, "invalid/path")] };
    },
    collect: async () => { collected = true; return null; }
  }), /Invalid installations response/);
  assert.equal(calls.length, 1);
  assert.equal(collected, false);
});
