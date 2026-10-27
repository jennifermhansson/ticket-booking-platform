# Status

Last updated: 2026-10-27 (changes only when the phase does)

**Phase:** 1 (G criteria), step 3: tests in the pipeline (2026-10-27 → 10-28). Step 2's window (10-24 → 10-26) ended with the database in place but the app core (#10–#12) and the React frontend (#13) still open, so they run alongside step 3. Every merge to `main` deploys Postgres, runs the migration Job and only then rolls out the backend to `https://api.<domain>` and the frontend to `https://cdn.<domain>`.

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

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
