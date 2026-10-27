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
