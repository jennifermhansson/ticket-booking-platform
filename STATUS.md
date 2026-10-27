# Status

Last updated: 2026-10-27

**Phase:** 1 (G criteria), step 3: tests in the pipeline (2026-10-27 → 10-28). Step 2's window (10-24 → 10-26) ended with the database in place but the app core (#10–#12) and the React frontend (#13) still open, so they run alongside step 3. Every merge to `main` deploys Postgres, runs the migration Job and only then rolls out the backend to `https://api.<domain>` and the frontend to `https://cdn.<domain>`.

**Next step:**

- **Done on 2026-10-26:**
  - The cdn page (#7). The merge of #59 deployed it, and `https://cdn.<domain>` answers over HTTPS ([ADR 0008](docs/adr/0008-static-files-from-nginx-pod.md)).
  - The `tickets` table and the CSV import (#9, PR #60).
  - Postgres in the cluster with the migration Job (#8, PR #62). CI runs [`k8s/deploy.sh`](k8s/deploy.sh) on the server, which stops the deploy before the rollout if the Job fails ([ADR 0007](docs/adr/0007-migrations-with-dbmate-as-a-job.md), [runbook](docs/runbooks/server-setup.md#migrations-and-the-deploy-script)). The deploy Role and the Secret `postgres` were set up by hand the same day.
- **Done on 2026-10-27:** #8 is verified in the cluster. The first deploy imported 5000 tickets before the backend rollout, the volume is `Bound`, and a migration that failed on purpose (PR #65) stopped the deploy while the backend kept its old image ([ADR 0007](docs/adr/0007-migrations-with-dbmate-as-a-job.md)). The PR that removes that migration closes #8 and turns `main` green again.
- **Jennifer:** #10, then #11 and #12. With #8 merged they can run in the cluster, where `DATABASE_URL` comes from the Secret `postgres`. The backend Deployment does not read it yet: #10 adds that `env` entry, the same way `k8s/jobs/migrate.yaml` does.
- **Unowned and unblocked:** #13 (the minimal React frontend on cdn), #14 (unit tests in the pipeline) and #43 (validate manifests in CI). Pick owners.
- **Branch protection (#21)** is not on yet, and only the repo owner (Jennifer) can turn it on.

**Domain:** `<domain>` in the docs means `tickets.philipzachariasson.dev`, so the backend is `api.tickets.philipzachariasson.dev`. The root domain stays free for other use.

**Blockers:** none.

Tasks, owners and progress live in GitHub Issues: `gh issue list --milestone G` (milestones `G`, `VG`, `Defence & submission`, `Extras`). This file holds only what issues can't: the current phase, the next step and blockers.
## Key dates

- 2026-11-04: oral defence; the system is demoed as it is that day
- 2026-11-08: code submission
