# Status

Last updated: 2026-10-26

**Phase:** 1 (G criteria), step 2: app core + frontend (2026-10-24 → 10-26). Step 1 is done: the checkpoint was proven on 2026-10-23, when the merge of #54 ended with a green `deploy` job and the cluster's backend image tagged with that merge's SHA (`e85600b`). Every merge to `main` now deploys to `https://api.<domain>`.

**Next step:**

- **Philip:** the cdn page (#7) is in review. CI builds a second image (`ticket-booking-platform-frontend`) and deploys it to `https://cdn.<domain>` ([ADR 0008](docs/adr/0008-static-files-from-nginx-pod.md)). Everything on the server is in [docs/runbooks/server-setup.md](docs/runbooks/server-setup.md).
- **Jennifer, right after #7 merges:** the first deploy fails with `ImagePullBackOff`, because GHCR creates the frontend package as private. Make it public in its package settings, then re-run the failed jobs of that workflow run.
- **Decided on 2026-10-26:** migrations use dbmate and run as a Kubernetes Job before each rollout ([ADR 0007](docs/adr/0007-migrations-with-dbmate-as-a-job.md)). #8 and #9 build on it.
- **Jennifer:** #9 is in its PR: the `tickets` table as the first dbmate migration and the CSV import as a Bun script, verified against a local Postgres. The CSV in the repo is a stand-in until Ahmad's real file turns up. Next: #10, then #11 and #12. They run locally first, but need #8 for the cluster.
- **Unowned and unblocked:** #8 (Postgres in k3s and the migration Job), which now also has to run `bun run import` as the second step and put `db/` with the CSV in the image (see its comment), and #43 (validate manifests in CI). Pick owners.
- **Branch protection (#21)** is not on yet, and only the repo owner (Jennifer) can turn it on.

**Domain:** `<domain>` in the docs means `tickets.philipzachariasson.dev`, so the backend is `api.tickets.philipzachariasson.dev`. The root domain stays free for other use.

**Blockers:** none.

Tasks, owners and progress live in GitHub Issues: `gh issue list --milestone G` (milestones `G`, `VG`, `Defence & submission`, `Extras`). This file holds only what issues can't: the current phase, the next step and blockers.
## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
