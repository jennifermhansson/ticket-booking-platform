# Status

Last updated: 2026-10-23

**Phase:** 1 (G criteria), step 2: app core + frontend (2026-10-24 → 10-26). Step 1 is done: the checkpoint was proven on 2026-10-23, when the merge of #54 ended with a green `deploy` job and the cluster's backend image tagged with that merge's SHA (`e85600b`). Every merge to `main` now deploys to `https://api.<domain>`.

**Next step:**

- **Philip:** the cdn page (#7), deployed by the pipeline. Everything on the server is in [docs/runbooks/server-setup.md](docs/runbooks/server-setup.md).
- **Jennifer:** the CSV import and `tickets` schema against a local Postgres (#9), then #10–#12.
- **Unowned and unblocked:** #8 (Postgres in k3s with migrations), which #10–#12 need in the cluster, and #43 (validate manifests in CI). Pick owners.
- **Branch protection (#21)** is not on yet, and only the repo owner (Jennifer) can turn it on.

**Domain:** `<domain>` in the docs means `tickets.philipzachariasson.dev`, so the backend is `api.tickets.philipzachariasson.dev`. The root domain stays free for other use.

**Blockers:** none.

Tasks, owners and progress live in GitHub Issues: `gh issue list --milestone G` (milestones `G`, `VG`, `Defence & submission`, `Extras`). This file holds only what issues can't: the current phase, the next step and blockers.
## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
