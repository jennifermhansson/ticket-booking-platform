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
