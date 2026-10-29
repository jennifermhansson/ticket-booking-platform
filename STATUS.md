# Status

Last updated: 2026-10-29 (changes only when the phase does)

**Phase:** 1 (G criteria), step 4: operations (2026-10-29 → 10-30): backups (#17), metrics and logs (#18) and a low-load k6 script (#19). The app core (#10–#12), unit tests (#14) and integration tests (#15) are done. The React frontend (#13) and Playwright e2e tests (#16) are still open and run alongside step 4. Every merge to `main` deploys Postgres, runs the migration Job and only then rolls out the backend to `https://api.<domain>` and the frontend to `https://cdn.<domain>`.

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
