# ticket-booking-platform

How the system fits together, and what is built so far: open the [architecture map](docs/architecture/README.md).

## Run the backend locally

You need Bun and Docker. From the repo root:

```
cd backend
bun install
cp .env.example .env
docker compose up -d --wait
bun run migrate
bun run import
bun run dev
```

- `docker compose up` starts Postgres 16 on `localhost:5433`.
- `bun run migrate` applies the SQL files in `backend/db/migrations/` with dbmate ([ADR 0007](docs/adr/0007-migrations-with-dbmate-as-a-job.md)).
- `bun run import` inserts the ticket numbers from `backend/db/data/biljettnummer_examination.csv`. It can be run again without changing anything.
- Check the result with `docker compose exec postgres psql -U postgres -d tickets -c "SELECT count(*) FROM tickets"`, which should say 5000.

## Run the tests

From `backend/`:

```
bun run test
bun run test:integration
```

- `bun run test` runs the unit tests in `backend/test/unit/`. They need no database.
- `bun run test:integration` needs Docker running. It starts its own Postgres with Testcontainers, runs the migrations and tests the API against it, so it never touches the database from `docker compose up` ([ADR 0010](docs/adr/0010-integration-tests-with-testcontainers.md)).
- Run them through these scripts, not a bare `bun test`: the integration tests refuse to run without the preload that starts their database.

The e2e tests are Playwright tests in `frontend/e2e/`. From `frontend/`, with Docker running:

```
bunx playwright install chromium
bun run test:e2e
```

- `bun run test:e2e` starts and migrates its own Postgres with Testcontainers, like the integration tests, so it never touches the database from `docker compose up`. `playwright.config.ts` then starts the backend and builds and serves the frontend, so ports 3000 and 4173 have to be free.
- On Windows, Testcontainers needs Bun 1.4 or later for both these and the integration tests, since Bun 1.3.6 cannot reach Docker's named pipe. CI runs on Linux and is not affected.

## Run a load test

k6 runs from Docker against the deployed system, and every run sells tickets in its database. How to run it, check the result and reset the tickets: [loadtests/README.md](loadtests/README.md).
