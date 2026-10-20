---
name: update-status
description: End a work session by writing this session's progress and decisions into STATUS.md, docs/plan.md and docs/adr/, on the current branch.
disable-model-invocation: true
---

Distil this session into the repo's shared files, so the other person's Claude starts its next session knowing what happened here.

1. **Check the branch.** Run `git branch --show-current`. On `main`, stop and ask which branch the update belongs to: status changes travel in the same PR as the work.
2. **Gather what changed.** Read `STATUS.md`, then the session's conversation and `git diff main...HEAD --stat`. List: steps finished, work started, new open items, blockers, and decisions made.
3. **Update `STATUS.md`.** Set *Last updated* to today, move the phase, step and *Next step* forward, tick finished open items, add new ones, and update *In progress* and *Blockers*. Keep it short: it is a snapshot of now, so remove what is done rather than keeping a history (git keeps the history).
4. **Tick `docs/plan.md`.** Check off finished items in the checklist. If the session changed the plan itself (a date, a scope cut, a reordering), edit the plan text too.
5. **Decide on ADRs.** For each decision from step 2, write an ADR only when all three hold: it is hard to reverse, a future reader would be surprised by it without context, and it came from a real trade-off between alternatives. Otherwise leave it out. An ADR is `docs/adr/NNNN-slug.md`, numbered one above the highest existing number, with a `# Title` and one paragraph of context, decision and why. If an ADR supersedes an older one, add `Superseded by ADR-NNNN` at the top of the old one.
6. **Update `GLOSSARY.md`** if the session introduced or sharpened a domain term. Definitions only, no implementation details.
7. **Show the diff** of every file you changed and wait for approval. Then commit with `docs: update status` (or a more specific `docs:` message) on the current branch.

Done when `STATUS.md`'s *Next step* names what the next session should start with, and every decision from step 2 is either an ADR or consciously left out.
