# Status

Last updated: 2026-10-20

**Phase:** 1 (G criteria), step 1: infrastructure skeleton. Target: a merge to `main` shows up live by 2026-10-23.

**Next step:** add Jennifer's SSH key, set the DNS records, enable the firewall, then install k3s and serve `https://api.<domain>/health`. What is done on the server so far, and the firewall plan, is in [docs/runbooks/server-setup.md](docs/runbooks/server-setup.md).

**Open decision:** the domain is `philipzachariasson.dev`, a personal domain. Either the project gets its own subdomain (`tickets.philipzachariasson.dev`, `api.tickets.…`, `cdn.tickets.…`, with a `*.tickets` wildcard record) and the root domain stays free for other use, or the whole domain points at the VPS (`api.philipzachariasson.dev` and so on). Not decided yet.

**Blockers:** none.

Tasks, owners and progress live in GitHub Issues: `gh issue list --milestone G` (milestones `G`, `VG`, `Defence & submission`, `Extras`). This file holds only what issues can't: the current phase, the next step and blockers.

## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
