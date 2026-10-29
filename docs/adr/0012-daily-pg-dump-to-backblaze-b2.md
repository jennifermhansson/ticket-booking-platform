# Daily pg_dump to Backblaze B2

A Kubernetes CronJob runs `pg_dump` every night at 03:00 and uploads the dump to a private Backblaze B2 bucket. A restore streams a chosen dump back into Postgres with `pg_restore`, following [docs/runbooks/restore-backup.md](../runbooks/restore-backup.md). This is our answer to a lost database on a single node ([ADR 0005](0005-single-node-no-node-level-ha.md)): we do not prevent the failure, we make sure we can recover from it.

Two words used below:

- **RPO** (recovery point objective): how much data we can lose. With a dump once a day it is up to 24 hours.
- **RTO** (recovery time objective): how long it takes to be running again. It is measured during the test restore and written in the runbook.

## Trade-offs

### What a backup is: a daily snapshot or continuous WAL archiving

- **A daily snapshot with `pg_dump` (chosen).** A copy of the whole database at one moment, like a photo. It is easy to understand, easy to restore and needs no change to Postgres. The cost: anything written after the latest photo is lost if the server dies, so up to 24 hours of purchases.
- **Continuous WAL archiving (WAL-G, pgBackRest).** Postgres writes every change to a log (the WAL) before applying it. Saving that log continuously is like filming instead of taking photos: you can restore to a chosen minute (point-in-time recovery) and lose almost nothing. It needs changed Postgres settings, an extra container next to Postgres, and much more to understand and test.
- **Why the photo:** we sell test tickets, not real ones, the G criterion asks for a daily backup, and the G deadline is 2026-10-30. With real money, losing a day of purchases would be unacceptable and the film would be right.

### Who runs the backup: our own CronJob or an operator

- **Our own CronJob (chosen).** About 90 lines of YAML with two stock images, `postgres` for `pg_dump` and `amazon/aws-cli` for the upload, so there is no custom image to build. We can read every line and explain it.
- **A Postgres operator (CloudNativePG).** An operator is a program in the cluster that runs Postgres for us: backups, restores and failover between several replicas. It is the right tool for a real production database, but we would have to replace our whole Postgres StatefulSet with it. That is too big a change for what G asks.

### Where the backup lives: on the server or off-site

- **Off-site, in B2 (chosen).** If the VPS is lost, the backups are not.
- **On the same server**, for example a second volume. The simplest option, but a lost server takes the database and its backups at the same time, which is exactly the failure a backup exists for.

### Which storage: B2, R2, Oracle or GitHub

- All of B2, Cloudflare R2 and Oracle Object Storage are free up to 10–20 GB, and all are **S3 compatible**: they speak the same API as Amazon S3, so the same tool (`aws-cli`) works with all of them, and switching means changing only the endpoint and the key. We do not use Amazon itself.
- **Backblaze B2 (chosen).** The free tier needs no card, it was already in the plan, and our dumps are a few hundred kB, so 10 GB lasts for years.
- **Cloudflare R2.** Free downloads, but the account wants a card.
- **Oracle Object Storage.** The most free space (20 GB), but a cumbersome signup that also wants a card.
- **GitHub Actions artifacts.** Free, but they are deleted after 90 days at most, and the backup would run in CI instead of in the cluster next to the database.

### Dump format: custom or plain SQL

- **Custom format, `pg_dump -Fc` (chosen).** Compressed, and `pg_restore` can drop and recreate each table in one all-or-nothing transaction (`--clean --single-transaction`).
- **Plain SQL.** Readable as text and restored with `psql`, but larger, and cleaning out the old data first has to be done by hand.

## Consequences

- RPO is 24 hours. A backup can be taken by hand at any time with `kubectl create job --from=cronjob/postgres-backup`, for example before a risky change.
- RTO is whatever the test restore measured, written in the runbook's restore log.
- The deploy Role gains `cronjobs` ([ADR 0006](0006-deploy-from-ci-over-ssh.md)), and the Secret `b2-backup` is created by hand on the server, like the Secret `postgres`.
- The restore runs from a laptop with the same key, not from the cluster, so it also works on a rebuilt server.
- **Known weakness:** the key can both write and delete, so anyone who steals it can wipe the backups. The improvement is two keys: a write-only one for the CronJob and a read one kept only for restores.
- **When to revisit:** real payments, or a requirement to lose at most minutes of data. Then WAL archiving with WAL-G, or CloudNativePG.
- **In the defence:** asked "what happens if the server dies?", the answer is: we restore last night's dump to a new server with the runbook, we lose at most a day of bookings, and we have done it once for real and know how long it takes.
