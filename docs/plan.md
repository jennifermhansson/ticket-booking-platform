# Project plan

## Context

We build the ticket booking system from Ahmad's project proposal ("Distribuerat biljettbokningssystem"). The course's grading criteria ("Praktisk examination") decide what earns the grade, and they set the order of work:

1. **G criteria**
2. **VG criteria**
3. **Extras**: everything from the proposal that earns no points

A phase starts only when the one before it is done (see [ADR 0003](adr/0003-priority-g-vg-extras.md)). The real deadline is the oral defence on 2026-11-04, where we demo the system as it is that day. Code is submitted on 2026-11-08.

### Grading criteria

- **G:**
  - The backend is deployed on our VPS and reachable at `api.<domain>` over HTTPS.
  - Static files are served from `cdn.<domain>`.
  - CI/CD: every merge to `main` is tested, built and deployed automatically.
  - Unit, integration and e2e tests run in the pipeline.
  - The database is backed up daily.
  - The system has metrics and logging, for example in Grafana.
- **VG:**
  - The backend runs as at least two instances behind a load balancer.
  - Deploys cause no downtime.
  - Autoscaling responds to load, and we can show it.
- **Oral defence:**
  - Demo of the app, a deploy through the pipeline, and the metrics and logs dashboard.
  - Architecture: the path from a request to the database, and from merge to deploy.
  - Code, tests and technical choices.
  - Operations: backups, and what we do when something breaks.
  - For VG: autoscaling and zero-downtime deploys, shown under load.
  - Questions are individual: each of us must be able to explain the whole solution.
- **Submission:** a link to the repo, with a README listing the api, cdn and dashboard URLs.

### Two trade-offs in the priority order

- **k3s from day one, not Docker Compose** ([ADR 0001](adr/0001-k3s-from-day-one.md)).
- **The app's core counts as G.** The criteria don't say what the app does, but there has to be an app to deploy and test. The core is the smallest working version of the proposal:
  - CSV import of the tickets
  - ticket status
  - reservation with locking
  - purchase

## Phase 1: G criteria (2026-10-20 → 10-30)

**1. Infrastructure skeleton (10-20 → 10-23)**
- VPS: a dedicated Contabo VPS (4 vCPU, 8 GB RAM) replaces Jennifer's 4 GB server, so nothing else runs on it ([ADR 0004](adr/0004-separate-contabo-vps.md)). We both need SSH access. Add 2–4 GB swap. See [the server runbook](runbooks/server-setup.md).
- Domain: `philipzachariasson.dev`. Point `api`, `cdn` and `grafana` at the server.
- k3s with Traefik and cert-manager: `https://api.<domain>/health` answers, and `cdn.<domain>` serves a static page.
- GitHub Actions: test → build → push to GHCR → deploy on merge to `main`.
- ✅ 10-23: a merge to `main` shows up live. If not, ask Ahmad for help straight away.

**2. App core + frontend (10-24 → 10-26)**
- Import the CSV so that every ticket number is a row in `tickets`.
- API endpoints:
  - list available, reserved and sold tickets
  - reserve
  - purchase (simulated)
- **Reservation:** a transaction with `SELECT ... FOR UPDATE SKIP LOCKED` ([ADR 0002](adr/0002-row-per-ticket-with-skip-locked.md)).
- **Time limit:** each reservation gets a `reserved_until`, and every read of ticket state (reserve, list, purchase) treats an expired reservation as available. That costs one condition per query and releases tickets with no background worker.
- **Purchase:** `purchases` has a UNIQUE constraint on `ticket_id`, so the database makes selling a ticket twice impossible.
- A minimal React + Vite frontend on `cdn.`.

**3. Tests in the pipeline (10-27 → 10-28)**
- Unit tests of the service logic.
- Integration tests against a real Postgres (a service container in Actions). One of them fires N parallel reservations at K tickets and checks that exactly K succeed.
- Playwright e2e tests against the running stack.

**4. Operations (10-29 → 10-30)**
- Backup: a CronJob runs `pg_dump` to Backblaze B2. **Test a restore** and write a short runbook in `docs/runbooks/`.
- Metrics and logs: Prometheus, Grafana and Loki in a lean configuration (see the RAM section), plus a dashboard.
- A **simple low-load k6 script**, so that Grafana has requests per second, response times, errors and logs to show.
- ✅ 10-30: **all G criteria done.**

## Phase 2: VG criteria (10-31 → 11-01)

- `replicas: 2+` behind the Service and Traefik. The concurrency test shows that the locking holds across instances.
- **Zero downtime:** readiness probe, graceful SIGTERM handling in Fastify, a `preStop` sleep and `maxUnavailable: 0`.
- **HPA:** set `resources.requests` and let the HPA scale between 2 and 4–5 pods.
- Run the k6 script at high load from a laptop. Show 0 failed requests during a rollout, and pods scaling up and back down.
- ✅ 11-01: **all VG criteria done.**

## Phase 3: Extras from the proposal (11-02, then 11-05 → 11-08 if we want)

In this order. They earn no points, so stop when time runs out.

1. **Crash test:** `kubectl delete pod` on a backend pod during a k6 run. Show that k3s starts a new pod, that traffic carries on to the other replica, and what k6 and Grafana show. It takes about an hour once VG is done, and gives a concrete answer to "what do you do when something breaks" in the defence.
2. **Idempotent purchases:** an `Idempotency-Key` with a UNIQUE constraint. A small change, and a large part of the proposal's core.
3. **Documented load test runs:** a reset script, a normal run and a spike run (see [GLOSSARY.md](../GLOSSARY.md)). Save the k6 summary and a database check (at most 5,000 sold, 0 duplicates) in `loadtests/results/`.
4. **Active sweeper** that releases expired reservations in the database, not only when they are read.
5. **Message queue on Redis** (for example BullMQ) for order confirmations: a worker Deployment, retries with backoff, a dead-letter queue and an idempotent consumer. Redis arrives with the queue.
6. **More Redis:** for example rate limiting.
7. **Bonus:** a virtual waiting room.

## Rehearsal and submission

- **11-03:** full rehearsal together. Record a backup video of a deploy under load.
- **11-04:** oral defence.
- **11-05 → 11-08:** first the README (api, cdn and dashboard URLs) and an architecture diagram, then more extras if we want.

## RAM on 4 GB

Phases 1–2 need about 2.5–3 GB, and the queue and Redis in phase 3 add about 0.2 GB. Keep the stack lean:
- Prometheus with 2–3 days of retention and no Alertmanager.
- Loki in single-binary mode.
- Resource limits on everything.
- Swap.

Run `kubectl top nodes` on 10-30. If RAM is above about 80 %, upgrade the VPS then.

## Working together

- Pair-program the infrastructure skeleton.
- Daily teach-back: whoever built something explains it to the other.
- One issue, one branch and one PR per task, reviewed by the other. Questions in the defence are individual.

## Tracking

Each task in this plan is a GitHub issue, grouped into milestones: `G` (due 10-30), `VG` (11-01), `Defence & submission` (11-08) and `Extras` (11-08). Every issue has a *Done when* line. This file holds the reasoning and order; the issues hold the tasks and their state.

## Later, with the CI pipeline

- Commitlint for conventional commits.
- A check for duplicate ADR numbers, since two parallel branches can both create the same `NNNN`.
- A shared `.claude/settings.json` once there is something to share, for example permissions for `bun test` and `kubectl`.
