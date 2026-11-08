import test from "node:test";
import assert from "node:assert/strict";
import { repoRowIndicator } from "../apps/desktop/ui/repo-row-indicator.mjs";
import { readFileSync } from "node:fs";

const row = (ahead, behind, extra = {}) => ({
  upstream: "origin/main", ahead, behind, dirty: false,
  github_repo: "team/repo", ...extra
});

test("per-repo Git ahead/behind takes priority over any CI result", () => {
  assert.deepEqual(repoRowIndicator(row(3, 0), "failure"),
    { kind: "git", text: "↑3", ahead: 3, behind: 0 });
  assert.deepEqual(repoRowIndicator(row(0, 5), "success"),
    { kind: "git", text: "↓5", ahead: 0, behind: 5 });
  assert.deepEqual(repoRowIndicator(row(2, 4), "success"),
    { kind: "git", text: "↑2 ↓4", ahead: 2, behind: 4 });
  assert.equal(repoRowIndicator(row(2, 1, { dirty: true }), "failure").kind, "git",
    "display true divergence without falsely enabling Safe Sync");
});

test("only a known synchronized repository falls back to verified last CI", () => {
  assert.deepEqual(repoRowIndicator(row(0, 0), "success"),
    { kind: "ci", text: "✓", outcome: "success" });
  assert.deepEqual(repoRowIndicator(row(0, 0), "failure"),
    { kind: "ci", text: "✕", outcome: "failure" });
  assert.deepEqual(repoRowIndicator(row(0, 0)),
    { kind: "ci", text: "—", outcome: null });
});

test("unknown Git tracking does not fabricate clean state or CI fallback", () => {
  for (const repo of [
    row(0, 0, { upstream: null }),
    row(null, 0), row(-1, 0), row(0, Infinity),
    row("0", "0"), row(Number.MAX_SAFE_INTEGER + 1, 0)
  ]) assert.deepEqual(repoRowIndicator(repo, "success"),
    { kind: "unknown", text: "—" });
});

test("card rereads the source local Git state on every CI and locale update", () => {
  const source = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
  assert.match(source, /const indicatorState = repoRowIndicator\(repo, outcome\)/);
  assert.match(source, /if \(repo\) paintCiIndicator\(row, repo\)/);
  assert.match(source, /addText\(row, "span", "—", "repo-delta"\)/);
  assert.match(readFileSync(new URL("../apps/desktop/ui/style.css", import.meta.url), "utf8"), /\.repo-delta\.is-git-pending/);
});
