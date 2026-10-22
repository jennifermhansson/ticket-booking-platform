# Status

Last updated: 2026-10-22

**Phase:** 1 (G criteria), step 1: infrastructure skeleton. Target: a merge to `main` shows up live by 2026-10-23.

**Next step:** add Jennifer's SSH key, set the DNS records, then install k3s and serve `https://api.<domain>/health`. The firewall is on; after k3s is installed, check that pods still reach each other and DNS (#35). What is done on the server so far is in [docs/runbooks/server-setup.md](docs/runbooks/server-setup.md).

**Domain:** `<domain>` in the docs means `tickets.philipzachariasson.dev`, so the backend is `api.tickets.philipzachariasson.dev`. The root domain stays free for other use.

**Blockers:** none.

Tasks, owners and progress live in GitHub Issues: `gh issue list --milestone G` (milestones `G`, `VG`, `Defence & submission`, `Extras`). This file holds only what issues can't: the current phase, the next step and blockers.

## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
