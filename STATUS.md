# Status

Last updated: 2026-10-23

**Phase:** 1 (G criteria), step 1: infrastructure skeleton. Target: a merge to `main` shows up live by 2026-10-23.

**Next step (2026-10-23, working remotely):** reach the checkpoint, a merge to `main` that shows up live on `https://api.<domain>/health`. Both halves build against the names in [ADR 0006](docs/adr/0006-deploy-from-ci-over-ssh.md), so neither waits for the other until the sync point.

- **Philip:** #4 is done: k3s with Traefik and cert-manager, `https://api.<domain>/health` over trusted HTTPS (a placeholder build until CI deploys the first image), and on 2026-10-23 the `deploy` user, CI's SSH key and the three Actions secrets (`DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`), verified with a login as CI makes it. PR #51 is merged, so `k8s/backend.yaml` is on `main`. Next: the cdn page if there is time (#7). Everything on the server is in [docs/runbooks/server-setup.md](docs/runbooks/server-setup.md).
- **Jennifer:** the first half of #6 merged on 2026-10-23 (#50): Biome, actionlint, tests, and a build that pushes the backend image to GHCR on every merge to `main`. The package is public. The deploy step is in its PR: one SSH connection (the firewall rejects 6 connections within 30 seconds from one address), so no retry loop. Merging that PR is the first real deploy, which swaps the `placeholder-` image for the SHA-tagged one. Next, the CSV import and `tickets` schema against a local Postgres (#9).
- **Sync point:** reached on 2026-10-23. The checkpoint is proven when the merge of the deploy PR ends with a green `deploy` job and the cluster's backend image ends with that merge's commit SHA.
- **After that:** #8 and #43 wait for #4 and #6; #10–#12 follow #9.

**Domain:** `<domain>` in the docs means `tickets.philipzachariasson.dev`, so the backend is `api.tickets.philipzachariasson.dev`. The root domain stays free for other use.

**Blockers:** none.

Tasks, owners and progress live in GitHub Issues: `gh issue list --milestone G` (milestones `G`, `VG`, `Defence & submission`, `Extras`). This file holds only what issues can't: the current phase, the next step and blockers.

## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
