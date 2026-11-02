import { defineConfig } from '@playwright/test'

const API_URL = 'http://localhost:3000'
const APP_URL = 'http://localhost:4173'

// The tests buy real tickets, so they run against a stack of their own and
// never against production. e2e/run.ts starts and migrates its Postgres, then
// runs Playwright with DATABASE_URL set.
export default defineConfig({
  testDir: 'e2e',
  // Every test changes the same tickets table, so they run one at a time.
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: APP_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'bun run start',
      cwd: '../backend',
      url: `${API_URL}/health`,
      // A dev backend on this port would talk to the dev database, not the
      // test container, so a busy port has to be an error.
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
        CORS_ORIGINS: APP_URL,
      },
    },
    {
      // VITE_API_URL set here wins over .env.production, so the bundle calls
      // the local backend. Same mechanism as the frontend Dockerfile.
      command: 'bun run build && bun run preview --port 4173 --strictPort',
      url: APP_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_URL: API_URL },
    },
  ],
})
