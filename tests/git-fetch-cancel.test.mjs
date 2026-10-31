import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const core = readFileSync(new URL("../crates/repoticker-core/src/git.rs", import.meta.url), "utf8");
const native = readFileSync(new URL("../apps/desktop/src-tauri/src/main.rs", import.meta.url), "utf8");
const ui = readFileSync(new URL("../apps/desktop/ui/app.mjs", import.meta.url), "utf8");
const html = readFileSync(new URL("../apps/desktop/ui/index.html", import.meta.url), "utf8");

test("Fetch cancellation belongs to registered child groups, not all Git processes", () => {
  assert.match(core, /pub struct FetchCancellation/);
  assert.match(core, /fn register\(&self, pid: u32\)/);
  assert.match(core, /fn unregister\(&self, pid: u32\)/);
  assert.match(core, /targeted: BTreeSet<u32>/);
  assert.match(core, /state\.targeted\.insert\(pid\)/);
  assert.match(core, /Ok\(state\.targeted\.remove\(&pid\)\)/);
  assert.match(core, /fn classify_fetch_completion\(/);
  assert.match(core, /status\.signal\(\)\.is_some\(\)/);
  assert.match(core, /fn completed_fetch_result_is_not_overwritten_by_late_or_sibling_cancel\(/);
  assert.match(core, /fn cancelling_two_owned_fetch_children_yields_two_distinct_cancelled_results\(/);
  assert.match(core, /pub fn cancel\(&self\)/);
  assert.match(core, /self\.cancel_with\(terminate_fetch_group\)/);
  assert.match(core, /fn cancel_with\(/);
  assert.match(core, /\.running\s*\.difference\(&state\.targeted\)/);
  assert.match(core, /if already_cancelled && pending\.is_empty\(\)/);
  assert.match(core, /fn unregistered_fetch_cleanup_error\(/);
  assert.match(core, /return Err\(unregistered_fetch_cleanup_error\(/);
  assert.match(core, /command\.process_group\(0\)/);
  assert.match(core, /kill\(-group, SIGKILL\)/);
  assert.match(core, /taskkill\.exe/);
  assert.match(core, /match cancel\.register\(pid\) \{/);
  assert.match(core, /Ok\(false\) => \{/);
  assert.match(core, /pub fn fetch_with_cancel\(/);
  assert.doesNotMatch(core.match(/pub fn safe_pull\([\s\S]*?\n\}/)?.[0] ?? "", /cancel|SIGKILL|taskkill/);
});

test("desktop cancellation IPC stays independent of the blocking Git operation lock", () => {
  const handler = native.match(/fn cancel_git_fetch\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(handler, /state::<ActiveFetch>\(\)/);
  assert.match(handler, /token\.cancel\(\)/);
  assert.doesNotMatch(handler, /OperationLock|spawn_blocking|execute\(/);
  assert.match(native, /\.manage\(ActiveFetch::default\(\)\)/);
  assert.match(native, /generate_handler!\[[\s\S]*?cancel_git_fetch,/);
  assert.match(native, /git::fetch_with_cancel\(/);
  assert.match(native, /status: "cancelled"/);
});

test("existing four-button card reuses Fetch as Cancel without interrupting Safe pull", () => {
  const actions = html.match(/<nav class="actions"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.equal([...actions.matchAll(/<button /g)].length, 4);
  assert.match(ui, /invoke\("cancel_git_fetch"\)/);
  assert.match(ui, /fetchCancelling \? "stopping" : "cancel"/);
  assert.match(ui, /cardText\(cardLanguage, fetchCancelling/);
  assert.match(ui, /progress\?\.operation === "fetch"/);
  assert.match(ui, /if \(errors\.length\)/);
  assert.match(ui, /item\.status === "error"/);
});

test("per-repository Fetch outcomes preserve concrete errors instead of global cancellation", () => {
  const body = core.match(/fn run_cancellable_command_with_timeout\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(body, /let targeted = cancel\.unregister\(pid\)/);
  assert.match(body, /\(Err\(error\), _\) => Err\(error\)/);
  assert.match(body, /classify_fetch_completion\(Ok\(output\), was_targeted\)/);
  assert.doesNotMatch(body, /if cancel\.is_cancelled\(\) \{\s*return Err\(GitError\(FETCH_CANCELLED\.into\(\)\)\);\s*\}\s*result/);
  const classifier = core.match(/fn classify_fetch_completion\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(classifier, /targeted && fetch_was_interrupted/);
  assert.match(classifier, /other => other/);
  assert.match(native, /Err\(GitError\(error\)\) => ActionResult/);
  assert.match(native, /Some\(match outcome/);
});

test("retry and pre-registration cleanup failure are covered by native regression tests", () => {
  for (const name of [
    "failed_termination_can_be_retried_without_resignalling_other_children",
    "failed_target_unregistered_before_retry_is_not_signalled_again",
    "spawn_registration_cleanup_never_hides_unknown_outcomes",
  ]) assert.match(core, new RegExp("fn " + name + "\\("));

  const command = core.match(/fn run_cancellable_command_with_timeout\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(command, /let reaped = wait_owned_child\(/);
  assert.match(command, /let terminated = terminate_fetch_group\(pid\)/);
  assert.match(command, /unregistered_fetch_cleanup_error\(error, terminated, reaped\)/);
  assert.match(command, /GitError\(FETCH_CANCELLED\.into\(\)\),\s*terminated,\s*reaped/);
  assert.doesNotMatch(command, /let _ = wait_owned_child\(/);
});
