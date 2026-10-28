import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LOCALE_ROSTER, coreText } from "../apps/desktop/ui/locale-catalog.mjs";
import { ERROR_TERMS, localizedKnownError } from "../apps/desktop/ui/locale-errors.mjs";
import { cardNoticeText, cardText } from "../apps/desktop/ui/card-i18n.mjs";
import { githubFailureReason, githubFailureMessage } from "../apps/desktop/ui/github-errors.mjs";
import { settingsText } from "../apps/desktop/ui/settings-i18n.mjs";
import { surfaceText } from "../apps/desktop/ui/surface-i18n.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const settings = read("../apps/desktop/ui/settings.mjs");
const card = read("../apps/desktop/ui/app.mjs");
const native = read("../apps/desktop/src-tauri/src/main.rs");
const autostart = read("../apps/desktop/src-tauri/src/autostart.rs");
const github = read("../apps/desktop/src-tauri/src/github_session.rs");
const githubApi = read("../apps/desktop/src-tauri/src/github_api.rs");
const monitorErrors = read("../apps/desktop/ui/github-errors.mjs");
const git = read("../crates/repoticker-core/src/git.rs");

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
  "GitHub authorization expired. Reconnect.",
  "Repository is not enrolled or no longer valid",
  "Repository changed during sync; retry manually",
  "Repository changed during Safe sync",
  "Remote upstream moved since Fetch; Safe sync did not push",
  "Untrusted GitHub Actions URL",
  "GitHub API authorization expired or revoked.",
  "GitHub API permission denied.",
  "GitHub API resource inaccessible.",
  "GitHub API rate limited.",
  "GitHub API request failed.",
  "GitHub API network error.",
  "GitHub API stream failed.",
  "GitHub API response exceeded safe size.",
  "GitHub API returned invalid JSON.",
  "GitHub authorization changed. Retry.",
  "GitHub authorization unavailable. Reconnect in Settings.",
  "GitHub access denied. Check installation permissions.",
  "GitHub API rate limited. Monitoring will retry on its normal schedule.",
  "GitHub resource inaccessible to this installation.",
  "GitHub network unavailable. Monitoring will retry.",
  "Some GitHub data is partial or incomplete.",
  "GitHub Actions data unavailable.",
  "Runner inventory access denied; authorized Actions jobs remain visible.",
  "System autostart state unavailable.",
  "System autostart registration failed.",
  "Cannot verify system autostart registration.",
  "Repository path cannot be copied as UTF-8",
  "Cannot copy repository path to system clipboard"
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
  const source = settings + native + github + git + githubApi + monitorErrors + autostart;
  for (const key of required) {
    assert.ok(source.includes('"' + key + '"'),
      "Missing native/Settings source for known fixed error: " + key);
  }
  assert.doesNotMatch(native + github, /locale-errors\.mjs/);
  assert.match(settings, /throw Error\("Invalid folder name"\)/);
  assert.match(settings, /throw Error\("System autostart registration could not be verified\."\)/);
});


test("card known native error projection uses every exact existing 20-locale translation", () => {
  for (const { code } of LOCALE_ROSTER) {
    for (const key of required) {
      assert.equal(localizedKnownError(code, key), ERROR_TERMS[code][key], code + "/" + key);
    }
  }
  assert.equal(localizedKnownError("ru", "Invalid folder name"), "Недопустимое имя папки");
  assert.equal(localizedKnownError("pt", "Invalid folder name"), "Nome de pasta inválido");
  assert.equal(localizedKnownError("ar", "GitHub is not connected."),
    ERROR_TERMS.ar["GitHub is not connected."]);
});

test("unknown native error and provider data remain exact text, not partial translations", () => {
  const unknown = [
    "GitHub is unreachable. unrelated remote details",
    "Error: GitHub is unreachable.",
    "Invalid folder name (private path: /home/private)",
    "C:\\Users\\someone\\repo: exit 1",
    "/home/user/secret-project",
    "https://github.com/owner/project/actions/runs/123",
    "token=local-test-canary",
    "Authorization: Bearer local-test-canary",
    "<script>alert('untrusted')</script>",
    ""
  ];
  for (const { code } of LOCALE_ROSTER)
    for (const value of unknown)
      assert.equal(localizedKnownError(code, value), value, code + "/" + value);
  for (const language of ["pt-BR", "RU", "__proto__", "constructor", "", null, undefined]) {
    assert.equal(localizedKnownError(language, "Invalid folder name"),
      "Invalid folder name");
  }
  assert.equal(localizedKnownError("ru", new Error("Invalid folder name")),
    "Error: Invalid folder name");
});

test("card reprojects typed raw and Git-operation notices on locale changes", () => {
  assert.match(card, /import \{ cardLocale, cardText, cardNoticeText, metricAccessibleLabel \}/);
  assert.match(card, /let lastNotice = null/);
  const paint = card.slice(card.indexOf("function paintNotice()"),
    card.indexOf("function addText("));
  assert.match(paint, /node\.textContent = cardNoticeText\(cardLanguage, lastNotice\)/);
  assert.match(paint, /lastNotice = \{ kind: "native", message: String\(message\) \}/);
  assert.match(paint, /lastNotice = \{ kind: "git", count, message: String\(message\) \}/);
  assert.match(paint, /lastNotice = null;\s*paintNotice\(\)/);
  assert.match(paint, /if \(lastNotice === null\) \{\s*node\.hidden = true;/);
  const locale = card.slice(card.indexOf("function setCardLanguage("),
    card.indexOf("function renderMonitorMetrics("));
  assert.match(locale, /if \(lastNotice !== null\) paintNotice\(\)/);
  assert.ok(locale.indexOf("cardLanguage = next") < locale.indexOf("paintNotice()"));
  const consume = card.slice(card.indexOf("function consumeResults("),
    card.indexOf("async function cancelActiveFetch("));
  assert.match(consume, /showGitOperationErrors\(errors\.length, errors\[0\]\.message\)/);
  assert.doesNotMatch(consume, /showError\(cardText\(/);
  assert.doesNotMatch(paint, /invoke\(|github_api_get|fetch\(/);
});

test("exact native Git safety messages and summary localize in all 20 languages", () => {
  const fixed = [
    "Repository is not enrolled or no longer valid",
    "Repository changed during sync; retry manually",
    "Repository changed during Safe sync",
    "Remote upstream moved since Fetch; Safe sync did not push",
    "Untrusted GitHub Actions URL"
  ];
  for (const { code } of LOCALE_ROSTER) {
    for (const message of fixed) {
      assert.equal(cardNoticeText(code, { kind: "native", message }),
        ERROR_TERMS[code][message], code + " / " + message);
      const gitText = cardNoticeText(code, { kind: "git", count: 2, message });
      assert.equal(gitText,
        cardText(code, "gitErrors", 2) + ERROR_TERMS[code][message]);
    }
    const moved = ERROR_TERMS[code]["Remote upstream moved since Fetch; Safe sync did not push"];
    assert.match(moved, /Fetch/);
    assert.match(moved, /push/i, "must explicitly say Safe sync did NOT push");
    assert.ok(moved.trim());
  }
  const raw = "token=canary /private/repo: credential unavailable";
  for (const { code } of LOCALE_ROSTER) {
    assert.equal(cardNoticeText(code, { kind: "native", message: raw }), raw);
    assert.equal(cardNoticeText(code, { kind: "git", count: 3, message: raw }),
      cardText(code, "gitErrors", 3) + raw);
    assert.equal(cardNoticeText(code, { kind: "native",
      message: "Error: Repository changed during Safe sync" }),
      "Error: Repository changed during Safe sync");
  }
  assert.notEqual(
    cardNoticeText("ru", { kind: "git", count: 2,
      message: "Repository changed during sync; retry manually" }),
    cardNoticeText("pt", { kind: "git", count: 2,
      message: "Repository changed during sync; retry manually" }),
  );
  for (const invalid of [null, undefined, {}, { kind: "git", count: 0, message: "broken" },
    { kind: "native", message: null }, { kind: "git", count: 1.5, message: "broken" }]) {
    assert.throws(() => cardNoticeText("en", invalid), /Invalid card notice/);
  }
});


test("all 18 GitHub API/monitor diagnostics have exact locale parity and safe meaning", () => {
  const nativeKeys = [
    "GitHub API authorization expired or revoked.",
    "GitHub API permission denied.",
    "GitHub API resource inaccessible.",
    "GitHub API rate limited.",
    "GitHub API request failed.",
    "GitHub API network error.",
    "GitHub API stream failed.",
    "GitHub API response exceeded safe size.",
    "GitHub API returned invalid JSON.",
    "GitHub authorization changed. Retry."
  ];
  const policyKeys = [
    "GitHub authorization unavailable. Reconnect in Settings.",
    "GitHub access denied. Check installation permissions.",
    "GitHub API rate limited. Monitoring will retry on its normal schedule.",
    "GitHub resource inaccessible to this installation.",
    "GitHub network unavailable. Monitoring will retry.",
    "Some GitHub data is partial or incomplete.",
    "GitHub Actions data unavailable.",
    "Runner inventory access denied; authorized Actions jobs remain visible."
  ];
  for (const key of nativeKeys) assert.ok(githubApi.includes('"' + key + '"'), key);
  for (const key of policyKeys) assert.ok(monitorErrors.includes('"' + key + '"'), key);
  for (const { code } of LOCALE_ROSTER) {
    for (const key of [...nativeKeys, ...policyKeys]) {
      assert.equal(settingsText(code, key), ERROR_TERMS[code][key]);
      assert.equal(surfaceText(code, key), ERROR_TERMS[code][key]);
      assert.equal(localizedKnownError(code, key), ERROR_TERMS[code][key]);
      assert.ok(ERROR_TERMS[code][key].trim());
    }
    const rate = surfaceText(code, policyKeys[2]);
    assert.notEqual(rate, surfaceText(code, policyKeys[1]),
      "429/rate-limit and 403/permission denied must remain distinct");
    assert.ok(surfaceText(code, nativeKeys[8]).includes("JSON"));
    assert.ok(surfaceText(code, nativeKeys[0]).includes("GitHub"));
  }
  assert.match(settingsText("pt", policyKeys[2]), /monitorização/);
  assert.match(settingsText("ru", policyKeys[2]), /расписанию/);
  assert.match(settingsText("ar", nativeKeys[8]), /JSON/);
});

test("unknown GitHub error payloads are not translated by exact-key catalog", () => {
  const raw = [
    "GitHub API rate limited. token=not-real",
    "Error: GitHub API rate limited.",
    "GitHub returned JSON with ghp_example",
    "/org/repo private-resource",
    "GitHub API authorization expired or revoked. https://internal.example/"
  ];
  for (const { code } of LOCALE_ROSTER)
    for (const message of raw) {
      assert.equal(localizedKnownError(code, message), message);
      assert.equal(surfaceText(code, message), message);
    }
  // The policy still redacts raw unknown exceptions in the monitor.
  for (const message of raw) {
    assert.equal(githubFailureReason(message), "unavailable");
    assert.equal(githubFailureMessage(githubFailureReason(message)),
      "GitHub Actions data unavailable.");
  }
});


test("native autostart/clipboard errors are translated exactly in every locale", () => {
  const autostartErrors = [
    "System autostart state unavailable.",
    "System autostart registration failed.",
    "Cannot verify system autostart registration."
  ];
  const clipboardErrors = [
    "Repository path cannot be copied as UTF-8",
    "Cannot copy repository path to system clipboard"
  ];
  for (const key of autostartErrors)
    assert.ok(autostart.includes('"' + key + '"'), key);
  for (const key of clipboardErrors)
    assert.ok(native.includes('"' + key + '"'), key);
  for (const { code } of LOCALE_ROSTER) {
    for (const key of [...autostartErrors, ...clipboardErrors]) {
      const translated = ERROR_TERMS[code][key];
      assert.equal(localizedKnownError(code, key), translated);
      assert.equal(settingsText(code, key), translated);
      assert.equal(cardNoticeText(code, { kind: "native", message: key }), translated);
      assert.ok(translated.trim());
    }
    // Failure modes must not collapse into one generic success/unknown state.
    assert.notEqual(ERROR_TERMS[code][autostartErrors[0]],
      ERROR_TERMS[code][autostartErrors[1]]);
    assert.notEqual(ERROR_TERMS[code][autostartErrors[1]],
      ERROR_TERMS[code][autostartErrors[2]]);
  }
  assert.equal(settingsText("pt", clipboardErrors[0]).includes("UTF-8"), true);
  assert.equal(settingsText("ar", clipboardErrors[0]).includes("UTF-8"), true);
  assert.equal(settingsText("ja", clipboardErrors[0]).includes("UTF-8"), true);
});

test("OS errors with dynamic paths and process details are left unchanged", () => {
  const dynamic = [
    "Cannot open browser: /private/executable command failed",
    "Cannot open repository folder: C:\\Users\\name\\private",
    "Error: System autostart registration failed.",
    "Cannot copy repository path to system clipboard: external detail"
  ];
  for (const { code } of LOCALE_ROSTER)
    for (const value of dynamic) {
      assert.equal(localizedKnownError(code, value), value);
      assert.equal(settingsText(code, value), value);
    }
  assert.match(autostart, /if previous \{[\s\S]*manager\.enable\(\)/);
  assert.match(autostart, /manager\.disable\(\)/);
});
