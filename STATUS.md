# Status

Last updated: 2026-10-22

**Phase:** 1 (G criteria), step 1: infrastructure skeleton. Target: a merge to `main` shows up live by 2026-10-23.

**Next step (2026-10-23, working remotely):** reach the checkpoint, a merge to `main` that shows up live on `https://api.<domain>/health`. Both halves build against the names in [ADR 0006](docs/adr/0006-deploy-from-ci-over-ssh.md), so neither waits for the other until the sync point.

- **Philip:** done on 2026-10-22: DNS (#3, closed), k3s `v1.37.1+k3s1` with Traefik and cert-manager, the pod and DNS check with the firewall on, and `https://api.<domain>/health` answering with a trusted Let's Encrypt certificate. It runs a placeholder build of the backend until CI pushes the first image. Left in #4: the `deploy` user, its namespace-scoped kubeconfig and the three Actions secrets. Then the cdn page if there is time (#7). Everything on the server is in [docs/runbooks/server-setup.md](docs/runbooks/server-setup.md); the manifests are on branch `4-k3s` until its PR merges.
- **Jennifer:** the CI/CD workflow (#6): Biome, actionlint, tests, then build and push to GHCR, all of which works before k3s exists. Then the deploy step, against `k8s/backend.yaml` on branch `4-k3s`. The SSH rate limit rejects 6 connections within 30 seconds from one address, so keep the deploy to a few SSH calls and don't retry in a loop. Next, the CSV import and `tickets` schema against a local Postgres (#9).
- **Sync point:** Philip tells Jennifer when k3s is up and the deploy secrets are set. A test merge then proves the checkpoint.
- **After that:** #8 and #43 wait for #4 and #6; #10–#12 follow #9.

**Domain:** `<domain>` in the docs means `tickets.philipzachariasson.dev`, so the backend is `api.tickets.philipzachariasson.dev`. The root domain stays free for other use.

**Blockers:** none.

Tasks, owners and progress live in GitHub Issues: `gh issue list --milestone G` (milestones `G`, `VG`, `Defence & submission`, `Extras`). This file holds only what issues can't: the current phase, the next step and blockers.

## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
