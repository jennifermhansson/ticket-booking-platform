# Status

Last updated: 2026-10-29 (changes only when the phase does)

**Phase:** 1 (G criteria), step 4: operations (2026-10-29 → 10-30). The app core (#10–#12) and the unit and integration tests (#14, #15) are merged; the React frontend (#13) and the Playwright e2e tests (#16) still run alongside. When we sit together we pair on the DevOps work (#17 backups, #18 metrics and logs, #19 k6) and take #13 and #16 remotely. Every merge to `main` deploys Postgres, runs the migration Job and only then rolls out the backend to `https://api.<domain>` and the frontend to `https://cdn.<domain>`.

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
