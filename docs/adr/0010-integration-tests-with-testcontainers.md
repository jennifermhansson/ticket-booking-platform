# Integration tests start their own Postgres with Testcontainers

`bun run test:integration` preloads `backend/test/integration/setup.ts`, which starts a `postgres:16.15-alpine` container with Testcontainers, points `DATABASE_URL` at it, runs `bun run migrate` and stops the container when the run ends. The same command runs on a laptop with Docker Desktop and in the CI `test` job, which uses the runner's Docker. Each test empties `tickets` and inserts only the rows it needs, so the concurrency test (#15) knows exactly how many tickets are free.

## Considered options

- **Postgres as a service container in GitHub Actions.** No new dependency and no risk with Bun, but the database only exists in CI. Locally the tests would run against whatever `DATABASE_URL` points at, which is the dev database from `backend/compose.yaml` with the 5,000 imported tickets, and the tests empty that table.
- **A second database in `compose.yaml` for tests.** Works locally, but CI would still need its own setup, so there would be two paths to keep in step.
- **Mocking the repository.** Fast, but it cannot test what matters here: that `FOR UPDATE SKIP LOCKED` stops two transactions from taking the same row. Only a real Postgres has the row locks.

## Consequences

- Testcontainers' default wait strategy also checks the port from inside the container with `docker exec`, and that hangs under Bun. `setup.ts` waits only for the image's health check, which runs `pg_isready` over TCP and so passes only once the real server is up, not the temporary one during init.
- The tests refuse to run unless the preload has set `DATABASE_URL`, so a plain `bun test` can never empty the dev database. `bun run test` runs only `test/unit`, which needs no database.
- Running the integration tests needs Docker, and each run spends about two seconds starting the container.
- The migrations run with the same script and flags as the migration Job ([ADR 0007](0007-migrations-with-dbmate-as-a-job.md)), so the tests see the schema production gets.
- **In the defence:** asked "how do you know you never sell a ticket twice?", the answer is `reserveConcurrency.test.ts`: 200 parallel reservations for 20 tickets give exactly 20 reservations, and with `SKIP LOCKED` removed the same test fails with 36.
