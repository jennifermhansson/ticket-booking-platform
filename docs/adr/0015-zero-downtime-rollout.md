# Zero-downtime rollout with a preStop sleep and a graceful shutdown

The VG criteria ask for deploys with no downtime, shown under load (#23). A rollout replaces backend pods while Traefik is still sending them requests, so each step of a pod's exit has to happen in order: a new pod is ready, the old pod is marked terminating, a `preStop` sleep of 10 s keeps it serving while Traefik stops routing to it, SIGTERM starts the drain in `backend/src/server.ts` (`app.close()` finishes in-flight requests, then the Postgres pool closes), and the process exits. `k8s/backend.yaml` sets `maxUnavailable: 0` and `maxSurge: 1`, so the old pod only goes once its replacement passes the readiness probe, and `terminationGracePeriodSeconds: 30` leaves time for the sleep and the drain before Kubernetes sends SIGKILL.

## Considered options

- **A fixed `preStop` sleep (chosen).** Kubernetes removes a terminating pod from the EndpointSlice and sends SIGTERM at about the same time, and Traefik learns about the removal asynchronously. The pod cannot know when it is out of rotation, so it waits a fixed time that is longer than that delay. It uses the built-in `sleep` action, so the slim image needs no `sleep` binary. The cost is about 10 s more per pod in every rollout.
- **Failing `/health` on SIGTERM, with no sleep.** The readiness probe would take the pod out of rotation itself, but only after `periodSeconds` (5 s) times `failureThreshold`, and Kubernetes already removes a terminating pod without the probe. The drain would still race Traefik, so it saves nothing over the sleep.
- **Default rolling update (`maxUnavailable: 25%`).** With 2 pods it rounds down to 0, so it behaves the same today, but with 4 or 5 pods during an HPA scale-up one pod could go before its replacement is ready. Writing `maxUnavailable: 0` makes the rule independent of the replica count.

## Consequences

- The Postgres pool closes in `server.ts`, not in an `onClose` hook in `app.ts`, because the tests share one global pool across many apps ([ADR 0010](0010-integration-tests-with-testcontainers.md)).
- Bun 1.4.4, the version in the image, keeps a socket alive after the last response even while the server closes, so `app.close()` waited out the 72 s keep-alive timeout and the pod would have been killed before the pool closed. Bun 1.3.9 and Node close the socket. `buildApp` sets `Connection: close` on every response once closing starts, and `test/unit/gracefulShutdown.test.ts` fails without it; run it on the image's Bun version, since a laptop's Bun may hide the problem.
- Fastify answers 503 to a request that arrives after `close()` has started (`return503OnClosing`). The `preStop` sleep is what keeps Traefik from sending one; a shorter sleep would show up as 503s in k6 and on the Traefik panel.
- Migrations must work with the old and the new version at once ([ADR 0007](0007-migrations-with-dbmate-as-a-job.md)), since both run during a rollout.
- Raising the sleep means raising `terminationGracePeriodSeconds` with it: the grace period counts from the start of `preStop`.
- `sql.close({ timeout: 5 })` waits at most 5 s for running queries, then rejects them, so a hung query ends the shutdown at about 15 s instead of a SIGKILL at 30 s. After the HTTP drain no queries should be running, so the timeout only matters when something hangs.
- **In the defence:** asked "what happens to a request that is running when the pod is replaced?", the answer is the shutdown order above: the pod is out of Traefik's rotation before SIGTERM, and `app.close()` lets the request finish before the process exits.
