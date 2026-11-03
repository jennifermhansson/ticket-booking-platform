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
| `PROFILE` | `low` | `smoke`: 1 booking attempt/s for 30 s, to check that the script works. `low`: 2 booking attempts/s for 5 minutes, about 600 tickets sold. `high`: ramps to `PEAK_RATE` in 1 minute, holds it for 4 minutes, then drops to 2/s for 4½ minutes; see [High load and autoscaling](#high-load-and-autoscaling). |
| `PEAK_RATE` | `40` | Booking attempts/s in the `high` profile's hold. |
| `BASE_URL` | `https://api.tickets.philipzachariasson.dev` | The API to test. |

For type checking and autocomplete in the editor, run `bun install` in `loadtests/`, and `bun run typecheck` checks the script. The k6 types (`@types/k6`) are only for the editor: k6 in the container uses its own built-in modules and never reads `package.json` or `node_modules`. Keep the `@types/k6` version equal to the image tag, so that the editor does not offer APIs the image lacks; bump both together.

The run fails if any request fails, if k6 drops iterations because it runs out of VUs (it then sends less load than the profile says), if p95 response time is over 500 ms, or if any purchase of a fresh reservation is refused (`purchase_conflicts`). A 409 on `POST /reservations` means sold out and counts as an expected answer, not a failure.

## Rollout under load

This shows that a backend rollout fails no requests ([ADR 0015](../docs/adr/0015-zero-downtime-rollout.md), #23). Start a `low` run as above, and while it runs, replace the backend pods from the server:

```bash
ssh root@<server-ip> 'kubectl -n tickets rollout restart deployment/backend && kubectl -n tickets rollout status deployment/backend'
```

At 2 booking attempts per second one restart sends few requests to a terminating pod, so restart 3–4 times in the 5-minute run, each after the previous one has finished. A real deploy from CI, a merge to `main`, counts as one of them; re-running the deploy job for a commit that is already deployed rolls nothing out. The `http_req_failed` threshold already fails the run on any failed request, and the Traefik 5xx panel on the **Tickets** dashboard must stay empty for the run.

## High load and autoscaling

This shows the HPA scaling the backend out and back in, and a rollout that fails no requests while it does (#25). Start from a clean database (`reset.sh` below), then:

```bash
docker run --rm -e PROFILE=high -e PEAK_RATE=40 -v "$PWD/loadtests:/scripts:ro" grafana/k6:2.2.0 run /scripts/bookingAttempt.ts
```

While it runs, watch the HPA from a second terminal and the *replicas* panel on the **Tickets** dashboard:

```bash
ssh root@<server-ip> 'kubectl -n tickets get hpa backend -w'
```

Start a rollout (`rollout restart` above, or a merge to `main`) right after the ramp, while tickets are still left, so purchases are in flight during the pod swap. Re-running the deploy job for a commit that is already deployed does not count: the pod template is unchanged, so nothing rolls out. At 40 booking attempts/s the 5,000 tickets sell out about 1½ minutes into the hold; after that each booking attempt is a list and a 409, which costs the backend less CPU.

The run passes when k6's thresholds pass, the Traefik 5xx panel stays empty, the HPA goes above 2 replicas during the hold and back to 2 in the tail, and `check.sql` below is clean.

## After a run

Check the database: sold tickets and purchases must be equal, at most 5,000, with no duplicates and both `duplicate_purchases` and `sold_without_purchase_or_reverse` at 0.

```bash
ssh root@<server-ip> 'kubectl -n tickets exec -i postgres-0 -- psql -U postgres -d tickets -x' < loadtests/check.sql
```

Make every ticket available again. The script asks before it deletes anything:

```bash
loadtests/reset.sh root@<server-ip>
```
