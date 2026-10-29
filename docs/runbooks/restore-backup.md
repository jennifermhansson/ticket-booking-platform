# Database backups and restore

Every night at 03:00 (Europe/Stockholm) the CronJob `postgres-backup` in [`k8s/database/postgres-backup.yaml`](../../k8s/database/postgres-backup.yaml) runs `pg_dump` and uploads the dump to Backblaze B2 ([ADR 0012](../adr/0012-daily-pg-dump-to-backblaze-b2.md)). This runbook covers the one-off setup, how to check that backups happen, and how to restore one.

- Bucket: `tickets-bp-backup` (private), files under `postgres/`, named `tickets-<UTC time>.dump`.
- Endpoint: `https://s3.eu-central-003.backblazeb2.com`.
- Format: `pg_dump -Fc` (custom format, compressed), restored with `pg_restore`.
- The worst case is losing everything written since the last dump, so up to 24 hours (RPO). The time a restore takes (RTO) is in the [restore log](#restore-log).

## One-off setup

**Backblaze.** The bucket and an application key exist since 2026-10-29. The key is restricted to `tickets-bp-backup` with Read and Write. Never use the account's master key. A key's `applicationKey` is shown only once, when it is created: if it is lost, create a new key and update the Secret below.

**Lifecycle rule**, so the bucket does not grow forever: in Backblaze under *Buckets → Lifecycle Settings → Use custom lifecycle rules*, set prefix `postgres/`, hide files 30 days after upload, and delete hidden files 1 day later. That keeps about 30 daily dumps.

**The Secret `b2-backup`** holds the key, created by hand as root on the server. The bucket and endpoint are not secret and live in the manifest. Start the line with a space, so the key stays out of bash history:

```
 kubectl -n tickets create secret generic b2-backup --from-literal=AWS_ACCESS_KEY_ID='<keyID>' --from-literal=AWS_SECRET_ACCESS_KEY='<applicationKey>'
```

Backblaze calls the two values *keyID* and *applicationKey*. The names `AWS_*` are what `aws-cli` reads. Check the Secret without printing the values:

```
kubectl -n tickets describe secret b2-backup
```

**The deploy Role** in [`k8s/cluster/deploy-rbac.yaml`](../../k8s/cluster/deploy-rbac.yaml) must allow `cronjobs`, or CI's apply of `k8s/database/` is refused. `k8s/cluster/` is applied by hand: `kubectl apply -f k8s/cluster/deploy-rbac.yaml`.

**On your laptop**, to list and fetch backups, put the same key in a file outside the repo, for example `~/b2.env`, with no quotes and no spaces around `=`:

```
AWS_ACCESS_KEY_ID=<keyID>
AWS_SECRET_ACCESS_KEY=<applicationKey>
```

The commands below run `aws-cli` with Docker, so nothing has to be installed. In Git Bash on Windows, `$HOME/b2.env` is `C:\Users\<you>\b2.env`.

## Checking that backups happen

On the server: the CronJob's last run and the last three Jobs of each outcome.

```
kubectl -n tickets get cronjob postgres-backup
kubectl -n tickets get jobs -l app=postgres-backup
kubectl -n tickets logs job/<job name> -c dump
kubectl -n tickets logs job/<job name> -c upload
```

On your laptop: the dumps in the bucket. One file per day, each a few hundred kB.

```
docker run --rm --env-file "$HOME/b2.env" amazon/aws-cli:2.39.1 s3 ls s3://tickets-bp-backup/postgres/ --endpoint-url https://s3.eu-central-003.backblazeb2.com
```

**Taking a backup now**, for example right before a risky change: a Job made from the CronJob runs straight away.

```
kubectl -n tickets create job --from=cronjob/postgres-backup backup-manual-$(date +%s)
```

## Restoring

The restore fetches the dump from B2 to your laptop and sends it into Postgres over SSH. It does not use the cluster's `b2-backup` Secret, so it also works on a rebuilt server, as long as the Postgres StatefulSet and its Secret exist (see [server-setup.md](server-setup.md#postgres)).

Run every step in Git Bash on your laptop, in one window, since the variables only live there. Paste one command at a time and check that it is still on one line: a command split across lines runs only its first half.

1. **Set the variables** (the server's IP is not in the repo: ask Philip):

   ```
   IP=<server-ip>
   API=https://api.tickets.philipzachariasson.dev
   ENDPOINT=https://s3.eu-central-003.backblazeb2.com
   ```

2. **Pick the dump.** The newest one, or set `DUMP` to an older file name from the listing:

   ```
   DUMP=$(docker run --rm --env-file "$HOME/b2.env" amazon/aws-cli:2.39.1 s3 ls s3://tickets-bp-backup/postgres/ --endpoint-url "$ENDPOINT" | sort | tail -1 | awk '{print $4}' | tr -d '\r'); echo "$DUMP"
   ```

3. **Start the clock and stop the backend**, so no booking writes to the database while it is being replaced:

   ```
   START=$(date +%s)
   ssh root@$IP 'kubectl -n tickets scale deployment/backend --replicas=0'
   ```

4. **Download the dump** to your home folder, outside the repo, and check that it is not empty:

   ```
   docker run --rm --env-file "$HOME/b2.env" amazon/aws-cli:2.39.1 s3 cp "s3://tickets-bp-backup/postgres/$DUMP" - --endpoint-url "$ENDPOINT" > "$HOME/restore.dump"
   ls -l "$HOME/restore.dump"
   ```

5. **Restore.** `--clean --if-exists` drops each table before recreating it, and `--single-transaction` makes the restore all or nothing: if any step fails, the database is left as it was. No output means it worked.

   ```
   ssh root@$IP 'kubectl -n tickets exec -i postgres-0 -- pg_restore -U postgres -d tickets --clean --if-exists --no-owner --single-transaction' < "$HOME/restore.dump"
   ```

6. **Check the data.** There are 5,000 tickets, and the number of sold tickets equals the number of purchases ([ADR 0011](../adr/0011-sold-status-written-with-the-purchase.md)). The query goes in on stdin, so its quotes need no escaping:

   ```
   echo "SELECT (SELECT count(*) FROM tickets) AS tickets, (SELECT count(*) FROM tickets WHERE status = 'sold') AS sold, (SELECT count(*) FROM purchases) AS purchases;" | ssh root@$IP 'kubectl -n tickets exec -i postgres-0 -- psql -U postgres -d tickets'
   ```

7. **Re-run the latest deploy.** The dump includes `schema_migrations`, so the migration Job applies only migrations newer than the dump ([ADR 0007](../adr/0007-migrations-with-dbmate-as-a-job.md)), and the rollout brings the backend back. Without CI, run the deploy by hand ([server-setup.md](server-setup.md#migrations-and-the-deploy-script)).

   ```
   RUN=$(gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'); gh run rerun "$RUN"
   gh run watch "$RUN"
   ```

8. **Stop the clock, check the app and clean up.** `/tickets?status=sold` returns what the dump held:

   ```
   echo "Restore took $(( $(date +%s) - START )) seconds"
   curl "$API/health"
   curl -s "$API/tickets?status=sold"
   rm "$HOME/restore.dump"
   ```

Every booking made after the dump was taken is gone. Reservations in the dump whose `reserved_until` has passed count as available again, since an expired reservation is treated as available everywhere.

## Restore log

Every real restore gets a line here: the date, who did it, which dump, and the time from step 3 to step 8.

| Date | Who | Dump | Time | Notes |
|---|---|---|---|---|
| 2026-10-29 | Jennifer | `tickets-20261029T180632Z.dump` | 209 s | First test restore, on the live namespace (#17). AMX-00002 was bought before the dump and a second ticket after it. Afterwards only AMX-00002 was sold, and `/health` was ok. |
