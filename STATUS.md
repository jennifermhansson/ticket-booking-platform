# Status

Last updated: 2026-11-06 (changes only when the phase does)

**Phase:** after the defence, before the code submission. All issues in the `G` and `VG` milestones are closed, and the oral defence was held on 2026-11-04. What remains is the code submission on 2026-11-08; the open issues in `Extras` are not needed for the grading criteria. Every merge to `main` deploys Postgres, runs the migration Job and only then rolls out the backend to `https://api.<domain>` and the frontend, with the page on `https://<domain>` and its assets on `https://cdn.<domain>`.

**What's next, who owns it and what's blocked live in GitHub Issues**, not here:

- Assignee: who works on it.
- *Blocked by*: what has to finish first.
- A comment: what is done and what remains.
- `gh issue list --assignee @me`: your open issues.
- `gh issue list --search no:assignee`: unowned work.
- `gh issue view <n> --comments`: where a task stands.
- The next task is the lowest open issue in the earliest unfinished milestone (G → VG → Defence & submission → Extras).

**Domain:** `<domain>` in the docs means `tickets.philipzachariasson.dev`, so the backend is `api.tickets.philipzachariasson.dev`. The root domain stays free for other use.

**Architecture map (#64):** [docs/architecture/index.html](docs/architecture/index.html) shows every planned part of the system and, from the issues, what is in place.

## Key dates

- 2026-11-04: oral defence (held)
- 2026-11-08: code submission
