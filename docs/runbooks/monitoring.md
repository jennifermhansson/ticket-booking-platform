# Metrics and logs

Grafana at `https://grafana.tickets.philipzachariasson.dev` shows the **Tickets** dashboard: requests per second, response times, responses by status code, the 5xx error rate, the number of backend pods, CPU and memory per pod, and searchable logs. Why the stack looks like this is in [ADR 0013](../adr/0013-monitoring-stack.md).

| Part | Manifest | What it does |
|---|---|---|
| kube-prometheus-stack | [`k8s/monitoring/kube-prometheus-stack.yaml`](../../k8s/monitoring/kube-prometheus-stack.yaml) | Prometheus, Grafana, kube-state-metrics and the Prometheus Operator; node-exporter is turned off |
| Traefik metrics | [`k8s/cluster/traefik-config.yaml`](../../k8s/cluster/traefik-config.yaml) | A `traefik-metrics` Service and a ServiceMonitor in `kube-system` |
| Loki | [`k8s/monitoring/loki.yaml`](../../k8s/monitoring/loki.yaml) | Stores the logs, one pod with a 5Gi volume |
| Alloy | [`k8s/monitoring/alloy.yaml`](../../k8s/monitoring/alloy.yaml) | Reads every pod's logs through the Kubernetes API and sends them to Loki |
| Dashboard | [`k8s/monitoring/dashboard-tickets.yaml`](../../k8s/monitoring/dashboard-tickets.yaml) | The Tickets dashboard as a ConfigMap |

Everything runs in the `monitoring` namespace. CI does not apply any of it: the deploy user may only change the `tickets` namespace ([ADR 0006](../adr/0006-deploy-from-ci-over-ssh.md)), so the files are applied by hand as root, like `k8s/cluster/`. The Helm charts are installed by k3s's Helm controller (`HelmChart` objects in `kube-system`), so there is no Helm on the server; to upgrade one, change its `version` in the repo and apply the file.

Retention: Prometheus keeps 3 days (at most 2 GB), Loki 72 hours.

## Installing from scratch

Order matters: the Grafana Secret must exist before Grafana starts, and Traefik's ServiceMonitor is only created once the Prometheus Operator's CRDs exist.

1. The namespace: `kubectl apply -f k8s/monitoring/namespace.yaml`.
2. The Grafana admin Secret, generated on the server and never committed:

   ```
   kubectl -n monitoring create secret generic grafana-admin --from-literal=admin-user=admin --from-literal=admin-password="$(openssl rand -base64 24)"
   ```

3. `kubectl apply -f k8s/monitoring/kube-prometheus-stack.yaml`, then wait until `kubectl -n monitoring get pods` shows everything `Running` (about 2 minutes).
4. `kubectl apply -f k8s/cluster/traefik-config.yaml`. k3s re-runs Traefik's chart and rolls Traefik out once.
5. `kubectl apply -f k8s/monitoring/loki.yaml -f k8s/monitoring/alloy.yaml`.
6. `kubectl apply -f k8s/monitoring/dashboard-tickets.yaml`.

From a laptop, send the files over one SSH connection, as the SSH rate limit allows only a few per 30 seconds:

```
tar --no-xattrs -c k8s/monitoring | ssh root@<server-ip> 'd=$(mktemp -d) && tar -x -C "$d" && kubectl apply -f "$d/k8s/monitoring/<file>.yaml"; rm -rf "$d"'
```

The certificate for `grafana.<domain>` comes from cert-manager as for the other hosts. The wildcard DNS record already covers it.

## Logging in

The user is `admin`. Read the password on the server:

```
kubectl -n monitoring get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d; echo
```

There is no anonymous access (decided 2026-10-29). To change the password, delete and recreate the Secret, then restart Grafana: `kubectl -n monitoring rollout restart deploy/kube-prometheus-stack-grafana`. Grafana has no persistent volume, so it reads the Secret again on every start.

## Changing the dashboard

The dashboard is provisioned from the ConfigMap, so Grafana does not save changes made in the UI. Edit it in the UI, then *Export → Export as JSON*, paste the JSON into `dashboard-tickets.yaml`, and apply the file. Grafana's sidecar reloads it within a few seconds.

Useful queries for Explore:

- Errors in the backend's logs: `{namespace="tickets", app="backend"} | json | level >= 50` (Fastify logs pino levels: 30 is info, 40 warn, 50 error).
- A request by its id: `{namespace="tickets"} |= "req-6u"`.
- Traefik's request counter: `traefik_service_requests_total{exported_service="tickets-backend-http@kubernetes"}`. The label is `exported_service`, not `service`, because Prometheus sets its own `service` label (the scraped Service, `traefik-metrics`) and renames Traefik's.

## Checking that it works

- `kubectl -n monitoring get pods`: all `Running`, with no new restarts.
- Prometheus's targets, without opening a port: `kubectl get --raw /api/v1/namespaces/monitoring/services/kube-prometheus-stack-prometheus:9090/proxy/api/v1/targets`. Every target should have `"health":"up"`. The kubelet's targets (`kube-prometheus-stack-kubelet/0–2`) provide CPU and memory per pod, and `kube-system/traefik` the request metrics.
- For the full Prometheus UI: `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090` on the server, and an SSH tunnel (`ssh -L 9090:localhost:9090 root@<server-ip>`) from the laptop.
- Logs arriving: `kubectl get --raw /api/v1/namespaces/monitoring/services/loki:3100/proxy/loki/api/v1/label/namespace/values` lists `tickets`.

## Memory

Measured on 2026-10-29 with the whole stack running and the app idle: `kubectl top nodes` showed 3,540 Mi (44 %) of the 8 GB node. The monitoring stack's share, from `kubectl top pods -n monitoring --containers`:

| Pod | Memory |
|---|---|
| Grafana (with its two sidecars) | about 455 Mi (Grafana itself about 300 Mi) |
| Prometheus | about 310 Mi |
| Loki | about 75 Mi |
| Alloy | about 60 Mi |
| Operator, kube-state-metrics and node-exporter (since turned off) | about 50 Mi together |

That is about 950 Mi, well under the 80 % at which [the plan](../plan.md#ram-on-8-gb) says to upgrade the VPS. Measure again under load (#19, #25).

## Known problems

- **Grafana OOMKilled at its first start.** With a 256Mi limit, Grafana was killed while it ran its database migrations. The limit is now 512Mi. If it happens again, check `kubectl -n monitoring get pod -l app.kubernetes.io/name=grafana -o jsonpath='{.items[0].status.containerStatuses[0].lastState}'`.
- **The Loki chart moves fast.** It lives in `grafana-community/helm-charts` now, changes major version often, and since 20.0.0 refuses unknown top-level values. Before an upgrade, render it locally with `helm template` and the values from `loki.yaml`, and read the release notes.
- **Loki's caches.** The chart starts memcached caches that reserve several GB of RAM unless `chunksCache` and `resultsCache` are turned off, as they are here.
