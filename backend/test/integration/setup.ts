import { afterAll } from 'bun:test'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { $, sql } from 'bun'
import { Wait } from 'testcontainers'

// Preloaded by `bun run test:integration` (ADR 0010): one throwaway Postgres
// for the whole run, so the tests never touch the dev database in compose.yaml.

// Same image as k8s/database/postgres.yaml.
const container = await new PostgreSqlContainer('postgres:16.15-alpine')
  // The default strategy also waits for the internal port with `docker exec`,
  // which hangs under Bun. The image's health check runs pg_isready over TCP,
  // so it only passes once the real server (not the init one) is up.
  .withWaitStrategy(Wait.forHealthCheck())
  .start()

const databaseUrl = `${container.getConnectionUri()}?sslmode=disable`

// Overrides the DATABASE_URL Bun loaded from .env, before any test file
// imports the app and with it Bun's default sql client.
process.env.DATABASE_URL = databaseUrl
process.env.TEST_DATABASE_URL = databaseUrl

// The same script and flags production uses, so the tests run against the
// schema the migration Job creates (ADR 0007).
await $`bun run migrate`
  .cwd(`${import.meta.dir}/../..`)
  .env({ ...process.env, DATABASE_URL: databaseUrl })
  .quiet()

afterAll(async () => {
  await sql.close()
  await container.stop()
})
