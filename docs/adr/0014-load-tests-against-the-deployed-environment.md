# Load tests run against the deployed environment and its only database

The k6 scripts in `loadtests/` run full booking attempts, a reservation followed by a purchase, so every run sells tickets for good. The usual answer is a separate staging or performance environment with its own database, so that load tests never touch production. We run them against the one deployed environment at `api.<domain>` and its only database instead, and make every ticket available again afterwards with `loadtests/reset.sh`.

## Considered options

- **The deployed environment (chosen).** The system has no real customers; its tickets exist for the demo. The VG criteria ask us to show a zero-downtime rollout and the HPA scaling under load (#23–#25), and those have to happen on the deployment that is graded, not on a copy. The Grafana dashboard already reads that deployment's Traefik service, so a run shows up with no changes. The cost is that a run writes to the real database, which `reset.sh` and `check.sql` handle.
- **A staging namespace on the same node, with its own Postgres and backend.** Memory is not the obstacle: on 2026-11-02 the node used about 3 GB of 8 GB, and Postgres and the backend each used under 50 MiB, so a copy would cost about 100–200 MiB. But on a single node staging shares CPU, disk and Traefik with production ([ADR 0005](0005-single-node-no-node-level-ha.md)), so a load test against staging still slows production down, and the isolation that is the point of staging is not there. It would also need its own host and certificate, a second deploy and migration Job in CI, and a way to tell the environments apart on the dashboard: about a day of work with the defence two days away.
- **Testcontainers or a local stack.** Keeps the real database untouched, but nothing reaches Traefik, Prometheus or Loki, so Grafana shows nothing, which is what #19 is for. Correctness under concurrency is already tested this way: an integration test fires parallel reservations at a real Postgres in a container ([ADR 0010](0010-integration-tests-with-testcontainers.md)).

## Consequences

- After a run, `check.sql` shows that sold tickets and purchases are equal, at most 5,000, with no ticket sold twice. That is the proof from the deployed system, next to the UNIQUE constraint on `purchases.ticket_id` and the integration test.
- `reset.sh` deletes every purchase and reservation, and asks before it does. Run it only when nobody is demoing.
- A run's purchases end up in that night's `pg_dump` to Backblaze B2 ([ADR 0012](0012-daily-pg-dump-to-backblaze-b2.md)) unless the database is reset first. That is harmless, since the data is test data.
- With real customers, this decision would be wrong: load tests would move to a separate environment on its own nodes, and production would get synthetic smoke checks only.
