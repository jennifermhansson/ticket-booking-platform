import { sql } from 'bun'
import { buildApp } from './app'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

const app = buildApp()

// Kubernetes sends SIGTERM after the preStop sleep, when Traefik has stopped
// routing here (ADR 0015). app.close() finishes in-flight requests first; a
// request arriving after that would get Fastify's 503, which the sleep is
// there to prevent. The pool closes here, not in an onClose hook, because the
// tests share one global pool across many apps (ADR 0010).
async function shutDown(signal: NodeJS.Signals) {
  app.log.info({ signal }, 'shutting down')
  try {
    await app.close()
    // Bounded, so a hung query cannot hold the pod until SIGKILL: the 10 s
    // preStop sleep plus 5 s fits in the 30 s grace period.
    await sql.close({ timeout: 5 })
    process.exit(0)
  } catch (err) {
    app.log.error(err, 'shutdown failed')
    process.exit(1)
  }
}

process.once('SIGTERM', shutDown)
process.once('SIGINT', shutDown)

try {
  await app.listen({ host, port })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
