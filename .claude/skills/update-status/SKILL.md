---
name: update-status
description: End a work session by writing this session's progress and decisions into the GitHub issues, and STATUS.md and docs/adr/ when they change.
disable-model-invocation: true
---

Distil this session into the repo's shared records, so the other person's Claude starts its next session knowing what happened here.

1. **Check the branch.** Run `git branch --show-current`. Only file changes (an ADR, the glossary, a phase change in `STATUS.md`) need a branch: they travel in the same PR as the work, or a small PR of their own. Issue updates can be made from `main`.
2. **Gather what changed.** Read the issues this session touched (`gh issue view <n> --comments`), `gh issue list --assignee @me`, the session's conversation and `git diff main...HEAD --stat`. Read `STATUS.md` only for the phase: it no longer holds the task list. List: issues started, progressed or finished, new work discovered, dependencies between tasks, and decisions made.
3. **Draft the issue updates.**
   - An issue someone has started gets that person as assignee (`gh issue edit <n> --add-assignee <login>`).
   - A progressed issue gets a short comment: what is done, what remains.
   - A task that waits on another gets *blocked by*. Get both node IDs with `gh api repos/<owner>/<repo>/issues/<n> --jq .node_id`, then run the GraphQL mutation `addBlockedBy(input: {issueId, blockingIssueId})` with `gh api graphql`. Only a real dependency counts, not the order someone plans to work in.
   - A finished issue closes through its PR's `Closes #<n>`; check that the PR body has it. Close an issue directly only when the task involved no PR (an admin task, for example), with a comment saying what was done.
   - New work gets a new issue with a milestone (`G`, `VG`, `Defence & submission` or `Extras`, per the priority order in `docs/plan.md`), labels and a *Done when* line.
   - Show the drafted assignees, links, comments, closes and new issues, and run the `gh` commands only after approval.
4. **Update `STATUS.md` only if the phase changed**, and then on its own small branch: set *Last updated* to today and move *Phase* forward. Then run `docs/architecture/refresh-snapshot.sh`, and if the session added or changed a component, or created an issue, update `docs/architecture/model.js`.
5. **Decide on ADRs.** For each decision from step 2, write an ADR only when all three hold: it is hard to reverse, a future reader would be surprised by it without context, and it came from a real trade-off between alternatives. Otherwise leave it out. An ADR is `docs/adr/NNNN-slug.md`, numbered one above the highest existing number, with a `# Title` and one paragraph of context, decision and why. If an ADR supersedes an older one, add `Superseded by ADR-NNNN` at the top of the old one. If the session changed the plan itself (a date, a scope cut, a reordering), edit `docs/plan.md` too.
6. **Update `GLOSSARY.md`** if the session introduced or sharpened a domain term. Definitions only, no implementation details.
7. **Show the diff** of every file you changed and wait for approval. Then commit with `docs: update status` (or a more specific `docs:` message), or hand over the commit command if the person commits themselves.

Done when:

- Every touched issue shows its real state: the assignee, *blocked by*, and a comment naming the next step.
- `STATUS.md`'s phase is true.
- Every decision from step 2 is either an ADR or consciously left out.
