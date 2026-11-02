# Load tests

k6 scripts that run against the deployed system at `https://api.tickets.philipzachariasson.dev`, so the traffic shows up on the Grafana **Tickets** dashboard ([docs/runbooks/monitoring.md](../docs/runbooks/monitoring.md)). Why they run against the real database, and not a staging copy, is in [ADR 0014](../docs/adr/0014-load-tests-against-the-deployed-environment.md).

Each iteration of [`bookingAttempt.ts`](bookingAttempt.ts) is one booking attempt (see [GLOSSARY.md](../GLOSSARY.md)): it lists available tickets, reserves one and buys it. Every run sells tickets for good.

## Running

k6 runs from the `grafana/k6` image, so nothing needs installing beyond Docker. From the repo root:

```bash
docker run --rm -e PROFILE=low -v "$PWD/loadtests:/scripts:ro" grafana/k6:2.2.0 run /scripts/bookingAttempt.ts
```

| Variable | Default | What it does |
|---|---|---|
| `PROFILE` | `low` | `smoke`: 1 booking attempt/s for 30 s, to check that the script works. `low`: 2 booking attempts/s for 5 minutes, about 600 tickets sold. |
| `BASE_URL` | `https://api.tickets.philipzachariasson.dev` | The API to test. |

The run fails if more than 1% of requests fail, if p95 response time is over 500 ms, or if any purchase of a fresh reservation is refused (`purchase_conflicts`). A 409 on `POST /reservations` means sold out and counts as an expected answer, not a failure.

## After a run

Check the database: sold tickets and purchases must be equal, at most 5,000, with no duplicates and both `duplicate_purchases` and `sold_without_purchase_or_reverse` at 0.

```bash
ssh root@<server-ip> 'kubectl -n tickets exec -i postgres-0 -- psql -U postgres -d tickets -x' < loadtests/check.sql
```

Make every ticket available again. The script asks before it deletes anything:

```bash
loadtests/reset.sh root@<server-ip>
```
