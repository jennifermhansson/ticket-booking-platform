import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { $ } from 'bun'
import { Wait } from 'testcontainers'

// `bun run test:e2e` runs this file. The backend needs its database when it
// starts, so the container has to be up before Playwright starts the backend.
// One Postgres for the whole run (ADR 0010), same image as production.
const container = await new PostgreSqlContainer('postgres:16.15-alpine')
  // The module's default also checks the port with `docker exec`, which hangs under Bun.
  .withWaitStrategy(Wait.forHealthCheck())
  .start()

let exitCode = 1
try {
  // lib/pq (dbmate's driver) requires SSL by default, and the test container has none.
  const databaseUrl = `${container.getConnectionUri()}?sslmode=disable`
  // Passed on explicitly: backend/.env must not win and point migrate at the
  // dev database.
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl,
  }

  await $`bun run migrate`.cwd('../backend').env(env).quiet()

  const playwright = Bun.spawn(
    ['bun', '--bun', 'x', 'playwright', 'test', ...Bun.argv.slice(2)],
    { env, stdio: ['inherit', 'inherit', 'inherit'] },
  )
  exitCode = await playwright.exited
} finally {
  await container.stop()
}

process.exit(exitCode)
