# Migrations with dbmate, run as a Kubernetes Job before each rollout

Schema changes are plain SQL files in `backend/db/migrations/`, applied with [dbmate](https://github.com/amacneil/dbmate). On every deploy, CI creates a Kubernetes Job that runs `dbmate up` with the backend image of that commit, waits for it to complete, and only then rolls out the backend. A migration therefore runs once per deploy however many replicas there are, and a failing migration stops the deploy before new code reaches the cluster. The same files and the same command build the schema on our laptops, in the integration tests in Actions and in the cluster, so every environment gets the same schema.

## Considered options

- **node-pg-migrate.** We used it in an earlier project on Bun and Kubernetes and ran into problems with it under Bun. It is a Node library built on the `pg` driver, so migrations run inside the JavaScript runtime, with a second Postgres client next to Bun's built-in one.
- **Our own runner (a `migrate.ts` of about 30 lines with Bun's `sql`).** No new dependency, and every line is ours to explain. But we would own and debug the code, and it has no status, rollback or wait-for-the-database, so the question of whether it is enough would stay open.
- **An initContainer in the backend Deployment.** Needs no change to the deploy job and no new RBAC, and is a common first solution while one pod runs. With 2+ replicas (#22) and autoscaling (#24), every pod start runs the migration, so correctness rests on a lock instead of the migration running once. A failing migration only shows when `rollout status` times out, and a backup right before a migration is impractical, since every pod start would take one.
- **Migrations at app startup.** The same per-pod drawbacks as the initContainer, and a slow migration counts against the liveness probe.
- **Helm pre-upgrade or Argo CD PreSync hooks.** The same pattern as ours, a Job before the rollout, but we deploy with plain `kubectl apply` over SSH ([ADR 0006](0006-deploy-from-ci-over-ssh.md)) and would add a tool only to get it.

dbmate is a single Go binary, so Bun never runs migration code and the problems we had with node-pg-migrate cannot come back the same way. Verified on 2026-10-26 against Postgres 16, with dbmate 2.37.0 installed with `bun add` and run with `bunx`: two concurrent `up` runs with `--migration-lock` applied the migration once, and a failing migration was rolled back completely and exited non-zero.

## How a deploy runs

This extends the deploy job in [ADR 0006](0006-deploy-from-ci-over-ssh.md). The steps run in `k8s/deploy.sh` on the server: CI sends the `k8s/` folder as a tar stream over its one SSH connection and runs the script there, so waiting for the Job opens no new connections (the firewall rejects 6 new SSH connections within 30 seconds). In order:

1. Apply `k8s/database/*.yaml` (the Postgres StatefulSet and Service), so the database exists before the first migration.
2. Apply `k8s/jobs/migrate.yaml` as the Job `migrate-<run id>-<run attempt>`.
3. Wait for the Job to complete. If it fails, print its logs and stop: the old backend keeps running on an unchanged schema.
4. Apply `k8s/*.yaml` and wait for `rollout status`, as before.

| What | Value |
|---|---|
| Migration files | `backend/db/migrations/<timestamp>_<name>.sql`, created with `bunx dbmate new <name>`, with a `-- migrate:up` and a `-- migrate:down` section |
| Applied migrations | the table `schema_migrations`, kept by dbmate |
| Command | `dbmate --wait --migration-lock --no-dump-schema up`, as `bun run migrate` in `backend/`; the Job runs `bun run migrate && bun run import` with `DBMATE_WAIT_TIMEOUT=120s`, dbmate's variable for `--wait-timeout`, so the flags stay in `package.json` |
| Image | the backend image of the same commit, with the dbmate binary copied in |
| Job name | `migrate-RUN_ID` in the manifest; `k8s/deploy.sh` replaces `RUN_ID` with the `${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}` CI passes it |
| `DATABASE_URL` | from the Secret `postgres`, created by hand, ending in `?sslmode=disable` |
| Manifests CI applies | `k8s/database/`, then `k8s/jobs/`, then `k8s/*.yaml`; `k8s/cluster/` stays manual |

## Consequences

- **The flags.** `--migration-lock` is off by default, and we keep it although only one Job runs per deploy, since deploys are queued but a manual run could still overlap one. `--no-dump-schema`, because dbmate otherwise writes `db/schema.sql` with `pg_dump`, which the image lacks. `sslmode=disable`, because Postgres in the cluster has no TLS and dbmate refuses to connect without it (`pq: SSL is not enabled on the server`).
- **A new Job name per run.** A Job's pod template cannot change after it is created, so reapplying one `migrate` Job with a new image tag would be refused. A name per run attempt also means that re-running a deploy runs the migration again, which a restore relies on. The deploy user still needs no `delete`: `ttlSecondsAfterFinished` lets Kubernetes remove finished Jobs.
- **`backoffLimit: 0`.** A failed migration is rolled back by its transaction and would fail the same way again, so the Job fails once and the deploy stops. `kubectl wait --for=condition=complete` does not notice a failed Job, and several `--for` flags are ANDed, so `k8s/deploy.sh` waits for `Complete` or `Failed` in a loop, prints the Job's logs on `Failed` and exits non-zero. `activeDeadlineSeconds` (300s) bounds the Job itself, so a hanging migration also ends as `Failed`, and the loop's own limit (360s) is longer, so the script sees that `Failed` instead of giving up first.
- **RBAC.** The deploy Role gets `statefulsets` (apps) and `jobs` (batch), and `cronjobs` (batch) with #17. `k8s/cluster/deploy-rbac.yaml` is applied by hand.
- **Migrations are backward compatible.** During a rollout, old and new pods share one schema, so a migration must work with both versions: add a table or a nullable column before code uses it, and rename or drop in a later deploy, once no running version reads it (expand/contract, #23).
- **An applied migration is never edited.** dbmate does not notice a changed file, so a fix is a new migration.
- **The CSV import is not a migration.** dbmate sends SQL to the server and cannot read a file from the repo: `COPY FROM` reads on the database server, and `\copy` exists only in `psql`. The import (#9) is a Bun script that inserts with `ON CONFLICT DO NOTHING`, run as a second step of the same Job after `dbmate up`. It runs once per deploy and can be rerun after a load-test reset (#30).
- **Backups (#17).** `pg_dump` includes `schema_migrations`, so a restored database knows its own migrations, and re-running the latest deploy lets the Job apply any that are missing. The Job is also where a backup right before a migration would go, if we add one.
- **Tests (#15, #16).** Actions starts Postgres as a service container and runs `bun run migrate` before the tests, so they run against the schema production gets.
- **Verified on 2026-10-26 (#8):** the binary in `ghcr.io/amacneil/dbmate:2.37.0` is `/usr/local/bin/dbmate`, statically linked, so it runs in the Debian-based `oven/bun:slim`. In the built backend image, against Postgres 16.15, the Job's command waited for the database, applied the migration and imported 5000 tickets, and a second run applied nothing and imported 0. `bunx dbmate` works on Windows (Jennifer, on #8).
- **Not verified yet (#8):** the Job and the RBAC against the cluster, and a failing migration stopping a real deploy.
- **In the defence:** the migration is its own step of the deploy. It runs once, before the new code, and stops the deploy if it fails, which is the pattern Helm and Argo CD hooks use.
