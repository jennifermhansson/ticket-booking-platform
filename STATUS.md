# Status

Last updated: 2026-10-22

**Phase:** 1 (G criteria), step 1: infrastructure skeleton. Target: a merge to `main` shows up live by 2026-10-23.

**Next step (2026-10-23, working remotely):** reach the checkpoint, a merge to `main` that shows up live on `https://api.<domain>/health`. Both halves build against the names in [ADR 0006](docs/adr/0006-deploy-from-ci-over-ssh.md), so neither waits for the other until the sync point.

- **Philip:** DNS A records `tickets` and `*.tickets` at name.com first, since certificates need them (#3). Then k3s, Traefik and cert-manager with `/health` over HTTPS, the pod and DNS check with the firewall on, and the `deploy` user and its three Actions secrets (#4). Then the cdn page if there is time (#7). What is done on the server so far is in [docs/runbooks/server-setup.md](docs/runbooks/server-setup.md).
- **Jennifer:** the CI/CD workflow (#6): Biome, actionlint, tests, then build and push to GHCR, all of which works before k3s exists. Then the deploy step. Next, the CSV import and `tickets` schema against a local Postgres (#9).
- **Sync point:** Philip tells Jennifer when k3s is up and the deploy secrets are set. A test merge then proves the checkpoint.
- **After that:** #8 and #43 wait for #4 and #6; #10–#12 follow #9.

**Domain:** `<domain>` in the docs means `tickets.philipzachariasson.dev`, so the backend is `api.tickets.philipzachariasson.dev`. The root domain stays free for other use.

**Blockers:** none.

Tasks, owners and progress live in GitHub Issues: `gh issue list --milestone G` (milestones `G`, `VG`, `Defence & submission`, `Extras`). This file holds only what issues can't: the current phase, the next step and blockers.

## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
