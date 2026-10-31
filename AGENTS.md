# RepoTicker engineering contract

RepoTicker is a local-first Git and GitHub activity companion. These are operating rules for agents working in this repository.

## Source and branch ownership

- `dev` is the normal development branch. `main` is reserved for reviewed releases. Check the current head, active changes and open PRs before writing; never force-push or overwrite another agent's work.
- Use short-lived branches only when real concurrent ownership prevents safe edits on `dev`. Merge and clean up only after the unique changes are preserved.
- Keep implementation/config and documentation in separate commits. Fix root causes and document an architectural decision before changing invariants.
- Do not run the full stable suite after every small edit. Use focused validation during implementation and one final required gate after a coherent change batch.
- **When CI or another external build starts, stop checking it. Never poll GitHub Actions for status.** Record the exact commit and run URL, say what remains unverified and stop until the owner provides the result or another supported completion event occurs. Do not restart checks while a job is active.
- Documentation-only edits do not justify a CI run. Do not modify release tags, protected branches, signing credentials, hosted infrastructure or other products without explicit owner authorization.

## Product and security boundaries

- Git inspection is restricted to explicitly enrolled roots. Report actual branch, upstream, dirty, detached and ahead/behind state; don't invent a clean or synchronized state.
- Fetch does not change the checked-out branch. Conservative sync must never force-push, silently stash/rebase/reset, create an upstream or overwrite user changes. Abort uncertain or conflicting operations.
- Keep GitHub monitoring and Git authorization distinct. Missing permissions, stale responses and usage uncertainty remain unknown.
- Credentials belong in the OS store. Do not reveal secrets, access tokens, local paths, private repository names or CI runner inventory in logs, Issues or public docs.
- Release artifacts require platform-native acceptance, exact provenance, immutable checksums, signed APT metadata when applicable and owner approval.

## Documentation boundary

`README.md` is for users: motivation, capabilities, feedback and license. `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md` and `docs/CI.md` are concise contracts. Do not append dated development diaries, GitHub run IDs, private hosting settings, signer custody, machine names, unreleased feature/status disclaimers or personal account configuration to current public documents.

Archived material can remain in Git history; a historical report is not current acceptance evidence. Keep broken links out of changed documentation, and preserve GPL/Apache obligations as applicable (RepoTicker itself is Apache 2.0).

Bug reports and improvement suggestions are welcome through Issues. Outside code contributions and unsolicited upstream PRs are not accepted; forks remain permitted by the license.

## Completion

State the actual changes, checks performed, and remaining unknowns. Never claim that unrun validation has passed.
