import { afterAll } from 'bun:test'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { $, sql } from 'bun'
import { Wait } from 'testcontainers'

// One Postgres for the whole run (ADR 0010), same image as production.
const container = await new PostgreSqlContainer('postgres:16.15-alpine')
  // The module's default also checks the port with `docker exec`, which hangs under Bun.
  .withWaitStrategy(Wait.forHealthCheck())
  .start()

// lib/pq (dbmate's driver) requires SSL by default, and the test container has
// none. Without this, `migrate --wait` retries for 60 s before it fails.
process.env.DATABASE_URL = `${container.getConnectionUri()}?sslmode=disable`
process.env.TEST_DATABASE_URL = process.env.DATABASE_URL

await $`bun run migrate`.quiet()

afterAll(async () => {
  await sql.close()
  await container.stop()
})
