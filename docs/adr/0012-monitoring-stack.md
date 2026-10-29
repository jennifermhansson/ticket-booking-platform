# Monitoring with kube-prometheus-stack, Loki and Alloy, with request metrics from Traefik

The G criteria ask for metrics and logging of the system, and the defence demos a dashboard with metrics and logs; VG adds showing autoscaling and a zero-downtime rollout under load. Everything runs on one 8 GB node that also carries the load tests ([ADR 0004](0004-separate-contabo-vps.md)), so the stack must stay lean. We install kube-prometheus-stack (Prometheus, Grafana, node-exporter and kube-state-metrics, without Alertmanager), Loki in single-binary mode and Alloy as the log collector, each as a k3s `HelmChart` in `k8s/monitoring/`, applied by hand like `k8s/cluster/`. Requests per second, response times and errors come from Traefik's built-in Prometheus metrics, not from instrumenting the backend.

## Considered options

- **Request metrics from Traefik (chosen).** Traefik already counts every request per Kubernetes service, with its duration and status code, so turning it on is a few lines in `k8s/cluster/traefik-config.yaml` and no backend code. It also sees requests that never reach a pod, such as the 502s when no backend answers, which is what a zero-downtime rollout has to show. It sums per service, not per pod, and knows nothing about what happens inside the app.
- **A `/metrics` endpoint in the backend.** Adds what only the app knows: tickets sold, active reservations and time spent in the reserve transaction, per pod. It costs a metrics library written for Node that must be tested under Bun, a separate port so that `/metrics` is not public through the Ingress, and a PodMonitor. No G or VG criterion needs it, so it is an extra (#74), added next to the Traefik metrics rather than instead of them.
- **kube-prometheus-stack (chosen) or separate Prometheus and Grafana charts.** The stack brings the Prometheus Operator and its CRDs, one more small pod, but scrapes CPU and memory per pod (cAdvisor) and pod counts (kube-state-metrics) out of the box, and Traefik and later the backend are added with a ServiceMonitor or PodMonitor. Separate charts would mean writing that scrape configuration by hand.
- **Alloy (chosen) or Promtail.** Promtail is deprecated and Alloy is Grafana's replacement. Alloy reads the logs through the Kubernetes API, so it needs no hostPath mounts.

## Consequences

- `k8s/monitoring/` is applied by hand as root, not by CI: the deploy user's Role covers only the `tickets` namespace ([ADR 0006](0006-deploy-from-ci-over-ssh.md)). An upgrade is a chart version changed in the repo and applied.
- The `monitoring` namespace cannot have the Pod Security `restricted` label (#53), because node-exporter needs `hostNetwork` and `hostPID`. Its port 9100 is a real listening socket that ufw filters, and the port scan in the server runbook checks it.
- The Loki chart now ships from `grafana-community/helm-charts` and changes major version often. Its memcached caches must be turned off, or they reserve several GB on an 8 GB node.
- Grafana requires a login. The admin password lives in a Kubernetes Secret created by hand, never in the repo.
- **In the defence:** asked "how do you know no request failed during the rollout?", the answer is Traefik's 5xx panel, which counts errors even when no pod answers, together with k6's own count of failed requests.
