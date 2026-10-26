---
name: update-status
description: End a work session by writing this session's progress and decisions into the GitHub issues, STATUS.md and docs/adr/, on the current branch.
disable-model-invocation: true
---

Distil this session into the repo's shared records, so the other person's Claude starts its next session knowing what happened here.

1. **Check the branch.** Run `git branch --show-current`. On `main`, stop and ask which branch the update belongs to: file changes travel in the same PR as the work.
2. **Gather what changed.** Read `STATUS.md`, the issues this session touched (`gh issue view <n>`), the session's conversation and `git diff main...HEAD --stat`. List: issues progressed or finished, new work discovered, blockers, and decisions made.
3. **Draft the issue updates.**
   - A progressed issue gets a short comment: what is done, what remains.
   - A finished issue closes through its PR's `Closes #<n>`; check that the PR body has it. Close an issue directly only when the task involved no PR (an admin task, for example), with a comment saying what was done.
   - New work gets a new issue with a milestone (`G`, `VG`, `Defence & submission` or `Extras`, per the priority order in `docs/plan.md`), labels and a *Done when* line.
   - Show the drafted comments, closes and new issues, and run the `gh` commands only after approval.
4. **Update `STATUS.md`.** Set *Last updated* to today, and move *Phase*, *Next step* and *Blockers* forward. It stays a snapshot of now: tasks and their history belong in the issues. Then run `docs/architecture/refresh-snapshot.sh`, and if the session added or changed a component, or created an issue, update `docs/architecture/model.js`.
5. **Decide on ADRs.** For each decision from step 2, write an ADR only when all three hold: it is hard to reverse, a future reader would be surprised by it without context, and it came from a real trade-off between alternatives. Otherwise leave it out. An ADR is `docs/adr/NNNN-slug.md`, numbered one above the highest existing number, with a `# Title` and one paragraph of context, decision and why. If an ADR supersedes an older one, add `Superseded by ADR-NNNN` at the top of the old one. If the session changed the plan itself (a date, a scope cut, a reordering), edit `docs/plan.md` too.
6. **Update `GLOSSARY.md`** if the session introduced or sharpened a domain term. Definitions only, no implementation details.
7. **Show the diff** of every file you changed and wait for approval. Then commit with `docs: update status` (or a more specific `docs:` message), or hand over the commit command if the person commits themselves.

Done when `STATUS.md`'s *Next step* names what the next session should start with, every issue this session touched reflects its real state, and every decision from step 2 is either an ADR or consciously left out.
