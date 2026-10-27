import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOCALE_ROSTER, coreText } from "../apps/desktop/ui/locale-catalog.mjs";
import { ERROR_TERMS } from "../apps/desktop/ui/locale-errors.mjs";
import { settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
import { surfaceText } from "../apps/desktop/ui/surface-i18n.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const settings = read("../apps/desktop/ui/settings.mjs");
const native = read("../apps/desktop/src-tauri/src/main.rs");
const github = read("../apps/desktop/src-tauri/src/github_session.rs");

const required = [
  "Invalid repository list",
  "Invalid folder name",
  "System autostart registration could not be verified.",
  "Folder selection unavailable",
  "Folder path is not a local filesystem path",
  "Folder path cannot be represented as UTF-8",
  "Unsupported language",
  "Too many enrolled roots",
  "Invalid GitHub repository selection.",
  "Invalid GitHub account.",
  "GitHub sign-in was cancelled.",
  "Invalid GitHub verification code.",
  "Cannot copy verification code to system clipboard.",
  "Cannot open the GitHub authorization page.",
  "GitHub is unreachable.",
  "GitHub authorization rejected.",
  "GitHub rejected the authorization request.",
  "Invalid GitHub authorization response.",
  "System credential store unavailable or locked.",
  "Stored GitHub credentials are invalid. Disconnect and reconnect.",
  "GitHub is not connected.",
  "GitHub authorization expired. Reconnect."
];

test("all known fixed local/authorization errors have exact 20-locale key parity", () => {
  assert.deepEqual(Object.keys(ERROR_TERMS), LOCALE_ROSTER.map(x => x.code));
  for (const { code } of LOCALE_ROSTER) {
    assert.deepEqual(Object.keys(ERROR_TERMS[code]), required, code);
    for (const key of required) {
      const value = ERROR_TERMS[code][key];
      assert.equal(typeof value, "string", code + "/" + key);
      assert.ok(value.trim() && value === value.trim());
      assert.equal(coreText(code, key), value);
      assert.equal(settingsText(code, key), value);
      assert.equal(surfaceText(code, key), value);
      assert.doesNotMatch(value, /<\/?(?:script|iframe|img)|javascript:|\{\{/i);
    }
  }
});

test("known failures preserve user-action semantics in representative locales", () => {
  assert.equal(settingsText("pt", "Invalid folder name"), "Nome de pasta inválido");
  assert.equal(settingsText("ru", "Invalid folder name"), "Недопустимое имя папки");
  assert.equal(settingsText("ja", "Unsupported language"), "対応していない言語です");
  assert.equal(settingsText("ar", "Folder selection unavailable"), "اختيار المجلد غير متاح");
  assert.match(settingsText("pl", "GitHub authorization expired. Reconnect."), /GitHub/);
  for (const { code } of LOCALE_ROSTER) {
    assert.ok(settingsText(code, "Folder path cannot be represented as UTF-8").includes("UTF-8"));
    assert.ok(settingsText(code, "Invalid GitHub verification code.").includes("GitHub"));
    assert.ok(settingsText(code, "System credential store unavailable or locked.").trim());
  }
});

test("unknown exception payloads, OS paths, repos and tokens pass through without rewriting", () => {
  const samples = [
    "C:\\Users\\test\\repo: git.exe error 0xC0000142",
    "/home/example/PrivateProject: permission denied",
    "https://github.com/organization/example/actions/runs/123",
    "token=secret-canary-987654",
    "GitHub is unreachable. unrelated remote details",
    "<script>alert('name')</script>"
  ];
  for (const { code } of LOCALE_ROSTER) {
    for (const raw of samples) {
      assert.equal(settingsText(code, raw), raw);
      assert.equal(coreText(code, raw), raw);
    }
  }
  assert.match(settings, /element\.textContent = t\(String\(text\)\)/);
  assert.match(settings, /byId\("message"\)\.textContent = t\(String\(text\)\)/);
});

test("catalog keys are grounded in native or Settings static error sites", () => {
  const source = settings + native + github;
  for (const key of required) {
    assert.ok(source.includes('"' + key + '"'),
      "Missing native/Settings source for known fixed error: " + key);
  }
  assert.doesNotMatch(native + github, /locale-errors\.mjs/);
  assert.match(settings, /throw Error\("Invalid folder name"\)/);
  assert.match(settings, /throw Error\("System autostart registration could not be verified\."\)/);
});
