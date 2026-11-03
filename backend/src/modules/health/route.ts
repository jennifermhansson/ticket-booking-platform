import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  // The probes would otherwise bury the real lines in the log panel.
  app.get('/health', { logLevel: 'silent' }, async () => ({ status: 'ok' }))
}
